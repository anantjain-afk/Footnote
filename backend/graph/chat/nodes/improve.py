from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_groq import ChatGroq
from ..state import ChatState
import os 
from dotenv import load_dotenv 
load_dotenv()

llm = ChatGroq(model="llama-3.3-70b-versatile", api_key=os.getenv('GROQ_API_KEY'))

async def improve_report(state: ChatState) -> dict:
    current_message = state["messages"][-1].content

    system = SystemMessage(content="""You are a research report editor.
Apply the requested changes and return the complete improved report in markdown.
Return only the report markdown — no explanation or preamble.""")

    user = HumanMessage(content=f"""Current report:
{state['report']}

Improvement requested:
{current_message}

Return the complete improved report:""")    

    response = await llm.ainvoke([system, user])
    confirmation = AIMessage(
        content="I've updated the report based on your feedback."
    )

    return {
        "updated_report": response.content,
        "response": confirmation.content,
        "messages": [confirmation]   # add_messages appends this
    }