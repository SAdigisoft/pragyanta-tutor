from __future__ import annotations

from io import BytesIO
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas
from sqlalchemy import select

from api import tutor
from api.database import SessionLocal
from api.models import Chunk, LearnerLevel, PracticeQuestion


def _assert_error(response, expected_status: int) -> None:
    assert response.status_code == expected_status, response.text
    body = response.json()
    assert set(body) == {"error"}
    assert isinstance(body["error"], str) and body["error"]


def _pdf_bytes(text: str) -> bytes:
    stream = BytesIO()
    pdf = canvas.Canvas(stream)
    pdf.drawString(72, 720, text)
    pdf.save()
    return stream.getvalue()


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_and_list_text_lesson(client: TestClient, lesson: dict) -> None:
    assert set(lesson) == {"lesson_id", "title", "created_at", "chunk_count", "question_count"}
    assert lesson["title"] == "Contract test: lists and tuples"
    assert lesson["chunk_count"] >= 1

    response = client.get("/api/lessons")
    assert response.status_code == 200
    listed = next(row for row in response.json() if row["lesson_id"] == lesson["lesson_id"])
    assert set(listed) == {"lesson_id", "title", "created_at", "chunk_count", "question_count"}
    assert listed["question_count"] == 0


def test_create_pdf_lesson(client: TestClient) -> None:
    response = client.post(
        "/api/lessons",
        data={"title": "PDF contract lesson"},
        files={"file": ("lesson.pdf", _pdf_bytes("Tuples are immutable."), "application/pdf")},
    )
    assert response.status_code == 201, response.text
    assert response.json()["chunk_count"] >= 1


def test_create_lesson_rejects_empty_body(client: TestClient) -> None:
    response = client.post("/api/lessons", json={})
    _assert_error(response, 422)


def test_create_session_and_reject_bad_lesson(client: TestClient, lesson: dict) -> None:
    response = client.post(
        "/api/sessions",
        json={"lesson_id": lesson["lesson_id"], "learner_level": "intermediate"},
    )
    assert response.status_code == 201, response.text
    assert set(response.json()) == {"session_id"}

    missing = client.post(
        "/api/sessions",
        json={"lesson_id": str(uuid4()), "learner_level": "beginner"},
    )
    _assert_error(missing, 404)


def test_update_session_level(client: TestClient, session: dict) -> None:
    detail = client.get(f"/api/sessions/{session['session_id']}")
    assert detail.status_code == 200, detail.text
    assert detail.json()["lesson_title"] == "Contract test: lists and tuples"
    assert detail.json()["learner_level"] == "beginner"

    response = client.patch(
        f"/api/sessions/{session['session_id']}",
        json={"learner_level": "intermediate"},
    )
    assert response.status_code == 200, response.text
    assert response.json() == {
        "session_id": session["session_id"],
        "learner_level": "intermediate",
    }


def test_list_sessions_for_sidebar(client: TestClient, lesson: dict, session: dict) -> None:
    response = client.get("/api/sessions")
    assert response.status_code == 200, response.text
    listed = next(row for row in response.json() if row["session_id"] == session["session_id"])
    assert listed == {
        "session_id": session["session_id"],
        "lesson_id": lesson["lesson_id"],
        "lesson_title": lesson["title"],
        "learner_level": "beginner",
        "last_message": None,
        "created_at": listed["created_at"],
    }


def test_practice_questions_include_exact_source_evidence(client: TestClient, lesson: dict) -> None:
    lesson_id = UUID(lesson["lesson_id"])
    with SessionLocal.begin() as db:
        chunk = db.scalar(select(Chunk).where(Chunk.lesson_id == lesson_id))
        source_quote = "A list is mutable, meaning its contents can be changed after creation."
        db.add(PracticeQuestion(
            lesson_id=lesson_id,
            chunk_id=chunk.id,
            kind="mcq",
            difficulty=LearnerLevel.beginner,
            prompt="Which collection can change after creation?",
            options=["A list", "A tuple", "Neither", "Both are fixed"],
            answer="A list",
            explanation="The lesson identifies lists as mutable.",
            misconception="Confusing list and tuple mutability.",
            source_quote=source_quote,
        ))

    response = client.get(f"/api/lessons/{lesson['lesson_id']}/questions")
    assert response.status_code == 200, response.text
    question = response.json()[0]
    assert question["answer"] in question["options"]
    assert question["source_quote"] == source_quote


