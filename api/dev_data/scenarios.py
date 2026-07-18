"""Scenario registry for the six approved Pragyanta screens."""

from __future__ import annotations

from sqlalchemy.orm import Session

from api.models import LearnerLevel, MessageType, MisconceptionStatus
from api.dev_data.common import (
    STUDENT,
    TUTOR,
    add_messages,
    add_misconception,
    citation,
    create_lesson,
    create_session,
)


def landing(db: Session) -> None:
    create_lesson(db)


def grounded_answer(db: Session) -> None:
    create_lesson(db)
    learning_session = create_session(db, "grounded-answer")
    add_messages(db, learning_session.id, [
        {"role": STUDENT, "content": "What’s the difference between a list and a tuple?"},
        {
            "role": TUTOR,
            "content": "A list can be changed after you create it, while a tuple cannot. Use a list for values that need to change and a tuple for a fixed group of values.",
            "citations": citation(1),
        },
        {
            "role": TUTOR,
            "content": "Quick check — if you needed to store coordinates that must never change, which would you pick, and why?",
            "msg_type": MessageType.diagnostic_question,
        },
    ])


def remediation(db: Session) -> None:
    create_lesson(db)
    learning_session = create_session(db, "remediation")
    evidence = "A tuple is better because we can modify its values later."
    add_messages(db, learning_session.id, [
        {"role": STUDENT, "content": "What’s the difference between a list and a tuple?"},
        {"role": TUTOR, "content": "A list can change after creation; a tuple cannot.", "citations": citation(1)},
        {"role": TUTOR, "content": "Which would you use for coordinates that must never change?", "msg_type": MessageType.diagnostic_question},
        {"role": STUDENT, "content": evidence},
        {
            "role": TUTOR,
            "content": "Lists and tuples have been mixed up: lists can change, while tuples cannot. Think of a list like a whiteboard—you can erase and rewrite it. A tuple is like a printed page: once printed, its values stay fixed.",
            "msg_type": MessageType.remediation,
            "citations": citation(1),
        },
        {
            "role": TUTOR,
            "content": "You have point = (3, 4). What happens if you run point[0] = 5?",
            "msg_type": MessageType.verification_question,
        },
    ])
    add_misconception(
        db,
        learning_session.id,
        key="remediation:tuple-mutable",
        description="The student believes tuple values can be modified.",
        evidence=evidence,
        status=MisconceptionStatus.open,
        detected_minute=4,
    )


def resolved(db: Session) -> None:
    create_lesson(db)
    learning_session = create_session(db, "resolved")
    evidence = "A tuple is better because we can modify its values later."
    add_messages(db, learning_session.id, [
        {"role": STUDENT, "content": evidence},
        {
            "role": TUTOR,
            "content": "Lists can change, while tuples cannot. You have point = (3, 4). What happens if you run point[0] = 5?",
            "msg_type": MessageType.verification_question,
            "citations": citation(1),
        },
        {"role": STUDENT, "content": "It will throw an error, because tuples can’t be changed after creation."},
        {
            "role": TUTOR,
            "content": "Exactly. A tuple does not support item assignment because it is immutable. You’ve got the key difference.",
            "msg_type": MessageType.verdict,
            "verdict_status": MisconceptionStatus.resolved,
        },
    ])
    add_misconception(
        db,
        learning_session.id,
        key="resolved:tuple-mutable",
        description="The student believes tuple values can be modified.",
        evidence=evidence,
        status=MisconceptionStatus.resolved,
        detected_minute=1,
        resolved_minute=4,
    )


def off_topic(db: Session) -> None:
    create_lesson(db)
    learning_session = create_session(db, "off-topic", learner_level=LearnerLevel.intermediate)
    add_messages(db, learning_session.id, [
        {"role": STUDENT, "content": "Who won the cricket world cup?"},
        {
            "role": TUTOR,
            "content": "That’s outside this lesson’s material. I can only teach from the sources your teacher provided.",
            "msg_type": MessageType.off_topic,
        },
    ])


def report(db: Session) -> None:
    create_lesson(db)
    resolved_session = create_session(db, "report", suffix="resolved", minute=0)
    unresolved_session = create_session(db, "report", suffix="unresolved", minute=10)
    open_session = create_session(db, "report", suffix="open", minute=20)

    rows = (
        (resolved_session, "resolved", "The student believes tuple values can be modified.", "A tuple is better because we can modify its values later.", MisconceptionStatus.resolved, 2, 7),
        (unresolved_session, "unresolved", "The student believes lists cannot contain mixed data types.", "Every item in a list has to be the same type.", MisconceptionStatus.unresolved, 12, None),
        (open_session, "open", "The student confuses tuple unpacking with modifying a tuple.", "Unpacking changes the original tuple.", MisconceptionStatus.open, 22, None),
    )
    for learning_session, key, description, evidence, status, detected, resolved_at in rows:
        add_messages(db, learning_session.id, [{"role": STUDENT, "content": evidence}])
        add_misconception(
            db,
            learning_session.id,
            key=f"report:{key}",
            description=description,
            evidence=evidence,
            status=status,
            detected_minute=detected,
            resolved_minute=resolved_at,
        )


SCENARIOS = {
    "landing": landing,
    "grounded-answer": grounded_answer,
    "remediation": remediation,
    "resolved": resolved,
    "off-topic": off_topic,
    "report": report,
}

