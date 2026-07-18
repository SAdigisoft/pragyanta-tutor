"""Exercise the critical live-model journey through the public HTTP API."""

import json
import os

import httpx


def main() -> None:
    base_url = os.getenv("VERIFY_API_URL", "http://localhost:8000").rstrip("/")
    with httpx.Client(base_url=base_url, timeout=240.0) as client:
        lessons = client.get("/api/lessons").raise_for_status().json()
        lesson = next(item for item in lessons if item["title"] == "Python Lists and Tuples")
        session_id = client.post(
            "/api/sessions",
            json={"lesson_id": lesson["lesson_id"], "learner_level": "beginner"},
        ).raise_for_status().json()["session_id"]

        wrong = client.post(
            f"/api/sessions/{session_id}/chat",
            json={"message": "A tuple is better because we can modify its values later."},
        ).raise_for_status().json()
        assert wrong["misconception_update"]["status"] == "open", wrong
        assert [item["msg_type"] for item in wrong["tutor_messages"]] == [
            "remediation",
            "verification_question",
        ], wrong

        correct = client.post(
            f"/api/sessions/{session_id}/chat",
            json={"message": "It raises an error because tuples cannot be changed after creation."},
        ).raise_for_status().json()
        assert correct["misconception_update"]["status"] == "resolved", correct
        assert correct["tutor_messages"][0]["msg_type"] == "verdict", correct

        history = client.get(f"/api/sessions/{session_id}/messages").raise_for_status().json()
        assert [item["msg_type"] for item in history] == [
            "chat",
            "remediation",
            "verification_question",
            "chat",
            "verdict",
        ], history

    print("PASS live Ollama detect -> remediate -> verify journey")
    print(f"session_id={session_id}")
    print(json.dumps({"wrong_turn": wrong, "verification_turn": correct}, indent=2))


if __name__ == "__main__":
    main()
