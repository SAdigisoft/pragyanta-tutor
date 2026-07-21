# Pragyanta Tutor — Demo Guide

This guide explains how to run Pragyanta Tutor locally and walk through the full demo. It is
written for hackathon judges and anyone opening the repository.

## What you will see

Pragyanta is an **evidence-based adaptive tutor**. A teacher supplies lesson material; the
tutor answers **only from that material with citations**, detects student misconceptions,
re-teaches them, verifies understanding, and exposes the learning gaps in a teacher report.
The core loop is **detect → remediate → verify** — it is deliberately not a general-purpose
chatbot.

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- No OpenAI API key required. The default demo runs in a deterministic **keyless mock mode**
  so the flow is repeatable for judging.

## Run the project

From the repository root:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
docker compose up --build
```

```bash
# macOS / Linux
cp .env.example .env
docker compose up --build
```

The first startup creates the database and loads 14 bundled Python lessons with grounded
practice questions.

### URLs

| Service | URL |
| --- | --- |
| Frontend (app) | http://localhost:6173 |
| Backend API | http://localhost:9000 |
| API docs (Swagger) | http://localhost:9000/docs |

## Demo flow (guided showcase)

The full **detect → remediate → verify** experience is scripted on the lesson card marked
**"Guided showcase" — "Python Lists and Tuples"**. Start there:

1. Open the frontend at http://localhost:6173.
2. Open the lesson marked **Guided showcase** (Python Lists and Tuples).
3. Start a **student** tutor session.
4. **Ask a supported question** from the lesson — the tutor answers using lesson evidence and
   shows a **citation** back to the source material.
5. **Submit the tuple-mutability misconception** (answer as if you believe tuples are
   mutable). The tutor **detects the misconception and re-teaches** it (remediation).
6. **Answer the transfer/verify question** correctly — the tutor **verifies** that the
   misconception is resolved.
7. Switch to the **teacher** role and open the **teacher report** to see the detected
   misconception, whether it was resolved, and the supporting evidence.

## Try your own lesson

1. Switch to the **teacher** view.
2. Use **Upload lesson** and upload a **selectable-text PDF** (or paste lesson text).
3. The lesson is chunked, embedded, and made available to the tutor.
4. Ask questions against it — answers stay grounded in your uploaded material with citations.

> Note: the scripted misconception/verify demo is tuned for the featured "Guided showcase"
> lesson. Custom lessons demonstrate grounded, cited Q&A.

## Practice quiz

Every one of the 14 lessons has a **Practice** screen with grounded multiple-choice questions
(precomputed, no runtime AI needed). Open any lesson and choose **Practice** to try it.

## Run the checks

From the repository root, with the stack running:

```powershell
docker compose exec api pytest -q      # backend tests
npm --prefix web test                  # frontend tests
npm --prefix web run build             # production build
.\smoke.ps1 http://localhost:9000      # API smoke test (smoke.sh on macOS/Linux)
```

## Troubleshooting

- **Ports already in use (6173 / 9000):** stop whatever is using them, or change `WEB_PORT` /
  `API_PORT` in `.env`, then re-run `docker compose up --build`.
- **Docker not running:** start Docker Desktop and wait until it reports "running" before
  `docker compose up`.
- **Blank page or API errors on first load:** the very first startup builds the database and
  seeds lessons — give it a few seconds and refresh http://localhost:6173.
- **Want a clean slate:** `docker compose down -v` removes the database volume, then
  `docker compose up --build` re-seeds from scratch.
- **PDF upload finds no text:** the PDF must be **selectable-text**, not a scanned image.
- **Frontend can't reach the API:** confirm both containers are up (`docker compose ps`) and
  that `CORS_ORIGINS` in `.env` includes `http://localhost:6173`.
