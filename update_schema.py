import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

async def main():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    try:
        queries = [
            "ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS topic TEXT",
            "ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS status TEXT",
            "ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS mode TEXT",
            "ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ",
            
            "ALTER TABLE reports ADD COLUMN IF NOT EXISTS word_count INTEGER",
            
            "ALTER TABLE report_sources ADD COLUMN IF NOT EXISTS session_id UUID",
            "ALTER TABLE report_sources ADD COLUMN IF NOT EXISTS source_number INTEGER",
            "ALTER TABLE report_sources ADD COLUMN IF NOT EXISTS snippet TEXT",

            """CREATE TABLE IF NOT EXISTS report_versions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
                version_number INTEGER NOT NULL,
                content TEXT NOT NULL,
                word_count INTEGER NOT NULL,
                change_prompt TEXT,
                version_type TEXT NOT NULL DEFAULT 'improve',
                restored_from_version INTEGER,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (session_id, version_number)
            )""",
            """INSERT INTO report_versions
                (id, session_id, version_number, content, word_count, change_prompt, version_type, created_at)
               SELECT gen_random_uuid(), r.session_id, 1, r.content,
                      COALESCE(r.word_count, CASE WHEN length(trim(r.content)) = 0 THEN 0
                          ELSE cardinality(regexp_split_to_array(trim(r.content), '\\s+')) END, 0),
                      'Original report', 'original', COALESCE(r.created_at, NOW())
               FROM reports r
               WHERE NOT EXISTS (
                   SELECT 1 FROM report_versions rv WHERE rv.session_id=r.session_id
               )
               ON CONFLICT (session_id, version_number) DO NOTHING""",
            "CREATE INDEX IF NOT EXISTS report_versions_session_created_idx ON report_versions(session_id, version_number DESC)"
        ]
        for q in queries:
            print("Executing:", q)
            await conn.execute(q)
            
        print("Schema updated successfully.")
    except Exception as e:
        print("Error:", e)
    finally:
        await conn.close()

asyncio.run(main())
