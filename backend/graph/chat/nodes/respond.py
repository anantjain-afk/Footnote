
from ....services import groq
from langchain_core.messages import SystemMessage
from ..state import ChatState
import os 
from dotenv import load_dotenv 
load_dotenv()
llm = groq.llm

from langchain_core.runnables import RunnableConfig

async def chat_response(state: ChatState, config: RunnableConfig) -> dict:
    system = SystemMessage(content=f"""You are a research assistant helping the user 
understand a research report. Answer questions based strictly on the report content.
If the answer isn't in the report, say so — don't invent information.

Report:
{state['report']}""")

    response = await llm.ainvoke([system] + state["messages"], config=config)
    return {
        "response": response.content,
        "messages": [response]
    }