"""Meetings CRUD API — /api/meetings"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting, Transcript, TranscriptLine, Summary, ActionItem
from schemas import (
    MeetingListItem,
    MeetingDetail,
    CreateMeetingRequest,
    UpdateMeetingRequest,
)
from services.transcript_parser import parse_transcript
from services.ai_processing import run_ai_pipeline

router = APIRouter(prefix="/meetings", tags=["meetings"])


def _participants_match(meeting: Meeting, needle: str) -> bool:
    needle = needle.lower()
    for p in meeting.participants or []:
        if needle in str(p.get("name", "")).lower():
            return True
    return False


def _to_list_item(meeting: Meeting, db: Session) -> MeetingListItem:
    total = db.query(func.count(ActionItem.id)).filter(ActionItem.meeting_id == meeting.id).scalar() or 0
    completed = (
        db.query(func.count(ActionItem.id))
        .filter(ActionItem.meeting_id == meeting.id, ActionItem.completed.is_(True))
        .scalar()
        or 0
    )
    has_summary = db.query(Summary.id).filter(Summary.meeting_id == meeting.id).first() is not None
    return MeetingListItem(
        id=meeting.id,
        title=meeting.title,
        date=meeting.date,
        duration_seconds=meeting.duration_seconds,
        participants=meeting.participants or [],
        status=meeting.status,
        has_summary=has_summary,
        action_items_count=total,
        action_items_completed=completed,
    )


@router.get("")
async def list_meetings(
    search: str | None = None,
    sort_by: str = Query("date", pattern="^(date|title)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    query = db.query(Meeting)

    if search:
        like = f"%{search.lower()}%"
        # Title match in SQL; participant match filtered in Python (JSON column).
        title_matches = query.filter(func.lower(Meeting.title).like(like)).all()
        all_meetings = db.query(Meeting).all()
        matched_ids = {m.id for m in title_matches}
        for m in all_meetings:
            if _participants_match(m, search):
                matched_ids.add(m.id)
        meetings = [m for m in all_meetings if m.id in matched_ids]
    else:
        meetings = query.all()

    reverse = order == "desc"
    if sort_by == "title":
        meetings.sort(key=lambda m: m.title.lower(), reverse=reverse)
    else:
        meetings.sort(key=lambda m: m.date, reverse=reverse)

    total = len(meetings)
    page = meetings[offset : offset + limit]
    return {
        "meetings": [_to_list_item(m, db) for m in page],
        "total": total,
    }


@router.get("/{meeting_id}", response_model=MeetingDetail)
async def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return MeetingDetail.model_validate(meeting)


@router.post("", response_model=MeetingDetail, status_code=201)
async def create_meeting(
    payload: CreateMeetingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    meeting = Meeting(
        title=payload.title,
        date=payload.date,
        participants=[p.model_dump() for p in payload.participants],
        status="ready",
        duration_seconds=0,
    )
    db.add(meeting)
    db.flush()

    has_transcript = bool(payload.transcript_text and payload.transcript_text.strip())
    if has_transcript:
        transcript = Transcript(meeting_id=meeting.id, raw_text=payload.transcript_text, language="en")
        db.add(transcript)
        db.flush()

        parsed = parse_transcript(payload.transcript_text, payload.transcript_file_type or "txt")
        word_count = 0
        last_end = 0.0
        for line in parsed:
            word_count += len(line["text"].split())
            last_end = max(last_end, line["timestamp_end"])
            db.add(
                TranscriptLine(
                    transcript_id=transcript.id,
                    speaker_name=line["speaker_name"],
                    speaker_id=line["speaker_id"],
                    timestamp_start=line["timestamp_start"],
                    timestamp_end=line["timestamp_end"],
                    text=line["text"],
                    line_index=line["line_index"],
                )
            )
        transcript.word_count = word_count
        meeting.duration_seconds = int(last_end) if last_end else 0
        meeting.status = "processing"

    db.commit()
    db.refresh(meeting)

    if has_transcript:
        background_tasks.add_task(run_ai_pipeline, meeting.id)

    return MeetingDetail.model_validate(meeting)


@router.patch("/{meeting_id}", response_model=MeetingDetail)
async def update_meeting(
    meeting_id: str,
    payload: UpdateMeetingRequest,
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if payload.title is not None:
        meeting.title = payload.title
    if payload.participants is not None:
        meeting.participants = [p.model_dump() for p in payload.participants]
    meeting.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(meeting)
    return MeetingDetail.model_validate(meeting)


@router.delete("/{meeting_id}", status_code=204)
async def delete_meeting(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    db.delete(meeting)
    db.commit()
    return None