def test_question_chat_has_ordered_messages_and_citation(client: TestClient, session: dict) -> None:
    response = client.post(
        f"/api/sessions/{session['session_id']}/chat",
        json={"message": "What's the difference between a list and a tuple?"},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body) == {"tutor_messages", "misconception_update"}
    assert body["misconception_update"] is None
    assert len(body["tutor_messages"]) >= 2
    assert body["tutor_messages"][0]["msg_type"] == "chat"
    assert body["tutor_messages"][0]["citations"]
    assert body["tutor_messages"][1]["msg_type"] == "diagnostic_question"

    history = client.get(f"/api/sessions/{session['session_id']}/messages")
    assert history.status_code == 200
    messages = history.json()
    assert messages[0]["role"] == "student"
    assert [m["msg_type"] for m in messages[1:3]] == ["chat", "diagnostic_question"]


def test_keyless_chat_is_grounded_in_a_non_showcase_lesson(client: TestClient) -> None:
    created = client.post(
        "/api/lessons",
        json={
            "title": "Contract test: dynamic typing",
            "text": (
                "## Dynamic typing\n\nPython is dynamically typed, which means a variable does not "
                "have a fixed type; the type belongs to the value, not the name."
            ),
        },
    )
    assert created.status_code == 201, created.text
    started = client.post(
        "/api/sessions",
        json={"lesson_id": created.json()["lesson_id"], "learner_level": "beginner"},
    )
    assert started.status_code == 201, started.text

    response = client.post(
        f"/api/sessions/{started.json()['session_id']}/chat",
        json={"message": "What is dynamic typing?"},
    )

    assert response.status_code == 200, response.text
    answer = response.json()["tutor_messages"][0]
    assert "dynamically typed" in answer["content"]
    assert "list" not in answer["content"].lower()
    assert "tuple" not in answer["content"].lower()
    assert answer["citations"]


def test_misconception_then_resolution_updates_report(
    client: TestClient, lesson: dict, session: dict
) -> None:
    wrong = client.post(
        f"/api/sessions/{session['session_id']}/chat",
        json={"message": "A tuple is better because we can modify its values later."},
    )
    assert wrong.status_code == 200, wrong.text
    wrong_body = wrong.json()
    assert wrong_body["misconception_update"]["status"] == "open"
    assert [m["msg_type"] for m in wrong_body["tutor_messages"]] == [
        "remediation",
        "verification_question",
    ]

    opened = client.get(f"/api/lessons/{lesson['lesson_id']}/report")
    assert opened.status_code == 200
    assert opened.json()["summary"] == {"total": 1, "resolved": 0, "unresolved": 0, "open": 1}

    correct = client.post(
        f"/api/sessions/{session['session_id']}/chat",
        json={"message": "It raises an error because tuples cannot be changed after creation."},
    )
    assert correct.status_code == 200, correct.text
    correct_body = correct.json()
    assert correct_body["misconception_update"]["status"] == "resolved"
    assert correct_body["tutor_messages"][0]["msg_type"] == "verdict"

    report = client.get(f"/api/lessons/{lesson['lesson_id']}/report")
    assert report.status_code == 200
    body = report.json()
    assert body["summary"] == {"total": 1, "resolved": 1, "unresolved": 0, "open": 0}
    assert sum(body["summary"][key] for key in ("resolved", "unresolved", "open")) == body["summary"]["total"]
    assert body["misconceptions"][0]["resolved_at"] is not None


def test_unknown_resources_and_empty_chat_are_safe(client: TestClient) -> None:
    unknown = str(uuid4())
    _assert_error(client.get(f"/api/lessons/{unknown}/report"), 404)
    _assert_error(client.get(f"/api/sessions/{unknown}/messages"), 404)
    _assert_error(client.post(f"/api/sessions/{unknown}/chat", json={"message": "hello"}), 404)

    response = client.post(f"/api/sessions/{unknown}/chat", json={"message": ""})
    _assert_error(response, 422)


def test_malformed_mock_llm_response_does_not_leak_raw_data(
    client: TestClient, session: dict, monkeypatch
) -> None:
    raw_model_data = "this is deliberately not valid JSON"

    def malformed(*_args, **_kwargs):
        raise ValueError(raw_model_data)

    monkeypatch.setattr(tutor, "_mock_turn", malformed)
    response = client.post(
        f"/api/sessions/{session['session_id']}/chat",
        json={"message": "Explain tuples."},
    )
    assert response.status_code == 502
    body = response.json()
    serialized = response.text.lower()
    assert "traceback" not in serialized
    assert "validationerror" not in serialized
    assert raw_model_data.lower() not in serialized
    assert set(body) == {"error"}
    history = client.get(f"/api/sessions/{session['session_id']}/messages")
    assert history.status_code == 200
    assert history.json() == []
