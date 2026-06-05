# RedBook Phase 5 Desktop Real Data Design

## Goal

Replace placeholder desktop panels with usable backend-connected workflows for the Phase 5 MVP: login/register, accounts, personas, drafts, schedule, and compliance risk logs.

## Scope

- Keep the existing Electron + React single-page shell and sidebar navigation.
- Add an authentication card before the operational workspace.
- Store the JWT in `localStorage` under the existing `redbook.token` key.
- Connect the desktop app to the existing FastAPI endpoints from Phases 1-4.
- Preserve the compliance boundary: no automatic Xiaohongshu login, publishing, scraping, browser control, or engagement automation.

## UX Design

The app keeps the Apple-inspired light management style already started in Phase 0:

- Soft gray background, frosted white sidebar, rounded panels, restrained badges.
- Forms use settings-style rows with calm inputs and clear helper text.
- Lists use clean table-like rows instead of dense grid borders.
- Risk logs display as calm cards with severity badges.
- Empty states stay useful and compact.

## Pages

- **Dashboard:** API health, auth state, counts for accounts, drafts, scheduled tasks, and risk logs.
- **Accounts:** Create accounts and list account status/health.
- **Personas:** Select an account and edit its persona fields.
- **Drafts:** Create manual drafts, generate AI drafts when an API key exists, approve/reject drafts.
- **Schedule:** Select approved drafts and schedule publish tasks.
- **Compliance:** List risk logs with type, severity, message, and related entity.
- **Settings:** Configure API base URL locally and show token/session controls.

## Data Flow

`api/client.ts` owns API base URL, token storage, JSON requests, and auth helpers. `App.tsx` owns Phase 5 UI state and reloads the core lists after mutations. Data loads are intentionally coarse-grained for this MVP because the record volume is small and the workflows benefit from predictable refreshes.

## Error Handling

API failures show one inline alert near the page content. Missing backend state produces empty panels. If the backend is unavailable, the health pill changes to attention state and authenticated page loads show the backend error.

## Verification

- `npm run desktop:build` must pass.
- Backend logic is not changed in this phase.
- The UI should remain responsive at desktop and narrow widths.
