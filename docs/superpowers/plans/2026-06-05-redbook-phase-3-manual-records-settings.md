# RedBook Phase 3 Manual Records And Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete backend APIs for the manual publishing loop: publish logs, analytics records, settings, and safe risk-log listing.

**Architecture:** Keep routers thin and model-backed. Publish logs validate account and draft ownership before recording manual publish results. Analytics records validate the publish log and account before persisting numbers. Settings mask secret values in responses while allowing operators to store a placeholder-safe secret flag without exposing raw secret values.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, FastAPI TestClient.

---

## File Structure

- `apps/api/app/api/publish_logs.py`: authenticated publish log create/list endpoints.
- `apps/api/app/api/analytics.py`: authenticated analytics record create/list endpoints.
- `apps/api/app/api/settings.py`: authenticated settings list/upsert endpoints with secret-safe responses.
- `apps/api/app/api/risks.py`: keep authenticated risk-log list behavior.
- `apps/api/app/schemas/business.py`: request/response models for publish logs, analytics, and settings.
- `apps/api/app/main.py`: router registration.
- `apps/api/tests/test_phase_3_manual_records_settings.py`: end-to-end Phase 3 acceptance tests.

---

### Task 1: Publish Logs And Analytics Records

**Files:**
- Create: `apps/api/tests/test_phase_3_manual_records_settings.py`
- Create: `apps/api/app/api/publish_logs.py`
- Create: `apps/api/app/api/analytics.py`
- Modify: `apps/api/app/schemas/business.py`
- Modify: `apps/api/app/main.py`

- [ ] **Step 1: Write failing tests**

Create a workflow test that authenticates, creates an account and draft, creates a manual publish log, lists publish logs, creates analytics numbers for that publish log, and lists analytics records.

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
cd apps/api
python -m pytest tests/test_phase_3_manual_records_settings.py -q
```

Expected: FAIL because `/publish-logs` and `/analytics-records` routes do not exist.

- [ ] **Step 3: Implement publish log and analytics routers**

Add:

```text
POST /publish-logs
GET /publish-logs
POST /analytics-records
GET /analytics-records
```

Validate that account IDs exist and that draft/publish log records belong to the supplied account.

- [ ] **Step 4: Run test to verify GREEN**

Run:

```powershell
cd apps/api
python -m pytest tests/test_phase_3_manual_records_settings.py -q
```

Expected: PASS for publish log and analytics behaviors after settings are also implemented in Task 2.

---

### Task 2: Secret-Safe Settings API

**Files:**
- Modify: `apps/api/tests/test_phase_3_manual_records_settings.py`
- Create: `apps/api/app/api/settings.py`
- Modify: `apps/api/app/schemas/business.py`
- Modify: `apps/api/app/main.py`

- [ ] **Step 1: Extend failing tests**

Add checks for `PUT /settings/{key}` and `GET /settings`: non-secret values round trip normally, secret values return a placeholder instead of raw secret text.

- [ ] **Step 2: Implement settings router**

Add:

```text
GET /settings
PUT /settings/{key}
```

For `is_secret=True`, store the submitted value locally but return `value="********"` in all API responses when a value exists. For non-secret settings, return the raw value.

- [ ] **Step 3: Run Phase 3 test**

Run:

```powershell
cd apps/api
python -m pytest tests/test_phase_3_manual_records_settings.py -q
```

Expected: PASS.

---

### Task 3: Regression Verification And Sync

**Files:**
- Modify only files needed to fix verification failures.

- [ ] **Step 1: Run all backend tests**

Run:

```powershell
cd apps/api
python -m pytest -q
```

Expected: all backend tests PASS.

- [ ] **Step 2: Review git status**

Run:

```powershell
git status
```

Confirm no `.env`, generated database files, build outputs, or secrets are staged.

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add -A
git commit -m "Update: add Phase 3 manual records and settings"
git push
```

If needed, run:

```powershell
git push -u origin HEAD
```

---

## Self-Review

- Spec coverage: Media metadata and risk-log list already exist from Phases 1-2; this plan adds the remaining Phase 3 APIs for publish logs, analytics, and settings.
- Placeholder scan: No open-ended implementation placeholders remain.
- Type consistency: Route names match the roadmap and existing API naming style.
