from ..state import State
from ....core.config import settings
from ....core.logging import get_logger

logger = get_logger(__name__)


def should_continue(state: State):
    """Decide whether to regenerate or finish based on judge scores."""
    if not state["failed_metrics"]:
        logger.info(
            "All metrics passed — finishing",
            extra={"node": "should_continue"},
        )
        return "finish"

    if state["iterations"] >= settings.max_iterations:
        logger.info(
            f"Max iterations ({settings.max_iterations}) reached — finishing",
            extra={"node": "should_continue"},
        )
        return "finish"

    logger.info(
        f"Failed metrics detected — regenerating (iteration {state['iterations']})",
        extra={"node": "should_continue"},
    )
    return "generate"