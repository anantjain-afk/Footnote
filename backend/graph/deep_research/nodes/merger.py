import time
import re
from langchain_core.messages import SystemMessage, HumanMessage
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from ....services.groq import llm
from ....core.logging import get_logger
from ....core.exceptions import LLMError
from ..state import DeepResearchState

logger = get_logger(__name__)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def _invoke_llm(messages):
    return await llm.ainvoke(messages)


def _build_global_source_list(all_sources: list[dict]) -> tuple[list[dict], dict[str, int]]:
    """Deduplicate sources by URL and assign global IDs.

    Returns:
        - global_sources: deduplicated list with 'id' field added
        - url_to_id: mapping from URL → global ID
    """
    url_to_id: dict[str, int] = {}
    global_sources: list[dict] = []
    current_id = 1

    for src in all_sources:
        url = src.get("url", "")
        if url not in url_to_id:
            src_with_id = {**src, "id": current_id}
            global_sources.append(src_with_id)
            url_to_id[url] = current_id
            current_id += 1

    return global_sources, url_to_id


def _remap_note_citations(section_content: str, notes: list[dict], url_to_id: dict[str, int]) -> str:
    """Replace [NOTE N] citations with global [N] source IDs."""
    # Find all [NOTE X] and [NOTE X,Y] patterns
    def replace_note_ref(match):
        note_refs = match.group(1)
        global_ids = []
        for ref in note_refs.split(","):
            ref = ref.strip()
            try:
                note_idx = int(ref) - 1  # NOTE refs are 1-indexed
                if 0 <= note_idx < len(notes):
                    source_url = notes[note_idx].get("source_url", "")
                    global_id = url_to_id.get(source_url)
                    if global_id and global_id not in global_ids:
                        global_ids.append(global_id)
            except (ValueError, IndexError):
                pass

        if global_ids:
            return "[" + ",".join(str(gid) for gid in global_ids) + "]"
        return match.group(0)

    return re.sub(r"\[NOTE\s+([\d,\s]+)\]", replace_note_ref, section_content)


def _format_reference_list(global_sources: list[dict]) -> str:
    """Format the global source list as a numbered reference section."""
    lines = []
    for src in global_sources:
        lines.append(f"[{src['id']}] {src['title']} — {src['url']}")
    return "\n".join(lines)


def _get_latest_drafts(section_drafts: list[dict]) -> list[dict]:
    """Deduplicate section drafts, keeping only the latest draft per sub_question."""
    seen: dict[str, dict] = {}
    for draft in section_drafts:
        seen[draft["sub_question"]] = draft
    return list(seen.values())


async def merge_report(state: DeepResearchState) -> dict:
    """Merge section drafts into a complete report with exec summary + intro + references.

    First-generation: Combines section drafts and writes intro/summary/conclusion.
    Revision: Uses failed_metrics feedback to improve the existing report.
    """
    start = time.time()
    failed_metrics = state.get("failed_metrics", [])
    all_sources = state.get("all_sources", [])
    all_notes = state.get("all_notes", [])

    # Build global source list
    global_sources, url_to_id = _build_global_source_list(all_sources)

    if not failed_metrics:
        # ── First-generation: combine section drafts ─────────────────────
        section_drafts = _get_latest_drafts(state.get("section_drafts", []))

        logger.info(
            f"Merging {len(section_drafts)} section drafts into report",
            extra={"node": "merge_report", "source_count": len(global_sources)},
        )

        # Group notes by sub_question for citation remapping
        notes_by_sq: dict[str, list[dict]] = {}
        for note in all_notes:
            sq = note.get("sub_question", "")
            if sq not in notes_by_sq:
                notes_by_sq[sq] = []
            notes_by_sq[sq].append(note)

        # Remap [NOTE N] → [global_id] in each section
        remapped_sections = []
        for draft in section_drafts:
            sq = draft["sub_question"]
            sq_notes = notes_by_sq.get(sq, [])
            remapped = _remap_note_citations(draft["content"], sq_notes, url_to_id)
            remapped_sections.append(remapped)

        combined_sections = "\n\n".join(remapped_sections)
        reference_list = _format_reference_list(global_sources)

        messages = [
            SystemMessage(
                content="""You are a senior editor assembling a research report from pre-written sections.

Your job is to write ONLY:
1. A title heading (# Topic)
2. An Executive Summary (## Executive Summary) — 200-300 words synthesizing the key findings
3. A brief Introduction (## Introduction) — 150-200 words framing the topic and what the report covers

Then include ALL the pre-written sections EXACTLY AS PROVIDED — do NOT rewrite, rephrase, or remove any content from them. Preserve every [N] citation.

After the sections, write:
4. A Conclusion (## Conclusion) — 150-200 words on implications and future outlook
5. A References section (## References) with the provided reference list

Rules:
- Do NOT alter the section content
- Do NOT add claims not present in the sections
- Preserve all [N] citations exactly as they appear
- Do not add a preamble or meta-commentary
- Start directly with the title"""
            ),
            HumanMessage(
                content=f"""Topic: {state['topic']}

Pre-written sections:
{combined_sections}

Reference list:
{reference_list}

Assemble the complete report now."""
            ),
        ]

        try:
            response = await _invoke_llm(messages)
            report = response.content
        except Exception as e:
            logger.error(f"Report merge failed: {e}")
            raise LLMError(f"Failed to merge report: {e}")

    else:
        # ── Revision: improve existing report ────────────────────────────
        failed = ", ".join(failed_metrics)
        logger.info(
            f"Revising report (failed metrics: {failed})",
            extra={"node": "merge_report"},
        )

        messages = [
            SystemMessage(
                content="""You are a senior editor revising a research report. The report was evaluated and specific metrics failed.

Rules:
- Improve ONLY the aspects mentioned in the failed metrics
- Preserve all [N] citations
- If groundedness failed: remove or soften any claims that seem invented (add "reportedly" or remove entirely)
- If coverage failed: ensure every sub-question gets a substantive section
- If coherence failed: improve transitions between sections
- Return the complete revised report in markdown format"""
            ),
            HumanMessage(
                content=f"""Topic: {state["topic"]}

Current report:
{state.get("report", "No report generated yet.")}

Failed evaluation metrics: {failed}

Sub-questions that should be covered: {state.get("sub_questions", [])}

Revise the report to fix these issues."""
            ),
        ]

        try:
            response = await _invoke_llm(messages)
            report = response.content
        except Exception as e:
            logger.error(f"Report revision failed: {e}")
            raise LLMError(f"Failed to revise report: {e}")

    # ── Compute stats ────────────────────────────────────────────────────
    word_count = len(report.split())
    unique_domains = len(set(src.get("domain", "") for src in global_sources))

    duration = round((time.time() - start) * 1000)
    logger.info(
        f"Report merged: {word_count} words, {len(global_sources)} sources, {unique_domains} domains",
        extra={"node": "merge_report", "duration_ms": duration},
    )

    return {
        "report": report,
        "sources": global_sources,
        "stats": {
            "total_sources": len(global_sources),
            "unique_domains": unique_domains,
            "word_count": word_count,
            "research_rounds": state.get("research_round", 1),
            "notes_count": len(all_notes),
        },
    }
