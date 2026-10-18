from pydantic import BaseModel, Field
from langgraph.types import Send
from langchain_core.messages import SystemMessage, HumanMessage
from ....services.groq import llm
from ....core.logging import get_logger
from ....core.config import settings
from ..state import DeepResearchState

logger = get_logger(__name__)


class SubQuestions(BaseModel):
    questions: list[str] = Field(description="3-5 focused, non-overlapping sub-questions")


async def planner(state: DeepResearchState) -> dict:
    """Decompose topic into focused sub-questions via LLM."""
    topic = state["topic"]
    logger.info(
        f"Decomposing topic into sub-questions",
        extra={"node": "planner", "topic": topic},
    )

    messages = [
        SystemMessage(
            content="""You are a research planner. Break the user's research topic into 3-5 focused, non-overlapping sub-questions that would comprehensively cover the topic.

Rules:
- Each question should target a distinct aspect (e.g., technology, economics, societal impact, challenges, future outlook)
- Questions should be specific enough to search for, not vague
- Together they should cover the topic comprehensively
- Keep each question to 1-2 sentences"""
        ),
        HumanMessage(content=f"Topic: {topic}"),
    ]

    structured_llm = llm.with_structured_output(SubQuestions, method="json_schema")
    result = await structured_llm.ainvoke(messages)

    logger.info(
        f"Generated {len(result.questions)} sub-questions",
        extra={"node": "planner", "sub_questions": result.questions},
    )

    return {
        "sub_questions": result.questions,
        "research_round": 1,
        "max_research_rounds": settings.deep_max_research_rounds,
        "gaps": [],
    }


def fan_out_sub_questions(state: DeepResearchState) -> list[Send]:
    """Conditional edge: emit one Send per sub-question → parallel fan-out."""
    # Split budget equally among initial sub-questions
    budget_per_sq = max(1, settings.deep_max_sources_total // max(1, len(state["sub_questions"])))
    
    return [
        Send(
            "research_sub_question",
            {
                "sub_question": sq, 
                "parent_topic": state["topic"],
                "original_sq_id": sq,
                "is_followup": False,
                "seen_urls": [],
                "budget": budget_per_sq,
            },
        )
        for sq in state["sub_questions"]
    ]
