# RedBook Phase 1 Business API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the authenticated backend workflow for accounts, personas, drafts, scheduling, and risk logs.

**Architecture:** FastAPI routers stay thin and persist SQLAlchemy models through the existing SQLite/PostgreSQL-ready session. Auth remains JWT bearer based, with a shared dependency that loads the current user before any business endpoint runs. Scheduling guards live in the schedule router for Phase 1 and create risk-log records when they block unsafe actions.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, python-jose, pytest, FastAPI TestClient.

---

## File Structure

- `apps/api/app/api/deps.py`: shared authenticated-user dependency.
- `apps/api/app/api/accounts.py`: `POST /accounts` and `GET /accounts`.
- `apps/api/app/api/personas.py`: `PUT /accounts/{account_id}/persona`.
- `apps/api/app/api/drafts.py`: `POST /drafts` and `PATCH /drafts/{draft_id}/review`.
- `apps/api/app/api/schedule.py`: `POST /publish-tasks` and `GET /publish-tasks` with Phase 1 compliance blocking.
- `apps/api/app/api/risks.py`: `GET /risk-logs`.
- `apps/api/app/schemas/business.py`: request and response models for Phase 1.
- `apps/api/app/main.py`: router registration.
- `apps/api/tests/test_phase_1_business_api.py`: end-to-end Phase 1 acceptance tests.

---

### Task 1: Authenticated Business Workflow

**Files:**
- Create: `apps/api/tests/test_phase_1_business_api.py`
- Create: `apps/api/app/api/deps.py`
- Create: `apps/api/app/api/accounts.py`
- Create: `apps/api/app/api/personas.py`
- Create: `apps/api/app/api/drafts.py`
- Create: `apps/api/app/api/schedule.py`
- Create: `apps/api/app/api/risks.py`
- Create: `apps/api/app/schemas/business.py`
- Modify: `apps/api/app/main.py`

- [ ] **Step 1: Write the failing workflow test**

Create a test that registers and logs in an operator, creates an account, upserts a persona, creates an AI draft, verifies the AI draft starts as `needs_review`, verifies unreviewed AI drafts cannot be scheduled, verifies a risk log is created, approves the draft, and schedules it.

- [ ] **Step 2: Verify RED**

Run:

```powershell
cd apps/api
python -m pytest tests/test_phase_1_business_api.py -q
```

Expected: FAIL with missing business routes.

- [ ] **Step 3: Add authenticated dependency**

Decode bearer JWTs with the existing JWT settings, load `User` by token subject, and return `401` for missing, invalid, or unknown users.

- [ ] **Step 4: Add schemas and routers**

Add focused Pydantic schemas and implement only the Phase 1 routes:

```text
POST /accounts
GET /accounts
PUT /accounts/{account_id}/persona
POST /drafts
PATCH /drafts/{draft_id}/review
POST /publish-tasks
GET /publish-tasks
GET /risk-logs
```

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
cd apps/api
python -m pytest tests/test_phase_1_business_api.py -q
```

Expected: PASS.

- [ ] **Step 6: Run backend regression tests**

Run:

```powershell
cd apps/api
python -m pytest -q
```

Expected: all backend tests PASS.

- [ ] **Step 7: Commit and push**

Run:

```powershell
git status
git add -A
git commit -m "Update: add Phase 1 business API"
git push
```

If the branch has no upstream, run:

```powershell
git push -u origin HEAD
```

---

## Self-Review

- Spec coverage: This plan covers every Phase 1 acceptance criterion from the phased roadmap and excludes media upload, OpenAI calls, and desktop wiring.
- Placeholder scan: No `TBD`, `TODO`, or open-ended implementation steps remain.
- Type consistency: Status fields use `needs_review`, `approved`, and `scheduled`; routes match the roadmap names.
