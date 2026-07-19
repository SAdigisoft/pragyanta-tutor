import enum
import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, JSON, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class LearnerLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"


class MessageRole(str, enum.Enum):
    student = "student"
    tutor = "tutor"


class MessageType(str, enum.Enum):
    chat = "chat"
    diagnostic_question = "diagnostic_question"
    remediation = "remediation"
    verification_question = "verification_question"
    verdict = "verdict"
    off_topic = "off_topic"


class MisconceptionStatus(str, enum.Enum):
    open = "open"
    resolved = "resolved"
    unresolved = "unresolved"


class Lesson(Base):
    __tablename__ = "lessons"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    chunks = relationship("Chunk", cascade="all, delete-orphan", passive_deletes=True)


class Chunk(Base):
    __tablename__ = "chunks"
    __table_args__ = (UniqueConstraint("lesson_id", "chunk_index", name="uq_chunk_lesson_index"), Index("ix_chunks_lesson", "lesson_id"))
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)


class LearningSession(Base):
    __tablename__ = "sessions"
    __table_args__ = (Index("ix_sessions_lesson", "lesson_id"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    learner_level: Mapped[LearnerLevel] = mapped_column(Enum(LearnerLevel, name="learner_level"), default=LearnerLevel.beginner)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_session_created", "session_id", "created_at"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[MessageRole] = mapped_column(Enum(MessageRole, name="message_role"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    msg_type: Mapped[MessageType] = mapped_column(Enum(MessageType, name="message_type"), default=MessageType.chat)
    citations: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    verdict_status: Mapped[MisconceptionStatus | None] = mapped_column(Enum(MisconceptionStatus, name="misconception_status", create_type=False), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), server_default=func.now())


class PracticeQuestion(Base):
    __tablename__ = "practice_questions"
    __table_args__ = (
        Index("ix_practice_questions_lesson", "lesson_id"),
        Index("ix_practice_questions_chunk", "chunk_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    chunk_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chunks.id", ondelete="CASCADE"), nullable=False)
    # kind: "mcq" carries options; "short_answer" leaves options null.
    kind: Mapped[str] = mapped_column(Text, nullable=False, default="mcq")
    difficulty: Mapped[LearnerLevel] = mapped_column(Enum(LearnerLevel, name="learner_level", create_type=False), default=LearnerLevel.beginner)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    misconception: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_quote: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Misconception(Base):
    __tablename__ = "misconceptions"
    __table_args__ = (Index("ix_misconceptions_session_status", "session_id", "status"), Index("ix_misconceptions_lesson", "lesson_id"))
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    lesson_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[MisconceptionStatus] = mapped_column(Enum(MisconceptionStatus, name="misconception_status", create_type=False), default=MisconceptionStatus.open)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
