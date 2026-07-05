from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from ..state import ChatState
import os 
from dotenv import load_dotenv 
from pydantic import BaseModel, Field

load_dotenv()

# We use the fast 8b model with structured output, which guarantees accurate classifications.
llm = ChatGroq(model="llama-3.1-8b-instant", api_key=os.getenv('GROQ_API_KEY'))

class IntentClassification(BaseModel):
    intent: str = Field(description="The classified intent, must be either 'CHAT' or 'IMPROVE'")

structured_llm = llm.with_structured_output(IntentClassification)

async def detect_intent(state: ChatState) -> dict:
    current_message = state["messages"][-1].content
    
    system = "You are a routing system. You must classify user messages about a research report into 'CHAT' (questions/explanations about the report) or 'IMPROVE' (requests to edit, rewrite, expand, or modify the report contents)."
    user = f"Classify this user message: '{current_message}'"
    
    try:
        response = await structured_llm.ainvoke([
            SystemMessage(content=system),
            HumanMessage(content=user)
        ])
        intent = response.intent.strip().upper()
    except Exception:
        # fallback to raw string model if tool calling fails
        prompt = f"""Classify this message into exactly one category:
CHAT — user is asking a question about the report, wants explanation or information
IMPROVE — user wants the report content itself to be changed, rewritten, or expanded

Message: "{current_message}"

Reply with only one word: CHAT or IMPROVE"""
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        intent = response.content.strip().upper()

    # safety fallback
    if intent not in ("CHAT", "IMPROVE"):
        intent = "CHAT"
        
    return {"intent": intent}