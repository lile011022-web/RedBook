# RedBook

RedBook is a compliant multi-account operations console MVP for Xiaohongshu content teams. It includes a FastAPI backend and an Electron + React desktop app for account setup, persona guidance, AI-assisted draft suggestions, manual review, scheduling, media metadata, manual publish records, and basic analytics entry.

## Compliance Boundary

This project does not implement automatic login, automatic publishing, batch control, proxy switching, device fingerprint spoofing, likes automation, comment automation, private-message automation, scraping, or any bypass of platform risk controls. Publishing workflows are designed for human review and manual publishing.

## Repository Layout

```text
apps/api        FastAPI backend
apps/desktop    Electron + React desktop app
packages/shared Shared TypeScript constants
infra           Docker Compose and API container config
docs            Product specs and implementation plans
```

## Environment

Copy `.env.example` to `.env` for local development and fill in real secret values locally. Do not commit `.env` files or credentials.

```powershell
Copy-Item .env.example .env
```

SQLite is the default local database:

```text
DATABASE_URL=sqlite:///./redbook.db
```

For Docker, the compose stack sets:

```text
DATABASE_URL=postgresql+psycopg://redbook:redbook@postgres:5432/redbook
S3_ENDPOINT_URL=http://minio:9000
```

## Backend Development

```powershell
cd apps/api
python -m pip install -e ".[dev]"
python -m pytest -q
python -m uvicorn app.main:app --reload --port 8010
```

Health check:

```text
GET http://127.0.0.1:8010/health
```

## Desktop Development

Install workspace dependencies first:

```powershell
npm install
```

Build the desktop app:

```powershell
npm run desktop:build
```

Run the Vite desktop UI during development:

```powershell
cd apps/desktop
npm run dev
```

The packaged Electron app loads `apps/desktop/dist/index.html`. The development Electron main process loads `http://127.0.0.1:5173` unless `VITE_DEV_SERVER_URL` is set.

## Docker Stack

The Docker stack runs the API, PostgreSQL, and MinIO:

```powershell
docker compose -f infra/docker-compose.yml config
docker compose -f infra/docker-compose.yml up --build
```

Services:

```text
API      http://127.0.0.1:8000
MinIO    http://127.0.0.1:9000
MinIO UI http://127.0.0.1:9001
```

Change all sample credentials before production use.

## Windows Packaging

Create a Windows installer with Electron Builder:

```powershell
npm run desktop:package:win
```

Generated artifacts are written under `apps/desktop/release` and are ignored by Git. The build also creates `apps/desktop/dist` and `apps/desktop/dist-electron`, which are ignored.

## User Guide

See `docs/user-guide.md` for installation, startup, daily workflow, and troubleshooting instructions.

## Verification Checklist

Run these before publishing a change:

```powershell
cd apps/api
python -m pytest -q
cd ..\..
npm run desktop:build
docker compose -f infra/docker-compose.yml config
```

If Docker or npm is unavailable in the current shell, use the available runtime path for TypeScript/Vite verification and report the missing external tool clearly.
