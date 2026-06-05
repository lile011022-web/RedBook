# RedBook Phase 4 OpenAI Draft Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add compliant AI draft generation that saves generated drafts as human-review-required suggestions.

**Architecture:** `openai_writer.py` owns prompt building, structured output parsing, API-key resolution, and the lazy OpenAI SDK call. The AI router validates account/persona context, calls the writer service through an injectable dependency, and persists the result as `source="ai"` with `review_status="needs_review"`. Tests cover prompt and route behavior without making real OpenAI API calls.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, OpenAI Python SDK, Responses API.

---

## File Structure

- `apps/api/app/services/openai_writer.py`: prompt builder, draft content dataclass, API-key resolver, lazy OpenAI Responses API wrapper.
- `apps/api/app/api/ai.py`: authenticated `/ai/generate-draft` endpoint.
- `apps/api/app/schemas/business.py`: AI generate request schema.
- `apps/api/app/main.py`: AI router registration.
- `apps/api/pyproject.toml`: add the OpenAI Python SDK dependency.
- `apps/api/tests/test_openai_writer.py`: pure prompt and parsing tests.
- `apps/api/tests/test_phase_4_ai_generate_draft.py`: endpoint test using a fake generator.

---

### Task 1: OpenAI Writer Service

**Files:**
- Create: `apps/api/tests/test_openai_writer.py`
- Create: `apps/api/app/services/openai_writer.py`
- Modify: `apps/api/pyproject.toml`

- [ ] **Step 1: Write failing writer tests**

Test that the prompt includes persona fields, topic, disabled words, manual-review language, and anti-overclaim language. Test that JSON text parses into title, body, tags, and cover text.

- [ ] **Step 2: Run tests to verify RED**

Run:

```powershell
cd apps/api
python -m pytest tests/test_openai_writer.py -q
```

Expected: FAIL because `openai_writer.py` does not exist.

- [ ] **Step 3: Implement writer service**

Add `build_draft_prompt`, `parse_draft_content`, `DraftContent`, `resolve_openai_api_key`, and `generate_draft_content`. Import OpenAI lazily inside the network function so tests never need the SDK call path.

- [ ] **Step 4: Run writer tests**

Run:

```powershell
cd apps/api
python -m pytest tests/test_openai_writer.py -q
```

Expected: PASS.

---

### Task 2: AI Generate Draft API

**Files:**
- Create: `apps/api/tests/test_phase_4_ai_generate_draft.py`
- Create: `apps/api/app/api/ai.py`
- Modify: `apps/api/app/schemas/business.py`
- Modify: `apps/api/app/main.py`

- [ ] **Step 1: Write failing endpoint test**

Create an authenticated account and persona, monkeypatch the AI router generator dependency to return deterministic content, call `/ai/generate-draft`, and assert the saved draft is `source="ai"` and `review_status="needs_review"`.

- [ ] **Step 2: Run endpoint test to verify RED**

Run:

```powershell
cd apps/api
python -m pytest tests/test_phase_4_ai_generate_draft.py -q
```

Expected: FAIL because `/ai/generate-draft` does not exist.

- [ ] **Step 3: Implement AI router**

Add:

```text
POST /ai/generate-draft
```

Load the account and persona, call the generator, save the generated content as a `Draft`, and return `DraftResponse`.

- [ ] **Step 4: Run endpoint test**

Run:

```powershell
cd apps/api
python -m pytest tests/test_phase_4_ai_generate_draft.py -q
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

Confirm no `.env`, raw API keys, generated databases, or build outputs are staged.

- [ ] **Step 3: Commit and push**

Run:

```powershell
git add -A
git commit -m "Update: add Phase 4 OpenAI draft generation"
git push
```

If needed, run:

```powershell
git push -u origin HEAD
```

---

## Self-Review

- Spec coverage: The plan covers prompt builder, wrapper, endpoint, AI draft persistence, environment/settings API key resolution, and no real API calls in tests.
- Placeholder scan: No open-ended implementation placeholders remain.
- Type consistency: Generated drafts use existing `DraftResponse`, `source="ai"`, and `review_status="needs_review"`.
