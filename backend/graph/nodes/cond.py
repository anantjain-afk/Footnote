

from ..state import State


def should_continue(state: State):
    MAX_ITERATIONS = 3
    if not state["failed_metrics"]:
        return 'finish'

    if state["iterations"] >= MAX_ITERATIONS:
        return "finish"

    return "generate"