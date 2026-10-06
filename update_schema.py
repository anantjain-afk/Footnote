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
            "ALTER TABLE report_sources ADD COLUMN IF NOT EXISTS snippet TEXT"
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
