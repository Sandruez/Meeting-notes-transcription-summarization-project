from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class Participant(BaseModel):
    name: str
    email: Optional[str] = None


class TranscriptLineSchema(BaseModel):
    id: str
    speaker_name: str
    speaker_id: str
    timestamp_start: float
    timestamp_end: float
    text: str
    line_index: int

    model_config = {"from_attributes": True}


class TranscriptDetailSchema(BaseModel):
    id: str
    raw_text: str
    word_count: int
    lines: list[TranscriptLineSchema] = []

    model_config = {"from_attributes": True}


class SummarySchema(BaseModel):
    id: str
    overview: str
    key_topics: list[str] = []
    chapters: list[dict] = []
    generated_by: str
    generated_at: datetime

    model_config = {"from_attributes": True}


class ActionItemSchema(BaseModel):
    id: str
    task: str
    owner: Optional[str] = None
    due_date_hint: Optional[str] = None
    completed: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class MeetingListItem(BaseModel):
    id: str
    title: str
    date: datetime
    duration_seconds: int
    participants: list[Participant] = []
    status: str
    has_summary: bool = False
    action_items_count: int = 0
    action_items_completed: int = 0

    model_config = {"from_attributes": True}


class MeetingDetail(BaseModel):
    id: str
    title: str
    date: datetime
    duration_seconds: int
    participants: list[Participant] = []
    status: str
    created_at: datetime
    updated_at: datetime
    transcript: Optional[TranscriptDetailSchema] = None
    summary: Optional[SummarySchema] = None
    action_items: list[ActionItemSchema] = []

    model_config = {"from_attributes": True}


class CreateMeetingRequest(BaseModel):
    title: str
    date: datetime
    participants: list[Participant] = []
    transcript_text: Optional[str] = None
    transcript_file_type: Optional[str] = None


class UpdateMeetingRequest(BaseModel):
    title: Optional[str] = None
    participants: Optional[list[Participant]] = None


class CreateActionItemRequest(BaseModel):
    task: str
    owner: Optional[str] = None
    due_date_hint: Optional[str] = None


class UpdateActionItemRequest(BaseModel):
    task: Optional[str] = None
    owner: Optional[str] = None
    due_date_hint: Optional[str] = None
    completed: Optional[bool] = None


class AskQuestionRequest(BaseModel):
    meeting_id: str
    question: str
    conversation_history: list[dict] = []


class ProcessTranscriptRequest(BaseModel):
    meeting_id: str


class MeetingStatusResponse(BaseModel):
    meeting_id: str
    status: str
    summary_ready: bool
    action_items_count: int


class SearchResult(BaseModel):
    meeting_id: str
    meeting_title: str
    meeting_date: datetime
    match_type: str
    matched_text: str
    context: str = ""
