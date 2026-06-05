# RedBook MVP Design

Date: 2026-06-05

## Product Positioning

RedBook is a compliant multi-account operations console for Xiaohongshu content teams. It is not group-control software and must not provide automatic login, automatic posting, proxy switching, device fingerprint spoofing, engagement automation, private-message automation, or any mechanism intended to bypass platform risk controls.

The MVP focuses on compliant assistance: account separation, persona setup, isolated media management, AI-assisted copy generation, compliance checks, publishing schedules, manual publishing reminders, one-click copy helpers, and post-publish data recording.

## Architecture

The repository will use a monorepo layout:

- `apps/api`: FastAPI backend for authentication, business APIs, OpenAI integration, compliance checks, scheduling, storage, and settings.
- `apps/desktop`: Electron + React desktop client packaged as a Windows `.exe`.
- `packages/shared`: Shared constants, TypeScript types, compliance thresholds, and API-facing schema helpers where useful.
- `infra`: Docker Compose and deployment configuration for API, PostgreSQL, and S3-compatible storage.

The backend exposes one API surface used by both desktop and online deployments. The desktop client supports two backend modes:

- Local mode: Electron starts a local FastAPI process, using SQLite and configured S3-compatible storage.
- Remote mode: Electron connects to a configured online API URL.

The online deployment uses Docker, FastAPI, PostgreSQL, and S3-compatible object storage. Local development uses SQLite by default and can use MinIO for S3-compatible storage.

## Authentication And Users

The MVP includes multi-user login with a shared workspace:

- Users can register and log in.
- Passwords are hashed.
- API sessions use JWT access tokens.
- All users can access the shared workspace in the MVP.
- Role-based permissions, teams, and per-user account ownership are explicitly deferred.

The `users` table is included from the first version so online deployment does not need a later authentication rewrite.

## Core Modules

### Dashboard

The dashboard shows operational status across the shared workspace:

- Account count.
- Pending publishing tasks.
- Recent risk logs.
- Recent drafts.
- Account health summaries.

### Account Management

Operators can create and manage Xiaohongshu account records. Each account receives an independent `account_id`. The system stores account metadata only and must not store cross-account shared cookies or automation credentials.

### Personas

Each account can have one persona profile:

- Positioning.
- Content direction.
- Tone of voice.
- Disabled words.
- Publishing frequency.

Personas guide AI generation and compliance checks.

### Media Library

Media is isolated per account. The primary storage backend is S3-compatible object storage, with keys scoped under:

```text
accounts/{account_id}/media/{asset_id}/{filename}
```

The database stores metadata and storage keys, not raw file bytes. Cross-account material reuse is allowed only after a warning. Reuse events create risk logs.

### Draft Management

Drafts belong to a single account. Operators can generate:

- Topic ideas.
- Titles.
- Body copy.
- Tags.
- Cover copy.

OpenAI configuration resolves in this order:

1. `OPENAI_API_KEY` environment variable.
2. API key stored in settings.

All AI-generated content starts in `needs_review` status. A human must confirm a draft before it can be scheduled.

### Compliance Checks

Compliance checks run against drafts and scheduling actions. MVP checks include:

- Sensitive words and disabled persona words.
- Over-marketing language.
- Exaggerated claims.
- Title similarity above 70%.
- Body similarity above 60%.
- Cross-account media reuse.
- AI-like copy signals.
- Multiple accounts scheduled in the same minute.

Compliance checks create structured risk log records. Blocking rules prevent unsafe state transitions such as scheduling an unreviewed AI draft.

### Publishing Schedule

Publish tasks connect one account, one reviewed draft, and one scheduled publish time.

The system must not publish automatically. When a task reaches its scheduled time, the app marks it as ready for manual publishing and can show an in-app reminder plus a desktop system notification.

The scheduler rejects tasks that would place multiple accounts in the same minute.

### Publishing Helper

The publishing helper provides compliant manual aids:

