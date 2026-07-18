# Pragyanta deployment runbook

The repository includes a Render Blueprint in `render.yaml`. It provisions a
static Vite site, a Docker-based FastAPI service, and managed PostgreSQL. The API
runs Alembic migrations and the idempotent lesson seed before every start.

The default is deliberately keyless: `MOCK_OPENAI=1`. No OpenAI credential is
needed. Real model calls can be enabled later by storing `OPENAI_API_KEY` in the
host's secret manager and changing `MOCK_OPENAI` to `0`; never put the key in a
file or Blueprint.

## Production URL configuration

The Blueprint prompts for two public values because their final hostnames are
assigned when the services are created:

- Set API `CORS_ORIGINS` to the exact public web origin, without a trailing slash.
- Set web `VITE_API_BASE_URL` to the exact public API URL, without a trailing slash.

The API normalizes a provider `postgresql://...` URL to SQLAlchemy's
driver-qualified Psycopg 3 form without logging credentials.

## Render setup

1. Run the local checks:

   ```powershell
   .\deploy\check-readiness.ps1 `
     -ApiUrl https://YOUR-API.onrender.com `
     -WebUrl https://YOUR-WEB.onrender.com
   ```

2. Create a Blueprint from `render.yaml`. Review the selected plans before
   confirming; plan availability and pricing can change.
3. Set API `CORS_ORIGINS` to the final web origin and web
   `VITE_API_BASE_URL` to the final public API URL, both with no trailing slash.
   Vite variables are build-time values, so rebuild the static site after a
   change.
4. Confirm the managed PostgreSQL role can execute
   `CREATE EXTENSION IF NOT EXISTS vector`. The initial Alembic migration does
   this automatically, but the deployment must stop if the provider disallows it.
5. Deploy the API first, verify `/health`, then deploy/rebuild the web service.
6. Run the read-only production smoke test:

   ```powershell
   .\deploy\smoke-production.ps1 `
     -ApiUrl https://YOUR-API.onrender.com `
     -WebUrl https://YOUR-WEB.onrender.com
   ```

The smoke test reads the web shell, health endpoint, lesson list, and CORS
preflight. It deliberately does not create sessions, messages, lessons, or
misconceptions.

## Required environment

| Service | Variable | Value |
|---|---|---|
| API | `DATABASE_URL` | Managed PostgreSQL connection string (secret) |
| API | `CORS_ORIGINS` | Exact public HTTPS web origin |
| API | `MOCK_OPENAI` | `1` for credential-free deterministic behavior |
| Web | `VITE_API_BASE_URL` | Public HTTPS API URL |
| Web | `VITE_MOCK` | `0` |
| Web | `VITE_SHOW_DEMO_SWITCHER` | `false` |

`OPENAI_API_KEY` is optional and should be absent in keyless mode.

## Railway equivalent

Use one managed PostgreSQL service with pgvector support, one API service built
from `api/Dockerfile`, and one static web service rooted at `web`. The API start
command is:

```sh
sh -c "alembic upgrade head && python -m api.seed && uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"
```

Apply the same environment table and run the same readiness and smoke checks.
Do not expose the database publicly merely to run migrations; migrations run
inside the API service over the provider's private network.

## Rollback and data safety

- Roll back application images independently of PostgreSQL.
- Do not run `alembic downgrade` against production as an automatic rollback.
- Take a provider snapshot before any later destructive schema migration.
- The current startup seed is idempotent and does not replace existing lessons.
- Keep database backups and secrets in the hosting provider, not in Git.
