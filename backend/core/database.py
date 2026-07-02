import sqlite3
from contextlib import contextmanager
from datetime import datetime

DB_PATH = "backend/research_agent.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
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

            CREATE INDEX IF NOT EXISTS idx_sessions_created
                ON research_sessions(created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_reports_session
                ON reports(session_id);
        """)
    print("✅ Database initialized")