"""Action items API — nested under /api/meetings/{meeting_id}/action-items"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Meeting, ActionItem
from schemas import (
    ActionItemSchema,
    CreateActionItemRequest,
    UpdateActionItemRequest,
)

router = APIRouter(prefix="/meetings", tags=["action_items"])


def _get_meeting_or_404(meeting_id: str, db: Session) -> Meeting:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("/{meeting_id}/action-items", response_model=ActionItemSchema, status_code=201)
async def create_action_item(
    meeting_id: str,
    payload: CreateActionItemRequest,
    db: Session = Depends(get_db),
):
    _get_meeting_or_404(meeting_id, db)
    item = ActionItem(
        meeting_id=meeting_id,
        task=payload.task,
        owner=payload.owner,
        due_date_hint=payload.due_date_hint,
        completed=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ActionItemSchema.model_validate(item)


@router.patch("/{meeting_id}/action-items/{item_id}", response_model=ActionItemSchema)
async def update_action_item(
    meeting_id: str,
    item_id: str,
    payload: UpdateActionItemRequest,
    db: Session = Depends(get_db),
):
    item = (
        db.query(ActionItem)
        .filter(ActionItem.id == item_id, ActionItem.meeting_id == meeting_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")

    if payload.task is not None:
        item.task = payload.task
    if payload.owner is not None:
        item.owner = payload.owner
    if payload.due_date_hint is not None:
        item.due_date_hint = payload.due_date_hint
    if payload.completed is not None:
        item.completed = payload.completed

    db.commit()
    db.refresh(item)
    return ActionItemSchema.model_validate(item)


@router.delete("/{meeting_id}/action-items/{item_id}", status_code=204)
async def delete_action_item(
    meeting_id: str,
    item_id: str,
    db: Session = Depends(get_db),
):
    item = (
        db.query(ActionItem)
        .filter(ActionItem.id == item_id, ActionItem.meeting_id == meeting_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    db.delete(item)
    db.commit()
    return None
