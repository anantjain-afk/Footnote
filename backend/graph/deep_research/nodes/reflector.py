import time
import uuid
from pydantic import BaseModel, Field
from langgraph.types import Send
from langchain_core.messages import SystemMessage, HumanMessage

from ....services.groq import llm
from ....core.logging import get_logger
from ....core.config import settings
from ..state import DeepResearchState

logger = get_logger(__name__)


# ── Structured output models ─────────────────────────────────────────────────

class GeneratedGap(BaseModel):
    sub_question_id: str = Field(description="Which original sub-question this gap relates to")
    description: str = Field(description="Description of the gap")
    suggested_query: str = Field(description="A specific search query to fill this gap")

class ReflectionResult(BaseModel):
    new_gaps: list[GeneratedGap] = Field(
        description="Genuinely new gaps. Empty if current claims meet requirements."
    )
    resolved_gap_ids: list[str] = Field(
        description="IDs of previous gaps that are now resolved by new claims."
    )


# ── Main node ─────────────────────────────────────────────────────────────────

async def reflector(state: DeepResearchState) -> dict:
    round_num = state.get("research_round", 1)
    max_rounds = state.get("max_research_rounds", settings.deep_max_research_rounds)
    all_notes = state.get("all_notes", [])
    all_sources = state.get("all_sources", [])
    ledger = state.get("gaps", [])
    original_sqs = state.get("sub_questions", [])
    
    start = time.time()
    
    # Check stop conditions internally to decide whether to prompt LLM
    sq_counts = {sq: 0 for sq in original_sqs}
    for n in all_notes:
        sq_id = n.get("sub_question")
        if sq_id in sq_counts:
            sq_counts[sq_id] += 1
            
    all_met = all(c >= settings.deep_target_claims_per_sq for c in sq_counts.values())
    sources_maxed = len(all_sources) >= settings.deep_max_sources_total
    rounds_maxed = round_num >= max_rounds
    
    logger.info(
        f"Reflector round {round_num}: {len(all_sources)} sources, {len(all_notes)} notes. "
        f"Sources maxed: {sources_maxed}, Rounds maxed: {rounds_maxed}, All SQ met: {all_met}",
        extra={"node": "reflector"}
    )
    
    if all_met or sources_maxed or rounds_maxed:
        logger.info("Stop conditions met. Skipping reflection LLM.")
        return {
            "research_round": 1,  # Increment here so routing logic sees the updated round
            "followup_queries": []
        }

    # Format current knowledge
    parts = []
    for sq in original_sqs:
        sq_notes = [n for n in all_notes if n.get("sub_question") == sq]
        claims = "\n".join(f"  - {n['claim']}" for n in sq_notes)
        parts.append(f"### {sq}\n({len(sq_notes)} claims)\n{claims or '  [No claims yet]'}")
    knowledge_map = "\n\n".join(parts)
    
    # Format open gaps from ledger
    open_gaps = [g for g in ledger if g["status"] == "open"]
    gaps_text = "\n".join(f"[{g['id']}] (For: {g['sub_question_id']}) {g['description']}" for g in open_gaps)
    
    messages = [
        SystemMessage(
            content=f"""You are a research director evaluating a report's progress. 

Rules:
1. Review the existing open gaps. If the current claims answer a gap, add its ID to resolved_gap_ids.
2. Target sub-questions that have fewer than {settings.deep_target_claims_per_sq} claims.
3. If you generate new gaps, ensure they are GENUINELY NEW and don't duplicate open ones.
4. Provide a highly specific suggested_query for each new gap."""
        ),
        HumanMessage(
            content=f"""Current Knowledge (Round {round_num}):
{knowledge_map}

Previous Open Gaps:
{gaps_text or 'None'}

Return resolved gap IDs and any new gaps."""
        ),
    ]

    structured_llm = llm.with_structured_output(ReflectionResult, method="json_schema")
    result = await structured_llm.ainvoke(messages)
    
    # Update Ledger
    updated_ledger = []
    for g in ledger:
        new_g = dict(g)
        if g["status"] == "open":
            new_g["attempts"] += 1
            if g["id"] in result.resolved_gap_ids:
                new_g["status"] = "resolved"
            elif new_g["attempts"] >= 2:
                new_g["status"] = "abandoned"  # Tried and failed, don't try again
        updated_ledger.append(new_g)
        
    # Add new gaps to ledger and prepare follow-ups
    followup_queries = []
    for ng in result.new_gaps:
        new_id = f"gap-{str(uuid.uuid4())[:6]}"
        updated_ledger.append({
            "id": new_id,
            "sub_question_id": ng.sub_question_id,
            "description": ng.description,
            "status": "open",
            "attempts": 0
        })
        followup_queries.append({
            "query": ng.suggested_query,
            "sub_question_id": ng.sub_question_id
        })

    duration = round((time.time() - start) * 1000)
    logger.info(
        f"Reflection done: {len(result.new_gaps)} new gaps, {len(result.resolved_gap_ids)} resolved.",
        extra={"node": "reflector", "duration_ms": duration}
    )

    return {
        "gaps": updated_ledger,
        "followup_queries": followup_queries,
        "research_round": 1
    }


# ── Conditional edge ──────────────────────────────────────────────────────────

def reflector_routing(state: DeepResearchState):
    followup_queries = state.get("followup_queries", [])
    # round_num is already incremented by reflector node before we get here!
    round_num = state.get("research_round", 1)
    max_rounds = state.get("max_research_rounds", settings.deep_max_research_rounds)
    all_sources = state.get("all_sources", [])
    seen_urls = [s["url"] for s in all_sources]
    
    # If we have queries AND we haven't exceeded the max round we are allowed to START
    if followup_queries and round_num <= max_rounds:
        remaining_budget = max(1, settings.deep_max_sources_total - len(all_sources))
        budget_per_sq = max(1, remaining_budget // len(followup_queries))
        
        logger.info(
            f"Routing to follow-up research ({len(followup_queries)} queries, round {round_num})",
            extra={"node": "reflector_routing"},
        )
        return [
            Send("research_sub_question", {
                "sub_question": fq["query"],
                "parent_topic": state["topic"],
                "original_sq_id": fq["sub_question_id"],
                "is_followup": True,
                "seen_urls": seen_urls,
                "budget": budget_per_sq
            })
            for fq in followup_queries
        ]

    # Proceed to section writing
    logger.info("Routing to section writing", extra={"node": "reflector_routing"})
    all_notes = state.get("all_notes", [])
    source_map = {src["url"]: src for src in all_sources}
    
    original_sqs = state.get("sub_questions", [])
    sends = []

    for sq in original_sqs:
        # Notes are now explicitly tied to original_sq_id
        sq_notes = [n for n in all_notes if n.get("sub_question") == sq]
        sq_source_urls = set(n["source_url"] for n in sq_notes)
        sq_sources = [source_map[url] for url in sq_source_urls if url in source_map]

        sends.append(Send("write_section", {
            "sub_question": sq,
            "notes": sq_notes,
            "sources": sq_sources,
            "parent_topic": state["topic"],
        }))

    return sends
