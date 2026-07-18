"""Verify schema availability and cross-table integrity without changing data."""

from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import func, inspect, select, text

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api.database import SessionLocal, engine  # noqa: E402
from api.models import Chunk, LearningSession, Lesson, Message, Misconception, MisconceptionStatus  # noqa: E402


EXPECTED_TABLES = {"lessons", "chunks", "sessions", "messages", "misconceptions"}


def main() -> int:
    failures: list[str] = []
    try:
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        missing = EXPECTED_TABLES - tables
        if missing:
            failures.append(f"missing tables: {', '.join(sorted(missing))}")
        else:
            print("PASS schema: all five application tables exist")

        with SessionLocal() as db:
            vector_installed = db.scalar(text("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')"))
            if vector_installed:
                print("PASS extension: pgvector is installed")
            else:
                failures.append("pgvector extension is not installed")

            if not missing:
                counts = {
                    "lessons": db.scalar(select(func.count()).select_from(Lesson)) or 0,
                    "chunks": db.scalar(select(func.count()).select_from(Chunk)) or 0,
                    "sessions": db.scalar(select(func.count()).select_from(LearningSession)) or 0,
                    "messages": db.scalar(select(func.count()).select_from(Message)) or 0,
                    "misconceptions": db.scalar(select(func.count()).select_from(Misconception)) or 0,
                }
                print("PASS access: " + ", ".join(f"{name}={count}" for name, count in counts.items()))

                orphan_checks = {
                    "chunks without lessons": text("SELECT count(*) FROM chunks c LEFT JOIN lessons l ON l.id=c.lesson_id WHERE l.id IS NULL"),
                    "sessions without lessons": text("SELECT count(*) FROM sessions s LEFT JOIN lessons l ON l.id=s.lesson_id WHERE l.id IS NULL"),
                    "messages without sessions": text("SELECT count(*) FROM messages m LEFT JOIN sessions s ON s.id=m.session_id WHERE s.id IS NULL"),
                    "misconceptions without sessions or lessons": text(
                        "SELECT count(*) FROM misconceptions m LEFT JOIN sessions s ON s.id=m.session_id "
                        "LEFT JOIN lessons l ON l.id=m.lesson_id WHERE s.id IS NULL OR l.id IS NULL"
                    ),
                }
                for label, query in orphan_checks.items():
                    count = db.scalar(query) or 0
                    if count:
                        failures.append(f"{label}: {count}")
                if not any("without" in failure for failure in failures):
                    print("PASS relationships: no orphaned records")

                duplicate_chunks = db.scalar(text(
                    "SELECT count(*) FROM (SELECT lesson_id, chunk_index FROM chunks "
                    "GROUP BY lesson_id, chunk_index HAVING count(*) > 1) duplicates"
                )) or 0
                if duplicate_chunks:
                    failures.append(f"duplicate lesson/chunk indexes: {duplicate_chunks}")
                else:
                    print("PASS chunks: lesson chunk indexes are unique")

                lesson_mismatches = db.scalar(text(
                    "SELECT count(*) FROM misconceptions m JOIN sessions s ON s.id=m.session_id "
                    "WHERE m.lesson_id <> s.lesson_id"
                )) or 0
                if lesson_mismatches:
                    failures.append(f"misconceptions assigned to a different lesson than their session: {lesson_mismatches}")
                else:
                    print("PASS misconceptions: session and lesson references agree")

                bad_resolution = db.scalar(select(func.count()).select_from(Misconception).where(
                    (Misconception.status == MisconceptionStatus.resolved) & (Misconception.resolved_at.is_(None))
                )) or 0
                if bad_resolution:
                    failures.append(f"resolved misconceptions missing resolved_at: {bad_resolution}")
                else:
                    print("PASS resolution: resolved records have timestamps")
    except Exception as exc:
        failures.append(f"database connection or query failed: {exc}")

    if failures:
        print("\nDatabase verification FAILED:", file=sys.stderr)
        for failure in failures:
            print(f"  - {failure}", file=sys.stderr)
        return 1
    print("\nDatabase verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

