# RedBook Phased Roadmap

> **For agentic workers:** Implement only one phase at a time. Before starting a phase, create or expand a focused implementation plan for that phase, then verify, commit, and push before moving on.

**Goal:** Split the RedBook MVP into small, independently verifiable phases so each work session stays focused and context-light.

**Architecture:** The backend remains the source of truth for business logic, compliance checks, storage, and OpenAI generation. The desktop app consumes the API and presents Apple-inspired operational workflows without adding platform automation.

**Tech Stack:** FastAPI, SQLAlchemy, pytest, React, TypeScript, Electron, Vite, Docker Compose, PostgreSQL, S3-compatible storage.

---

## Current State

Completed foundation:

- FastAPI project skeleton and health endpoint.
- Database models and authentication.
- Electron + React desktop shell with the original MVP navigation.
- Shared package, environment template, README, and root workspace scripts.

Not complete yet:

- Business API routers for accounts, personas, media, drafts, schedule, logs, analytics, risks, and settings.
- Compliance and storage services wired into API workflows.
- OpenAI draft generation.
- Desktop pages connected to real backend data.
- Local desktop backend startup, Docker stack validation, and Windows packaging verification.

---

## Phase 1: Backend Business API Foundation

**Goal:** Make the backend support the core workspace records.

**Scope:**

- Accounts API.
- Personas API.
- Drafts API.
- Publish task scheduling API.
- Risk log creation for blocked scheduling actions.
- Auth protection for all business endpoints.

**Files likely touched:**

- `apps/api/app/api/accounts.py`
- `apps/api/app/api/personas.py`
- `apps/api/app/api/drafts.py`
- `apps/api/app/api/schedule.py`
- `apps/api/app/api/risks.py`
- `apps/api/app/main.py`
- `apps/api/tests/test_mvp_api.py`

**Acceptance criteria:**

- A logged-in user can create an account.
- A logged-in user can create or update the persona for an account.
- A logged-in user can create a draft.
- AI-sourced drafts start as `needs_review`.
- Unreviewed AI drafts cannot be scheduled.
- Approved drafts can be scheduled.
- Backend tests pass.

**Do not include:**

- Media upload.
- OpenAI API calls.
- Desktop UI wiring.
- Automatic publishing.

---

## Phase 2: Compliance And Storage Services

**Goal:** Add reusable services that protect account separation and publishing safety.

**Scope:**

- Text similarity checks.
- Persona disabled-word checks.
- Over-claim warning checks.
- Same-minute multi-account scheduling conflict checks.
- Account-scoped media storage key builder.
- Cross-account media reuse warning structure.

**Files likely touched:**

- `apps/api/app/services/compliance.py`
- `apps/api/app/services/storage.py`
- `apps/api/app/api/media.py`
- `apps/api/app/api/schedule.py`
- `apps/api/tests/test_compliance.py`
- `apps/api/tests/test_storage.py`

**Acceptance criteria:**

- Similar titles above the MVP threshold produce warnings.
- Similar body copy above the MVP threshold produces warnings.
- Same-minute scheduling across different accounts is rejected.
- Media keys are always scoped under `accounts/{account_id}/media/...`.
- Compliance and storage tests pass.

**Do not include:**

- Real S3 upload UI.
- OpenAI generation.
- Analytics dashboard.

---

## Phase 3: Media, Publish Logs, Analytics, And Settings APIs

**Goal:** Complete the remaining backend records needed for a full manual publishing loop.

**Scope:**

- Media metadata API.
- Publish logs API.
- Analytics records API.
- Settings API with secret-safe behavior.
- Risk logs list API.

**Files likely touched:**

- `apps/api/app/api/media.py`
- `apps/api/app/api/publish_logs.py`
- `apps/api/app/api/analytics.py`
- `apps/api/app/api/settings.py`
- `apps/api/app/api/risks.py`
- `apps/api/tests/test_mvp_api.py`

**Acceptance criteria:**

- Media metadata can be created and listed per account.
- Publish result records can be created manually.
- Analytics numbers can be recorded manually.
- Settings can store non-secret values and secret placeholders safely.
- Backend tests pass.

**Do not include:**

- Real image upload transfer.
- Desktop pages.
- Automated data scraping from Xiaohongshu.

