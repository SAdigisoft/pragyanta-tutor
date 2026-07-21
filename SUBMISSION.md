# Pragyanta Tutor

An evidence-based adaptive tutor that answers **only from teacher-approved lesson material**,
detects student misconceptions, re-teaches them, and verifies understanding — then surfaces
the learning gaps in a teacher report. Built for OpenAI Build Week.

## Inspiration

Most AI tutors can answer from anywhere on the internet, but classrooms need students to learn
from **approved material**. A general chatbot can be confidently wrong, wander off-topic, or
teach something the teacher never assigned. Teachers also have no visibility into *where* a
student is actually struggling. We built Pragyanta Tutor to make AI tutoring **safer,
grounded, and classroom-ready** — and to give teachers a window into each student's
misconceptions.

## What it does

- **Teachers upload lesson material** (a selectable-text PDF or pasted text). It is chunked,
  embedded, and stored as the tutor's only source of truth.
- **Students ask questions**, and the tutor answers **using only the approved lesson material,
  with citations** back to the source. Off-topic questions are declined rather than answered.
- **It runs a detect → remediate → verify loop:** when a student's answer reveals a
  misconception, the tutor detects it, re-teaches the concept, and then verifies the student
  has understood before moving on.
- **A practice mode** offers grounded multiple-choice questions for every lesson.
- **A teacher report** aggregates each student's detected misconceptions, whether they were
  resolved, and the supporting evidence — turning tutoring into actionable insight.
- **A deterministic keyless mode** lets anyone run and evaluate the full experience without an
  API key, so judging is reliable and repeatable.

## How we built it

The product is organized around a single, inspectable loop rather than an open-ended chat.
Teacher material is ingested into a **PostgreSQL + pgvector** store; the tutor retrieves the
most relevant chunks, answers within those bounds, and enforces a **citation guardrail** so
every answer (and every generated practice question) carries a verbatim source quote. The
detect → remediate → verify state is **persisted and inspectable**, which is what makes the
teacher report possible. The stack ships with a deterministic mock provider so the core flow
is reproducible, while a live model provider remains optional.

## Built with

- **Frontend:** React 18 + Vite
- **Backend:** FastAPI (Python)
- **Database & retrieval:** PostgreSQL 16 + pgvector, Alembic migrations
- **AI:** pluggable provider (deterministic keyless mock for judging; OpenAI optional)
- **PDF ingestion:** selectable-text extraction, chunking, and embeddings
- **Infrastructure:** Docker / Docker Compose
- **Testing:** pytest, Vitest, Playwright end-to-end, and an API smoke test

## Challenges we ran into

- **Keeping the tutor grounded.** Preventing the model from answering outside the approved
  material required enforcing citations and declining off-topic questions instead of guessing.
- **Making the learning loop inspectable.** Persisting misconception state through
  detect → remediate → verify (rather than a stateless chat) is what powers the teacher
  report, but it took careful data modeling.
- **Reliable, repeatable judging.** We built a deterministic keyless mock path so the full
  demo runs identically for every judge, without spending API credits or depending on a key.

## Accomplishments that we're proud of

- A working, grounded tutor with **verbatim citations** — not a general chatbot.
- A **persistent, inspectable** misconception loop and a real teacher report.
- A **14-lesson Python curriculum** with grounded practice questions across every chapter.
- A one-command local run (`docker compose up --build`) that works **without an API key**.
- A tested submission: backend, frontend, end-to-end, and smoke checks all green.

## What we learned

- Grounding and guardrails matter more than raw model power for a classroom tool — trust comes
  from the tutor staying inside approved material and showing its evidence.
- Modeling the *pedagogy* (detect → remediate → verify) as first-class, persisted state, not
  just a conversation, is what turns a tutor into something a teacher can act on.
- Deterministic, keyless demo modes make a project genuinely reviewable by others.

## What's next

- Richer misconception detection across more subjects and lesson types.
- Teacher analytics across a whole class, not just per session.
- Authentication and multi-classroom support (intentionally out of scope for the hackathon).
- Optional live-model deployment for schools that want it, alongside the grounded defaults.

## Team

Built by **SADigisoft**.
