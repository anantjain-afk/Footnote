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
        You are a senior research analyst. You write authoritative, well-structured 
        research reports that read like they were written by a domain expert — 
        not by an AI summarizing web content.

        Rules you must follow without exception:
        - Never reference your source material directly. Do not say phrases like 
        "based on the information provided", "the text suggests", "according to 
        the content", "the extracted text", "the snippets", or any variation.
        - Write in confident, declarative prose. State findings as facts, not 
        observations about what the text says.
        - Never mention that you are an AI or that you generated this report.
        - Do not add a preamble before the report. Start directly with the title.
        - Do not add a closing note, disclaimer, or meta-commentary after the report.
    """

    if len(failed_metrics) == 0:
        # ── First generation ─────────────────────────────────────────────
        # Format extracted text with source attribution
        formatted_sources = "\n\n".join(
            f"--- Source {i+1} ({url}) ---\n{text}"
            for i, (text, url) in enumerate(
                zip(state["extracted_text"], state.get("urls", []))
            )
        )

        user_prompt = f"""
            Write a comprehensive research report on the following topic: {state['topic']}

            Use the research data below as your knowledge base.

            {formatted_sources}

            Structure the report in this exact format:

            # [Report Title]

            ## Executive Summary
            2-3 sentence overview of the most important findings.

            ## Introduction
            Context and background on why this topic matters right now.

            ## Key Findings
            ### [Finding 1 Title]
            ### [Finding 2 Title]
            ### [Finding 3 Title]
            (as many as the research supports)

            ## Analysis
            Synthesize the findings. Identify patterns, contradictions, or implications.

            ## Conclusion
            What this means going forward. Concrete takeaways.

            ## References
            List the key sources as bullet points with clickable URLs.
            URLs: {state['urls']}

            Write the full report now.
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

        messages = [HumanMessage(content=revision_prompt)]

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
