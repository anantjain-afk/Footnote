import uuid
from datetime import datetime, timezone
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from ..core.database import get_db
from ..graph.research.builder import build_graph
from ..core.sse import get_queue, remove_queue, publish_event, format_sse_event
from ..core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/sessions")

class CreateSessionRequest(BaseModel):
    topic: str

# ── BACKGROUND TASK ───────────────────────────────────────────────────────────
async def run_research_pipeline(session_id: str, topic: str):
    graph = build_graph()
    final_report = ""

    try:
        # Use LangGraph's astream_events to get real-time node progress
        async for event in graph.astream_events({"topic": topic}, version="v2"):
            kind = event["event"]
            name = event["name"]

            if kind == "on_chain_start" and name in ["search", "extract_contents", "generate", "judge_1", "judge_2"]:
                await publish_event(session_id, "node_start", {"node": name})

            elif kind == "on_chain_end":
                if name == "search":
                    output = event["data"].get("output", {})
                    await publish_event(session_id, "node_end", {"node": name, "data": output})
                elif name == "extract_contents":
                    output = event["data"].get("output", {})
                    extracted_count = len(output.get("extracted_text", [])) if output else 0
                    await publish_event(session_id, "node_end", {"node": name, "data": {"extracted_count": extracted_count}})
                elif name in ["judge_1", "judge_2"]:
                    output = event["data"].get("output", {})
                    await publish_event(session_id, "scores", {"node": name, "data": output})
                elif name == "route":
                    output = event["data"].get("output", {})
                    await publish_event(session_id, "progress", {"node": name, "data": output})
                elif name == "LangGraph":
                    # The root graph completed
                    output = event["data"].get("output", {})
                    if output and "report" in output:
                        final_report = output["report"]

        # Persist report and update session status to completed
        with get_db() as conn:
            conn.execute(
                """INSERT INTO reports (id, session_id, content, word_count)
                   VALUES (?, ?, ?, ?)""",
                (str(uuid.uuid4()), session_id, final_report, len(final_report.split()))
            )
            conn.execute(
                """UPDATE research_sessions
                   SET status='completed', completed_at=?
                   WHERE id=?""",
                (datetime.now(timezone.utc).isoformat(), session_id)
            )

        # Notify frontend that we are completely done
        await publish_event(session_id, "complete", {"report": final_report})

    except Exception as e:
        logger.error(f"Pipeline failed for session {session_id}: {e}", exc_info=True)
        with get_db() as conn:
            conn.execute(
                "UPDATE research_sessions SET status='failed' WHERE id=?",
                (session_id,)
            )
        await publish_event(session_id, "error", {"detail": str(e)})

    finally:
        # Wait a moment to ensure frontend receives the final complete/error message before dropping queue
        await asyncio.sleep(2)
        remove_queue(session_id)


# ── CREATE ────────────────────────────────────────────────────────────────────
@router.post("", status_code=201)
async def create_session(body: CreateSessionRequest, background_tasks: BackgroundTasks):
    session_id = str(uuid.uuid4())

    # Insert session row immediately so sidebar shows 'running'
    with get_db() as conn:
        conn.execute(
            "INSERT INTO research_sessions (id, topic, status) VALUES (?, ?, 'running')",
            (session_id, body.topic)
        )

    # Launch background task for graph execution
    background_tasks.add_task(run_research_pipeline, session_id, body.topic)

    # Return immediately, don't wait for report
    return {"session_id": session_id}


# ── SSE STREAM ────────────────────────────────────────────────────────────────
async def event_generator(session_id: str):
    queue = get_queue(session_id)
    try:
        while True:
            event = await queue.get()
            yield event
            if event["event"] in ["complete", "error"]:
                break
    except asyncio.CancelledError:
        pass

@router.get("/{session_id}/stream")
async def stream_session(session_id: str):
    # Verify session status first
    with get_db() as conn:
        session = conn.execute(
            "SELECT status FROM research_sessions WHERE id=?", 
            (session_id,)
        ).fetchone()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["status"] == "completed":
        # If it's already done, just emit one 'complete' event
        with get_db() as conn:
            report = conn.execute(
                "SELECT content FROM reports WHERE session_id=?", 
                (session_id,)
            ).fetchone()
        
        async def quick_complete():
            yield format_sse_event("complete", {"report": report["content"] if report else ""})
        return EventSourceResponse(quick_complete())

    if session["status"] == "failed":
        async def quick_error():
            yield format_sse_event("error", {"detail": "Session previously failed."})
        return EventSourceResponse(quick_error())

    return EventSourceResponse(event_generator(session_id))


# ── LIST (sidebar) ────────────────────────────────────────────────────────────
@router.get("")
def list_sessions():
    with get_db() as conn:
        rows = conn.execute(
            """SELECT id, topic, status, created_at
               FROM research_sessions
               ORDER BY created_at DESC
               LIMIT 50"""
        ).fetchall()
    return [dict(r) for r in rows]


# ── GET ONE ───────────────────────────────────────────────────────────────────
@router.get("/{session_id}")
def get_session(session_id: str):
    with get_db() as conn:
        session = conn.execute(
            "SELECT * FROM research_sessions WHERE id=?",
            (session_id,)
        ).fetchone()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        report = conn.execute(
            "SELECT content, word_count, created_at FROM reports WHERE session_id=?",
            (session_id,)
        ).fetchone()

    return {
        "session": dict(session),
        "report": dict(report) if report else None
    }


# ── DELETE ────────────────────────────────────────────────────────────────────
@router.delete("/{session_id}", status_code=204)
def delete_session(session_id: str):
    with get_db() as conn:
        conn.execute("DELETE FROM reports WHERE session_id=?", (session_id,))
        conn.execute(
            "DELETE FROM research_sessions WHERE id=?", (session_id,)
        )