from typing import TypedDict, Literal , Annotated
from langgraph.graph import add_messages
from langchain_core.messages import BaseMessage

class ChatState(TypedDict):
    # loaded from DB at the start of every request
    session_id: str
    report: str           # full report markdown — shared via DB fetch
    
    # conversation
    messages: Annotated[list[BaseMessage], add_messages]

    
    # set by intent node, used by conditional edge
    intent: Literal["CHAT", "IMPROVE"]
    
    # final output written by respond or improve node
    response: str
    updated_report: str   # only populated if intent == IMPROVE