# RedBook Phase 2 Compliance And Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable compliance and storage services that protect publishing safety and account-scoped media records.

**Architecture:** Business routers call small service functions instead of owning compliance logic. `compliance.py` returns structured rule results for text similarity, disabled words, over-claim language, AI review gates, and cross-account same-minute scheduling. `storage.py` builds safe account-scoped media keys, while the media router persists metadata only and does not upload binary files in this phase.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, Python dataclasses, `difflib.SequenceMatcher`, `pathlib.PurePosixPath`.

---

## File Structure

- `apps/api/app/services/compliance.py`: reusable compliance checks and structured result dataclasses.
- `apps/api/app/services/storage.py`: account-scoped media key builder.
- `apps/api/app/api/schedule.py`: use compliance service for AI review and same-minute checks.
- `apps/api/app/api/media.py`: authenticated media metadata create/list routes.
- `apps/api/app/schemas/business.py`: media request/response schemas.
- `apps/api/app/main.py`: media router registration.
- `apps/api/tests/test_compliance.py`: service-level compliance tests.
- `apps/api/tests/test_storage.py`: storage key tests.
- `apps/api/tests/test_phase_2_media_api.py`: authenticated media metadata API test.

---

### Task 1: Compliance Service

**Files:**
- Create: `apps/api/tests/test_compliance.py`
- Create: `apps/api/app/services/compliance.py`
- Modify: `apps/api/app/api/schedule.py`

- [ ] **Step 1: Write failing compliance tests**

Cover title/body similarity warnings, disabled word warnings, over-claim warnings, AI draft schedule blocking, and same-minute cross-account schedule blocking.

- [ ] **Step 2: Run tests to verify RED**

Run:

```powershell
cd apps/api
python -m pytest tests/test_compliance.py -q
```

Expected: FAIL because `app.services.compliance` does not exist.

- [ ] **Step 3: Implement service and schedule integration**

Create dataclasses `SimilarityResult`, `RuleResult`, and `WarningResult`. Add:

```text
compare_text_similarity(left, right, threshold)
check_disabled_words(text, disabled_words)
check_over_claims(text)
check_ai_draft_can_be_scheduled(source, review_status)
check_same_minute_account_conflict(new_account_id, new_scheduled_at, existing_tasks)
```

Update `schedule.py` to call the service functions while preserving Phase 1 route behavior.

- [ ] **Step 4: Run compliance tests and Phase 1 workflow**

Run:

```powershell
cd apps/api
python -m pytest tests/test_compliance.py tests/test_phase_1_business_api.py -q
```

Expected: PASS.

---

### Task 2: Storage Service And Media Metadata API

**Files:**
- Create: `apps/api/tests/test_storage.py`
- Create: `apps/api/tests/test_phase_2_media_api.py`
- Create: `apps/api/app/services/storage.py`
- Create: `apps/api/app/api/media.py`
- Modify: `apps/api/app/schemas/business.py`
- Modify: `apps/api/app/main.py`

- [ ] **Step 1: Write failing storage and media API tests**

Cover account-scoped storage keys, filename path stripping, creating media metadata, listing media per account, and cross-account SHA reuse warning structure.

- [ ] **Step 2: Run tests to verify RED**

Run:

```powershell
cd apps/api
python -m pytest tests/test_storage.py tests/test_phase_2_media_api.py -q
```

Expected: FAIL because storage and media routes do not exist.

- [ ] **Step 3: Implement storage service and media router**

Create `build_media_storage_key(account_id, asset_id, filename)` and `build_cross_account_reuse_warning(account_id, reused_from_asset_id)`. Add authenticated routes:

```text
POST /media-assets
GET /accounts/{account_id}/media-assets
```

The router creates a `MediaAsset` row with `storage_key` under `accounts/{account_id}/media/{asset_id}/{filename}`.

- [ ] **Step 4: Run Phase 2 tests**

Run:

```powershell
cd apps/api
python -m pytest tests/test_storage.py tests/test_phase_2_media_api.py -q
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

Expected: all tests PASS.

- [ ] **Step 2: Review git status**

Run:

```powershell
git status
```

Confirm no `.env`, database files, generated folders, or secrets are staged.

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add -A
git commit -m "Update: add Phase 2 compliance and storage"
git push
```

If the branch has no upstream, run:

```powershell
git push -u origin HEAD
```

---

## Self-Review

- Spec coverage: This plan covers every Phase 2 acceptance criterion and adds only media metadata because the roadmap explicitly excludes real S3 upload UI.
- Placeholder scan: No open `TBD`, `TODO`, or ambiguous implementation instructions remain.
- Type consistency: Service result types and route names match the current Phase 1 API naming.