---

## Phase 4: OpenAI Draft Generation

**Goal:** Let operators generate compliant draft suggestions without bypassing human review.

**Scope:**

- Prompt builder.
- OpenAI service wrapper.
- `/ai/generate-draft` endpoint.
- Save generated drafts with `source="ai"` and `review_status="needs_review"`.
- Read API key from environment first, then settings fallback.

**Files likely touched:**

- `apps/api/app/services/openai_writer.py`
- `apps/api/app/api/ai.py`
- `apps/api/app/main.py`
- `apps/api/tests/test_openai_writer.py`

**Acceptance criteria:**

- Prompt includes persona, topic, disabled words, and manual-review language.
- Tests do not call the real OpenAI API.
- Generated drafts are never auto-approved.
- Backend tests pass.

**Do not include:**

- Chat UI.
- Automatic publishing.
- Browser automation.

---

## Phase 5: Desktop Real Data Pages

**Goal:** Replace desktop placeholders with usable MVP pages connected to the backend.

**Scope:**

- Login/register screen.
- Accounts page.
- Personas page.
- Drafts page.
- Schedule page.
- Compliance/risk log page.

**Files likely touched:**

- `apps/desktop/src/App.tsx`
- `apps/desktop/src/api/client.ts`
- `apps/desktop/src/pages/*.tsx`
- `apps/desktop/src/styles.css`

**Acceptance criteria:**

- User can log in from the desktop app.
- Accounts can be created from the UI.
- Personas can be edited from the UI.
- Drafts can be created, reviewed, and scheduled from the UI.
- Risk logs are visible as calm status cards or tables.
- TypeScript check and Vite build pass.

**Do not include:**

- Windows installer packaging.
- Docker deployment.
- Automatic platform publishing.

---

## Phase 6: Media UI And Manual Publishing Helper

**Goal:** Make the operator workflow practical for real content preparation.

**Scope:**

- Media library UI with image previews.
- Draft detail view.
- Copy title/body/tags buttons.
- Open official Xiaohongshu creator/publishing page link.
- Manual publish log form.
- Basic analytics entry form.

**Files likely touched:**

- `apps/desktop/src/pages/MediaPage.tsx`
- `apps/desktop/src/pages/DraftDetailPage.tsx`
- `apps/desktop/src/pages/PublishRecordsPage.tsx`
- `apps/desktop/src/styles.css`
- Existing API routers as needed for missing fields.

**Acceptance criteria:**

- Image media displays as previews, not raw URLs.
- Copy helper copies draft fields only.
- The app does not click, log in, or publish on Xiaohongshu.
- Publish results and analytics can be manually recorded.
- TypeScript check and Vite build pass.

---

## Phase 7: Deployment And Packaging

**Goal:** Prepare the product for local use, online deployment, and Windows distribution.

**Scope:**

- Docker Compose validation.
- API container Dockerfile.
- PostgreSQL and MinIO configuration.
- Electron Windows packaging.
- Local/remote backend mode documentation.
- Final README update.

**Files likely touched:**

- `infra/docker-compose.yml`
- `infra/api.Dockerfile`
- `apps/desktop/electron/main.ts`
- `apps/desktop/package.json`
- `README.md`
- `.env.example`

**Acceptance criteria:**

- `docker compose -f infra/docker-compose.yml config` succeeds.
- Backend can run locally with SQLite.
- Online stack can run with PostgreSQL and MinIO.
- Windows package command creates ignored release artifacts.
- Final git status has no secrets or generated installers committed.

---

## Recommended Execution Order

1. Phase 1: Backend Business API Foundation.
2. Phase 2: Compliance And Storage Services.
3. Phase 3: Remaining Backend APIs.
4. Phase 4: OpenAI Draft Generation.
5. Phase 5: Desktop Real Data Pages.
6. Phase 6: Media UI And Manual Publishing Helper.
7. Phase 7: Deployment And Packaging.

Each phase should end with:

- Focused tests or build verification.
- `git status` review.
- One clear commit.
- Successful push to GitHub.

## Next Step

Start with Phase 1. Create a focused Phase 1 implementation plan, then implement only the account, persona, draft, schedule, and risk-log backend workflow.
