"""Atomic, shared rolling quotas for authenticated paid operations."""
import logging
import math
from typing import Literal
from uuid import uuid4

from fastapi import Request
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from redis.exceptions import RedisError
from redis.backoff import NoBackoff
from redis.asyncio.retry import Retry

from .config import settings

logger = logging.getLogger(__name__)
Quota = Literal["reports", "chat"]

# One atomic check/admission; rejected attempts neither add entries nor renew TTL.
ADMIT_SCRIPT = """
local clock = redis.call('TIME')
local now = clock[1] * 1000 + math.floor(clock[2] / 1000)
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
if redis.call('ZCARD', KEYS[1]) >= limit then
    local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
    return math.max(1, math.ceil((tonumber(oldest[2]) + window - now) / 1000))
end
redis.call('ZADD', KEYS[1], now, ARGV[3])
redis.call('PEXPIRE', KEYS[1], window)
return 0
"""


class RateLimitError(Exception):
    def __init__(self, status: int, message: str, retry_after: int = 0):
        self.status = status
        self.message = message
        self.retry_after = retry_after


async def rate_limit_error_handler(request: Request, exc: RateLimitError):
    body = {
        "error": "Rate limit exceeded" if exc.status == 429 else "Temporarily unavailable",
        "message": exc.message,
    }
    headers = {}
    if exc.status == 429:
        body["reset_in_seconds"] = exc.retry_after
        headers["Retry-After"] = str(exc.retry_after)
    return JSONResponse(body, status_code=exc.status, headers=headers)


class RateLimiter:
    def __init__(self, client, prefix: str, reports: int, chat: int, window_seconds: int):
        self.client = client
        self.prefix = prefix
        self.limits = {"reports": reports, "chat": chat}
        self.window_seconds = window_seconds

    async def consume(self, user_id: str, quota: Quota):
        try:
            if self.client is None:
                raise ConnectionError("Redis is not configured")
            delay = int(await self.client.eval(
                ADMIT_SCRIPT, 1, f"{self.prefix}:rate-limit:{quota}:{user_id}",
                self.window_seconds * 1000, self.limits[quota], uuid4().hex,
            ))
        except (RedisError, ConnectionError, OSError, TimeoutError):
            # Do not log exception text: connection errors may contain credentials.
            logger.warning("Rate limit storage unavailable quota=%s", quota)
            raise RateLimitError(503, "Generation and chat are temporarily unavailable. Please try again shortly.") from None
        if delay:
            logger.info("Rate limit denied quota=%s", quota)
            action = "generate" if quota == "reports" else "send"
            noun = "reports" if quota == "reports" else "chat messages"
            period = "hour" if self.window_seconds == 3600 else f"{self.window_seconds} seconds"
            minutes = math.ceil(delay / 60)
            wait = f"{minutes} minute{'s' if minutes != 1 else ''}"
            raise RateLimitError(429, f"You can {action} {self.limits[quota]} {noun} per {period}. Try again in {wait}.", delay)


def create_rate_limiter():
    client = None
    if settings.redis_url:
        try:
            client = Redis.from_url(
                settings.redis_url, socket_connect_timeout=1, socket_timeout=1,
                max_connections=50, retry=Retry(NoBackoff(), 0),
            )
        except (ValueError, RedisError):
            logger.warning("Invalid rate limit storage configuration")
    return RateLimiter(client, settings.rate_limit_key_prefix, settings.rate_limit_reports,
                       settings.rate_limit_chat, settings.rate_limit_window_seconds)


def get_rate_limiter(request: Request) -> RateLimiter:
    return request.app.state.rate_limiter
