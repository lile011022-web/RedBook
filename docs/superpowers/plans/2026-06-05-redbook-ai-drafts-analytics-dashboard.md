# RedBook AI Drafts And Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved MVP update: Chinese GPT-assisted multi-version drafts, manual Xiaohongshu dashboard data entry, AI operating recommendations, and a temporarily hidden media entry point.

**Architecture:** Keep all Xiaohongshu platform access manual. The backend stores manually entered dashboard snapshots and provides AI endpoints that use existing account personas and manual data. The desktop UI stays Chinese, hides the media page from navigation, generates copy into reviewable drafts, and shows manual analytics forms plus AI recommendations.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, OpenAI Python SDK Responses API, React, TypeScript, Vite, Electron.

---

## File Structure

- Create `apps/api/app/models/dashboard_record.py` for manual creator-center dashboard snapshots.
- Modify `apps/api/app/models/__init__.py` so metadata creation includes the new table.
- Modify `apps/api/app/schemas/business.py` with dashboard record schemas, multi-draft request/response schemas, and AI analysis schemas.
- Create `apps/api/app/api/dashboard_records.py` with CRUD/list endpoints for manual dashboard snapshots.
- Modify `apps/api/app/api/ai.py` to add `/ai/generate-draft-options` and `/ai/analyze-dashboard` while preserving `/ai/generate-draft`.
- Modify `apps/api/app/services/openai_writer.py` with multi-draft prompt parsing and dashboard-analysis prompt parsing.
- Modify `apps/api/app/main.py` to include the dashboard records router.
- Add `apps/api/tests/test_dashboard_records.py` for dashboard CRUD/list behavior.
- Add `apps/api/tests/test_phase_8_ai_drafts_dashboard.py` for multi-draft and AI analysis endpoints with monkeypatched OpenAI service calls.
- Modify `apps/api/tests/test_openai_writer.py` to cover parsers without calling the real API.
- Modify `apps/desktop/src/App.tsx` to hide media navigation, rename publish records to analytics, add AI draft controls, add dashboard data forms/history, and show AI advice cards.
- Modify `apps/desktop/src/styles.css` only if the new metric grid or recommendation card needs small styling support.
- Modify `docs/user-guide.md` with Chinese usage instructions for GPT drafts, manual dashboard entry, independent Xiaohongshu windows, and install/start steps.

---

### Task 1: Backend Dashboard Records

**Files:**
- Create: `apps/api/app/models/dashboard_record.py`
- Modify: `apps/api/app/models/__init__.py`
- Modify: `apps/api/app/schemas/business.py`
- Create: `apps/api/app/api/dashboard_records.py`
- Modify: `apps/api/app/main.py`
- Test: `apps/api/tests/test_dashboard_records.py`

- [ ] **Step 1: Write the failing dashboard record API tests**

Add tests that create a user, login, create an account, post a dashboard snapshot with the screenshot metrics, list all snapshots, and list snapshots by account.

- [ ] **Step 2: Run the dashboard record tests and verify they fail**

Run: `cd apps/api; python -m pytest tests/test_dashboard_records.py -q`
Expected: FAIL because the dashboard records router/model do not exist yet.

- [ ] **Step 3: Add the dashboard record model and schemas**

Create a SQLAlchemy model with string account id, period dates, period label, the twelve metric fields, optional trend-note fields stored as strings, and timestamps. Add Pydantic create/response models with non-negative integer validation and percentage fields as floats.

- [ ] **Step 4: Add dashboard record endpoints**

Create:
- `POST /dashboard-records`
- `GET /dashboard-records`
- `GET /accounts/{account_id}/dashboard-records`

Each endpoint must require authentication and verify the account exists before writing or account-specific reading.

- [ ] **Step 5: Register the router and run the tests**

Run: `cd apps/api; python -m pytest tests/test_dashboard_records.py -q`
Expected: PASS.

---

### Task 2: Backend AI Draft Options And Dashboard Advice

**Files:**
- Modify: `apps/api/app/services/openai_writer.py`
- Modify: `apps/api/app/schemas/business.py`
- Modify: `apps/api/app/api/ai.py`
- Test: `apps/api/tests/test_openai_writer.py`
- Test: `apps/api/tests/test_phase_8_ai_drafts_dashboard.py`

- [ ] **Step 1: Write failing parser and endpoint tests**

Add parser tests for a JSON object containing `drafts` and another containing `summary`, `diagnosis`, `recommendations`, `next_actions`, and `content_angles`. Add endpoint tests that monkeypatch OpenAI service functions, create account/persona/dashboard records, and verify generated drafts are saved with `source="ai"` and dashboard recommendations are returned.

