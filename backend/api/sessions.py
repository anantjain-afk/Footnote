import uuid
from datetime import datetime, timezone
import asyncio
from fastapi import Request, APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
import asyncpg

from ..core.database import get_db, get_pool, get_checkpointer
from ..graph.research.builder import build_graph
from ..core.sse import get_queue, remove_queue, publish_event, format_sse_event
from ..core.logging import get_logger
from ..services.report_versions import save_initial_report_version, list_report_versions, restore_previous_report

logger = get_logger(__name__)

router = APIRouter(prefix="/sessions")

class CreateSessionRequest(BaseModel):
    topic: str
    mode: str = "normal"


# ── BACKGROUND TASK ───────────────────────────────────────────────────────────
async def run_research_pipeline(session_id: str, topic: str):
    async with get_checkpointer() as checkpointer:
        graph = build_graph(checkpointer)
        final_report = ""
        final_sources = []

        try:
            # Use LangGraph's astream_events to get real-time node progress
            config = {"configurable": {"thread_id": session_id}}
            async for event in graph.astream_events({"topic": topic}, config=config, version="v2"):
                kind = event["event"]
                name = event["name"]

                if kind == "on_chain_start" and name in ["search", "extract_contents", "generate", "judge"]:
                    await publish_event(session_id, "node_start", {"node": name})

                elif kind == "on_chain_end":
                    if name == "search":
                        output = event["data"].get("output", {})
                        await publish_event(session_id, "node_end", {"node": name, "data": output})
                    elif name == "extract_contents":
                        output = event["data"].get("output", {})
                        extracted_count = len(output.get("extracted_text", [])) if output else 0
                        await publish_event(session_id, "node_end", {"node": name, "data": {"extracted_count": extracted_count}})
                    elif name == "judge":
                        output = event["data"].get("output", {})
                        await publish_event(session_id, "scores", {"node": name, "data": output.get("scores", {})})
                    elif name == "route":
                        output = event["data"].get("output", {})
                        await publish_event(session_id, "progress", {"node": name, "data": output})
                    elif name == "LangGraph":
                        # The root graph completed
                        output = event["data"].get("output", {})
                        if output and "report" in output:
                            final_report = output["report"]
                            final_sources = output.get("sources", [])

            # Persist report and update session status to completed
            async with get_pool().acquire() as conn:
                async with conn.transaction():
                    await conn.execute(
                        """INSERT INTO reports (id, session_id, content, word_count)
                           VALUES ($1, $2, $3, $4)""",
                        str(uuid.uuid4()), session_id, final_report, len(final_report.split())
                    )
                    await save_initial_report_version(conn, session_id, final_report)
                for source in final_sources:
                    await conn.execute(
                        """INSERT INTO report_sources
                           (id, session_id, source_number, url, title, snippet)
                           VALUES ($1, $2, $3, $4, $5, $6)""",
                        str(uuid.uuid4()), session_id,
                        source["id"], source["url"],
                        source["title"], source["snippet"]
                    )
                await conn.execute(
                    """UPDATE research_sessions
                       SET status='completed', completed_at=$1
                       WHERE id=$2""",
                    datetime.now(timezone.utc), session_id
                )

            # Notify frontend that we are completely done
            await publish_event(session_id, "complete", {"report": final_report, "sources": final_sources})

        except Exception as e:
            logger.error(f"Pipeline failed for session {session_id}: {e}", exc_info=True)
            async with get_pool().acquire() as conn:
                await conn.execute(
                    "UPDATE research_sessions SET status='failed' WHERE id=$1",
                    session_id
                )
            await publish_event(session_id, "error", {"detail": str(e)})

        finally:
            # Wait a moment to ensure frontend receives the final complete/error message before dropping queue
            await asyncio.sleep(2)
            remove_queue(session_id)


