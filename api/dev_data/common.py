"""Builders for deterministic database states used by the six demo screens."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Iterable

from sqlalchemy import delete
from sqlalchemy.orm import Session

from api.models import (
    Chunk,
    LearnerLevel,
    LearningSession,
    Lesson,
    Message,
    MessageRole,
    MessageType,
    Misconception,
    MisconceptionStatus,
)


DEMO_NAMESPACE = uuid.UUID("4ef6f5d8-71c8-5e70-b30f-1d6337229428")
DEMO_LESSON_ID = uuid.uuid5(DEMO_NAMESPACE, "lesson:python-lists-and-tuples")
LESSON_TITLE = "Python Lists and Tuples"
BASE_TIME = datetime(2026, 7, 18, 9, 30, tzinfo=timezone.utc)

SOURCE_SECTIONS = (
    (
        "Lists & Tuples §1",
        "In Python, both lists and tuples are sequences: ordered collections that hold multiple values in a single variable. "
        "Both keep their items in order, both can be indexed, and both can be looped over with a for loop.",
    ),
    (
        "Lists & Tuples §2",
        "A list is mutable, meaning its contents can be changed after creation. A tuple is immutable, meaning its contents "
        "cannot be changed after creation. If you write point[0] = 5 on a tuple, Python raises a TypeError, because tuples "
        "do not support item assignment.",
    ),
    (
        "Lists & Tuples §3",
        "Use a list when the collection is expected to grow, shrink, or change. Use a tuple when the values belong together "
        "and must never change, such as coordinates like (3, 4).",
    ),
    (
        "Lists & Tuples §5",
        "Tuples support a convenient pattern called unpacking, where each value is assigned to its own variable in one step. "
        "Unpacking does not modify the original tuple.",
    ),
)


def stable_id(name: str) -> uuid.UUID:
    return uuid.uuid5(DEMO_NAMESPACE, name)


def scenario_session_id(scenario: str, suffix: str = "main") -> uuid.UUID:
    return stable_id(f"session:{scenario}:{suffix}")


def remove_demo_data(db: Session) -> tuple[int, int]:
    """Remove tagged demo sessions and the lesson UUID reserved for scenarios."""
    sessions = db.execute(delete(LearningSession).where(LearningSession.is_demo.is_(True)))
    lessons = db.execute(delete(Lesson).where(Lesson.id == DEMO_LESSON_ID))
    return (sessions.rowcount or 0), (lessons.rowcount or 0)


def create_lesson(db: Session) -> tuple[Lesson, list[Chunk]]:
    lesson = Lesson(
        id=DEMO_LESSON_ID,
        title=LESSON_TITLE,
        raw_text="\n\n".join(content for _, content in SOURCE_SECTIONS),
        created_at=BASE_TIME,
    )
    db.add(lesson)

    chunks: list[Chunk] = []
    for index, (_, content) in enumerate(SOURCE_SECTIONS):
        # Non-zero, deterministic development vectors avoid external embedding calls.
        embedding = [0.0] * 1536
        embedding[index] = 1.0
        chunk = Chunk(
            id=stable_id(f"chunk:{index}"),
            lesson_id=lesson.id,
            chunk_index=index,
            content=content,
            embedding=embedding,
        )
        chunks.append(chunk)
        db.add(chunk)
    # The models intentionally do not expose every relationship. Flush parent
    # rows here so later builders cannot race their foreign keys at commit.
    db.flush()
    return lesson, chunks


def create_session(
    db: Session,
    scenario: str,
    *,
    suffix: str = "main",
    learner_level: LearnerLevel = LearnerLevel.beginner,
    minute: int = 0,
) -> LearningSession:
    learning_session = LearningSession(
        id=scenario_session_id(scenario, suffix),
        lesson_id=DEMO_LESSON_ID,
        learner_level=learner_level,
        is_demo=True,
        created_at=BASE_TIME + timedelta(minutes=minute),
    )
    db.add(learning_session)
    db.flush()
    return learning_session


def citation(chunk_index: int = 1) -> list[dict[str, str]]:
    label, content = SOURCE_SECTIONS[chunk_index]
    return [{"chunk_id": str(stable_id(f"chunk:{chunk_index}")), "snippet": content, "label": label}]


def add_messages(db: Session, session_id: uuid.UUID, rows: Iterable[dict]) -> list[Message]:
    messages: list[Message] = []
    for index, row in enumerate(rows):
        message = Message(
            id=stable_id(f"message:{session_id}:{index}"),
            session_id=session_id,
            role=row["role"],
            content=row["content"],
            msg_type=row.get("msg_type", MessageType.chat),
            citations=row.get("citations"),
            verdict_status=row.get("verdict_status"),
            created_at=BASE_TIME + timedelta(minutes=index + 1),
        )
        messages.append(message)
        db.add(message)
    return messages


def add_misconception(
    db: Session,
    session_id: uuid.UUID,
    *,
    key: str,
    description: str,
    evidence: str,
    status: MisconceptionStatus,
    detected_minute: int,
    resolved_minute: int | None = None,
) -> Misconception:
    item = Misconception(
        id=stable_id(f"misconception:{key}"),
        session_id=session_id,
        lesson_id=DEMO_LESSON_ID,
        description=description,
        evidence=evidence,
        status=status,
        detected_at=BASE_TIME + timedelta(minutes=detected_minute),
        resolved_at=(BASE_TIME + timedelta(minutes=resolved_minute)) if resolved_minute is not None else None,
    )
    db.add(item)
    return item


STUDENT = MessageRole.student
TUTOR = MessageRole.tutor
