from .api.report import router as report_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import init_db
from .api.sessions import router as sessions_router
app = FastAPI()


# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.on_event("startup")
def startup():
    init_db()

app.include_router(sessions_router , prefix="/api")
app.include_router(report_router, prefix="/api")


@app.get("/")
def root():
    return {
        "message": "Research Agent API is running!"
    }