async def run_deep_research_pipeline(session_id: str, topic: str):
    from ..graph.deep_research.builder import build_deep_research_graph
    async with get_checkpointer() as checkpointer:
        graph = build_deep_research_graph(checkpointer)
        final_report = ""
        final_sources = []
        final_stats = {}

        # Node names we care about for SSE events
        tracked_nodes = {
            "planner", "research_sub_question", "reflector",
            "write_section", "merge_report", "verify_report",
            "deep_judge", "deep_route",
        }

        try:
            config = {"configurable": {"thread_id": session_id}}
            async for event in graph.astream_events({"topic": topic}, config=config, version="v2"):
                kind = event["event"]
                name = event["name"]

                # ── Node start events ─────────────────────────────────────────
                if kind == "on_chain_start" and name in tracked_nodes:
                    await publish_event(session_id, "node_start", {"node": name})

                # ── Node end events ───────────────────────────────────────────
                elif kind == "on_chain_end":
                    output = event["data"].get("output", {})

                    if name == "planner":
                        await publish_event(session_id, "node_end", {
                            "node": name,
                            "data": {
                                "sub_questions": output.get("sub_questions", []),
                                "research_round": output.get("research_round", 1),
                            }
                        })

                    elif name == "research_sub_question":
                        sub_results = output.get("sub_results", [{}])
                        sq = sub_results[0].get("sub_question", "") if sub_results else ""
                        original_sq_id = sub_results[0].get("original_sq_id", sq) if sub_results else sq
                        empty_reason = sub_results[0].get("empty_reason", "") if sub_results else ""
                        note_count = len(sub_results[0].get("notes", [])) if sub_results else 0
                        source_count = len(sub_results[0].get("sources", [])) if sub_results else 0
                        await publish_event(session_id, "node_end", {
                            "node": name,
                            "data": {
                                "sub_question": sq,
                                "original_sq_id": original_sq_id,
                                "empty_reason": empty_reason,
                                "source_count": source_count,
                                "note_count": note_count,
                            }
                        })

                    elif name == "reflector":
                        gaps_ledger = output.get("gaps", [])
                        open_gaps = [g["description"] for g in gaps_ledger if g.get("status") == "open"]
                        followups = output.get("followup_queries", [])

                        await publish_event(session_id, "node_end", {
                            "node": name,
                            "data": {
                                "gaps": open_gaps,
                                "followup_count": len(followups),
                                "followup_queries": [fq["query"] if isinstance(fq, dict) else fq for fq in followups],
                                "research_round": output.get("research_round", 1)
                            }
                        })

                    elif name == "write_section":
                        drafts = output.get("section_drafts", [{}])
                        sq = drafts[0].get("sub_question", "") if drafts else ""
                        wc = drafts[0].get("word_count", 0) if drafts else 0
                        await publish_event(session_id, "node_end", {
                            "node": name,
                            "data": {"sub_question": sq, "word_count": wc}
                        })

                    elif name == "merge_report":
                        await publish_event(session_id, "node_end", {
                            "node": name,
                            "data": output.get("stats", {}),
                        })

                    elif name == "verify_report":
                        await publish_event(session_id, "node_end", {
                            "node": name,
                            "data": output.get("stats", {}),
                        })

                    elif name == "deep_judge":
                        await publish_event(session_id, "scores", {
                            "node": name,
                            "data": output.get("scores", {}),
                        })

                    elif name == "deep_route":
                        await publish_event(session_id, "progress", {
                            "node": name,
                            "data": output,
                        })

                    elif name == "LangGraph":
                        if output and "report" in output:
                            final_report = output["report"]
                            final_sources = output.get("sources", [])
                            final_stats = output.get("stats", {})

            async with get_pool().acquire() as conn:
                async with conn.transaction():
                    await conn.execute(
                        """INSERT INTO reports (id, session_id, content, word_count)
                           VALUES ($1, $2, $3, $4)""",
                        str(uuid.uuid4()), session_id, final_report, len(final_report.split())
                    )
                    await save_initial_report_version(conn, session_id, final_report)
                for source in final_sources:
                    await conn.execute(
                        """INSERT INTO report_sources
                           (id, session_id, source_number, url, title, snippet)
                           VALUES ($1, $2, $3, $4, $5, $6)""",
                        str(uuid.uuid4()), session_id,
                        source.get("id", 0), source["url"],
                        source["title"], source["snippet"]
                    )
                await conn.execute(
                    """UPDATE research_sessions
                       SET status='completed', completed_at=$1
                       WHERE id=$2""",
                    datetime.now(timezone.utc), session_id
                )

            await publish_event(session_id, "complete", {
                "report": final_report,
                "sources": final_sources,
                "stats": final_stats,
            })

        except Exception as e:
            logger.error(f"Deep Research Pipeline failed for session {session_id}: {e}", exc_info=True)
            async with get_pool().acquire() as conn:
                await conn.execute(
                    "UPDATE research_sessions SET status='failed' WHERE id=$1",
                    session_id
                )
            await publish_event(session_id, "error", {"detail": str(e)})

        finally:
            await asyncio.sleep(2)
            remove_queue(session_id)


