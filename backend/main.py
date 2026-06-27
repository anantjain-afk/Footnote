from .api.report import router as report_router
from fastapi import FastAPI

app = FastAPI()

app.include_router(report_router, prefix="/api")


@app.get("/")
def root():
    return {
        "message": "Research Agent API is running!"
    }