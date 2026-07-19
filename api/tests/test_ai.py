import json
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest

from api import rag, tutor
from api.ai import get_ai_provider
from api.schemas import TutorTurn
from api.scripts import generate_questions


def test_committed_question_bank_passes_grounding_validation() -> None:
    api_dir = Path(__file__).resolve().parents[1]
    records = json.loads((api_dir / "question_bank.json").read_text(encoding="utf-8"))
    lesson_chunks = {}
    for lesson_path in (api_dir / "curriculum").glob("*.md"):
        lesson_text = lesson_path.read_text(encoding="utf-8")
        lesson_title = lesson_text.splitlines()[0].removeprefix("# ").strip()
        lesson_chunks[lesson_title] = {
            chunk.chunk_index: chunk.content for chunk in rag.chunk_text(lesson_text)
        }
    for record in records:
        candidate = generate_questions.GeneratedQuestion.model_validate(record)
        chunks = lesson_chunks[record["lesson_title"]]
        assert generate_questions.validate_question(candidate, chunks[record["chunk_index"]]) is None


def test_citation_display_text_removes_markdown_structure() -> None:
    assert tutor._clean_citation_text("## §1 What lists and tuples are") == "What lists and tuples are"
    assert tutor._clean_citation_text("1. Lists are mutable") == "Lists are mutable"
    assert tutor._clean_citation_text("- Tuples are immutable") == "Tuples are immutable"


def test_question_source_quote_must_be_an_exact_substring() -> None:
    candidate = generate_questions.GeneratedQuestion(
        difficulty="beginner",
        prompt="What is stored?",
        options=["A value", "A file", "A loop", "Nothing"],
        answer="A value",
        explanation="The passage says so.",
        misconception="Confusing a variable with a file.",
        source_quote="a variable stores a value",
    )
    assert generate_questions.validate_question(candidate, "A variable stores a value.") == "source_quote is not verbatim in the chunk"
    candidate.source_quote = "A variable stores a value in memory"
    assert generate_questions.validate_question(candidate, "A variable stores a value in memory.") is None


def test_question_rejects_heading_only_quote() -> None:
    candidate = generate_questions.GeneratedQuestion(
        difficulty="beginner",
        prompt="What does None represent?",
        options=["No value", "Zero", "False", "An empty string"],
        answer="No value",
        explanation="None represents the deliberate absence of a value.",
        misconception="None is the same as zero.",
        source_quote="§6 None, the absence of a value",
    )
    chunk = "§6 None, the absence of a value\n\nNone represents no value."
    assert "heading" in generate_questions.validate_question(candidate, chunk)


def test_question_rejects_html_escaped_text() -> None:
    quote = "The type function returns the type of the value supplied to it."
    candidate = generate_questions.GeneratedQuestion(
        difficulty="beginner",
        prompt="What is the result?",
        options=["&lt;class 'int'&gt;", "str", "float", "bool"],
        answer="&lt;class 'int'&gt;",
        explanation="The value is an integer.",
        misconception="The value is text.",
        source_quote=quote,
    )
    assert "HTML-escaped" in generate_questions.validate_question(candidate, quote)


def test_openai_question_generation_uses_the_openai_adapter(monkeypatch: pytest.MonkeyPatch) -> None:
    expected = []
    openai_generate = lambda *_args: expected
    ollama_generate = pytest.fail
    monkeypatch.setattr(generate_questions, "_openai_generate", openai_generate)
    monkeypatch.setattr(generate_questions, "_ollama_generate", ollama_generate)
    assert generate_questions.generate_for_chunk("source", 1, "openai", "gpt-test") is expected


def test_provider_defaults_to_mock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    monkeypatch.setenv("MOCK_OPENAI", "1")
    assert get_ai_provider() == "mock"


def test_provider_rejects_openai_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="OPENAI_API_KEY"):
        get_ai_provider()


def test_keyless_tutor_uses_the_retrieved_lesson_instead_of_a_hardcoded_topic() -> None:
    source = (
        "## Dynamic typing\n\nPython is dynamically typed, which means a variable does not have "
        "a fixed type; the type belongs to the value, not the name."
    )
    chunk = SimpleNamespace(id=uuid4(), content=source)

    turn = tutor._mock_turn("What is dynamic typing?", [chunk], "beginner", None, None)

    assert turn.grounded is True
    assert "dynamically typed" in turn.answer
    assert "list" not in turn.answer.lower()
    assert "tuple" not in turn.answer.lower()
    assert turn.citations[0].snippet in source


def test_keyless_showcase_keeps_the_known_list_and_tuple_explanation() -> None:
    source = (
        "A list is mutable, meaning its contents can be changed after creation. "
        "A tuple is immutable, meaning its contents cannot be changed after creation."
    )
    chunk = SimpleNamespace(id=uuid4(), content=source)

    turn = tutor._mock_turn(
        "What is the difference between a list and a tuple?", [chunk], "beginner", None, None,
        {
            "topic_terms": ["list", "tuple"],
            "beginner_answer": "A list can change; a tuple stays fixed.",
            "beginner_follow_up": "Which would you choose for fixed coordinates?",
        },
    )

    assert turn.grounded is True
    assert "A list can change" in turn.answer
    assert turn.citations[0].snippet in source


