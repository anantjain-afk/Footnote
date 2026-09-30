import time
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage

from ....services.groq import llm
from ....core.logging import get_logger
from ..state import DeepResearchState

logger = get_logger(__name__)


# ── Structured output models ─────────────────────────────────────────────────

class FlaggedClaim(BaseModel):
    sentence: str = Field(description="The sentence from the report containing the claim")
    cited_source: str = Field(description="The source cited in the sentence")
    reason: str = Field(description="Why this claim is not supported: 'no matching note', 'quote doesn't support claim', etc.")

class VerificationResult(BaseModel):
    verified_claims_pct: float = Field(
        ge=0, le=1,
        description="Fraction of cited claims that are supported by the source notes (0.0 to 1.0)"
    )
    flagged_claims: list[FlaggedClaim] = Field(
        description="Claims that are not adequately supported by the source notes (max 10)"
    )


def _format_notes_for_verification(notes: list[dict]) -> str:
    """Format notes as a ground-truth reference for the verifier."""
    parts = []
    for note in notes:
        parts.append(
            f"Source: {note['source_title']} ({note['source_url']})\n"
            f"  Claim: {note['claim']}\n"
            f"  Evidence: \"{note['evidence_quote']}\""
        )
    return "\n\n".join(parts)


# ── Main node ─────────────────────────────────────────────────────────────────

async def verify_report(state: DeepResearchState) -> dict:
    """Check cited claims in the report against the source notes.

    The verifier:
    1. Reads the report and the accumulated research notes
    2. For each cited claim, checks if a matching note with a supporting
       evidence_quote exists
    3. Returns a verified_claims_pct and a list of flagged claims
    4. Does NOT rewrite the report (avoids truncation issues)

    The stats are passed to the deep judge and shown in the UI.
    """
    start = time.time()
    report = state.get("report", "")
    all_notes = state.get("all_notes", [])

    logger.info(
        f"Verifying report claims against {len(all_notes)} notes",
        extra={"node": "verify_report"},
    )

    notes_text = _format_notes_for_verification(all_notes)

    messages = [
        SystemMessage(
            content="""You are a fact-checker. Your job is to verify the claims in a research report against the source notes (ground truth).

For each sentence in the report that contains a [N] citation:
1. Find a note from that source that supports the claim
2. Check if the note's evidence_quote actually supports what the sentence says
3. If the claim is NOT supported by any note, flag it

A claim is "supported" if:
- There exists a note whose claim or evidence_quote semantically matches the sentence's claim
- The source URL/title matches the citation

A claim should be "flagged" if:
- The cited source has no notes that support the specific claim
- The sentence states something more specific than what the notes contain (e.g., invents a percentage)
- The sentence attributes information to the wrong source

Report the overall verified_claims_pct and list up to 10 flagged claims.
If the report has strong grounding, verified_claims_pct should be high (>0.8)."""
        ),
        HumanMessage(
            content=f"""Report:
{report[:6000]}

Source notes (ground truth):
{notes_text[:6000]}

Verify the claims now."""
        ),
    ]

    try:
        verify_llm = llm.with_structured_output(VerificationResult, method="json_schema")
        result = await verify_llm.ainvoke(messages)

        duration = round((time.time() - start) * 1000)
        logger.info(
            f"Verification done: {result.verified_claims_pct:.0%} verified, {len(result.flagged_claims)} flagged",
            extra={"node": "verify_report", "duration_ms": duration},
        )

        return {
            "stats": {
                **state.get("stats", {}),
                "verified_claims_pct": round(result.verified_claims_pct, 2),
                "flagged_count": len(result.flagged_claims),
            }
        }
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        # Non-fatal: if verification fails, proceed with unknown status
        return {
            "stats": {
                **state.get("stats", {}),
                "verified_claims_pct": -1,  # -1 = verification failed
                "flagged_count": 0,
            }
        }
