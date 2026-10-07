from .api.report import router as report_router
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from .core.database import init_db_pool, close_db_pool
from .api.sessions import router as sessions_router
from .api.chat import router as chat_router
from contextlib import asynccontextmanager
from .core.rate_limit import create_rate_limiter, RateLimitError, rate_limit_error_handler

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db_pool()
    limiter = create_rate_limiter()
    app.state.rate_limiter = limiter
    try:
        yield
    finally:
        try:
            if limiter.client is not None:
                await limiter.client.aclose()
        finally:
            await close_db_pool()

app = FastAPI(lifespan=lifespan)
app.add_exception_handler(RateLimitError, rate_limit_error_handler)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After"],
)

app.include_router(chat_router , prefix = '/api') 
app.include_router(sessions_router , prefix="/api")
app.include_router(report_router, prefix="/api")


@app.get("/health/ready")
async def readiness(request: Request):
    """Quota dependency readiness; does not invoke providers or consume quota."""
    try:
        await request.app.state.rate_limiter.check_available()
    except RateLimitError:
        return JSONResponse(
            {"status": "unavailable", "checks": {"rate_limit": "unavailable"}},
            status_code=503,
        )
    return {"status": "ready", "checks": {"rate_limit": "ready"}}


@app.get("/")
def root():
    return {
        "message": "Research Agent API is running!"
    }
