# RedBook Phase 6 Media And Publishing Helper Design

## Goal

Make the desktop app practical for manual content preparation after Phase 5 connected the core data pages.

## Scope

- Add a media library page with image previews when a preview URL is available.
- Add copy buttons for draft title, body, tags, and cover text.
- Add a button that opens the official Xiaohongshu creator page without clicking or publishing for the user.
- Add manual publish record and analytics entry UI.
- Keep all publishing steps human-operated.

## Backend Adjustment

Media metadata gets an optional `preview_url` field. This is not an upload system and does not fetch remote media. It only stores a URL operators provide so the desktop can render a preview instead of a raw text-only row when possible.

## UX Design

The new pages keep the same Apple-inspired operational UI:

- Media cards show rounded preview tiles for image metadata.
- Draft helpers use quiet action buttons beside each reviewed draft.
- Publish records and analytics use compact forms and calm record cards.
- External publishing opens a normal browser tab/window and never automates platform actions.

## Verification

- Backend tests cover `preview_url`.
- Desktop TypeScript/Vite build passes.
- Backend tests pass.
