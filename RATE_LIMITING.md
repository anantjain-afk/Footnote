# Rate limiting

Rate limiting is enforced per verified Supabase user over the preceding 60 minutes.
Normal and deep research plus the legacy report route share 10 requests. Both chat
POST routes share 30 requests across all sessions. Accepted requests count even
when processing fails or a client disconnects. Invalid/unauthorized requests do
not count. Reads, progress streams, and PDF export have no quota in this change.

## Phase 1: Configure Redis

Install dependencies with `uv pip install --python .venv/bin/python -r requirements.txt`.
The Redis 5.2.1 client pin preserves this project's existing PyJWT pin.

For local development, start Docker and run:

```sh
docker run --rm --name research-agent-redis -p 127.0.0.1:6379:6379 redis:7-alpine redis-server --save "" --appendonly no
```

Add these settings to `backend/.env` (preserve all existing keys):

```dotenv
REDIS_URL=redis://127.0.0.1:6379/0
RATE_LIMIT_KEY_PREFIX=research-agent:local
RATE_LIMIT_REPORTS=10
RATE_LIMIT_CHAT=30
RATE_LIMIT_WINDOW_SECONDS=3600
```

Production: use a private Redis-compatible service supporting Lua `EVAL`, `TIME`,
`ZREMRANGEBYSCORE`, `ZCARD`, `ZRANGE`, `ZADD`, and `PEXPIRE`. Use authenticated
`rediss://` with certificate verification for remote TLS connections. Configure
a distinct prefix per environment; every worker in one environment must share
its URL, prefix, and quota settings. Do not commit credentials. Prefer a dedicated
instance with a `noeviction` policy: evicting or flushing quota keys grants fresh
allowances. Persistence/HA are service configuration choices; loss of Redis data
resets usage history. No SQL migration is needed.

## Phase 2: Backend enforcement

| Quota | Routes | Default |
| --- | --- | --- |
| Reports | `POST /api/sessions`, `POST /api/report` | 10 / 3600 seconds |
| Chat | `POST /api/sessions/{id}/chat`, `POST /api/sessions/{id}/chat/stream` | 30 / 3600 seconds |

The server atomically prunes expired entries and admits a request using Redis
server time. Unique entry IDs preserve concurrent requests with equal timestamps.
Idle keys expire; rejected requests do not renew their lifetime. No automatic
Redis command retries are used, avoiding duplicate admission after ambiguous
network failures. Connection and operation timeouts are one second each.

HTTP 429 returns top-level `error`, `message`, `reset_in_seconds`, plus a
CORS-exposed `Retry-After` header. Reset timing means the next available slot,
not a full allowance reset. Chat rejects before opening an SSE response.

Missing configuration, Redis outages, timeouts, and Redis command errors return
503 on paid operations. There is no in-memory fallback. The app can start and
serve reads while Redis is unavailable; subsequent requests reconnect when Redis
recovers. Quota denials and storage failures are logged without credentials or
request content. Monitor 429 rates and alert on storage-unavailable warnings/503s.

## Phase 3: Frontend recovery

429 responses show a cooldown and disable submitting that quota while leaving
drafts editable. Cooldowns belong to the authenticated app, survive session
navigation, and clear on sign-out; reloads rely on server enforcement. Expiration
enables manual retry without making a request. Report retries preserve mode and
topic; rejected chat messages return to the composer without phantom history.
503 responses explain temporary unavailability and clear all loading indicators.

## Phase 4: Verify and roll out

Start Redis first, configure backend workers, deploy backend enforcement, then
ship frontend handling. Older clients still receive enforced 429/503 responses.
Verify with mocked providers or test accounts; production API requests spend quota
and may incur provider charges. Do not delete live quota keys to test resets.

```sh
# Auto-start an isolated local server, or supply a dedicated REDIS_TEST_URL.
REDIS_SERVER_BINARY=/path/to/redis-server uv run --no-project --python .venv/bin/python python -m unittest discover -s backend/tests -p 'test_*.py'
cd frontend
node --test tests/*.test.mjs
npm run build
npm run dev -- --host 127.0.0.1
```

With Vite running, from the repository root:

```sh
uv run --no-project --python .venv/bin/python python backend/tests/rate_limit_browser_check.py
uv run --no-project --python .venv/bin/python python backend/tests/auth_browser_check.py
```

Browser checks mock auth and API calls; they incur no provider charges. Screenshots
are written to `/tmp/rate-limit-*.png`. Redis tests use random prefixes, clean only
their own keys, and cover concurrency, expiry, shared routes/modes, user isolation,
auth/validation rejection, outages/recovery, and failed-work accounting. They skip
when neither a Redis server binary nor a test URL is configured; configure one in
CI so these checks actually run.
