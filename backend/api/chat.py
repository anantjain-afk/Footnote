import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from sse_starlette.sse import EventSourceResponse

from ..core.database import get_db
from ..graph.chat.builder import build_chat_graph
from ..core.sse import format_sse_event
from ..core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/sessions/{session_id}/chat")


# ── Request model ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_report_for_session(conn, session_id: str) -> str:
    report = conn.execute(
        "SELECT content FROM reports WHERE session_id=?",
        (session_id,)
    ).fetchone()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="No report found for this session. Generate a report first."
        )
    return report["content"]


def get_chat_history_from_db(conn, session_id: str) -> list[dict]:
    rows = conn.execute(
        """SELECT role, content FROM chat_messages
           WHERE session_id=?
           ORDER BY created_at ASC""",
        (session_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def save_messages(conn, session_id: str, user_msg: str, assistant_msg: str):
    conn.execute(
        """INSERT INTO chat_messages (id, session_id, role, content)
           VALUES (?, ?, 'user', ?)""",
        (str(uuid.uuid4()), session_id, user_msg)
    )
    conn.execute(
        """INSERT INTO chat_messages (id, session_id, role, content)
           VALUES (?, ?, 'assistant', ?)""",
        (str(uuid.uuid4()), session_id, assistant_msg)
    )


def update_report_in_db(conn, session_id: str, new_content: str):
    conn.execute(
        """UPDATE reports
           SET content=?, word_count=?
           WHERE session_id=?""",
        (new_content, len(new_content.split()), session_id)
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


# ── POST /sessions/{session_id}/chat ─────────────────────────────────────────

@router.post("")
async def chat(session_id: str, body: ChatRequest):

    # 1. validate session exists and is completed
    with get_db() as conn:
        session = conn.execute(
            "SELECT id, status FROM research_sessions WHERE id=?",
            (session_id,)
        ).fetchone()

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
        report = get_report_for_session(conn, session_id)
        history_rows = get_chat_history_from_db(conn, session_id)

    # 3. deserialize history + append current user message
    messages = rows_to_messages(history_rows)
    messages.append(HumanMessage(content=body.message))

    # 4. run chat graph
    graph = build_chat_graph()
    result = await graph.ainvoke({
        "session_id": session_id,
        "report": report,
        "messages": messages,
        "intent": "",
        "response": "",
        "updated_report": ""
    })

    # 5. persist both turns and updated report atomically
    with get_db() as conn:
        save_messages(
            conn,
            session_id,
            user_msg=body.message,
            assistant_msg=result["response"]
        )

        if result["intent"] == "IMPROVE" and result["updated_report"]:
            update_report_in_db(conn, session_id, result["updated_report"])

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
async def chat_stream(session_id: str, body: ChatRequest):
    # 1. validate session exists and is completed
    with get_db() as conn:
        session = conn.execute(
            "SELECT id, status FROM research_sessions WHERE id=?",
            (session_id,)
        ).fetchone()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")
        if session["status"] != "completed":
            raise HTTPException(
                status_code=400,
                detail="Report is not ready yet. Cannot chat until research completes."
            )

        # 2. load report and history from DB
        report = get_report_for_session(conn, session_id)
        history_rows = get_chat_history_from_db(conn, session_id)

    # 3. deserialize history + append current user message
    messages = rows_to_messages(history_rows)
    messages.append(HumanMessage(content=body.message))

    async def event_generator():
        try:
            graph = build_chat_graph()
            final_response = ""
            intent = ""
            updated_report = ""

            # Use astream_events to catch 'on_chat_model_stream' events
            async for event in graph.astream_events({
                "session_id": session_id,
                "report": report,
                "messages": messages,
                "intent": "",
                "response": "",
                "updated_report": ""
            }, version="v2"):
                
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
            with get_db() as conn:
                save_messages(
                    conn,
                    session_id,
                    user_msg=body.message,
                    assistant_msg=final_response
                )

                if intent == "IMPROVE" and updated_report:
                    update_report_in_db(conn, session_id, updated_report)

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
def get_chat_history(session_id: str):
    """Called when user clicks a session in sidebar — restores full chat."""
    with get_db() as conn:
        session = conn.execute(
            "SELECT id FROM research_sessions WHERE id=?",
            (session_id,)
        ).fetchone()

        if not session:
            raise HTTPException(
                status_code=404,
                detail="Session not found."
            )

        messages = get_chat_history_from_db(conn, session_id)

    return {"messages": messages}