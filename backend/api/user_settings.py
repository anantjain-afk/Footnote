"""Authenticated user settings; credential values never leave this API."""

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request

from ..core.auth import User, get_current_user
from ..core.database import get_db
from ..core.user_settings import has_firecrawl_key, remove_firecrawl_key, save_firecrawl_key

router = APIRouter(prefix="/user/settings")


@router.get("")
async def get_settings(user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    return {"has_firecrawl_key": await has_firecrawl_key(db, user.id)}


@router.post("")
async def update_settings(request: Request, user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    # Parse this credential manually: validation errors must never echo its input.
    try:
        body = await request.json()
    except ValueError:
        raise HTTPException(400, "Enter a valid Firecrawl API key.") from None
    raw_key = body.get("firecrawl_api_key") if isinstance(body, dict) else None
    if not isinstance(raw_key, str):
        raise HTTPException(400, "Enter a valid Firecrawl API key.")
    key = raw_key.strip()
    if not key or len(key) > 512 or any(char.isspace() for char in key):
        raise HTTPException(400, "Enter a valid Firecrawl API key.")
    await save_firecrawl_key(db, user.id, key)
    return {"has_firecrawl_key": True}


@router.delete("/firecrawl")
async def delete_firecrawl_key(user: User = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    await remove_firecrawl_key(db, user.id)
    return {"has_firecrawl_key": False}
