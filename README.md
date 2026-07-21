# Pragyanta

## Judge quick start

This repository is ready for local judging. The default path needs Docker Desktop, but it does not need an OpenAI API key or Ollama:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Then open <http://localhost:6173>. The API is available at <http://localhost:9000/docs>.

The first startup creates the database and loads 14 bundled Python lessons with grounded practice questions. Open the first lesson marked **Guided showcase** and follow the built-in flow: ask the supported question, submit the tuple mutability misconception, answer the transfer question, and open the teacher report. The deterministic mock provider makes this path repeatable for judges while FastAPI, PostgreSQL, pgvector retrieval, citations, sessions, misconception state, and reports remain real.

For a custom lesson test, use **Upload lesson** in the teacher view and upload a selectable-text PDF. The teacher/student switch is a demo role view; authentication is intentionally outside this hackathon scope.

Run the checks from the repository root:

```powershell
docker compose exec api pytest -q
npm --prefix web test
npm --prefix web run build
.\smoke.ps1 http://localhost:9000
```

## How Codex and GPT-5.6 accelerated the build

Codex was used as the implementation partner across the full workflow: it inspected the existing React, FastAPI, PostgreSQL, and pgvector code; traced the lesson-to-tutor data flow; fixed the non-conflicting `6173/9000` ports and CORS contract; improved lesson ingestion and source-evidence selection; added lesson CRUD; repaired teacher/student role switching; and created focused API, frontend, smoke, and Playwright checks. Codex also generated the reproducible submission screenshots in `artifacts/`.

GPT-5.6 was used through Codex for architecture decisions, debugging, code changes, test design, lesson-content quality review, grounded-tutor behavior, and submission documentation. The key product decisions were to keep the tutor bounded by teacher-provided sources, make the detect/remediate/verify loop persistent and inspectable, provide deterministic keyless mode for reliable judging, and keep the live OpenAI provider optional rather than pretending that mock responses are live model output.

The result is a testable local submission: judges can start the stack, inspect the source-grounded answer and citation, trigger remediation, verify resolution, practise, and review the teacher report without configuring a model key.

Pragyanta is an evidence-based adaptive tutor. A teacher supplies trusted lesson material; the tutor answers from that material with citations, detects misconceptions in student responses, re-teaches them, verifies understanding, and exposes the learning gaps in a teacher report.

The core product loop is **detect → remediate → verify**. It is deliberately not a general-purpose chatbot.

## Run locally without an OpenAI key

The complete local demo works without a key. Deterministic mock embeddings and tutor turns are enabled by default, while PostgreSQL and pgvector remain real.

Prerequisite: Docker Desktop with Docker Compose.

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Open:

- Web: <http://localhost:6173>
- API health: <http://localhost:9000/health>
- API docs: <http://localhost:9000/docs>

The first startup applies Alembic migrations and loads all 14 bundled Python lessons plus their grounded practice bank idempotently. Database data is retained in the `pragyanta_postgres_data` Docker volume.

Keyless mode is intentionally limited: it validates every screen, route, database transition, and integration contract, but it does not measure real model quality. Keep these values in `.env`:

```dotenv
OPENAI_API_KEY=
CORS_ORIGINS=http://localhost:6173,http://127.0.0.1:6173
API_PORT=9000
WEB_PORT=6173
AI_PROVIDER=mock
MOCK_OPENAI=1
VITE_MOCK=0
```

`VITE_MOCK=0` connects the browser to the real local FastAPI/PostgreSQL stack. Use `VITE_MOCK=1` only for isolated frontend work.

### Keyless reviewer showcase

The guided question is not hard-coded in React. It is marked as the featured question in `api/question_bank.json`, loaded idempotently into PostgreSQL by `python -m api.seed`, and returned to the browser by the lesson/session API. This makes the same reviewer path available after every fresh deployment.

The hackathon review path requires only Docker—no OpenAI key and no Ollama installation. On the lesson library, open the first card labeled **Guided showcase** and use the built-in question:

1. Ask **What is the difference between a list and a tuple?**
2. Enter the known misconception: **A tuple is better because we can modify its values later.**
3. Answer the verification: **It raises an error because a tuple is immutable and cannot be changed.**
4. Open the teacher report and inspect the stored resolved misconception.

