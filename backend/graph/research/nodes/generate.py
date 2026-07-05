from ....services.groq import llm 
from ..state import State

# pyrefly: ignore [missing-import]
from langchain_core.messages import SystemMessage , HumanMessage 

async def generate(state : State) -> dict :

    print('Generating the report..')
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

    user_prompt = f"""
        Write a comprehensive research report on the following topic: {state['topic']}

        Use the research data below as your knowledge base.

        ---
        {state['extracted_text']}
        ---

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
        List the key sources as bullet points (domain names or publication names only).

        Write the full report now.
    """

    failed = ", ".join(state.get("failed_metrics", []))
 
    prompt2 = f"""
    You previously wrote this report.

    Topic:
    {state["topic"]}

    Current report:
    {state.get("report", "No report generated yet.")}

    The following evaluation metrics were below 0.7:

    {failed}

    Revise the report to improve ONLY these aspects while preserving the strengths of the report.
    and only give the revised report in markdown format. Do not include any explanations or justifications for the changes made.
    or something like : "here is your revised report" .

    Return the complete revised report.
    """

    
    if len(state.get('failed_metrics',[])) == 0:
        response = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
])
    else : 
        response  = llm.invoke(prompt2)
    print('Generated report:', response.content)
    return {'report': response.content}

