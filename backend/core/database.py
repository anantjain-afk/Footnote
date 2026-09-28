import sqlite3
from contextlib import contextmanager
from .config import settings
from .logging import get_logger

logger = get_logger(__name__)


def get_connection():
    conn = sqlite3.connect(settings.db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

@contextmanager
def get_db():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        conn.executescript("""
            -- existing tables ...
            CREATE TABLE IF NOT EXISTS research_sessions (
                id           TEXT PRIMARY KEY,
                topic        TEXT NOT NULL,
                status       TEXT DEFAULT 'running',
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME
            );

            CREATE TABLE IF NOT EXISTS reports (
                id          TEXT PRIMARY KEY,
                session_id  TEXT NOT NULL REFERENCES research_sessions(id),
                content     TEXT NOT NULL,
                word_count  INTEGER,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id          TEXT PRIMARY KEY,
                session_id  TEXT NOT NULL REFERENCES research_sessions(id),
                role        TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content     TEXT NOT NULL,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_created
                ON research_sessions(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_reports_session
                ON reports(session_id);
            CREATE INDEX IF NOT EXISTS idx_chat_session
                ON chat_messages(session_id, created_at ASC);
        """)
    logger.info("Database initialized", extra={"node": "startup"})