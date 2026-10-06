import logging
from fastapi import Request, APIRouter, HTTPException, Depends
from pydantic import BaseModel
from ..graph.research.builder import graph
import uuid
from fastapi.responses import FileResponse
from ..services.pdf.renderer import generate_pdf

logger = logging.getLogger(__name__)
router = APIRouter()

class ReportRequest(BaseModel):
    topic : str

from ..core.auth import User, get_current_user
from ..core.rate_limit import get_rate_limiter

@router.post('/report')
async def create_report(http_request: Request, request: ReportRequest, user: User = Depends(get_current_user)):

    await get_rate_limiter(http_request).consume(user.id, "reports")
    result = await graph.ainvoke({
        "topic": request.topic,
        
    }, config = {"run_name": "create_report" })

    return result


class ExportRequest(BaseModel):
    topic: str
    report: str   # raw markdown from frontend
    sources: list[dict] = []

@router.post("/report/export")
async def export_pdf(body: ExportRequest, user: User = Depends(get_current_user)):
    # use /tmp so you don't accumulate PDFs on disk
    filename = f"report_{uuid.uuid4().hex[:8]}.pdf"
    output_path = f"/tmp/{filename}"

    try:
        await generate_pdf(
            topic=body.topic,
            report_md=body.report,
            output_path=output_path,
            sources=body.sources
        )
    except Exception as e:
        logger.error("PDF generation failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    return FileResponse(
        path=output_path,
        media_type="application/pdf",
        filename=f"research-{body.topic[:30].replace(' ', '-')}.pdf",
        background=None     # keep file alive until response is sent
    )