# RedBook Phase 5 Desktop Real Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the Electron React desktop shell to real backend workflows for login, accounts, personas, drafts, scheduling, and compliance risk logs.

**Architecture:** Keep the desktop as a single React app for Phase 5. `api/client.ts` handles base URL/token/auth helpers. `App.tsx` owns local UI state and backend data refreshes. CSS extends the existing Apple-inspired shell with settings-style forms, tables, badges, and responsive panels.

**Tech Stack:** React, TypeScript, Vite, Electron, FastAPI JSON endpoints, localStorage.

---

## File Structure

- `apps/desktop/src/api/client.ts`: add token helpers and robust JSON request handling.
- `apps/desktop/src/App.tsx`: replace placeholder panels with real Phase 5 workflows.
- `apps/desktop/src/styles.css`: add responsive Apple-inspired form, table, auth, and risk-card styles.
- `docs/superpowers/specs/2026-06-05-redbook-phase-5-desktop-real-data-design.md`: concise design spec.

---

### Task 1: API Client

**Files:**
- Modify: `apps/desktop/src/api/client.ts`

- [ ] **Step 1: Add auth helpers**

Add `getToken`, `setToken`, `clearToken`, `getApiBaseUrl`, and `setApiBaseUrl`.

- [ ] **Step 2: Improve request errors**

Parse JSON error bodies when possible and return useful messages for UI alerts.

---

### Task 2: Real Data App Pages

**Files:**
- Modify: `apps/desktop/src/App.tsx`

- [ ] **Step 1: Add types and state**

Add TypeScript types for accounts, personas, drafts, publish tasks, and risk logs.

- [ ] **Step 2: Add auth screen**

Allow login and register against `/auth/login` and `/auth/register`.

- [ ] **Step 3: Add data pages**

Implement Accounts, Personas, Drafts, Schedule, Compliance, Dashboard, and Settings using the existing backend endpoints.

- [ ] **Step 4: Add mutation refreshes**

After create/update/review/schedule actions, reload the relevant lists.

---

### Task 3: Styling And Verification

**Files:**
- Modify: `apps/desktop/src/styles.css`

- [ ] **Step 1: Add Apple-inspired components**

Add styles for auth card, page grids, form rows, list rows, action buttons, alerts, and risk cards.

- [ ] **Step 2: Build desktop app**

Run:

```powershell
npm run desktop:build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Commit and push**

Run:

```powershell
git status
git add -A
git commit -m "Update: add Phase 5 desktop real data pages"
git push
```

---

## Self-Review

- Spec coverage: Covers every Phase 5 acceptance criterion and avoids Phase 6/7 scope.
- Placeholder scan: No open implementation placeholders remain.
- Type consistency: UI routes match existing backend endpoints.
