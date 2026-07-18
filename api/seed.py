from pathlib import Path

from sqlalchemy import select

from api.database import SessionLocal
from api.models import Chunk, Lesson
from api.rag import chunk_text, embed

SEED_TITLE = "Python Lists and Tuples"


def seed_database():
    path = Path(__file__).with_name("seed_lesson.md")
    if not path.exists():
        print("Seed lesson file is not present; skipping seed.")
        return None
    with SessionLocal() as db:
        existing = db.scalar(select(Lesson).where(Lesson.title == SEED_TITLE))
        if existing:
            print(f"Seed lesson already present: {existing.id}")
            return existing.id
        text = path.read_text(encoding="utf-8")
        pieces = chunk_text(text)
        vectors = embed([piece.content for piece in pieces])
        lesson = Lesson(title=SEED_TITLE, raw_text=text)
        db.add(lesson)
        db.flush()
        db.add_all([Chunk(lesson_id=lesson.id, chunk_index=piece.chunk_index, content=piece.content, embedding=vector)
                    for piece, vector in zip(pieces, vectors, strict=True)])
        db.commit()
        print(f"Seeded {SEED_TITLE}: {lesson.id} ({len(pieces)} chunks)")
        return lesson.id


if __name__ == "__main__":
    seed_database()

