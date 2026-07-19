import json
import re
from pathlib import Path

from sqlalchemy import select

from api.database import SessionLocal
from api.models import Chunk, LearnerLevel, Lesson, PracticeQuestion
from api.rag import chunk_text, embed

# The lists-and-tuples lesson drives the scripted demo, golden-set evaluation,
# and the smoke scripts, so its title must remain stable.
SEED_TITLE = "Python Lists and Tuples"
CURRICULUM_DIR = Path(__file__).with_name("curriculum")
LEGACY_LESSON = Path(__file__).with_name("seed_lesson.md")
QUESTION_BANK = Path(__file__).with_name("question_bank.json")


def _title_from_markdown(text: str, fallback: str) -> str:
    """Use the first level-one heading as the lesson title, else the filename."""
    for line in text.splitlines():
        match = re.match(r"#\s+(.+)", line.strip())
        if match:
            return match.group(1).strip()
    return fallback


def _curriculum_files() -> list[Path]:
    if CURRICULUM_DIR.is_dir():
        files = sorted(CURRICULUM_DIR.glob("*.md"))
        if files:
            return files
    # Fall back to the original single bundled lesson.
    return [LEGACY_LESSON] if LEGACY_LESSON.exists() else []


def _ingest_lesson(db, path: Path) -> Lesson | None:
    """Insert one markdown lesson idempotently, keyed on its title."""
    text = path.read_text(encoding="utf-8")
    title = _title_from_markdown(text, path.stem.replace("-", " ").title())
    existing = db.scalar(select(Lesson).where(Lesson.title == title))
    if existing:
        print(f"Lesson already present: {title} ({existing.id})")
        return existing
    pieces = chunk_text(text)
    if not pieces:
        print(f"Lesson has no content, skipping: {title}")
        return None
    vectors = embed([piece.content for piece in pieces])
    lesson = Lesson(title=title, raw_text=text)
    db.add(lesson)
    db.flush()
    db.add_all([
        Chunk(lesson_id=lesson.id, chunk_index=piece.chunk_index, content=piece.content, embedding=vector)
        for piece, vector in zip(pieces, vectors, strict=True)
    ])
    print(f"Seeded {title}: {lesson.id} ({len(pieces)} chunks)")
    return lesson


def load_question_bank(db, *, repair_single_question_chunks: bool = False) -> int:
    """Load the committed practice-question bank into the DB, idempotently.

    Records are keyed by lesson title + chunk index so they survive re-seeding
    without depending on generated UUIDs. Nothing here calls a model: the bank
    was produced offline by api.scripts.generate_questions and shipped as JSON.
    """
    if not QUESTION_BANK.exists():
        return 0
    try:
        records = json.loads(QUESTION_BANK.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"Question bank is not valid JSON, skipping: {exc}")
        return 0
    changed = 0
    for record in records:
        lesson = db.scalar(select(Lesson).where(Lesson.title == record["lesson_title"]))
        if not lesson:
            continue
        chunk = db.scalar(
            select(Chunk).where(
                Chunk.lesson_id == lesson.id, Chunk.chunk_index == record["chunk_index"]
            )
        )
        if not chunk:
            continue
        question = db.scalar(
            select(PracticeQuestion).where(
                PracticeQuestion.chunk_id == chunk.id,
                PracticeQuestion.prompt == record["prompt"],
            )
        )
        if question is None and repair_single_question_chunks:
            questions = list(
                db.scalars(select(PracticeQuestion).where(PracticeQuestion.chunk_id == chunk.id))
            )
            if len(questions) == 1:
                # Preserve the existing UUID and learner history while repairing
                # the one bank question attached to this source chunk.
                question = questions[0]
        if question is None:
            question = PracticeQuestion(lesson_id=lesson.id, chunk_id=chunk.id)
            db.add(question)
        question.kind = record.get("kind", "mcq")
        question.difficulty = LearnerLevel(record.get("difficulty", "beginner"))
        question.prompt = record["prompt"]
        question.options = record.get("options")
        question.answer = record["answer"]
        question.explanation = record["explanation"]
        question.misconception = record.get("misconception")
        question.source_quote = record.get("source_quote")
        question.is_featured = bool(record.get("featured", False))
        changed += 1
    if changed:
        print(f"Synchronized {changed} practice question(s) from the committed bank.")
    return changed


def seed_database():
    """Ingest the full Python curriculum. Returns the lists-and-tuples lesson id."""
    files = _curriculum_files()
    if not files:
        print("No curriculum lessons are present; skipping seed.")
        return None
    primary_id = None
    with SessionLocal() as db:
        for path in files:
            lesson = _ingest_lesson(db, path)
            if lesson and lesson.title == SEED_TITLE:
                primary_id = lesson.id
        db.commit()
        load_question_bank(db)
        db.commit()
    print(f"Curriculum seed complete: {len(files)} lesson file(s) processed.")
    return primary_id


if __name__ == "__main__":
    seed_database()
