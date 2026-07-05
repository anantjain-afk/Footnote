from typing import TypedDict, Annotated
import operator

class State(TypedDict):
    topic: str
    urls: Annotated[list[str], operator.add]
    extracted_text: Annotated[list[str], operator.add]
    report: str
    judge_1_scores: dict[str, float]
    judge_2_scores: dict[str, float]
    scores: dict[str, float]
    passed: bool
    failed_metrics: list[str]
    iterations: int

    

