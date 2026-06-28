import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, DateTime, JSON, ForeignKey, Index, Enum as SAEnum
from sqlalchemy.orm import relationship
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer, default=0)
    participants = Column(JSON, default=list)
    status = Column(String, default="ready")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    transcript = relationship("Transcript", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    summary = relationship("Summary", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    highlights = relationship("Highlight", back_populates="meeting", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_meetings_date", "date"),)

    def __repr__(self):
        return f"<Meeting(id={self.id}, title={self.title})>"


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), unique=True, nullable=False)
    raw_text = Column(Text, default="")
    language = Column(String, default="en")
    word_count = Column(Integer, default=0)

    meeting = relationship("Meeting", back_populates="transcript")
    lines = relationship("TranscriptLine", back_populates="transcript", cascade="all, delete-orphan", order_by="TranscriptLine.line_index")

    def __repr__(self):
        return f"<Transcript(id={self.id}, meeting_id={self.meeting_id})>"


class TranscriptLine(Base):
    __tablename__ = "transcript_lines"

    id = Column(String, primary_key=True, default=generate_uuid)
    transcript_id = Column(String, ForeignKey("transcripts.id", ondelete="CASCADE"), nullable=False)
    speaker_name = Column(String, nullable=False)
    speaker_id = Column(String, nullable=False)
    timestamp_start = Column(Float, nullable=False)
    timestamp_end = Column(Float, nullable=False)
    text = Column(Text, nullable=False)
    line_index = Column(Integer, nullable=False)

    transcript = relationship("Transcript", back_populates="lines")
    highlights = relationship("Highlight", back_populates="transcript_line", cascade="all, delete-orphan")

    __table_args__ = (Index("ix_transcript_lines_transcript_id", "transcript_id"),)

    def __repr__(self):
        return f"<TranscriptLine(id={self.id}, speaker={self.speaker_name}, index={self.line_index})>"


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), unique=True, nullable=False)
    overview = Column(Text, default="")
    key_topics = Column(JSON, default=list)
    chapters = Column(JSON, default=list)
    generated_by = Column(String, default="seeded")
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    meeting = relationship("Meeting", back_populates="summary")

    def __repr__(self):
        return f"<Summary(id={self.id}, meeting_id={self.meeting_id})>"


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    task = Column(String, nullable=False)
    owner = Column(String, nullable=True)
    due_date_hint = Column(String, nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    meeting = relationship("Meeting", back_populates="action_items")

    __table_args__ = (Index("ix_action_items_meeting_id", "meeting_id"),)

    def __repr__(self):
        return f"<ActionItem(id={self.id}, task={self.task[:30]})>"


class Highlight(Base):
    __tablename__ = "highlights"

    id = Column(String, primary_key=True, default=generate_uuid)
    transcript_line_id = Column(String, ForeignKey("transcript_lines.id", ondelete="CASCADE"), nullable=False)
    meeting_id = Column(String, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False)
    note = Column(Text, nullable=True)
    color = Column(String, default="yellow")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    transcript_line = relationship("TranscriptLine", back_populates="highlights")
    meeting = relationship("Meeting", back_populates="highlights")

    def __repr__(self):
        return f"<Highlight(id={self.id}, color={self.color})>"
