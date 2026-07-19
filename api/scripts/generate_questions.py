"""Generate and validate a grounded practice-question bank from lesson chunks.

Each question is produced from a single source chunk and must carry a
``source_quote`` that appears verbatim in that chunk. Questions whose quote is
not found, whose options are malformed, or whose answer is not among the
options are discarded before anything is written. This mirrors the citation
enforcement the live tutor already applies, so the bank cannot drift away from
the teacher-approved material.

Usage examples::

    python -m api.scripts.generate_questions --per-chunk 20
    python -m api.scripts.generate_questions --lesson "Python Functions" --per-chunk 25
    python -m api.scripts.generate_questions --limit-chunks 2 --dry-run
    python -m api.scripts.generate_questions --reset --per-chunk 20

The provider follows AI_PROVIDER (mock | ollama | openai). ``mock`` produces
deterministic template questions so the pipeline runs with no model at all.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path
from typing import Literal

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import httpx  # noqa: E402
from openai import OpenAI  # noqa: E402
from pydantic import BaseModel, ValidationError  # noqa: E402
from sqlalchemy import func, select  # noqa: E402

from api.ai import get_ai_provider, ollama_base_url  # noqa: E402
from api.database import SessionLocal  # noqa: E402
from api.models import Chunk, LearnerLevel, Lesson, PracticeQuestion  # noqa: E402
from api.tutor import MODEL, OLLAMA_MODEL  # noqa: E402


class GeneratedQuestion(BaseModel):
    difficulty: Literal["beginner", "intermediate"]
    prompt: str
    options: list[str]
    answer: str
    explanation: str
    misconception: str
    source_quote: str


class GeneratedBatch(BaseModel):
    questions: list[GeneratedQuestion]


GENERATION_SYSTEM_PROMPT = (
    "You are an expert Python teacher writing multiple-choice practice questions "
    "for a single passage of approved lesson material. Follow every rule:\n"
    "- Write questions answerable using ONLY the passage. Never use outside facts.\n"
    "- Each question has exactly four options; exactly one is correct.\n"
    "- 'answer' must be copied verbatim from one of the four options.\n"
    "- Distractors must be plausible and reflect a real beginner misunderstanding.\n"
    "- 'misconception' states the wrong idea the incorrect options represent.\n"
    "- 'explanation' says why the answer is correct, grounded in the passage.\n"
    "- 'source_quote' MUST be an exact, contiguous, verbatim substring of the "
    "passage that supports the answer. Copy it character for character.\n"
    "- Vary what each question tests; do not repeat the same question.\n"
    "- Set 'difficulty' to 'beginner' for recall/definition questions and "
    "'intermediate' for questions requiring reasoning or transfer."
)


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip().lower()


def validate_question(candidate: GeneratedQuestion, chunk_content: str) -> str | None:
    """Return a rejection reason, or None when the question is acceptable."""
    options = [opt.strip() for opt in candidate.options if opt and opt.strip()]
    if len(options) != 4:
        return "not exactly four non-empty options"
    if len({_normalize(opt) for opt in options}) != 4:
        return "duplicate options"
    if _normalize(candidate.answer) not in {_normalize(opt) for opt in options}:
        return "answer is not one of the options"
    if not candidate.prompt.strip() or not candidate.explanation.strip():
        return "empty prompt or explanation"
    quote = candidate.source_quote.strip()
    if quote not in chunk_content:
        return "source_quote is not verbatim in the chunk"
    if len(quote) < 24 or re.match(r"^(?:#+\s*)?§\d+\b", quote):
        return "source_quote is only a heading or is too short to support the answer"
    visible_fields = [candidate.prompt, *options, candidate.answer, candidate.explanation]
    if any(html.unescape(value) != value for value in visible_fields):
        return "question contains HTML-escaped text"
    if any(_normalize(option) in {"answer", "option", "none"} for option in options):
        return "question contains a placeholder option"
    return None


def _ollama_generate(chunk_content: str, count: int, model: str) -> list[GeneratedQuestion]:
    response = httpx.post(
        f"{ollama_base_url()}/api/chat",
        json={
            "model": model,
            "stream": False,
            "format": GeneratedBatch.model_json_schema(),
            "messages": [
                {"role": "system", "content": GENERATION_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {"PASSAGE": chunk_content, "HOW_MANY_QUESTIONS": count}
                    ),
                },
            ],
            "options": {"temperature": 0.6},
        },
        timeout=240.0,
    )
    response.raise_for_status()
    content = response.json()["message"]["content"]
    return GeneratedBatch.model_validate_json(content).questions


def _openai_generate(chunk_content: str, count: int, model: str) -> list[GeneratedQuestion]:
    response = OpenAI().responses.parse(
        model=model,
        instructions=GENERATION_SYSTEM_PROMPT,
        input=json.dumps({"PASSAGE": chunk_content, "HOW_MANY_QUESTIONS": count}),
        reasoning={"effort": "low"},
        text_format=GeneratedBatch,
    )
    if not response.output_parsed:
        raise RuntimeError("Question batch could not be parsed")
    return response.output_parsed.questions


def _mock_generate(chunk_content: str, count: int) -> list[GeneratedQuestion]:
    """Deterministic template questions so the pipeline runs without a model."""
    sentences = [s.strip() for s in re.split(r"(?<=[.])\s+", chunk_content) if len(s.strip()) > 25]
    questions: list[GeneratedQuestion] = []
    for index, sentence in enumerate(sentences[:count]):
        quote = sentence.rstrip(".")
        questions.append(
            GeneratedQuestion(
                difficulty="beginner" if index % 2 == 0 else "intermediate",
                prompt=f"Which statement is supported by the lesson material? (item {index + 1})",
                options=[
                    quote,
                    "None of the lesson material supports this.",
                    "The opposite of what the lesson states.",
                    "This topic is not covered in the lesson.",
                ],
                answer=quote,
                explanation="The lesson states this directly in the source passage.",
                misconception="Assuming the lesson does not clearly state this fact.",
                source_quote=quote,
            )
        )
    return questions


def generate_for_chunk(chunk_content: str, count: int, provider: str, model: str) -> list[GeneratedQuestion]:
    if provider == "mock":
        return _mock_generate(chunk_content, count)
    if provider == "openai":
        return _openai_generate(chunk_content, count, model)
    # Small local models produce cleaner structured output in modest batches;
    # request in slices and let deduplication + validation trim the rest.
    collected: list[GeneratedQuestion] = []
    seen: set[str] = set()
    attempts = 0
    max_attempts = max(3, (count // 6) + 2)
    while len(collected) < count and attempts < max_attempts:
        attempts += 1
        try:
            batch = _ollama_generate(chunk_content, min(8, count - len(collected) + 2), model)
        except (httpx.HTTPError, ValidationError, KeyError) as exc:
            print(f"    batch attempt {attempts} failed: {exc}")
            continue
        for candidate in batch:
            key = _normalize(candidate.prompt)
            if key and key not in seen:
                seen.add(key)
                collected.append(candidate)
    return collected


def _lesson_query(db, lesson_title: str | None):
    statement = select(Lesson).order_by(Lesson.created_at)
    if lesson_title:
        statement = statement.where(Lesson.title == lesson_title)
    return list(db.scalars(statement))


def run(args: argparse.Namespace) -> int:
    provider = get_ai_provider()
    model = args.model or (MODEL if provider == "openai" else OLLAMA_MODEL)
    print(f"Provider: {provider} | model: {model} | target per chunk: {args.per_chunk}")

    with SessionLocal() as db:
        lessons = _lesson_query(db, args.lesson)
        if not lessons:
            print("No matching lessons found. Run `python -m api.seed` first.")
            return 1

        total_kept = 0
        total_rejected = 0
        exported: list[dict] = []
        for lesson in lessons:
            chunks = list(
                db.scalars(
                    select(Chunk).where(Chunk.lesson_id == lesson.id).order_by(Chunk.chunk_index)
                )
            )
            if args.limit_chunks:
                chunks = chunks[: args.limit_chunks]
            print(f"\n== {lesson.title} ({len(chunks)} chunk(s)) ==")

            for chunk in chunks:
                if args.reset and not args.dry_run:
                    db.execute(
                        PracticeQuestion.__table__.delete().where(
                            PracticeQuestion.chunk_id == chunk.id
                        )
                    )
                existing = db.scalar(
                    select(func.count(PracticeQuestion.id)).where(
                        PracticeQuestion.chunk_id == chunk.id
                    )
                ) or 0
                if existing >= args.per_chunk:
                    print(f"  chunk {chunk.chunk_index}: {existing} already present, skipping")
                    continue

                need = args.per_chunk - existing
                candidates = generate_for_chunk(chunk.content, need, provider, model)
                kept = 0
                for candidate in candidates:
                    reason = validate_question(candidate, chunk.content)
                    if reason:
                        total_rejected += 1
                        if args.verbose:
                            print(f"    rejected: {reason}")
                        continue
                    kept += 1
                    total_kept += 1
                    if args.export:
                        exported.append({
                            "lesson_title": lesson.title,
                            "chunk_index": chunk.chunk_index,
                            "kind": "mcq",
                            "featured": False,
                            "difficulty": candidate.difficulty,
                            "prompt": candidate.prompt.strip(),
                            "options": [opt.strip() for opt in candidate.options],
                            "answer": candidate.answer.strip(),
                            "explanation": candidate.explanation.strip(),
                            "misconception": candidate.misconception.strip() or None,
                            "source_quote": candidate.source_quote.strip(),
                        })
                    if not args.dry_run:
                        db.add(
                            PracticeQuestion(
                                lesson_id=lesson.id,
                                chunk_id=chunk.id,
                                kind="mcq",
                                difficulty=LearnerLevel(candidate.difficulty),
                                prompt=candidate.prompt.strip(),
                                options=[opt.strip() for opt in candidate.options],
                                answer=candidate.answer.strip(),
                                explanation=candidate.explanation.strip(),
                                misconception=candidate.misconception.strip() or None,
                                source_quote=candidate.source_quote.strip(),
                            )
                        )
                    if kept >= need:
                        break
                print(f"  chunk {chunk.chunk_index}: kept {kept}/{len(candidates)} generated")
                if not args.dry_run:
                    db.commit()  # commit per chunk so long runs are resumable

    if args.export and not args.dry_run:
        # Rebuild the export from the database so resumed runs include questions
        # accepted during every earlier chunk, not only this process invocation.
        exported = []
        with SessionLocal() as db:
            statement = (
                select(PracticeQuestion, Lesson, Chunk)
                .join(Lesson, Lesson.id == PracticeQuestion.lesson_id)
                .join(Chunk, Chunk.id == PracticeQuestion.chunk_id)
                .order_by(Lesson.title, Chunk.chunk_index, PracticeQuestion.created_at, PracticeQuestion.id)
            )
            if args.lesson:
                statement = statement.where(Lesson.title == args.lesson)
            for question, lesson, chunk in db.execute(statement):
                if args.limit_chunks and chunk.chunk_index >= args.limit_chunks:
                    continue
                exported.append({
                    "lesson_title": lesson.title,
                    "chunk_index": chunk.chunk_index,
                    "kind": question.kind,
                    "featured": question.is_featured,
                    "difficulty": question.difficulty.value,
                    "prompt": question.prompt,
                    "options": question.options,
                    "answer": question.answer,
                    "explanation": question.explanation,
                    "misconception": question.misconception,
                    "source_quote": question.source_quote,
                })
    if args.export and exported:
        export_path = Path(args.export)
        export_path.write_text(json.dumps(exported, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Exported {len(exported)} question(s) to {export_path}")

    print(f"\nDone. Accepted: {total_kept} | rejected: {total_rejected}"
          + (" (dry run, nothing written)" if args.dry_run else ""))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lesson", help="Only this lesson title (default: all lessons)")
    parser.add_argument("--per-chunk", type=int, default=20, help="Target questions per chunk")
    parser.add_argument("--limit-chunks", type=int, default=0, help="Only the first N chunks per lesson")
    parser.add_argument("--model", help="Override the Ollama chat model")
    parser.add_argument("--reset", action="store_true", help="Delete existing questions for targeted chunks first")
    parser.add_argument("--export", help="Also write accepted questions to this JSON file (commit it to ship the bank)")
    parser.add_argument("--dry-run", action="store_true", help="Generate and validate but write nothing to the DB")
    parser.add_argument("--verbose", action="store_true", help="Print each rejection reason")
    args = parser.parse_args()
    try:
        return run(args)
    except Exception as exc:  # surface a clean message; the traceback is rarely useful here
        print(f"Generation failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
