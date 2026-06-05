# RedBook Phase 7 Deployment And Packaging Design

## Goal

Prepare the RedBook MVP for local backend use, online Docker deployment, and Windows desktop packaging.

## Scope

- Add Docker Compose configuration for API, PostgreSQL, and MinIO.
- Add an API Dockerfile that installs the FastAPI package and runs Uvicorn.
- Keep SQLite as the default local development database.
- Document local, Docker, desktop, and Windows packaging commands.
- Preserve ignored generated build and installer artifacts.

## Deployment Shape

- **Local development:** run FastAPI directly with SQLite and run the desktop Vite app separately.
- **Docker stack:** run FastAPI with PostgreSQL and MinIO through `infra/docker-compose.yml`.
- **Desktop package:** use Electron Builder to produce Windows installer artifacts under `apps/desktop/release`.

## Constraints

Docker and npm may not be present in every Codex shell. Verification should use available local runtime paths where possible and clearly report unavailable external tooling.

## Compliance Boundary

Deployment and packaging do not add platform automation. The desktop app remains a manual publishing helper.
