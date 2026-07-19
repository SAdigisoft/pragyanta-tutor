from collections import Counter
import os
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from api.database import get_db
from api.models import Chunk, LearnerLevel, LearningSession, Lesson, Message, Misconception, MisconceptionStatus, PracticeQuestion
from api.rag import chunk_text, embed, extract_pdf_text
from api.schemas import ChatCreate, LessonTextCreate, SessionCreate, SessionLevelUpdate
from api.tutor import process_chat

app = FastAPI(title="Pragyanta Tutor API", version="1.0.0")
cors_origins = [origin.strip().rstrip("/") for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(StarletteHTTPException)
async def http_error(_request, exc):
    return JSONResponse(status_code=exc.status_code, content={"error": str(exc.detail)})


@app.exception_handler(RequestValidationError)
async def validation_error(_request, exc):
    return JSONResponse(status_code=422, content={"error": "Invalid request"})


@app.get("/health")
def health():
    return {"status": "ok"}


def _lesson_response(db: Session, lesson: Lesson):
    count = db.scalar(select(func.count(Chunk.id)).where(Chunk.lesson_id == lesson.id)) or 0
    question_count = db.scalar(select(func.count(PracticeQuestion.id)).where(PracticeQuestion.lesson_id == lesson.id)) or 0
    featured_prompt = db.scalar(
        select(PracticeQuestion.prompt).where(
            PracticeQuestion.lesson_id == lesson.id,
            PracticeQuestion.is_featured.is_(True),
        )
    )
    return {"lesson_id": str(lesson.id), "title": lesson.title, "created_at": lesson.created_at.isoformat(),
            "chunk_count": count, "question_count": question_count, "featured_prompt": featured_prompt}


@app.post("/api/lessons", status_code=201)
async def create_lesson(request: Request, db: Session = Depends(get_db)):
    content_type = request.headers.get("content-type", "")
    title = ""
    text = ""
    if "application/json" in content_type:
        try:
            payload = LessonTextCreate.model_validate(await request.json())
        except Exception as exc:
            raise HTTPException(422, "A title and non-empty lesson text are required") from exc
        title, text = payload.title.strip(), payload.text.strip()
    elif "multipart/form-data" in content_type:
        form = await request.form()
        upload = form.get("file")
        title = str(form.get("title") or "").strip()
        if upload is None or not hasattr(upload, "read"):
            raise HTTPException(422, "Choose a PDF file to upload")
        if not upload.filename or not upload.filename.lower().endswith(".pdf"):
            raise HTTPException(415, "Only PDF files are supported")
        data = await upload.read()
        if len(data) > 50 * 1024 * 1024:
            raise HTTPException(413, "PDF must be 50 MB or smaller")
        try:
            text = extract_pdf_text(data)
        except Exception as exc:
            raise HTTPException(422, "The PDF could not be read") from exc
        title = title or upload.filename.rsplit(".", 1)[0]
    else:
        raise HTTPException(415, "Send JSON lesson text or a multipart PDF")
    if not text.strip():
        raise HTTPException(422, "The lesson contains no readable text")
    pieces = chunk_text(text)
    vectors = embed([piece.content for piece in pieces])
    lesson = Lesson(title=title, raw_text=text)
    db.add(lesson)
    db.flush()
    db.add_all([Chunk(lesson_id=lesson.id, chunk_index=piece.chunk_index, content=piece.content, embedding=vector)
                for piece, vector in zip(pieces, vectors, strict=True)])
    db.commit()
    return _lesson_response(db, lesson)


@app.get("/api/lessons")
def list_lessons(db: Session = Depends(get_db)):
    return [_lesson_response(db, lesson) for lesson in db.scalars(select(Lesson).order_by(Lesson.created_at.desc()))]


@app.get("/api/sessions")
def list_sessions(limit: int = 30, db: Session = Depends(get_db)):
    """Return recent tutor conversations for sidebar navigation."""
    limit = max(1, min(limit, 100))
    last_message = (
        select(Message.content)
        .where(Message.session_id == LearningSession.id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(1)
        .scalar_subquery()
    )
    statement = (
        select(LearningSession, Lesson, last_message.label("last_message"))
        .join(Lesson, Lesson.id == LearningSession.lesson_id)
        .order_by(LearningSession.created_at.desc())
        .limit(limit)
    )
    return [
        {
            "session_id": str(session.id),
            "lesson_id": str(session.lesson_id),
            "lesson_title": lesson.title,
            "learner_level": session.learner_level.value,
            "last_message": preview,
            "created_at": session.created_at.isoformat(),
        }
        for session, lesson, preview in db.execute(statement)
    ]


@app.post("/api/sessions", status_code=201)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    try:
        lesson_id = UUID(payload.lesson_id)
    except ValueError as exc:
        raise HTTPException(404, "Lesson not found") from exc
    if not db.get(Lesson, lesson_id):
        raise HTTPException(404, "Lesson not found")
    session = LearningSession(
        lesson_id=lesson_id,
        learner_level=payload.learner_level,
        is_demo=payload.is_demo,
    )
    db.add(session)
    db.commit()
    return {"session_id": str(session.id)}


@app.get("/api/sessions/{session_id}")
def get_session(session_id: UUID, db: Session = Depends(get_db)):
    session = db.get(LearningSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    lesson = db.get(Lesson, session.lesson_id)
    featured_prompt = db.scalar(
        select(PracticeQuestion.prompt).where(
            PracticeQuestion.lesson_id == lesson.id,
            PracticeQuestion.is_featured.is_(True),
        )
    )
    return {
        "session_id": str(session.id),
        "lesson_id": str(session.lesson_id),
        "lesson_title": lesson.title,
        "learner_level": session.learner_level.value,
        "featured_prompt": featured_prompt,
        "created_at": session.created_at.isoformat(),
    }


@app.patch("/api/sessions/{session_id}")
def update_session_level(session_id: UUID, payload: SessionLevelUpdate, db: Session = Depends(get_db)):
    session = db.get(LearningSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    session.learner_level = LearnerLevel(payload.learner_level)
    db.commit()
    return {"session_id": str(session.id), "learner_level": session.learner_level.value}


@app.post("/api/sessions/{session_id}/chat")
def chat(session_id: UUID, payload: ChatCreate, db: Session = Depends(get_db)):
    session = db.get(LearningSession, session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    try:
        return process_chat(db, session, payload.message.strip())
    except Exception as exc:
        raise HTTPException(502, "The tutor could not respond. Try again.") from exc


@app.get("/api/sessions/{session_id}/messages")
def messages(session_id: UUID, db: Session = Depends(get_db)):
    if not db.get(LearningSession, session_id):
        raise HTTPException(404, "Session not found")
    rows = db.scalars(select(Message).where(Message.session_id == session_id).order_by(Message.created_at, Message.id))
    return [{"id": str(item.id), "role": item.role.value, "content": item.content, "msg_type": item.msg_type.value,
             "citations": item.citations, "verdict_status": item.verdict_status.value if item.verdict_status else None,
             "created_at": item.created_at.isoformat()} for item in rows]


@app.get("/api/lessons/{lesson_id}/questions")
def lesson_questions(lesson_id: UUID, limit: int = 20, difficulty: str | None = None, db: Session = Depends(get_db)):
    if not db.get(Lesson, lesson_id):
        raise HTTPException(404, "Lesson not found")
    limit = max(1, min(limit, 100))
    statement = select(PracticeQuestion).where(PracticeQuestion.lesson_id == lesson_id)
    if difficulty:
        try:
            statement = statement.where(PracticeQuestion.difficulty == LearnerLevel(difficulty))
        except ValueError as exc:
            raise HTTPException(422, "difficulty must be beginner or intermediate") from exc
    rows = list(db.scalars(statement.order_by(func.random()).limit(limit)))
    return [{"id": str(item.id), "kind": item.kind, "difficulty": item.difficulty.value,
             "prompt": item.prompt, "options": item.options, "answer": item.answer,
             "explanation": item.explanation, "misconception": item.misconception,
             "source_quote": item.source_quote, "is_featured": item.is_featured} for item in rows]


@app.get("/api/lessons/{lesson_id}/report")
def report(lesson_id: UUID, db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    rows = list(db.scalars(select(Misconception).where(Misconception.lesson_id == lesson_id).order_by(Misconception.detected_at.desc())))
    counts = Counter(item.status.value for item in rows)
    return {"lesson_title": lesson.title,
            "misconceptions": [{"description": item.description, "evidence": item.evidence, "status": item.status.value,
                                 "detected_at": item.detected_at.isoformat(),
                                 "resolved_at": item.resolved_at.isoformat() if item.resolved_at else None} for item in rows],
            "summary": {"total": len(rows), "resolved": counts["resolved"], "unresolved": counts["unresolved"], "open": counts["open"]}}
