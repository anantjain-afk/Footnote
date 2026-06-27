from langgraph.graph import StateGraph
from typing import TypedDict , Annotated
import operator

class State(TypedDict):
    topic : str
    urls : Annotated[list[str], operator.add ,"The URLs to be searched" ]
    extracted_text : Annotated[str, operator.concat,"The text extracted from the URL" ]
    report : str 
    scores : Annotated[dict[str, float], operator.or_,"The scores for the extracted text" ]
    passed : bool
    failed_metrics: list[str]
    iterations: int

    

