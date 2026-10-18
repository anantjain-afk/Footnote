import time
from pydantic import BaseModel, Field
from ....services.groq import llm
from ....core.logging import get_logger
from ....core.config import settings
from ..state import State

from langchain_core.messages import SystemMessage, HumanMessage

logger = get_logger(__name__)


class JudgeScores(BaseModel):
    relevance: float = Field(ge=0, le=1, description="Score between 0.0 and 1.0 for relevance")
    depth: float = Field(ge=0, le=1, description="Score between 0.0 and 1.0 for depth of analysis")
    clarity: float = Field(ge=0, le=1, description="Score between 0.0 and 1.0 for clarity")
    language: float = Field(ge=0, le=1, description="Score between 0.0 and 1.0 for language and professionalism")
    format: float = Field(ge=0, le=1, description="Score between 0.0 and 1.0 for formatting")


async def judge(state: State) -> dict:
    """Evaluate report quality on all 5 metrics simultaneously."""
    start = time.time()

    system_prompt = """
    You are an expert on evaluating the quality of research reports. 
    Your task is to evaluate the quality of the report based on 5 metrics: 
    relevance, depth, clarity, language, and format.
    
    Criteria:
    1. Relevance: How well does the report address the topic?
    2. Depth: Does the report provide a thorough analysis of the topic?
    3. Clarity: Is the report clear and easy to understand?
    4. Language: Is the language used appropriate and professional?
    5. Format: Is the report well-structured and formatted correctly?

    Provide a score between 0.0 and 1.0 for each criterion, where 0.0 is the worst and 1.0 is the best.
    Return ONLY a valid JSON object matching the requested schema. Do not return any text other than the JSON.
    """

    user_prompt = f"""
    Topic: {state.get('topic')}
    Report: {state.get('report', 'No report generated yet.')}
    """

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]

    judge_llm = llm.with_structured_output(JudgeScores, method="json_schema")
    result = await judge_llm.ainvoke(messages)
    duration = round((time.time() - start) * 1000)

    logger.info(
        f"Judge scores: {result.model_dump()}",
        extra={"node": "judge", "scores": result.model_dump(), "duration_ms": duration},
    )
    return {"scores": result.model_dump()}


def route(state: State):
    """Identify failed metrics and increment iteration."""
    scores = state.get("scores", {})
    failed = [
        metric
        for metric, score in scores.items()
        if score < settings.judge_threshold
    ]

    iteration = state.get("iterations", 0) + 1

    logger.info(
        f"Route: iteration={iteration}, failed={failed}, scores={scores}",
        extra={
            "node": "route",
            "scores": scores,
        },
    )

    return {
        "failed_metrics": failed,
        "iterations": iteration,
    }