- One-click copy title.
- One-click copy body.
- One-click copy tags.
- Open Xiaohongshu creator service or publishing page in the browser.

The final platform publish action must be performed manually by the operator.

### Publishing Records And Analytics

Operators can manually record note performance:

- Published time.
- Note link.
- Views.
- Likes.
- Favorites.
- Comments.

These records support basic review and account health scoring.

### Settings

Settings include:

- OpenAI API key fallback.
- Desktop backend mode.
- Remote API URL.
- S3-compatible endpoint, bucket, region, access key, and secret key.
- Local API startup options where needed.

Secrets must be excluded from committed files. `.env` and local environment files are never committed.

## Database Tables

The MVP includes these tables:

- `users`
- `accounts`
- `personas`
- `media_assets`
- `drafts`
- `publish_tasks`
- `publish_logs`
- `risk_logs`
- `analytics_records`
- `settings`

SQLAlchemy models and Alembic migrations are used so SQLite and PostgreSQL share the same application model. Fields that represent timestamps use timezone-aware values.

## Compliance Boundaries

The MVP must not implement:

- Automatic batch login.
- Automatic clicking or publishing.
- Shared cookies across accounts.
- Proxy IP switching.
- Device fingerprint spoofing.
- Likes automation.
- Comment automation.
- Private message automation.
- Batch publishing.
- Any feature designed to bypass Xiaohongshu risk controls.

The UI should make the compliance posture visible: generated content needs human review, scheduled tasks require manual publication, and risky reuse or similarity produces warnings.

## UI Direction

The desktop UI follows an Apple-inspired premium SaaS style:

- Light gray or white backgrounds.
- Calm cards and panels.
- Rounded controls.
- Subtle borders and shadows.
- Clean tables.
- Settings-style forms.
- Direct image previews for media assets.
- Clear status badges for drafts, tasks, risks, and account health.

MVP navigation:

- Dashboard.
- Accounts.
- Personas.
- Media.
- Drafts.
- Compliance.
- Schedule.
- Publish Records.
- Settings.

## Testing Strategy

Backend tests use `pytest` and should cover:

- Registration, login, password hashing, and JWT-protected endpoints.
- Account creation and persona management.
- Media key isolation by `account_id`.
- Similarity thresholds for titles and body copy.
- Scheduling conflict when multiple accounts are assigned the same minute.
- AI-generated drafts requiring human confirmation before scheduling.
- Risk log creation for compliance warnings.

Frontend verification includes TypeScript checking and production build. Electron packaging verification includes a Windows build command through `electron-builder`.

## Packaging And Deployment

Desktop packaging:

- Electron + React application.
- Windows `.exe` built with `electron-builder`.
- Local mode starts the FastAPI backend process.
- Remote mode connects to the configured online API URL.

Docker deployment:

- API container.
- PostgreSQL container.
- MinIO container for local S3-compatible deployment.
- Environment-based configuration for production S3-compatible providers.

## Deferred Scope

The following items are intentionally deferred:

- Team workspaces.
- Role-based permissions.
- Payment or subscription features.
- Email or SMS reminders.
- Native mobile app.
- Advanced analytics dashboards.
- Automated import from Xiaohongshu.
- Any automation that logs in, clicks, publishes, likes, comments, messages, rotates devices, or rotates proxies.

## Acceptance Criteria

The MVP is complete when:

- A user can register, log in, and use the shared workspace.
- Operators can create accounts and personas.
- Media uploads are stored under account-isolated S3-compatible keys.
- Operators can generate drafts with OpenAI and review them manually.
- Compliance checks warn or block according to MVP rules.
- Reviewed drafts can be scheduled without same-minute multi-account conflicts.
- Desktop reminders and in-app task status indicate when manual publishing is due.
- Operators can copy title, body, and tags, then manually publish.
- Operators can record publish results and analytics numbers.
- The backend can run with SQLite locally and PostgreSQL in Docker.
- The desktop app can be packaged as a Windows `.exe`.
- Docker Compose can run the online stack.