The keyless tutor response is deterministic, but the lesson chunks, vector retrieval, exact citation, session, messages, misconception transition, and report all use the real FastAPI/PostgreSQL/pgvector stack. No Ollama installation is required for the public reviewer path.

## Database and reproducible screen data

There is one schema and six independent scenario loaders. Each loader replaces only deterministic demo records; it does not recreate tables or remove user-created lessons.

```powershell
docker compose exec api python -m api.scripts.load_scenario landing
docker compose exec api python -m api.scripts.load_scenario grounded-answer
docker compose exec api python -m api.scripts.load_scenario remediation
docker compose exec api python -m api.scripts.load_scenario resolved
docker compose exec api python -m api.scripts.load_scenario off-topic
docker compose exec api python -m api.scripts.load_scenario report
```

Remove tagged guided-demo sessions and deterministic scenario data only. Ordinary learner sessions and user-created lessons are retained:

```powershell
docker compose exec api python -m api.scripts.reset_demo_data
```

Schema changes belong in Alembic migrations. Scenario scripts only create reproducible data states. `docker compose down` preserves PostgreSQL; `docker compose down -v` permanently removes the local volume and should only be used for an intentional full reset.

## Test

Unit and contract tests use real Docker PostgreSQL with deterministic mock AI. They never call OpenAI and require no API key.

```powershell
docker compose exec api pytest -q
npm --prefix web test
npm --prefix web run build
```

The smoke journey verifies health → seed lesson → session → tutor turn → report:

```powershell
.\smoke.ps1 http://localhost:9000 -ResetDemoData
```

On macOS/Linux:

```bash
chmod +x smoke.sh
./smoke.sh http://localhost:9000 --reset-demo-data
```

For a deployed API, omit the local Docker cleanup option and pass the public API URL: `.\smoke.ps1 https://your-api.example`. Run the reset-enabled command only against the local Docker environment.

## Enable the real OpenAI tutor later

When a key is available, update `.env` without committing it:

```dotenv
OPENAI_API_KEY=your-key-in-your-local-env
AI_PROVIDER=openai
VITE_MOCK=0
```

Then restart the API:

```powershell
docker compose up -d --force-recreate api
```

Runtime uses `text-embedding-3-small` and the tutor model configured in `api/tutor.py`. Real prompt quality is evaluated separately because it spends API credits:

```powershell
docker compose exec api python api/tests/eval_tutor.py
```

The committed 25-case golden set covers genuine misconceptions, correct-answer false-positive traps, off-topic grounding traps, verification transfer, parroted answers, and ambiguous short responses. The target is at least 90% before UI polish is considered final.

## Architecture

```text
React 18 + Vite (host 6173, container 5173)
          ↓ JSON HTTP
FastAPI + SQLAlchemy (host 9000, container 8000)
          ↓
PostgreSQL 16 + pgvector
```

Core tables are `lessons`, `chunks`, `sessions`, `messages`, and `misconceptions`. Deleting a lesson cascades through its derived records. No authentication is included; the teacher/student role is a demo UI switch by design.

## Useful commands

```powershell
docker compose ps
docker compose logs -f api
docker compose exec api alembic current
docker compose exec db psql -U postgres -d pragyanta -c "\dt"
docker compose exec db psql -U postgres -d pragyanta -c "\dx vector"
```

## API contract

- `POST /api/lessons` — create from JSON text or a PDF upload
- `GET /api/lessons` — list lessons
- `POST /api/sessions` — begin a learner session
- `PATCH /api/sessions/{id}` — change subsequent explanation level
- `POST /api/sessions/{id}/chat` — run the tutor loop
- `GET /api/sessions/{id}/messages` — ordered history
- `GET /api/lessons/{id}/report` — misconception evidence and totals

All expected API errors are returned as JSON with a safe `error` message; raw model output and tracebacks are never sent to the browser.

## Deployment

- `deploy/DEPLOYMENT.md` — credential-free Render/Railway preparation and public smoke checks

`render.yaml` is deployment-ready, but no public deployment URL is claimed until a provider account creates and verifies it.
