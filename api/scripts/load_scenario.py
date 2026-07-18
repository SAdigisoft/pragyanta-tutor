"""Replace deterministic demo data with one named screen scenario."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from api.database import SessionLocal  # noqa: E402
from api.dev_data.common import DEMO_LESSON_ID, remove_demo_data, scenario_session_id  # noqa: E402
from api.dev_data.scenarios import SCENARIOS  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scenario", choices=SCENARIOS)
    args = parser.parse_args()

    try:
        with SessionLocal.begin() as db:
            remove_demo_data(db)
            SCENARIOS[args.scenario](db)
    except Exception as exc:
        print(f"Failed to load scenario {args.scenario!r}: {exc}", file=sys.stderr)
        return 1

    print(f"Scenario loaded: {args.scenario}")
    print(f"Lesson ID: {DEMO_LESSON_ID}")
    if args.scenario != "landing":
        suffix = "resolved" if args.scenario == "report" else "main"
        print(f"Session ID: {scenario_session_id(args.scenario, suffix)}")
    print("Open lessons: http://localhost:5173/")
    if args.scenario == "report":
        print(f"Open report: http://localhost:5173/report/{DEMO_LESSON_ID}")
    elif args.scenario != "landing":
        print(f"Open lesson: http://localhost:5173/learn/{scenario_session_id(args.scenario)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
