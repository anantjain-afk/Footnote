from langgraph.graph import StateGraph, START,END
from .state import ChatState
from .nodes.intent import detect_intent
from .nodes.respond import chat_response
from .nodes.improve import improve_report

def route_by_intent(state: ChatState) -> str:
    return state["intent"]

def build_chat_graph(checkpointer=None):
    graph = StateGraph(ChatState)

    graph.add_node("detect_intent", detect_intent)
    graph.add_node("chat_response", chat_response)
    graph.add_node("improve_report", improve_report)

    graph.add_edge(START , "detect_intent")

    graph.add_conditional_edges(
        "detect_intent",
        route_by_intent,
        {
            "CHAT": "chat_response",
            "IMPROVE": "improve_report"
        }
    )

    graph.add_edge("chat_response", END)
    graph.add_edge("improve_report", END)

    return graph.compile(checkpointer=checkpointer)