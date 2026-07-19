from types import SimpleNamespace
from uuid import uuid4

import httpx
import pytest

from api import rag, tutor
from api.ai import get_ai_provider
from api.schemas import TutorTurn


def test_citation_display_text_removes_markdown_structure() -> None:
    assert tutor._clean_citation_text("## §1 What lists and tuples are") == "What lists and tuples are"
    assert tutor._clean_citation_text("1. Lists are mutable") == "Lists are mutable"
    assert tutor._clean_citation_text("- Tuples are immutable") == "Tuples are immutable"


def test_provider_defaults_to_mock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    monkeypatch.setenv("MOCK_OPENAI", "1")
    assert get_ai_provider() == "mock"


def test_provider_rejects_openai_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_PROVIDER", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="OPENAI_API_KEY"):
        get_ai_provider()


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
