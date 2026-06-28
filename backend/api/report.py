from fastapi import APIRouter
from pydantic import BaseModel
from ..graph.builder import graph

router = APIRouter()

class ReportRequest(BaseModel):
    topic : str

@router.post('/report')
def create_report(request: ReportRequest):

    result = graph.invoke({
        "topic": request.topic,
        
    }, config = {"run_name": "create_report" })

    return result