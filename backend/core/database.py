import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from .config import settings
from .logging import get_logger

logger = get_logger(__name__)

pool: asyncpg.Pool = None

async def init_db_pool():
    global pool
    logger.info("Initializing Postgres connection pool...")
    try:
        pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=5,
            max_size=20,
            command_timeout=60,
        )
        logger.info("Postgres connection pool initialized.", extra={"node": "startup"})
    except Exception as e:
        logger.error(f"Failed to initialize Postgres pool: {e}", extra={"node": "startup"})
        raise

async def close_db_pool():
    global pool
    if pool:
        await pool.close()
        logger.info("Postgres connection pool closed.", extra={"node": "shutdown"})

async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    async with get_pool().acquire() as connection:
        yield connection

def get_pool() -> asyncpg.Pool:
    if pool is None:
        raise RuntimeError("Database pool is not initialized")
    return pool

@asynccontextmanager
async def get_checkpointer():
    # LangGraph requires a psycopg connection, not the asyncpg application pool.
    from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
    async with AsyncPostgresSaver.from_conn_string(settings.database_url) as checkpointer:
        await checkpointer.setup()
        yield checkpointer
