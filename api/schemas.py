from typing import Literal
from pydantic import BaseModel, Field


class Citation(BaseModel):
    chunk_id: str
    snippet: str


class TutorTurn(BaseModel):
    intent: Literal["question", "answer_attempt", "verification_response", "off_topic"]
    grounded: bool
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    misconception_detected: bool
    misconception: dict[str, str] | None
    remediation: str | None
    verification_question: str | None
    verification_verdict: Literal["resolved", "unresolved"] | None
    follow_up_question: str | None


class LessonTextCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1)


class LessonUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    text: str | None = Field(default=None, min_length=1)


class SessionCreate(BaseModel):
    lesson_id: str
    learner_level: Literal["beginner", "intermediate"] = "beginner"
    is_demo: bool = False


class SessionLevelUpdate(BaseModel):
    learner_level: Literal["beginner", "intermediate"]


class ChatCreate(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
