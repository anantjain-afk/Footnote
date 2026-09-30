from typing import TypedDict, Annotated, Literal
import operator

class Gap(TypedDict):
    id: str
    sub_question_id: str
    description: str
    status: Literal["open", "resolved", "abandoned"]
    attempts: int

class DeepResearchState(TypedDict):
    topic: str
    sub_questions: list[str]

    # ── Research data (fan-in via operator.add) ──────────────────────────
    sub_results: Annotated[list[dict], operator.add]
    all_notes: Annotated[list[dict], operator.add]      # structured notes
    all_sources: Annotated[list[dict], operator.add]     # accumulated sources

    # ── Reflection loop ─────────────────────────────────────────────────
    research_round: Annotated[int, operator.add]
    max_research_rounds: int
    gaps: list[Gap]  # The gap ledger
    followup_queries: list[dict] # {query, sub_question_id}

    # ── Writing ─────────────────────────────────────────────────────────
    section_drafts: Annotated[list[dict], operator.add]
    report: str
    sources: list[dict]     # final deduplicated source list for DB

    # ── Evaluation ──────────────────────────────────────────────────────
    scores: dict[str, float]
    failed_metrics: list[str]
    iterations: int

    # ── Stats for UI ────────────────────────────────────────────────────
    stats: dict


class SubQuestionState(TypedDict):
    """Input state for each parallel mini-agent (via Send)."""
    sub_question: str
    parent_topic: str
    original_sq_id: str  # To map it back to a specific sub-question for coverage tracking
    is_followup: bool
    seen_urls: list[str]
    budget: int  # max sources to scrape in this branch


class SectionWriterState(TypedDict):
    """Input state for each parallel section writer (via Send)."""
    sub_question: str
    notes: list[dict]
    sources: list[dict]
    parent_topic: str
