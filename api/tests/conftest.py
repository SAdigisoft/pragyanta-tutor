from __future__ import annotations

import os
from uuid import UUID

# Contract tests must never spend money or require a developer secret.
os.environ["AI_PROVIDER"] = "mock"
os.environ.setdefault("MOCK_OPENAI", "1")
os.environ.pop("OPENAI_API_KEY", None)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import or_, select

from api.main import app
from api.database import SessionLocal
from api.models import Lesson


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def cleanup_contract_test_data():
    yield
    with SessionLocal.begin() as db:
        rows = db.scalars(select(Lesson).where(or_(Lesson.title.like("Contract test:%"), Lesson.title == "PDF contract lesson")))
        for row in rows:
            db.delete(row)


@pytest.fixture
def lesson(client: TestClient) -> dict:
    response = client.post(
        "/api/lessons",
        json={
            "title": "Contract test: lists and tuples",
            "text": (
                "A list is mutable, meaning its contents can be changed after creation. "
                "A tuple is immutable, meaning its contents cannot be changed after creation. "
                "Use a tuple for fixed coordinates and a list for a changing shopping cart."
            ),
        },
    )
    assert response.status_code == 201, response.text
    created = response.json()
    try:
        yield created
    finally:
        with SessionLocal.begin() as db:
            stored = db.get(Lesson, UUID(created["lesson_id"]))
            if stored:
                db.delete(stored)


@pytest.fixture
def session(client: TestClient, lesson: dict) -> dict:
    response = client.post(
        "/api/sessions",
        json={"lesson_id": lesson["lesson_id"], "learner_level": "beginner"},
    )
    assert response.status_code == 201, response.text
    return response.json()
