import time
from pydantic import BaseModel, Field
from ....services.groq import llm
from ....core.logging import get_logger
from ....core.config import settings
from ..state import State

logger = get_logger(__name__)


# ── Judge 1: Relevance + Depth ────────────────────────────────────────────────

class Judge1Scores(BaseModel):
    relevance: float = Field(ge=0, le=1)
    depth: float = Field(ge=0, le=1)


async def judge_1(state: State) -> dict:
    """Evaluate report quality on relevance and depth of analysis."""
    start = time.time()

    prompt = f"""
    You are an expert on evaluating the quality of research reports. 
    Your task is to evaluate the quality of the report based on relevance to the topic 
    and depth of the analysis.
    
    Criteria:
    1. Relevance: How well does the report address the topic?
    2. Depth of Analysis: Does the report provide a thorough analysis of the topic?

    Provide a score between 0 and 1 for each criterion, where 0 is the worst and 1 is the best.
    Topic: {state.get('topic')}
    Report: {state.get('report', 'No report generated yet.')}
    Return ONLY the structured output.
    """

    judge_llm = llm.with_structured_output(Judge1Scores, method="json_schema")
    result = await judge_llm.ainvoke(prompt)
    duration = round((time.time() - start) * 1000)

    logger.info(
        f"Judge 1 scores: {result.model_dump()}",
        extra={"node": "judge_1", "scores": result.model_dump(), "duration_ms": duration},
    )
    return {"judge_1_scores": result.model_dump()}


# ── Judge 2: Clarity + Language + Format ──────────────────────────────────────

class Judge2Scores(BaseModel):
    clarity: float = Field(ge=0, le=1)
    language: float = Field(ge=0, le=1)
    format: float = Field(ge=0, le=1)


async def judge_2(state: State) -> dict:
    """Evaluate report quality on clarity, language, and format."""
    start = time.time()

    prompt = f"""
    You are an expert on evaluating the quality of research reports. 
    Your task is to evaluate the quality of the report based on clarity, language, 
    and format.
    
    Criteria:
    1. Clarity: Is the report clear and easy to understand?
    2. Language: Is the language used appropriate and professional?
    3. Format: Is the report well-structured and formatted correctly?

    Provide a score between 0 and 1 for each criterion, where 0 is the worst and 1 is the best.
    Topic: {state.get('topic')}
    Report: {state.get('report', 'No report generated yet.')}
    Return ONLY the structured output.
    """

    judge_llm = llm.with_structured_output(Judge2Scores, method="json_schema")
    result = await judge_llm.ainvoke(prompt)
    duration = round((time.time() - start) * 1000)

    logger.info(
        f"Judge 2 scores: {result.model_dump()}",
        extra={"node": "judge_2", "scores": result.model_dump(), "duration_ms": duration},
    )
    return {"judge_2_scores": result.model_dump()}


# ── Route: Aggregate scores and decide ────────────────────────────────────────

def route(state: State):
    """Aggregate judge scores, identify failed metrics, and increment iteration."""
    scores = {
        **state.get("judge_1_scores", {}),
        **state.get("judge_2_scores", {}),
    }
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
        "scores": scores,
        "failed_metrics": failed,
        "iterations": iteration,
    }