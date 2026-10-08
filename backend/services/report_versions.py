import uuid

import asyncpg


async def _ensure_baseline_version(db: asyncpg.Connection, session_id: str):
    await db.execute(
        """INSERT INTO report_versions
             (id, session_id, version_number, content, word_count, change_prompt, version_type, created_at)
           SELECT $1, r.session_id, 1, r.content, COALESCE(r.word_count, 0),
                  'Original report', 'original', COALESCE(r.created_at, NOW())
           FROM reports r
           WHERE r.session_id=$2
             AND NOT EXISTS (
               SELECT 1 FROM report_versions rv WHERE rv.session_id=r.session_id
             )
           ON CONFLICT (session_id, version_number) DO NOTHING""",
        str(uuid.uuid4()), session_id,
    )


async def save_initial_report_version(db: asyncpg.Connection, session_id: str, content: str):
    """Save the original report version alongside a newly inserted report."""
    await db.execute(
        """INSERT INTO report_versions
             (id, session_id, version_number, content, word_count, change_prompt, version_type)
           VALUES ($1, $2, 1, $3, $4, 'Original report', 'original')
           ON CONFLICT (session_id, version_number) DO NOTHING""",
        str(uuid.uuid4()), session_id, content, len(content.split()),
    )


async def append_report_version(
    db: asyncpg.Connection,
    session_id: str,
    content: str,
    change_prompt: str,
):
    """Atomically update the current report and append a changed revision."""
    async with db.transaction():
        current = await db.fetchrow(
            "SELECT content FROM reports WHERE session_id=$1 FOR UPDATE", session_id
        )
        if not current:
            return None

        await _ensure_baseline_version(db, session_id)
        if content == current["content"]:
            return None

        version_number = await db.fetchval(
            "SELECT COALESCE(MAX(version_number), 0) + 1 FROM report_versions WHERE session_id=$1",
            session_id,
        )
        row = await db.fetchrow(
            """INSERT INTO report_versions
                 (id, session_id, version_number, content, word_count, change_prompt, version_type)
               VALUES ($1, $2, $3, $4, $5, $6, 'improve')
               RETURNING id, version_number, content, word_count, change_prompt, version_type, created_at""",
            str(uuid.uuid4()), session_id, version_number, content,
            len(content.split()), change_prompt,
        )
        await db.execute(
            "UPDATE reports SET content=$1, word_count=$2 WHERE session_id=$3",
            content, len(content.split()), session_id,
        )
        return dict(row)


async def list_report_versions(db: asyncpg.Connection, session_id: str):
    await _ensure_baseline_version(db, session_id)
    versions = await db.fetch(
        """SELECT id, version_number, content, word_count, change_prompt,
                  version_type, restored_from_version, created_at
           FROM report_versions WHERE session_id=$1 ORDER BY version_number ASC""",
        session_id,
    )
    return [dict(row) for row in versions]
