"""Background AI pipeline — orchestrates AI calls and writes results to the DB.

This module bridges the pure AI functions in ai_service.py with the database.
It is invoked from FastAPI BackgroundTasks so AI work never blocks a request.
"""

import asyncio
import logging
from datetime import datetime, timezone

from database import SessionLocal
from models import Meeting, Transcript, Summary, ActionItem
from services import ai_service

logger = logging.getLogger("ai_processing")


def _build_transcript_text(transcript: Transcript) -> str:
    """Reconstruct a readable transcript string from its lines."""
    if transcript.raw_text and transcript.raw_text.strip():
        return transcript.raw_text
    parts = []
    for line in transcript.lines:
        ts = int(line.timestamp_start)
        stamp = f"[{ts // 3600:01d}:{(ts % 3600) // 60:02d}:{ts % 60:02d}]"
        parts.append(f"{stamp} {line.speaker_name}: {line.text}")
    return "\n".join(parts)


async def _process(meeting_id: str, regenerate: bool = False) -> None:
    db = SessionLocal()
    try:
        meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
        if not meeting:
            logger.warning("AI pipeline: meeting %s not found", meeting_id)
            return

        transcript = db.query(Transcript).filter(Transcript.meeting_id == meeting_id).first()
        if not transcript or not transcript.lines:
            logger.info("AI pipeline: meeting %s has no transcript, marking ready", meeting_id)
            meeting.status = "ready"
            db.commit()
            return

        meeting.status = "processing"
        db.commit()

        transcript_text = _build_transcript_text(transcript)

        # 1) Summary
        try:
            summary_data = await ai_service.generate_summary(transcript_text, meeting.title)
            existing = db.query(Summary).filter(Summary.meeting_id == meeting_id).first()
            if existing:
                existing.overview = summary_data.get("overview", "")
                existing.key_topics = summary_data.get("key_topics", [])
                existing.chapters = summary_data.get("chapters", [])
                existing.generated_by = (
                    ai_service.SUMMARY_MODEL if ai_service.ai_enabled() else "local-mock"
                )
                existing.generated_at = datetime.now(timezone.utc)
            else:
                db.add(
                    Summary(
                        meeting_id=meeting_id,
                        overview=summary_data.get("overview", ""),
                        key_topics=summary_data.get("key_topics", []),
                        chapters=summary_data.get("chapters", []),
                        generated_by=(
                            ai_service.SUMMARY_MODEL if ai_service.ai_enabled() else "local-mock"
                        ),
                    )
                )
            db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.error("AI pipeline summary failed for %s: %s", meeting_id, exc)

        # 2) Action items (skip if regenerating only the summary and items exist)
        try:
            existing_items = db.query(ActionItem).filter(ActionItem.meeting_id == meeting_id).count()
            if not existing_items or not regenerate:
                if not existing_items:
                    items = await ai_service.extract_action_items(
                        transcript_text, meeting.participants or []
                    )
                    for it in items:
                        db.add(
                            ActionItem(
                                meeting_id=meeting_id,
                                task=it.get("task", "").strip(),
                                owner=it.get("owner"),
                                due_date_hint=it.get("due_date_hint"),
                            )
                        )
                    db.commit()
        except Exception as exc:  # noqa: BLE001
            logger.error("AI pipeline action items failed for %s: %s", meeting_id, exc)

        meeting.status = "ready"
        db.commit()
        logger.info("AI pipeline complete for meeting %s", meeting_id)
    except Exception as exc:  # noqa: BLE001
        logger.error("AI pipeline crashed for %s: %s", meeting_id, exc)
        try:
            meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
            if meeting:
                meeting.status = "error"
                db.commit()
        except Exception:  # noqa: BLE001
            pass
    finally:
        db.close()


def run_ai_pipeline(meeting_id: str, regenerate: bool = False) -> None:
    """Sync entry point for BackgroundTasks — runs the async pipeline."""
    try:
        asyncio.run(_process(meeting_id, regenerate=regenerate))
    except RuntimeError:
        # An event loop is already running (rare in BackgroundTasks); use a new loop.
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(_process(meeting_id, regenerate=regenerate))
        finally:
            loop.close()
