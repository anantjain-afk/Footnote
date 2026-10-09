"""Server-only access to encrypted per-user provider credentials."""

from uuid import UUID

import asyncpg
from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException

from .config import settings


DEEP_KEY_REQUIRED = (
    "Deep Research requires your own Firecrawl API key. "
    "Add yours in Settings → API Keys to use this mode."
)


def _cipher() -> Fernet:
    if not settings.firecrawl_key_encryption_key:
        raise HTTPException(503, "Firecrawl key storage is not configured.")
    try:
        return Fernet(settings.firecrawl_key_encryption_key.encode("ascii"))
    except (ValueError, TypeError, UnicodeEncodeError):
        raise HTTPException(503, "Firecrawl key storage is not configured.") from None


async def has_firecrawl_key(db: asyncpg.Connection, user_id: str) -> bool:
    return bool(await db.fetchval(
        "SELECT firecrawl_api_key IS NOT NULL FROM public.users WHERE id=$1",
        UUID(user_id),
    ))


async def save_firecrawl_key(db: asyncpg.Connection, user_id: str, raw_key: str) -> None:
    ciphertext = _cipher().encrypt(raw_key.encode("utf-8")).decode("ascii")
    await db.execute(
        """INSERT INTO public.users (id, firecrawl_api_key) VALUES ($1, $2)
           ON CONFLICT (id) DO UPDATE SET firecrawl_api_key=EXCLUDED.firecrawl_api_key""",
        UUID(user_id), ciphertext,
    )


async def remove_firecrawl_key(db: asyncpg.Connection, user_id: str) -> None:
    await db.execute(
        "UPDATE public.users SET firecrawl_api_key=NULL WHERE id=$1", UUID(user_id),
    )


async def resolve_firecrawl_key(db: asyncpg.Connection, user_id: str, mode: str) -> str:
    ciphertext = await db.fetchval(
        "SELECT firecrawl_api_key FROM public.users WHERE id=$1", UUID(user_id),
    )
    if ciphertext:
        try:
            return _cipher().decrypt(ciphertext.encode("ascii")).decode("utf-8")
        except (InvalidToken, ValueError, UnicodeEncodeError, UnicodeDecodeError):
            raise HTTPException(503, "Saved Firecrawl key could not be read.") from None
    if mode == "normal":
        return settings.firecrawl_api_key
    raise HTTPException(400, DEEP_KEY_REQUIRED)
