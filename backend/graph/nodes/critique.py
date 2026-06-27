from pydantic import BaseModel, Field

from ...services.groq import llm
from ..state import State

class Judge1Scores(BaseModel):
    relevance: float = Field(ge=0, le=1)
    depth: float = Field(ge=0, le=1)

def judge_1(state : State) -> dict :
    print('judgin on the basis of relevance and depth of analysis')
    prompt = f"""
    You are a expert on evaluating the quality of research reports. 
    Your task is the evaluate the quality of the report based on relevance to the topic, clarity ,
    depth of the analysis. 
    
    The report should be evaluated based on the following criteria:
    1. Relevance: How well does the report address the topic?
    2. Depth of Analysis: Does the report provide a thorough analysis of the topic?


    provide a score between 0 and 1 for each criteria, where 0 is the worst and 1 is the best.
    here is the topic  : {state.get('topic')}
    here is the report {state.get('report', 'No report generated yet.')}
    Return ONLY the structured output.
    """

    judge_llm = llm.with_structured_output(Judge1Scores)
    result = judge_llm.invoke(prompt)
    print('Judge 1 scores:', result.model_dump())
    return {'judge_1_scores': result.model_dump()}


class Judge2Scores(BaseModel):
    clarity: float = Field(ge=0, le=1)
    language: float = Field(ge=0, le=1)
    format: float = Field(ge=0, le=1)


def judge_2(state : State) -> dict :
    print('judging on the basis of clarity, language and format')
    prompt = f"""
    You are a expert on evaluating the quality of research reports. 
    Your task is the evaluate the quality of the report based on clarity, language, and format. 
    
    The report should be evaluated based on the following criteria:
    1. Clarity: Is the report clear and easy to understand?
    2. Language: Is the language used in the report appropriate and professional?
    3. Format: Is the report well-structured and formatted correctly?

    provide a score between 0 and 1 for each criteria, where 0 is the worst and 1 is the best.
    here is the topic  : {state.get('topic')}
    here is the report {state.get('report', 'No report generated yet.')}
    Return ONLY the structured output.
    """

    judge_llm = llm.with_structured_output(Judge2Scores)

    result = judge_llm.invoke(prompt)
    print('Judge 2 scores:', result.model_dump())
    return {'judge_2_scores': result.model_dump()}



def route(state: State):
    print('Routing based on scores and iterations')
    THRESHOLD = 0.7
    scores = {
        **state.get("judge_1_scores", {}),
        **state.get("judge_2_scores", {}),
    }
    failed = [
        metric
        for metric, score in scores.items()
        if score < THRESHOLD
    ]
    print('Failed metrics:', failed)

    return {
        "scores": scores,
        "failed_metrics": failed,
        "iterations": state.get("iterations", 0) + 1,
    }