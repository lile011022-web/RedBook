# RedBook

RedBook is a compliant multi-account operations console foundation for Xiaohongshu content teams. The phase 0 project only includes a runnable FastAPI health endpoint and a minimal Electron + React desktop shell.

## Compliance Boundary

This project does not implement automatic login, automatic publishing, batch control, proxy switching, device fingerprint spoofing, likes automation, comment automation, private-message automation, or any bypass of platform risk controls. Publishing workflows are designed for human review and manual publishing.

## Repository Layout

```text
apps/api       FastAPI backend
apps/desktop   Electron + React desktop shell
packages/shared Shared TypeScript constants
docs           Product specs and implementation plans
```

## Backend Development

```powershell
cd apps/api
python -m pip install -e ".[dev]"
python -m pytest -q
python -m uvicorn app.main:app --reload
```

Health check:

```text
GET http://127.0.0.1:8000/health
```

## Desktop Development

```powershell
npm install
npm run desktop:build
```

For local desktop development:

```powershell
cd apps/desktop
npm run dev
```

In another terminal, run Electron against the Vite dev server after the next phase adds a dedicated start script.

## Environment

Copy `.env.example` to `.env` for local development and fill in real secret values locally. Do not commit `.env` files or credentials.
