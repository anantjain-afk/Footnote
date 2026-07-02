import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..core.database import get_db
from ..graph.builder import build_graph

router = APIRouter(prefix="/sessions")

class CreateSessionRequest(BaseModel):
    topic: str

# ── CREATE ────────────────────────────────────────────────────────────────────
@router.post("", status_code=201)
async def create_session(body: CreateSessionRequest):
    session_id = str(uuid.uuid4())

    # insert session row immediately so sidebar shows 'running'
    with get_db() as conn:
        conn.execute(
            "INSERT INTO research_sessions (id, topic, status) VALUES (?, ?, 'running')",
            (session_id, body.topic)
        )

    try:
        graph = build_graph()
        result = await graph.ainvoke({"topic": body.topic})
        report_content = result["report"]

        with get_db() as conn:
            conn.execute(
                """INSERT INTO reports (id, session_id, content, word_count)
                   VALUES (?, ?, ?, ?)""",
                (str(uuid.uuid4()), session_id, report_content,
                 len(report_content.split()))
            )
            conn.execute(
                """UPDATE research_sessions
                   SET status='completed', completed_at=?
                   WHERE id=?""",
                (datetime.now(timezone.utc).isoformat(), session_id)
            )

        return {"session_id": session_id, "report": report_content}

    except Exception as e:
        with get_db() as conn:
            conn.execute(
                "UPDATE research_sessions SET status='failed' WHERE id=?",
                (session_id,)
            )
        raise HTTPException(status_code=500, detail=str(e))


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