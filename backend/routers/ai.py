"""AI API — /api/ai/* plus meeting status polling."""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting, Transcript, Summary, ActionItem
from schemas import (
    ProcessTranscriptRequest,
    AskQuestionRequest,
    MeetingStatusResponse,
)
from services.ai_processing import run_ai_pipeline, _build_transcript_text
from services import ai_service

router = APIRouter(tags=["ai"])


@router.get("/ai/status")
async def ai_status():
    """Check whether the NVIDIA API key is configured and recognised."""
    enabled = ai_service.ai_enabled()
    key = ai_service.NVIDIA_API_KEY
    return {
        "ai_enabled": enabled,
        "key_prefix": key[:12] + "..." if key else None,
        "models": {
            "summary": ai_service.SUMMARY_MODEL,
            "actions": ai_service.ACTION_MODEL,
            "qa": ai_service.QA_MODEL,
        } if enabled else None,
    }


@router.post("/ai/process-transcript")
async def process_transcript(
    payload: ProcessTranscriptRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    meeting = db.query(Meeting).filter(Meeting.id == payload.meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting.status = "processing"
    db.commit()

    background_tasks.add_task(run_ai_pipeline, payload.meeting_id, False)
    return {"status": "queued"}


@router.post("/ai/ask")
async def ask(payload: AskQuestionRequest, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == payload.meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    transcript = db.query(Transcript).filter(Transcript.meeting_id == payload.meeting_id).first()
    transcript_text = _build_transcript_text(transcript) if transcript else ""

    async def event_stream():
        try:
            async for chunk in ai_service.ask_question(
                transcript_text, payload.question, payload.conversation_history
            ):
                # SSE frames; escape newlines so multi-line chunks stay one event.
                safe = chunk.replace("\r", "").replace("\n", "\\n")
                yield f"data: {safe}\n\n"
        except Exception as exc:  # noqa: BLE001
            yield f"data: [error] {exc}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/meetings/{meeting_id}/status", response_model=MeetingStatusResponse)
async def meeting_status(meeting_id: str, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    summary_ready = db.query(Summary.id).filter(Summary.meeting_id == meeting_id).first() is not None
    action_count = db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).count()

    return MeetingStatusResponse(
        meeting_id=meeting_id,
        status=meeting.status,
        summary_ready=summary_ready,
        action_items_count=action_count,
    )
