# Pragyanta

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

- Web: <http://localhost:5173>
- API health: <http://localhost:8000/health>
- API docs: <http://localhost:8000/docs>

The first startup applies Alembic migrations and loads the bundled **Python Lists and Tuples** lesson idempotently. Database data is retained in the `pragyanta_postgres_data` Docker volume.

Keyless mode is intentionally limited: it validates every screen, route, database transition, and integration contract, but it does not measure real model quality. Keep these values in `.env`:

```dotenv
OPENAI_API_KEY=
MOCK_OPENAI=1
VITE_MOCK=0
```

`VITE_MOCK=0` connects the browser to the real local FastAPI/PostgreSQL stack. Use `VITE_MOCK=1` only for isolated frontend work.

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

Remove deterministic demo data only:

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
.\smoke.ps1 http://localhost:8000
```

On macOS/Linux:

```bash
chmod +x smoke.sh
./smoke.sh http://localhost:8000
```

The same command accepts a deployed API URL and should be run immediately before recording the demo.

## Enable the real OpenAI tutor later

When a key is available, update `.env` without committing it:

```dotenv
OPENAI_API_KEY=your-key-in-your-local-env
MOCK_OPENAI=0
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
React 18 + Vite (5173)
          ↓ JSON HTTP
FastAPI + SQLAlchemy (8000)
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

## Demo, architecture, and deployment

- `docs/DEMO.md` — exact three-minute recording runbook
- `docs/SUBMISSION.md` — Devpost-ready submission copy
- `docs/ARCHITECTURE.md` — application and data-flow architecture
- `docs/RELEASE_CHECKLIST.md` — local, demo, and production gates
- `deploy/DEPLOYMENT.md` — credential-free Render/Railway preparation and public smoke checks

`render.yaml` is deployment-ready, but no public deployment URL is claimed until a provider account creates and verifies it.
