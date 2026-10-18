import time
import asyncio
from langchain_core.runnables import RunnableConfig
from ....services.firecrawl import client_for_key
from ....core.database import get_pool
from ....core.user_settings import resolve_firecrawl_key
from ....core.logging import get_logger
from ....core.config import settings
from ..state import State

logger = get_logger(__name__)


def clean_extracted(text: str) -> str:
    """Remove lines that are likely nav/footer noise."""
    lines = text.split("\n")
    cleaned = [
        line
        for line in lines
        if len(line.strip()) > 40  # skip short nav items
        and not line.strip().startswith("©")
        and "cookie" not in line.lower()
        and "subscribe" not in line.lower()
    ]
    return "\n".join(cleaned)


async def extract_contents(state: State, config: RunnableConfig) -> dict:
    """Extracts content from discovered URLs in parallel with error resilience."""
    urls = state["urls"]
    start = time.time()

    logger.info(
        f"Extracting content from {len(urls)} URLs",
        extra={"node": "extract_contents"},
    )

    user_id = config["configurable"]["user_id"]
    async with get_pool().acquire() as db:
        api_key = await resolve_firecrawl_key(db, user_id, "normal")
    firecrawl = client_for_key(api_key)
    tasks = [firecrawl.scrape(url, formats=["markdown"]) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Filter out failed extractions and log them individually
    contents = []
    sources = []
    for url, result in zip(urls, results):
        if isinstance(result, Exception):
            logger.warning(
                f"Extraction failed for {url} ({type(result).__name__})",
                extra={"node": "extract_contents"},
            )
            continue
        # Use configurable max chars instead of hardcoded 1000
        text = result.markdown[: settings.extract_max_chars]
        contents.append(clean_extracted(text))
        
        # Build source object
        title = url
        if hasattr(result, "metadata") and result.metadata:
            title = getattr(result.metadata, "title", None) or url

        sources.append({
            "id": len(sources) + 1,
            "url": url,
            "title": title,
            "snippet": text[:800]
        })

    duration = round((time.time() - start) * 1000)
    logger.info(
        f"Extracted content from {len(contents)}/{len(urls)} URLs",
        extra={"node": "extract_contents", "duration_ms": duration},
    )

    if not contents:
        logger.error(
            "All URL extractions failed",
            extra={"node": "extract_contents"},
        )
        # Return empty list — generate node will work with whatever it has
        return {"extracted_text": ["No content could be extracted from the discovered sources."], "sources": []}

    return {"extracted_text": contents, "sources": sources}
