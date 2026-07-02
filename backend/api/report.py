from fastapi import APIRouter
from pydantic import BaseModel
from ..graph.builder import graph
import uuid
from fastapi.responses import FileResponse
from ..services.pdf.renderer import generate_pdf
router = APIRouter()

class ReportRequest(BaseModel):
    topic : str

@router.post('/report')
async def create_report(request: ReportRequest):

    result = await graph.ainvoke({
        "topic": request.topic,
        
    }, config = {"run_name": "create_report" })

    return result


class ExportRequest(BaseModel):
    topic: str
    report: str   # raw markdown from frontend

@router.post("/report/export")
async def export_pdf(body: ExportRequest):
    # use /tmp so you don't accumulate PDFs on disk
    filename = f"report_{uuid.uuid4().hex[:8]}.pdf"
    output_path = f"/tmp/{filename}"

    await generate_pdf(
        topic=body.topic,
        report_md=body.report,
        output_path=output_path
    )

    return FileResponse(
        path=output_path,
        media_type="application/pdf",
        filename=f"research-{body.topic[:30].replace(' ', '-')}.pdf",
        background=None     # keep file alive until response is sent
    )