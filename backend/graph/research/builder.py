from langgraph.graph import StateGraph, START, END

from .nodes.search import search
from .nodes.extract import extract_contents
from .nodes.generate import generate
from .nodes.critique import judge, route
from .nodes.cond import should_continue
from .state import State


def build_graph() -> StateGraph:
    builder = StateGraph(State)
    builder.add_node("search", search)
    builder.add_node("extract_contents", extract_contents)
    builder.add_node("generate", generate)
    builder.add_node("judge", judge)
    builder.add_node("route", route)

    builder.add_edge(START, "search")
    builder.add_edge("search", "extract_contents")
    builder.add_edge("extract_contents", "generate")
    builder.add_edge("generate", "judge")
    builder.add_edge("judge", "route")

    builder.add_conditional_edges(
        "route",
        should_continue,
        {"finish": END, "generate": "generate"},
    )
    return builder.compile()


# Compiled graph instance for execution
graph = build_graph()
