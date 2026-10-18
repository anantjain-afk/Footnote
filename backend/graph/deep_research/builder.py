from langgraph.graph import StateGraph, START, END

from .state import DeepResearchState
from .nodes.planner import planner, fan_out_sub_questions
from .nodes.research_sub_question import research_sub_question
from .nodes.reflector import reflector, reflector_routing
from .nodes.section_writer import write_section
from .nodes.merger import merge_report
from .nodes.verifier import verify_report
from .nodes.deep_judge import deep_judge, deep_route, should_continue_deep


def build_deep_research_graph(checkpointer=None) -> StateGraph:
    """Build the deep research graph.

    Flow:
        START → planner
        planner →(fan-out)→ research_sub_question ×N
        research_sub_question →(fan-in)→ reflector
        reflector →(conditional)→ research_sub_question (follow-ups) OR write_section ×N
        write_section →(fan-in)→ merge_report
        merge_report → verify_report → deep_judge → deep_route
        deep_route →(conditional)→ merge_report (revise) OR END
    """
    builder = StateGraph(DeepResearchState)

    # ── Register nodes ────────────────────────────────────────────────────
    builder.add_node("planner", planner)
    builder.add_node("research_sub_question", research_sub_question)
    builder.add_node("reflector", reflector)
    builder.add_node("write_section", write_section)
    builder.add_node("merge_report", merge_report)
    builder.add_node("verify_report", verify_report)
    builder.add_node("deep_judge", deep_judge)
    builder.add_node("deep_route", deep_route)

    # ── Wire edges ────────────────────────────────────────────────────────
    # 1. Plan → fan-out to parallel research
    builder.add_edge(START, "planner")
    builder.add_conditional_edges(
        "planner", fan_out_sub_questions, ["research_sub_question"]
    )

    # 2. Research → Reflect → (loop for follow-ups OR proceed to writing)
    builder.add_edge("research_sub_question", "reflector")
    builder.add_conditional_edges(
        "reflector",
        reflector_routing,
        ["research_sub_question", "write_section"],
    )

    # 3. Write sections → Merge → Verify → Judge → Route
    builder.add_edge("write_section", "merge_report")
    builder.add_edge("merge_report", "verify_report")
    builder.add_edge("verify_report", "deep_judge")
    builder.add_edge("deep_judge", "deep_route")

    # 4. Route: revise or finish
    builder.add_conditional_edges(
        "deep_route",
        should_continue_deep,
        {"finish": END, "revise": "merge_report"},
    )

    return builder.compile(checkpointer=checkpointer)
