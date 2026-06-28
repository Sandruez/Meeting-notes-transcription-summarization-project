"""Summaries API — /api/meetings/{meeting_id}/summary"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting, Summary
from schemas import SummarySchema
from services.ai_processing import run_ai_pipeline

router = APIRouter(prefix="/meetings", tags=["summaries"])


@router.get("/{meeting_id}/summary", response_model=SummarySchema)
async def get_summary(meeting_id: str, db: Session = Depends(get_db)):
    summary = db.query(Summary).filter(Summary.meeting_id == meeting_id).first()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not yet generated")
    return SummarySchema.model_validate(summary)


@router.post("/{meeting_id}/summary/regenerate")
async def regenerate_summary(
    meeting_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting.status = "processing"
    db.commit()

    background_tasks.add_task(run_ai_pipeline, meeting_id, True)
    return {"status": "processing", "message": "Summary regeneration started"}
