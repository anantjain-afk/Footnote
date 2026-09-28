import time
import asyncio
from ....services.firecrawl import firecrawl
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


async def extract_contents(state: State) -> dict:
    """Extracts content from discovered URLs in parallel with error resilience."""
    urls = state["urls"]
    start = time.time()

    logger.info(
        f"Extracting content from {len(urls)} URLs",
        extra={"node": "extract_contents"},
    )

    tasks = [firecrawl.scrape(url, formats=["markdown"]) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Filter out failed extractions and log them individually
    contents = []
    for url, result in zip(urls, results):
        if isinstance(result, Exception):
            logger.warning(
                f"Extraction failed for {url}: {result}",
                extra={"node": "extract_contents", "error": str(result)},
            )
            continue
        # Use configurable max chars instead of hardcoded 1000
        text = result.markdown[: settings.extract_max_chars]
        contents.append(clean_extracted(text))

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
        return {"extracted_text": ["No content could be extracted from the discovered sources."]}

    return {"extracted_text": contents}
