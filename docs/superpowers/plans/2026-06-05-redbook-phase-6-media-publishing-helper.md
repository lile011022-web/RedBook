# RedBook Phase 6 Media And Publishing Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add media previews, draft copy helpers, and manual publish/analytics UI to the desktop app.

**Architecture:** Keep the backend changes limited to a nullable `preview_url` field on media metadata. Extend the single React desktop app with Media and Publish Records pages while preserving the no-automation boundary.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, React, TypeScript, Vite.

---

## File Structure

- `apps/api/app/models/media_asset.py`: add optional `preview_url`.
- `apps/api/app/schemas/business.py`: expose media `preview_url`.
- `apps/api/app/api/media.py`: persist `preview_url`.
- `apps/api/tests/test_phase_2_media_api.py`: assert preview URL round trip.
- `apps/desktop/src/App.tsx`: add media, draft copy helper, publish records, analytics UI.
- `apps/desktop/src/styles.css`: add image preview and helper styles.

---

### Task 1: Media Preview Metadata

- [ ] Add failing backend assertion for `preview_url`.
- [ ] Add nullable model/schema/router support.
- [ ] Run focused media tests.

### Task 2: Desktop Phase 6 Pages

- [ ] Add Media and Publish Records navigation.
- [ ] Load account media, publish logs, and analytics records.
- [ ] Add media create form with image preview.
- [ ] Add draft copy buttons and official creator link.
- [ ] Add publish log and analytics forms.

### Task 3: Verification And Sync

- [ ] Run backend tests.
- [ ] Run desktop build with available Node runtime.
- [ ] Review git status, commit, and push.

---

## Self-Review

- Phase 6 scope is covered without real upload, scraping, automatic publishing, or Windows packaging.
- Image previews render when `preview_url` is available; otherwise the UI shows a clean file placeholder.
