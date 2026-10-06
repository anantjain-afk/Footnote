import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

async def main():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    try:
        tables = await conn.fetch("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        for t in tables:
            print("Table:", t['table_name'])
            cols = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name = $1", t['table_name'])
            for c in cols:
                print("  -", c['column_name'])
    except Exception as e:
        print("Error:", e)
    finally:
        await conn.close()

asyncio.run(main())
