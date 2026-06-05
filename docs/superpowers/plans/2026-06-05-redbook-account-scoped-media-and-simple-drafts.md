# RedBook Account Scoped Media And Simple Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore media as an account-isolated asset library with local upload, previews, AI image/idea generation, and simplify drafts to one-click persona-based GPT generation.

**Architecture:** FastAPI remains the source of truth for media metadata, local file storage, OpenAI calls, and account isolation. React keeps the existing Apple-inspired panels and consumes account-scoped endpoints so the UI cannot accidentally mix assets across accounts.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, OpenAI Python SDK, local filesystem storage, React, TypeScript, Vite, Electron.

---

## Task 1: Backend Local Upload And Account-Scoped Media

**Files:**
- Modify: `apps/api/app/models/media_asset.py`
- Modify: `apps/api/app/schemas/business.py`
- Modify: `apps/api/app/services/storage.py`
- Modify: `apps/api/app/api/media.py`
- Modify: `apps/api/tests/test_phase_2_media_api.py`

- [ ] Add model fields: `source`, `file_size`, `width`, `height`.
- [ ] Add response fields for those values.
- [ ] Add local media path helpers under `apps/api/data/media/accounts/{account_id}/{asset_id}/{filename}`.
- [ ] Add `POST /accounts/{account_id}/media-assets/upload` accepting `UploadFile`.
- [ ] Add `GET /media-assets/{asset_id}/file` returning the saved file.
- [ ] Test upload creates account-scoped storage and that account B list does not include account A media.

## Task 2: Backend AI Media And Simple Draft Support

**Files:**
- Modify: `apps/api/app/services/openai_writer.py`
- Modify: `apps/api/app/api/media.py`
- Modify: `apps/api/app/schemas/business.py`
- Modify: `apps/api/tests/test_openai_writer.py`
- Modify: `apps/api/tests/test_phase_2_media_api.py`

- [ ] Add dataclass and parser for media ideas.
- [ ] Add prompt builder for account-persona media ideas.
- [ ] Add `POST /accounts/{account_id}/media-ideas`.
- [ ] Add `POST /accounts/{account_id}/media-assets/generate-image`, saving returned base64 image as an account-scoped asset.
- [ ] Keep tests monkeypatched so CI does not call real OpenAI.

## Task 3: Desktop Media Library And Simple Draft UI

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/styles.css`

- [ ] Restore `素材` navigation.
- [ ] Rework `MediaPage` into account selector, local upload, AI image generation, AI idea generation, and account-scoped gallery.
- [ ] Show image thumbnails, video previews, and file cards.
- [ ] Simplify `DraftsPage` creation area to account selector, generation count, optional requirement, and one `生成文案` button.
- [ ] Preserve review/copy buttons for generated drafts.

## Task 4: Real GPT Verification, Docs, Packaging

**Files:**
- Modify: `docs/user-guide.md`

- [ ] Install/verify Python dependencies for the backend environment without printing secrets.
- [ ] Restart or test backend from `apps/api` so it loads the current code.
- [ ] Run a real `/ai/generate-draft-options` request with a test account/persona when OpenAI is available.
- [ ] Update Chinese user guide for media upload, AI image generation, simple draft generation, and correct backend startup.
- [ ] Run full backend tests, desktop typecheck, production build, and Windows package.
- [ ] Check secrets, commit, and push.
