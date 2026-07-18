"""Print compact row counts and recent records for Pragyanta database tables."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import func, select

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api.database import SessionLocal  # noqa: E402
from api.models import Chunk, LearningSession, Lesson, Message, Misconception  # noqa: E402


TABLES = {
    "lessons": Lesson,
    "chunks": Chunk,
    "sessions": LearningSession,
    "messages": Message,
    "misconceptions": Misconception,
}


def shorten(value: object, width: int = 72) -> str:
    if value is None:
        return "—"
    text = str(value).replace("\n", " ")
    return text if len(text) <= width else f"{text[: width - 1]}…"


def row_summary(table: str, row: object) -> str:
    if table == "lessons":
        return f"{row.id} | {shorten(row.title, 40)} | created {row.created_at}"
    if table == "chunks":
        return f"{row.id} | lesson {row.lesson_id} | index {row.chunk_index} | {shorten(row.content)}"
    if table == "sessions":
        return f"{row.id} | lesson {row.lesson_id} | {row.learner_level.value} | created {row.created_at}"
    if table == "messages":
        return f"{row.id} | session {row.session_id} | {row.role.value}/{row.msg_type.value} | {shorten(row.content)}"
    return f"{row.id} | session {row.session_id} | {row.status.value} | {shorten(row.description)}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("table", nargs="?", choices=["all", *TABLES], default="all")
    parser.add_argument("--limit", type=int, default=10, help="Maximum rows shown per table (default: 10)")
    args = parser.parse_args()
    if args.limit < 0:
        parser.error("--limit must be zero or greater")

    selected = TABLES.items() if args.table == "all" else [(args.table, TABLES[args.table])]
    try:
        with SessionLocal() as db:
            for table, model in selected:
                count = db.scalar(select(func.count()).select_from(model)) or 0
                print(f"\n{table}: {count} row(s)")
                if not args.limit:
                    continue
                order_column = getattr(model, "created_at", None)
                if order_column is None:
                    order_column = getattr(model, "detected_at", None)
                statement = select(model)
                if order_column is not None:
                    statement = statement.order_by(order_column.desc())
                rows = db.scalars(statement.limit(args.limit)).all()
                for row in rows:
                    print(f"  {row_summary(table, row)}")
    except Exception as exc:
        print(f"Could not inspect database: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
