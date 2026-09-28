
from ....services import groq
from langchain_core.messages import SystemMessage
from ..state import ChatState
import os 
from dotenv import load_dotenv 
load_dotenv()
llm = groq.llm

async def chat_response(state: ChatState) -> dict:
    system = SystemMessage(content=f"""You are a research assistant helping the user 
understand a research report. Answer questions based strictly on the report content.
If the answer isn't in the report, say so — don't invent information.

Report:
{state['report']}""")

    response = await llm.ainvoke([system] + state["messages"])
    return {
        "response": response.content,
        # add_messages will append this to state["messages"] automatically
        "messages": [response]
    }