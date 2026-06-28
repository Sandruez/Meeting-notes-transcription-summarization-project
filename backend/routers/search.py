"""Global search API — /api/search

Searches meeting titles and transcript line text, returning grouped results
with context snippets around each match.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting, Transcript, TranscriptLine
from schemas import SearchResult

router = APIRouter(tags=["search"])


def _snippet(text: str, needle: str, radius: int = 50) -> str:
    low = text.lower()
    idx = low.find(needle.lower())
    if idx == -1:
        return text[: radius * 2]
    start = max(0, idx - radius)
    end = min(len(text), idx + len(needle) + radius)
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(text) else ""
    return f"{prefix}{text[start:end]}{suffix}"


@router.get("/search", response_model=list[SearchResult])
async def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    needle = q.strip()
    like = f"%{needle.lower()}%"
    results: list[SearchResult] = []

    # 1) Title matches
    title_matches = (
        db.query(Meeting)
        .filter(func.lower(Meeting.title).like(like))
        .order_by(Meeting.date.desc())
        .limit(limit)
        .all()
    )
    for m in title_matches:
        results.append(
            SearchResult(
                meeting_id=m.id,
                meeting_title=m.title,
                meeting_date=m.date,
                match_type="title",
                matched_text=m.title,
                context=m.title,
            )
        )

    # 2) Transcript line matches
    line_matches = (
        db.query(TranscriptLine, Meeting)
        .join(Transcript, TranscriptLine.transcript_id == Transcript.id)
        .join(Meeting, Transcript.meeting_id == Meeting.id)
        .filter(func.lower(TranscriptLine.text).like(like))
        .order_by(Meeting.date.desc())
        .limit(limit)
        .all()
    )
    for line, meeting in line_matches:
        results.append(
            SearchResult(
                meeting_id=meeting.id,
                meeting_title=meeting.title,
                meeting_date=meeting.date,
                match_type="transcript",
                matched_text=line.text,
                context=_snippet(line.text, needle),
            )
        )

    return results[: limit * 2]