from ..core.auth import User, get_current_user
from ..core.rate_limit import get_rate_limiter

# ── CREATE ────────────────────────────────────────────────────────────────────
@router.post("", status_code=201)
async def create_session(request: Request, body: CreateSessionRequest, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    await get_rate_limiter(request).consume(user.id, "reports")
    session_id = str(uuid.uuid4())

    # Insert session row immediately so sidebar shows 'running'
    await db.execute(
        "INSERT INTO research_sessions (id, user_id, topic, status, mode) VALUES ($1, $2, $3, 'running', $4)",
        session_id, user.id, body.topic, body.mode
    )

    # Launch background task for graph execution
    if body.mode == "deep_research":
        background_tasks.add_task(run_deep_research_pipeline, session_id, body.topic)
    else:
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
async def stream_session(session_id: str, user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    # Verify session status first
    session = await db.fetchrow(
        "SELECT status FROM research_sessions WHERE id=$1 AND user_id=$2",
        session_id, user.id
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["status"] == "completed":
        # If it's already done, just emit one 'complete' event
        report = await db.fetchrow(
            "SELECT content FROM reports WHERE session_id=$1",
            session_id
        )

        async def quick_complete():
            yield format_sse_event("complete", {"report": dict(report)["content"] if report else ""})
        return EventSourceResponse(quick_complete())

    if session["status"] == "failed":
        async def quick_error():
            yield format_sse_event("error", {"detail": "Session previously failed."})
        return EventSourceResponse(quick_error())

    return EventSourceResponse(event_generator(session_id))


# ── LIST (sidebar) ────────────────────────────────────────────────────────────
@router.get("")
async def list_sessions(user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    rows = await db.fetch(
        """SELECT id, topic, status, mode, created_at
           FROM research_sessions
           WHERE user_id=$1
           ORDER BY created_at DESC
           LIMIT 50""",
           user.id
    )
    return [dict(r) for r in rows]


# ── GET ONE ───────────────────────────────────────────────────────────────────
@router.get("/{session_id}")
async def get_session(session_id: str, user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    session = await db.fetchrow(
        "SELECT * FROM research_sessions WHERE id=$1 AND user_id=$2",
        session_id, user.id
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    report = await db.fetchrow(
        "SELECT content, word_count, created_at FROM reports WHERE session_id=$1",
        session_id
    )

    sources = await db.fetch(
        """SELECT source_number, url, title, snippet
           FROM report_sources
           WHERE session_id=$1
           ORDER BY source_number ASC""",
        session_id
    )

    return {
        "session": dict(session),
        "report": dict(report) if report else None,
        "sources": [dict(s) for s in sources]
    }


@router.get("/{session_id}/report/versions")
async def get_report_versions(session_id: str, user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    session = await db.fetchrow(
        "SELECT id FROM research_sessions WHERE id=$1 AND user_id=$2",
        session_id, user.id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"versions": await list_report_versions(db, session_id)}


@router.post("/{session_id}/report/undo")
async def undo_report_version(session_id: str, user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    session = await db.fetchrow(
        "SELECT id FROM research_sessions WHERE id=$1 AND user_id=$2",
        session_id, user.id,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    restored, error = await restore_previous_report(db, session_id)
    if error:
        status_code = 404 if error.startswith("No report") else 409
        raise HTTPException(status_code=status_code, detail=error)
    return restored


# ── DELETE ────────────────────────────────────────────────────────────────────
@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: str, user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    # Verify ownership
    session = await db.fetchrow("SELECT id FROM research_sessions WHERE id=$1 AND user_id=$2", session_id, user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.execute("DELETE FROM reports WHERE session_id=$1", session_id)
    await db.execute("DELETE FROM research_sessions WHERE id=$1", session_id)
