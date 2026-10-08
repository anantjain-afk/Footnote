import uuid
from fastapi import Request, APIRouter, HTTPException, Depends
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from sse_starlette.sse import EventSourceResponse
import asyncpg

from ..core.database import get_db, get_checkpointer
from ..graph.chat.builder import build_chat_graph
from ..core.sse import format_sse_event
from ..core.logging import get_logger
from ..services.report_versions import append_report_version

logger = get_logger(__name__)

router = APIRouter(prefix="/sessions/{session_id}/chat")


# ── Request model ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


# ── DB helpers ────────────────────────────────────────────────────────────────

async def get_report_for_session(db: asyncpg.Connection, session_id: str) -> str:
    report = await db.fetchrow(
        "SELECT content FROM reports WHERE session_id=$1",
        session_id
    )

    if not report:
        raise HTTPException(
            status_code=404,
            detail="No report found for this session. Generate a report first."
        )
    return report["content"]


async def get_chat_history_from_db(db: asyncpg.Connection, session_id: str) -> list[dict]:
    rows = await db.fetch(
        """SELECT role, content FROM chat_messages
           WHERE session_id=$1
           ORDER BY created_at ASC""",
        session_id
    )
    return [dict(r) for r in rows]


async def save_messages(db: asyncpg.Connection, session_id: str, user_msg: str, assistant_msg: str):
    await db.execute(
        """INSERT INTO chat_messages (id, session_id, role, content)
           VALUES ($1, $2, 'user', $3)""",
        str(uuid.uuid4()), session_id, user_msg
    )
    await db.execute(
        """INSERT INTO chat_messages (id, session_id, role, content)
           VALUES ($1, $2, 'assistant', $3)""",
        str(uuid.uuid4()), session_id, assistant_msg
    )


# ── Serialization helpers ─────────────────────────────────────────────────────

def rows_to_messages(rows: list[dict]) -> list[BaseMessage]:
    """Convert DB rows → LangChain BaseMessage objects for graph input."""
    messages = []
    for row in rows:
        if row["role"] == "user":
            messages.append(HumanMessage(content=row["content"]))
        else:
            messages.append(AIMessage(content=row["content"]))
    return messages


from ..core.auth import User, get_current_user
from ..core.rate_limit import get_rate_limiter

# ── POST /sessions/{session_id}/chat ─────────────────────────────────────────

@router.post("")
async def chat(request: Request, session_id: str, body: ChatRequest, user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):

    # 1. validate session exists and is completed
    session = await db.fetchrow(
        "SELECT id, status FROM research_sessions WHERE id=$1 AND user_id=$2",
        session_id, user.id
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found."
        )
    if session["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail="Report is not ready yet. Cannot chat until research completes."
        )

    # 2. load report and history from DB — bridge between graphs
    report = await get_report_for_session(db, session_id)
    await get_rate_limiter(request).consume(user.id, "chat")
    history_rows = await get_chat_history_from_db(db, session_id)

    # 3. deserialize history + append current user message
    messages = rows_to_messages(history_rows)
    messages.append(HumanMessage(content=body.message))

    async with get_checkpointer() as checkpointer:

        # 4. run chat graph
        graph = build_chat_graph(checkpointer)
        config = {"configurable": {"thread_id": session_id}}
        result = await graph.ainvoke({
            "session_id": session_id,
            "report": report,
            "messages": messages,
            "intent": "",
            "response": "",
            "updated_report": ""
        }, config=config)

    # 5. persist both turns and updated report atomically
    async with db.transaction():
        await save_messages(
            db,
            session_id,
            user_msg=body.message,
            assistant_msg=result["response"]
        )

        if result["intent"] == "IMPROVE" and result["updated_report"]:
            await append_report_version(db, session_id, result["updated_report"], body.message)

    # 6. build response payload
    payload = {
        "response": result["response"],
        "intent": result["intent"],
    }

    if result["intent"] == "IMPROVE" and result["updated_report"]:
        payload["updated_report"] = result["updated_report"]

    return payload


# ── POST /sessions/{session_id}/chat/stream ──────────────────────────────────

@router.post("/stream")
async def chat_stream(request: Request, session_id: str, body: ChatRequest, user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    # 1. validate session exists and is completed
    session = await db.fetchrow(
        "SELECT id, status FROM research_sessions WHERE id=$1 AND user_id=$2",
        session_id, user.id
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail="Report is not ready yet. Cannot chat until research completes."
        )

    # 2. load report and history from DB
    report = await get_report_for_session(db, session_id)
    await get_rate_limiter(request).consume(user.id, "chat")
    history_rows = await get_chat_history_from_db(db, session_id)

    # 3. deserialize history + append current user message
    messages = rows_to_messages(history_rows)
    messages.append(HumanMessage(content=body.message))

    async def event_generator():
        try:
            async with get_checkpointer() as checkpointer:

                graph = build_chat_graph(checkpointer)
                final_response = ""
                intent = ""
                updated_report = ""

                # Use astream_events to catch 'on_chat_model_stream' events
                config = {"configurable": {"thread_id": session_id}}
                async for event in graph.astream_events({
                    "session_id": session_id,
                    "report": report,
                    "messages": messages,
                    "intent": "",
                    "response": "",
                    "updated_report": ""
                }, config=config, version="v2"):

                    kind = event["event"]
                    name = event["name"]

                    # Emit tokens as they arrive from the LLM
                    if kind == "on_chat_model_stream":
                        chunk = event["data"]["chunk"]
                        if hasattr(chunk, "content") and isinstance(chunk.content, str) and chunk.content:
                            yield format_sse_event("token", {"content": chunk.content})

                    # Capture final graph output
                    elif kind == "on_chain_end" and name == "LangGraph":
                        output = event["data"].get("output", {})
                        final_response = output.get("response", "")
                        intent = output.get("intent", "")
                        updated_report = output.get("updated_report", "")

            # Persist turns and updated report automatically at the end
            # In SSE, we need a distinct db connection, wait, the Dependency injects one for the request, but we are inside a generator
            # The dependency 'db' is kept alive during the streaming response.
            async with db.transaction():
                await save_messages(
                    db,
                    session_id,
                    user_msg=body.message,
                    assistant_msg=final_response
                )

                if intent == "IMPROVE" and updated_report:
                    await append_report_version(db, session_id, updated_report, body.message)

            # Send done event with final payload
            payload = {"intent": intent, "response": final_response}
            if intent == "IMPROVE" and updated_report:
                payload["updated_report"] = updated_report

            yield format_sse_event("done", payload)

        except Exception as e:
            logger.error(f"Chat stream failed: {e}", exc_info=True)
            yield format_sse_event("error", {"detail": str(e)})

    return EventSourceResponse(event_generator())


# ── GET /sessions/{session_id}/chat ──────────────────────────────────────────

@router.get("")
async def get_chat_history(session_id: str, user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    """Called when user clicks a session in sidebar — restores full chat."""
    session = await db.fetchrow(
        "SELECT id FROM research_sessions WHERE id=$1 AND user_id=$2",
        session_id, user.id
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found."
        )

    messages = await get_chat_history_from_db(db, session_id)

    return {"messages": messages}
