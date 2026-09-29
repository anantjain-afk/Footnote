import time
from ....services.groq import llm
from ....core.logging import get_logger
from ....core.exceptions import LLMError
from ..state import State
from langchain_core.messages import SystemMessage, HumanMessage
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = get_logger(__name__)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def _invoke_llm(messages):
    """LLM invocation with retry — always async."""
    return await llm.ainvoke(messages)


async def generate(state: State) -> dict:
    """Generate or revise the research report using the LLM."""
    start = time.time()
    failed_metrics = state.get("failed_metrics", [])
    iteration = state.get("iterations", 0)

    logger.info(
        f"Generating report (iteration {iteration})",
        extra={"node": "generate", "topic": state["topic"]},
    )

    system_prompt = """
        You are a senior research analyst writing an authoritative research report.
        You are given numbered source documents.

        CITATION RULES — follow without exception:
        - After every factual claim, statistic, or named entity, add the citation number in square brackets immediately before the period: "AI adoption grew 40% in 2025 [1]."
        - Use [1,2] when a claim is supported by multiple sources
        - Only cite a source if it directly supports that claim
        - If a claim has no source, either remove it or soften it with "reportedly" or "some analysts suggest"
        - At the end of the report, include a ## References section:
          [1] Title — URL
          [2] Title — URL
        - Never write "based on the sources" or "according to the provided text" — write in confident declarative prose.
        - Never mention that you are an AI or that you generated this report.
        - Do not add a preamble before the report. Start directly with the title.
        - Do not add a closing note, disclaimer, or meta-commentary after the report.
    """

    if len(failed_metrics) == 0:
        # ── First generation ─────────────────────────────────────────────
        # Format extracted text with source attribution
        formatted_sources = "\n".join(
            f"[SOURCE {source['id']}]\nTitle: {source['title']}\nURL: {source['url']}\nContent: {source['snippet']}\n---"
            for source in state.get("sources", [])
        )

        user_prompt = f"""
            Write a comprehensive research report on: {state['topic']}

            Available sources:
            {formatted_sources}

            Report structure:
            # {state['topic']}
            ## Executive Summary
            ## Introduction
            ## Key Findings
            ## Analysis
            ## Conclusion
            ## References

            Write the full report with inline citations now.
        """

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]
    else:
        # ── Revision pass ────────────────────────────────────────────────
        failed = ", ".join(failed_metrics)
        revision_prompt = f"""
        You previously wrote this report.

        Topic:
        {state["topic"]}

        Current report:
        {state.get("report", "No report generated yet.")}

        The following evaluation metrics were below 0.7:

        {failed}

        Revise the report to improve ONLY these aspects while preserving the strengths of the report.
        Return the complete revised report in markdown format only.
        """

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=revision_prompt),
        ]

    try:
        response = await _invoke_llm(messages)
        duration = round((time.time() - start) * 1000)

        logger.info(
            f"Report generated ({len(response.content)} chars)",
            extra={"node": "generate", "duration_ms": duration},
        )
        return {"report": response.content}

    except Exception as e:
        logger.error(
            f"Report generation failed: {e}",
            extra={"node": "generate", "error": str(e)},
        )
        raise LLMError(f"Failed to generate report: {e}")
