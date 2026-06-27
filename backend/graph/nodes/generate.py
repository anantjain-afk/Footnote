from ...services.groq import llm 
from ..state import State
def generate(state : State) -> dict :


    prompt1 = f"""
    You are a expert research assistant. Your task is to generate a report based on the extracted text. 
    The report should be well-structured, concise, and provide a comprehensive overview of the topic.
    The report should be in markdown format and should include the following sections:
    1. Introduction: Provide a brief introduction to the topic.
    2. Key Findings: Summarize the key findings from the extracted text.
    3. Conclusion: Provide a conclusion based on the key findings.
    The report should be based on the following extracted text:
    {state['extracted_text']}
    """

    prompt2 = failed = ", ".join(state["failed_metrics"])

    prompt = f"""
    You previously wrote this report.

    Topic:
    {state["topic"]}

    Current report:
    {state["report"]}

    The following evaluation metrics were below 0.7:

    {failed}

    Revise the report to improve ONLY these aspects while preserving the strengths of the report.

    Return the complete revised report.
    """

    
    if state['failed_metrics'].length == 0:
        response = llm.invoke(prompt1)
    else : 
        response  = llm.invoke(prompt2)
  
    return {'report': response.text}

