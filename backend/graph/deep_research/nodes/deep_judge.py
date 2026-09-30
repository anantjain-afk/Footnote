import time
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage

from ....services.groq import llm
from ....core.logging import get_logger
from ....core.config import settings
from ..state import DeepResearchState

logger = get_logger(__name__)


# ── Structured output models ─────────────────────────────────────────────────

class DeepJudgeScores(BaseModel):
    coverage: float = Field(
        ge=0, le=1,
        description="Does every sub-question get a substantive section? (not just a paragraph)"
    )
    groundedness: float = Field(
        ge=0, le=1,
        description="Are claims backed by cited sources, or do they read like LLM general knowledge?"
    )
    coherence: float = Field(
        ge=0, le=1,
        description="Does the report flow as one unified piece despite section-by-section writing?"
    )
    contradiction_handling: float = Field(
        ge=0, le=1,
        description="When sources disagree, does the report acknowledge and discuss it?"
    )
    depth: float = Field(
        ge=0, le=1,
        description="Does the analysis go beyond listing facts into interpretation and implications?"
    )


# ── Judge node ────────────────────────────────────────────────────────────────

async def deep_judge(state: DeepResearchState) -> dict:
    """Evaluate the deep research report with a rubric specific to deep research.

    Unlike the normal judge (relevance, clarity, language, format), this scores:
    - Coverage: every sub-question addressed
    - Groundedness: claims backed by sources
    - Coherence: unified report flow
    - Contradiction handling: conflicting findings discussed
    - Depth: beyond surface-level facts
    """
    start = time.time()
    report = state.get("report", "")
    sub_questions = state.get("sub_questions", [])
    stats = state.get("stats", {})

    logger.info(
        f"Deep judge evaluating report",
        extra={"node": "deep_judge", "word_count": stats.get("word_count", 0)},
    )

    messages = [
        SystemMessage(
            content="""You are an expert evaluator for deep research reports.

Score the report on 5 criteria, each 0.0 to 1.0:

1. **Coverage** (0.0-1.0): Does every listed sub-question get a substantive section (not just a paragraph)? Are important aspects of the topic missing?

2. **Groundedness** (0.0-1.0): Do the claims feel anchored in specific sources, or do they read like generic LLM knowledge? Look for:
   - Specific numbers/stats with citations → high groundedness
   - Vague claims like "experts agree" without citations → low groundedness
   - Invented-sounding percentages → low groundedness

3. **Coherence** (0.0-1.0): Does the report read as one unified piece? Good transitions between sections? Or does it feel like disconnected chunks?

4. **Contradiction handling** (0.0-1.0): If sources disagree on something, does the report acknowledge this and discuss both perspectives? Or does it present one view as fact?

5. **Depth** (0.0-1.0): Does the analysis interpret and synthesize findings, or just list facts? Does it discuss implications, trade-offs, and nuances?

Return ONLY a valid JSON object matching the requested schema."""
        ),
        HumanMessage(
            content=f"""Topic: {state.get('topic', '')}

Sub-questions that should be covered:
{chr(10).join(f'- {sq}' for sq in sub_questions)}

Report:
{report[:8000]}

Evaluate now."""
        ),
    ]

    judge_llm = llm.with_structured_output(DeepJudgeScores, method="json_schema")
    result = await judge_llm.ainvoke(messages)

    duration = round((time.time() - start) * 1000)
    scores = result.model_dump()

    logger.info(
        f"Deep judge scores: {scores}",
        extra={"node": "deep_judge", "scores": scores, "duration_ms": duration},
    )

    return {"scores": scores}


# ── Route node ────────────────────────────────────────────────────────────────

def deep_route(state: DeepResearchState) -> dict:
    """Identify failed metrics and increment iteration counter."""
    scores = state.get("scores", {})
    threshold = settings.deep_judge_threshold
    failed = [metric for metric, score in scores.items() if score < threshold]
    iteration = state.get("iterations", 0) + 1

    logger.info(
        f"Deep route: iteration={iteration}, failed={failed}, scores={scores}",
        extra={"node": "deep_route", "scores": scores},
    )

    return {
        "failed_metrics": failed,
        "iterations": iteration,
    }


# ── Conditional edge ──────────────────────────────────────────────────────────

def should_continue_deep(state: DeepResearchState) -> str:
    """Decide whether to revise or finish."""
    if not state.get("failed_metrics"):
        logger.info(
            "All deep research metrics passed — finishing",
            extra={"node": "should_continue_deep"},
        )
        return "finish"

    if state.get("iterations", 0) >= settings.deep_max_revisions:
        logger.info(
            f"Max revisions ({settings.deep_max_revisions}) reached — finishing",
            extra={"node": "should_continue_deep"},
        )
        return "finish"

    logger.info(
        f"Failed metrics detected — revising (iteration {state.get('iterations', 0)})",
        extra={"node": "should_continue_deep"},
    )
    return "revise"