- [ ] **Step 2: Run the targeted AI tests and verify they fail**

Run: `cd apps/api; python -m pytest tests/test_openai_writer.py tests/test_phase_8_ai_drafts_dashboard.py -q`
Expected: FAIL until service functions, schemas, and routes exist.

- [ ] **Step 3: Add multi-draft service helpers**

Add:
- `build_draft_options_prompt(...)`
- `parse_draft_options(raw_text)`
- `generate_draft_options(api_key, prompt, model=DEFAULT_OPENAI_MODEL)`

Clamp the request count to 1-5 in schema validation. Parse invalid `tags` as empty arrays. Return `DraftContent` objects.

- [ ] **Step 4: Add dashboard analysis service helpers**

Add:
- `DashboardAnalysis` dataclass
- `build_dashboard_analysis_prompt(persona, records, recent_drafts)`
- `parse_dashboard_analysis(raw_text)`
- `generate_dashboard_analysis(api_key, prompt, model=DEFAULT_OPENAI_MODEL)`

The prompt must explicitly say the data is manually entered, must not ask the model to automate platform access, and must request practical Chinese advice.

- [ ] **Step 5: Add AI endpoints**

Add:
- `POST /ai/generate-draft-options` returning a list of saved `DraftResponse`
- `POST /ai/analyze-dashboard` returning structured advice

Keep the existing `/ai/generate-draft` response unchanged for compatibility.

- [ ] **Step 6: Run targeted AI tests**

Run: `cd apps/api; python -m pytest tests/test_openai_writer.py tests/test_phase_8_ai_drafts_dashboard.py -q`
Expected: PASS.

---

### Task 3: Desktop UI For Chinese AI Drafts And Operations Analysis

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/styles.css`

- [ ] **Step 1: Hide the media navigation entry**

Remove `素材` from `navItems` while leaving existing media code dormant. Rename `发布记录` to `运营分析`.

- [ ] **Step 2: Add frontend types and state**

Add TypeScript types for dashboard records and AI analysis. Add state for dashboard form fields, draft option count/requirements, and the latest AI analysis result.

- [ ] **Step 3: Load dashboard records**

Update `loadData()` to call `/dashboard-records` and keep the result in state. Clear the state on logout.

- [ ] **Step 4: Upgrade the draft page**

Add AI controls for account, topic, generation count, and extra requirements. Submit to `/ai/generate-draft-options`, refresh data, and keep copy buttons for title/body/tags/cover text.

- [ ] **Step 5: Upgrade the operations analysis page**

Keep manual publish and per-note analytics sections. Add the creator-center dashboard snapshot form matching the requested metrics and trend fields. Add a dashboard history list and a button to call `/ai/analyze-dashboard`.

- [ ] **Step 6: Run TypeScript verification**

Run: `cd apps/desktop; npm run typecheck`
Expected: PASS.

---

### Task 4: User Guide And Final Verification

**Files:**
- Modify: `docs/user-guide.md`

- [ ] **Step 1: Update Chinese usage instructions**

Document:
- Installing from `apps/desktop/release/RedBook Compliance Ops Setup 0.1.0.exe`
- Starting backend and desktop dev mode
- Creating accounts and opening independent Xiaohongshu windows for manual login
- Configuring the OpenAI key without pasting it into chat
- Generating GPT drafts from persona
- Manually entering dashboard metrics
- Generating AI operation advice
- Compliance boundaries

- [ ] **Step 2: Run backend tests**

Run: `cd apps/api; python -m pytest -q`
Expected: PASS.

- [ ] **Step 3: Run desktop build checks**

Run:
- `cd apps/desktop; npm run typecheck`
- `cd apps/desktop; npm run build`
- `cd apps/desktop; npm run package:win`

Expected: PASS or a clearly documented local environment blocker.

- [ ] **Step 4: Check git status and secrets**

Run:
- `git status --short`
- `git diff --check`
- `git ls-files -o --exclude-standard`
- `rg -n "sk-proj-|OPENAI_API_KEY=|password\\s*=|token\\s*=" -g "!node_modules" -g "!dist" -g "!dist-electron" -g "!release" -g "!.venv" .`

Expected: no committed secret material. Example strings in `.env.example` are acceptable if they do not contain a real key.

- [ ] **Step 5: Commit and push**

Run:
- `git add -A`
- `git commit -m "Update: add AI drafts and operations dashboard"`
- `git push`

Expected: push succeeds on `codex/redbook-phase-0`.

