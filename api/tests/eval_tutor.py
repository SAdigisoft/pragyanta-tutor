"""Run the committed tutor golden set against a real configured model.

This is intentionally a script, not a pytest module. It spends API credits and
is only run during prompt tuning:

    AI_PROVIDER=openai OPENAI_API_KEY=... python api/tests/eval_tutor.py
    AI_PROVIDER=ollama python api/tests/eval_tutor.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api.models import MessageRole, MessageType
from api.rag import chunk_text
from api.ai import get_ai_provider
from api.tutor import _live_turn, _ollama_turn

GOLDEN_PATH = Path(__file__).with_name("golden_set.json")
SEED_PATH = ROOT / "api" / "seed_lesson.md"


def _lesson_chunks() -> list[SimpleNamespace]:
    if not SEED_PATH.exists():
        raise SystemExit(f"Seed lesson is missing: {SEED_PATH}")
    return [
        SimpleNamespace(id=uuid4(), content=part.content)
        for part in chunk_text(SEED_PATH.read_text(encoding="utf-8"))
    ]


def _verification_context() -> tuple[list[SimpleNamespace], SimpleNamespace]:
    misconception = SimpleNamespace(
        description="The student believes tuple values can be modified after creation.",
        evidence="A tuple is better because we can modify its values later.",
    )
    history = [
        SimpleNamespace(
            role=MessageRole.student,
            content=misconception.evidence,
            msg_type=MessageType.chat,
        ),
        SimpleNamespace(
            role=MessageRole.tutor,
            content="A tuple is fixed after creation, while a list can change.",
            msg_type=MessageType.remediation,
        ),
        SimpleNamespace(
            role=MessageRole.tutor,
            content="You have point = (3, 4). What happens if you run point[0] = 5?",
            msg_type=MessageType.verification_question,
        ),
    ]
    return history, misconception


def _evaluate(case: dict, chunks: list[SimpleNamespace]) -> tuple[bool, str]:
    history: list[SimpleNamespace] = []
    open_item = None
    if case.get("context") == "after_remediation":
        history, open_item = _verification_context()
    provider = get_ai_provider()
    run_turn = _ollama_turn if provider == "ollama" else _live_turn
    turn = run_turn(case["student_message"], chunks, "beginner", history, open_item)

    mismatches: list[str] = []
    checks = {
        "intent": (turn.intent, case["expected_intent"]),
        "misconception": (turn.misconception_detected, case["expect_misconception"]),
        "grounded": (turn.grounded, case["expect_grounded"]),
    }
    if "expected_verdict" in case:
        checks["verdict"] = (turn.verification_verdict, case["expected_verdict"])
    for label, (actual, expected) in checks.items():
        if actual != expected:
            mismatches.append(f"{label}={actual!r}, expected {expected!r}")
    return not mismatches, "; ".join(mismatches) or "all checks matched"


def main() -> int:
    provider = get_ai_provider()
    if provider == "mock":
        print("Set AI_PROVIDER to ollama or openai for the real tutor evaluation.", file=sys.stderr)
        return 2
    cases = json.loads(GOLDEN_PATH.read_text(encoding="utf-8"))["cases"]
    chunks = _lesson_chunks()
    passed = 0
    print(f"Running {len(cases)} cases with the real {provider} tutor model\n")
    for case in cases:
        try:
            ok, detail = _evaluate(case, chunks)
        except Exception as exc:
            ok, detail = False, f"{type(exc).__name__}: {exc}"
        passed += int(ok)
        marker = "PASS" if ok else "FAIL"
        print(f"[{marker}] {case['id']:>2}  {detail}")
    rate = (passed / len(cases) * 100) if cases else 0
    print(f"\nSummary: {passed}/{len(cases)} passed ({rate:.1f}%)")
    print("Target: >= 90% before UI polish")
    return 0 if rate >= 90 else 1


if __name__ == "__main__":
    raise SystemExit(main())
