# test_chat_graph.py — run this directly
import asyncio
from graph.chat.builder import build_chat_graph
from langchain_core.messages import HumanMessage

async def test():
    graph = build_chat_graph()

    # test CHAT intent
    result = await graph.ainvoke({
        "session_id": "test-123",
        "report": "# AI in 2025\n\nAI adoption grew 40% in 2025...",
        "messages": [
            HumanMessage(content='What was the growth rate mentioned?')
        ],
        "intent": "",
        "response": "",
        "updated_report": ""
    })
    print("Intent detected:", result["intent"])
    print("Response:", result["response"][:100])
    assert result["intent"] == "CHAT"

    # test IMPROVE intent
    result2 = await graph.ainvoke({
        "session_id": "test-123",
        "report": "# AI in 2025\n\nAI adoption grew 40% in 2025...",
        "messages": [
            HumanMessage(content='Change the content of the report to 100 words')
        ],
        "intent": "",
        "response": "",
        "updated_report": ""
    })
    print("\nIntent detected:", result2["intent"])
    print("Updated report starts with:", result2["updated_report"][:100])
    assert result2["intent"] == "IMPROVE"
    
    print("\n✅ Chat graph working correctly")

asyncio.run(test())