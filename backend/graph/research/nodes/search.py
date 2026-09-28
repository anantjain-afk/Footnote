import time
from ..state import State
from ....services.tavily import tavilyClient
from ....core.logging import get_logger
from ....core.exceptions import SearchError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = get_logger(__name__)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
def _search_with_retry(topic: str):
    """Tavily search with exponential backoff retry."""
    return tavilyClient.search(topic)


async def search(state: State) -> dict:
    """Searches the web for the given topic and returns a list of relevant URLs."""
    topic = state["topic"]
    start = time.time()

    try:
        response = _search_with_retry(topic)
        urls = [result["url"] for result in response["results"]]
        duration = round((time.time() - start) * 1000)

        logger.info(
            f"Found {len(urls)} URLs for topic",
            extra={"node": "search", "topic": topic, "duration_ms": duration},
        )
        return {"urls": urls}

    except Exception as e:
        logger.error(
            f"Search failed: {e}",
            extra={"node": "search", "topic": topic, "error": str(e)},
        )
        raise SearchError(f"Web search failed for topic '{topic}': {e}")
