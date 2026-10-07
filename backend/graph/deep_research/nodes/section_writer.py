import time
from langchain_core.messages import SystemMessage, HumanMessage
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from ....services.groq import llm
from ....core.logging import get_logger
from ..state import SectionWriterState

logger = get_logger(__name__)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def _invoke_llm(messages):
    return await llm.ainvoke(messages)


def _format_notes_for_writer(notes: list[dict]) -> str:
    """Format notes as an evidence block for the section writer."""
    if not notes:
        return "No notes available."

    parts = []
    for i, note in enumerate(notes, 1):
        parts.append(
            f"[NOTE {i}] (Source: {note['source_title']} — {note['source_url']})\n"
            f"  Claim: {note['claim']}\n"
            f"  Evidence: \"{note['evidence_quote']}\""
        )
    return "\n\n".join(parts)


async def write_section(state: SectionWriterState) -> dict:
    """Write one section of the report using only its sub-question's notes.

    Each section writer:
    - Receives only its sub-question's notes (~4K tokens)
    - Can write 600-1200 words without hitting token limits
    - Is told to ONLY state claims that appear in the notes
    """
    sub_q = state["sub_question"]
    notes = state.get("notes", [])
    parent_topic = state.get("parent_topic", "")
    start = time.time()

    logger.info(
        f"Writing section for: {sub_q}",
        extra={"node": "write_section", "note_count": len(notes)},
    )

    formatted_notes = _format_notes_for_writer(notes)

    messages = [
        SystemMessage(
            content="""You are a research writer. Write a detailed section for a research report.

GROUNDING RULES — these are absolute:
- You may ONLY state claims that appear in the provided notes
- Do not add inline citation markers. Sources are presented separately by the application.
- If you want to say something that is NOT in any note, do NOT write it
- Do NOT invent statistics, percentages, or specific numbers unless they appear verbatim in a note
- You may add brief connecting/transitional sentences without citations

WRITING RULES:
- Write 600-1200 words for this section
- Use markdown formatting with a ## heading based on the sub-question
- Write in confident, professional prose
- Do NOT start with "Based on the research" or similar meta-commentary
- Do NOT mention "notes" or "provided evidence" — write as if reporting directly"""
        ),
        HumanMessage(
            content=f"""Report topic: {parent_topic}
Section focus: {sub_q}

Available evidence:
{formatted_notes}

Write the section now."""
        ),
    ]

    response = await _invoke_llm(messages)
    word_count = len(response.content.split())
    duration = round((time.time() - start) * 1000)

    logger.info(
        f"Section written: {word_count} words",
        extra={"node": "write_section", "sub_question": sub_q, "duration_ms": duration},
    )

    return {
        "section_drafts": [{
            "sub_question": sub_q,
            "content": response.content,
            "word_count": word_count,
            "note_count": len(notes),
        }]
    }
