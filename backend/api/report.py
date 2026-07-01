from fastapi import APIRouter
from pydantic import BaseModel
from ..graph.builder import graph

router = APIRouter()

class ReportRequest(BaseModel):
    topic : str

@router.post('/report')
async def create_report(request: ReportRequest):

    result = await graph.ainvoke({
        "topic": request.topic,
        
    }, config = {"run_name": "create_report" })

    return result