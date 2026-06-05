# RedBook Phase 7 Deployment And Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deployment and packaging configuration for the completed RedBook MVP.

**Architecture:** Keep source code unchanged except Electron documentation/config as needed. Docker Compose runs the API against PostgreSQL and MinIO. Local development still defaults to SQLite. Electron Builder outputs Windows artifacts to ignored `release/`.

**Tech Stack:** Docker Compose, FastAPI, Uvicorn, PostgreSQL, MinIO, Electron Builder, Vite.

---

## File Structure

- `infra/docker-compose.yml`: API, PostgreSQL, and MinIO stack.
- `infra/api.Dockerfile`: API container build.
- `.env.example`: safe local and Docker environment template.
- `README.md`: local, Docker, desktop, and package instructions.
- `docs/superpowers/specs/2026-06-05-redbook-phase-7-deployment-packaging-design.md`: design summary.

---

### Task 1: Docker Configuration

- [ ] Add `infra/docker-compose.yml`.
- [ ] Add `infra/api.Dockerfile`.
- [ ] Confirm `docker compose -f infra/docker-compose.yml config` if Docker is installed.

### Task 2: Documentation And Environment

- [ ] Update `.env.example` with safe defaults.
- [ ] Update `README.md` for backend, desktop, Docker, and packaging workflows.
- [ ] Document ignored generated artifacts and compliance boundary.

### Task 3: Verification And Sync

- [ ] Run backend tests.
- [ ] Run desktop build.
- [ ] Run Windows package command if available.
- [ ] Review `git status` for secrets/generated artifacts.
- [ ] Commit and push.

---

## Self-Review

- Phase 7 scope is covered without adding automation, scraping, or production secrets.
- Docker validation may be limited by local Docker availability and must be reported honestly.
