"""Delete generated demo records without touching user-created data."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api.database import SessionLocal  # noqa: E402
from api.dev_data.common import DEMO_LESSON_ID, remove_demo_data  # noqa: E402


def main() -> int:
    try:
        with SessionLocal.begin() as db:
            removed_sessions, removed_lessons = remove_demo_data(db)
    except Exception as exc:
        print(f"Failed to reset demo data: {exc}", file=sys.stderr)
        return 1
    print(
        f"Demo reset complete. Removed {removed_sessions} tagged demo session(s) and "
        f"{removed_lessons} scenario lesson(s) with reserved ID {DEMO_LESSON_ID}."
    )
    print("User-created lessons and ordinary learner sessions were retained.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