def test_ollama_embedding_requires_database_dimensions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class Response:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict:
            return {"embeddings": [[1.0] * 768]}

    class Client:
        def __init__(self, **_kwargs) -> None:
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args) -> None:
            return None

        def post(self, *_args, **_kwargs) -> Response:
            return Response()

    monkeypatch.setenv("AI_PROVIDER", "ollama")
    monkeypatch.setattr(rag.httpx, "Client", Client)
    vector = rag.embed(["tuple"])[0]
    assert len(vector) == rag.EMBEDDING_DIMS
    assert vector[:768] == [1.0] * 768
    assert vector[768:] == [0.0] * 768


def test_ollama_turn_parses_schema_and_enforces_citation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    chunk = SimpleNamespace(id=uuid4(), content="A tuple is immutable after creation.")
    output = TutorTurn(
        intent="question",
        grounded=True,
        answer="A tuple is immutable.",
        citations=[{"chunk_id": str(chunk.id), "snippet": "A tuple is immutable"}],
        misconception_detected=False,
        misconception=None,
        remediation=None,
        verification_question=None,
        verification_verdict=None,
        follow_up_question=None,
    )

    def post(*_args, **_kwargs) -> httpx.Response:
        request = httpx.Request("POST", "http://ollama/api/chat")
        return httpx.Response(
            200,
            request=request,
            json={"message": {"content": output.model_dump_json()}},
        )

    monkeypatch.setattr(tutor.httpx, "post", post)
    turn = tutor._ollama_turn("What is a tuple?", [chunk], "beginner", [], None)
    assert turn.grounded is True
    assert turn.citations[0].chunk_id == str(chunk.id)


def test_ollama_normalization_repairs_latent_misconception() -> None:
    turn = TutorTurn(
        intent="answer_attempt",
        grounded=True,
        answer="Tuples cannot be changed after creation.",
        citations=[],
        misconception_detected=False,
        misconception=None,
        remediation="Review mutability.",
        verification_question="What happens if point[0] = 5?",
        verification_verdict=None,
        follow_up_question=None,
    )

    normalized = tutor._normalize_ollama_turn(turn, "A tuple can change later.")

    assert normalized.misconception_detected is True
    assert normalized.misconception == {
        "description": "The learner's answer conflicts with the lesson material.",
        "evidence": "A tuple can change later.",
    }
    assert normalized.remediation == "Tuples cannot be changed after creation."


def test_ollama_normalization_never_opens_misconception_for_question() -> None:
    turn = TutorTurn(
        intent="answer_attempt",
        grounded=True,
        answer="Lists can change.",
        citations=[],
        misconception_detected=False,
        misconception=None,
        remediation="Clarify the difference.",
        verification_question="Can a list change?",
        verification_verdict=None,
        follow_up_question=None,
    )

    normalized = tutor._normalize_ollama_turn(
        turn, "What is the difference between a list and a tuple?"
    )

    assert normalized.intent == "question"
    assert normalized.misconception_detected is False
    assert normalized.remediation is None
    assert normalized.verification_question is None


def test_focused_local_check_promotes_missed_misconception() -> None:
    turn = TutorTurn(
        intent="answer_attempt",
        grounded=True,
        answer="Tuples cannot be changed.",
        citations=[],
        misconception_detected=False,
        misconception=None,
        remediation=None,
        verification_question=None,
        verification_verdict=None,
        follow_up_question=None,
    )
    check = tutor.LocalMisconceptionCheck(
        contradicts_source=True,
        description="The learner says tuples can change, but the source says they cannot.",
        remediation="A tuple stays fixed after creation.",
        verification_question="What happens when you assign to point[0]?",
    )

    checked = tutor._apply_local_misconception_check(turn, check, "A tuple can change.")

    assert checked.misconception_detected is True
    assert checked.misconception["evidence"] == "A tuple can change."
    assert checked.remediation == "A tuple stays fixed after creation."
    assert checked.verification_question == "What happens when you assign to point[0]?"


def test_focused_verification_check_controls_transition() -> None:
    turn = TutorTurn(
        intent="answer_attempt",
        grounded=True,
        answer="The answer is correct.",
        citations=[],
        misconception_detected=True,
        misconception={"description": "Incorrect", "evidence": "Incorrect"},
        remediation="Incorrect",
        verification_question="Incorrect",
        verification_verdict="unresolved",
        follow_up_question="Incorrect",
    )

    checked = tutor._apply_local_verification_check(
        turn, tutor.LocalVerificationCheck(verdict="resolved")
    )

    assert checked.intent == "verification_response"
    assert checked.verification_verdict == "resolved"
    assert checked.misconception_detected is False
    assert checked.remediation is None
