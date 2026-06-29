"""Highlights API — POST /api/meetings/{meeting_id}/highlights"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting, TranscriptLine, Highlight

router = APIRouter(prefix="/meetings", tags=["highlights"])


class CreateHighlightRequest(BaseModel):
    transcript_line_id: str
    note: str | None = None
    color: str = "yellow"


@router.post("/{meeting_id}/highlights", status_code=201)
async def create_highlight(
    meeting_id: str,
    payload: CreateHighlightRequest,
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    line = db.query(TranscriptLine).filter(
        TranscriptLine.id == payload.transcript_line_id
    ).first()
    if not line:
        raise HTTPException(status_code=404, detail="Transcript line not found")

    highlight = Highlight(
        transcript_line_id=payload.transcript_line_id,
        meeting_id=meeting_id,
        note=payload.note,
        color=payload.color,
    )
    db.add(highlight)
    db.commit()
    db.refresh(highlight)
    return {"id": highlight.id, "color": highlight.color, "created_at": highlight.created_at}


@router.get("/{meeting_id}/highlights")
async def list_highlights(meeting_id: str, db: Session = Depends(get_db)):
    highlights = db.query(Highlight).filter(Highlight.meeting_id == meeting_id).all()
    return [
        {
            "id": h.id,
            "transcript_line_id": h.transcript_line_id,
            "note": h.note,
            "color": h.color,
            "created_at": h.created_at,
        }
        for h in highlights
    ]
