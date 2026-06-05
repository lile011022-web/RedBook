# RedBook MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable RedBook MVP foundation with FastAPI, Electron + React, SQLite/PostgreSQL-ready models, S3-compatible media storage, OpenAI draft generation, compliance checks, scheduling, publishing records, Docker support, and Windows packaging configuration.

**Architecture:** Use a monorepo with `apps/api`, `apps/desktop`, `packages/shared`, and `infra`. The FastAPI backend owns all business logic and exposes one API surface for both desktop local mode and online deployment. The Electron app is a React client that can point to either a local API process or a remote API URL.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, pytest, boto3, OpenAI Python SDK, Vite, React, TypeScript, Electron, electron-builder, Docker Compose, PostgreSQL, MinIO.

---

## File Structure

- `apps/api/pyproject.toml`: Python package configuration and API dependencies.
- `apps/api/app/main.py`: FastAPI application factory and router registration.
- `apps/api/app/core/config.py`: Environment and settings loading.
- `apps/api/app/core/security.py`: Password hashing and JWT helpers.
- `apps/api/app/db/session.py`: SQLAlchemy engine and session setup.
- `apps/api/app/db/base.py`: Declarative model base.
- `apps/api/app/models/*.py`: Database models for all MVP tables.
- `apps/api/app/schemas/*.py`: Pydantic request and response schemas.
- `apps/api/app/services/compliance.py`: Sensitive word, similarity, AI-like, material reuse, and scheduling checks.
- `apps/api/app/services/storage.py`: S3-compatible storage adapter and account-scoped key builder.
- `apps/api/app/services/openai_writer.py`: OpenAI draft generation service.
- `apps/api/app/api/*.py`: Routers for auth, accounts, personas, media, drafts, schedule, publish logs, analytics, risks, and settings.
- `apps/api/tests/*.py`: Backend tests for authentication, compliance, scheduling, and storage isolation.
- `apps/desktop/package.json`: Desktop scripts and dependencies.
- `apps/desktop/src/*`: React app, API client, pages, and components.
- `apps/desktop/electron/*`: Electron main process, preload bridge, and local API process launcher.
- `packages/shared/package.json`: Shared package metadata.
- `packages/shared/src/constants.ts`: Compliance thresholds and status constants shared with the desktop UI.
- `infra/docker-compose.yml`: Online/local Docker stack with API, PostgreSQL, and MinIO.
- `.env.example`: Safe configuration template without secrets.
- `README.md`: Development, Docker, desktop, and packaging instructions.

---

### Task 1: Backend Project Skeleton

**Files:**
- Create: `apps/api/pyproject.toml`
- Create: `apps/api/app/main.py`
- Create: `apps/api/app/core/config.py`
- Create: `apps/api/app/db/base.py`
- Create: `apps/api/app/db/session.py`
- Create: `apps/api/app/api/health.py`
- Create: `apps/api/tests/test_health.py`

- [ ] **Step 1: Write the failing health test**

Create `apps/api/tests/test_health.py`:

```python
from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_returns_ok():
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "redbook-api"}
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
cd apps/api
python -m pytest tests/test_health.py -q
```

Expected: FAIL because the API package and `/health` route do not exist yet.

- [ ] **Step 3: Create backend package configuration**

Create `apps/api/pyproject.toml`:

```toml
[project]
name = "redbook-api"
version = "0.1.0"
description = "Compliant Xiaohongshu multi-account operations API"
requires-python = ">=3.11"
dependencies = [
  "alembic>=1.13.0",
  "boto3>=1.34.0",
  "fastapi>=0.115.0",
  "httpx>=0.27.0",
  "openai>=1.40.0",
  "passlib[bcrypt]>=1.7.4",
  "psycopg[binary]>=3.2.0",
  "pydantic-settings>=2.4.0",
  "python-jose[cryptography]>=3.3.0",
  "python-multipart>=0.0.9",
  "sqlalchemy>=2.0.0",
  "uvicorn[standard]>=0.30.0"
]

[project.optional-dependencies]
dev = [
  "pytest>=8.2.0",
  "pytest-asyncio>=0.23.0",
  "ruff>=0.5.0"
]

[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]

[tool.ruff]
line-length = 100
```

- [ ] **Step 4: Implement the minimal app and health route**

Create `apps/api/app/api/health.py`:

```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "redbook-api"}
```

Create `apps/api/app/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health

app = FastAPI(title="RedBook API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
```

Create `apps/api/app/core/config.py`:

```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./redbook.db"
    jwt_secret: str = "dev-change-me"
    jwt_algorithm: str = "HS256"
    openai_api_key: str | None = None
    s3_endpoint_url: str | None = None
    s3_bucket: str = "redbook-media"
    s3_region: str = "us-east-1"
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

Create `apps/api/app/db/base.py`:

```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

Create `apps/api/app/db/session.py`:

```python
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 5: Run the health test to verify it passes**

Run:

```powershell
cd apps/api
python -m pytest tests/test_health.py -q
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/api
git commit -m "Update: add FastAPI project skeleton"
```

---

### Task 2: Database Models And Authentication

**Files:**
- Create: `apps/api/app/models/user.py`
- Create: `apps/api/app/models/account.py`
- Create: `apps/api/app/models/persona.py`
- Create: `apps/api/app/models/media_asset.py`
- Create: `apps/api/app/models/draft.py`
- Create: `apps/api/app/models/publish_task.py`
- Create: `apps/api/app/models/publish_log.py`
- Create: `apps/api/app/models/risk_log.py`
- Create: `apps/api/app/models/analytics_record.py`
- Create: `apps/api/app/models/setting.py`
- Create: `apps/api/app/models/__init__.py`
- Create: `apps/api/app/core/security.py`
- Create: `apps/api/app/schemas/auth.py`
- Create: `apps/api/app/api/auth.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_auth.py`

- [ ] **Step 1: Write failing auth tests**

Create `apps/api/tests/test_auth.py`:

```python
from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_user_can_register_and_login():
    client = TestClient(app)

    register = client.post(
        "/auth/register",
        json={"email": "operator@example.com", "password": "strong-password"},
    )

    assert register.status_code == 201
    assert register.json()["email"] == "operator@example.com"

    login = client.post(
        "/auth/login",
        json={"email": "operator@example.com", "password": "strong-password"},
    )

    assert login.status_code == 200
    assert login.json()["access_token"]
    assert login.json()["token_type"] == "bearer"


def test_login_rejects_wrong_password():
    client = TestClient(app)
    client.post(
        "/auth/register",
        json={"email": "operator@example.com", "password": "strong-password"},
    )

    response = client.post(
        "/auth/login",
        json={"email": "operator@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401
```

- [ ] **Step 2: Run auth tests to verify they fail**

Run:

```powershell
cd apps/api
python -m pytest tests/test_auth.py -q
```

Expected: FAIL because auth models and routes do not exist.

- [ ] **Step 3: Implement models**

Create focused SQLAlchemy models with these required columns:

```python
# apps/api/app/models/user.py
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
```

For the remaining models, include `id`, `created_at`, and the MVP fields from the design:

```python
# accounts: account_id, display_name, status, health_score
# personas: account_id, positioning, content_direction, tone, disabled_words, publish_frequency
# media_assets: account_id, filename, content_type, storage_key, sha256, reused_from_asset_id
# drafts: account_id, title, body, tags, cover_text, source, review_status, compliance_status
# publish_tasks: account_id, draft_id, scheduled_at, status
# publish_logs: account_id, draft_id, published_at, note_url
# risk_logs: account_id, risk_type, severity, message, related_entity_type, related_entity_id
# analytics_records: account_id, publish_log_id, views, likes, favorites, comments, recorded_at
# settings: key, value, is_secret
```

Import every model in `apps/api/app/models/__init__.py` so `Base.metadata.create_all()` sees all tables.

- [ ] **Step 4: Implement security helpers**

Create `apps/api/app/core/security.py`:

```python
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(subject: str) -> str:
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=12)
    payload = {"sub": subject, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
```

- [ ] **Step 5: Implement schemas and auth router**

Create `apps/api/app/schemas/auth.py`:

```python
from pydantic import BaseModel, EmailStr, Field


class AuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class UserResponse(BaseModel):
    id: str
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

Create `apps/api/app/api/auth.py` with `/auth/register` and `/auth/login` using `Session`, `User`, `hash_password`, `verify_password`, and `create_access_token`. Return `201` for register, `401` for invalid login, and `409` for duplicate email.

Modify `apps/api/app/main.py` to import all models, create tables at startup for MVP local development, and include the auth router.

- [ ] **Step 6: Run auth tests to verify they pass**

Run:

```powershell
cd apps/api
python -m pytest tests/test_auth.py -q
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add apps/api
git commit -m "Update: add database models and authentication"
```

---

### Task 3: Compliance, Storage, And Scheduling Services

**Files:**
- Create: `apps/api/app/services/compliance.py`
- Create: `apps/api/app/services/storage.py`
- Create: `apps/api/tests/test_compliance.py`
- Create: `apps/api/tests/test_storage.py`

- [ ] **Step 1: Write failing compliance tests**

Create `apps/api/tests/test_compliance.py`:

```python
from datetime import datetime, timezone

from app.services.compliance import (
    check_ai_draft_can_be_scheduled,
    check_same_minute_account_conflict,
    compare_text_similarity,
)


def test_title_similarity_above_70_percent_warns():
    result = compare_text_similarity("夏天防晒好物推荐", "夏天防晒好物清单", threshold=0.70)

    assert result.is_warning is True
    assert result.score >= 0.70


def test_body_similarity_above_60_percent_warns():
    result = compare_text_similarity(
        "这篇内容介绍温和护肤步骤和适合新手的日常护理方法",
        "这篇笔记介绍温和护肤流程和适合新手的每日护理方法",
        threshold=0.60,
    )

    assert result.is_warning is True
    assert result.score >= 0.60


def test_unreviewed_ai_draft_cannot_be_scheduled():
    result = check_ai_draft_can_be_scheduled(source="ai", review_status="needs_review")

    assert result.allowed is False
    assert "human review" in result.message.lower()


def test_same_minute_different_account_conflict_is_rejected():
    scheduled_at = datetime(2026, 6, 5, 10, 30, tzinfo=timezone.utc)
    result = check_same_minute_account_conflict(
        new_account_id="account-b",
        new_scheduled_at=scheduled_at,
        existing_tasks=[
            {"account_id": "account-a", "scheduled_at": scheduled_at},
        ],
    )

    assert result.allowed is False
```

- [ ] **Step 2: Write failing storage test**

Create `apps/api/tests/test_storage.py`:

```python
from app.services.storage import build_media_storage_key


def test_media_storage_key_is_scoped_by_account_id():
    key = build_media_storage_key(
        account_id="acc_123",
        asset_id="asset_456",
        filename="cover.png",
    )

    assert key == "accounts/acc_123/media/asset_456/cover.png"
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```powershell
cd apps/api
python -m pytest tests/test_compliance.py tests/test_storage.py -q
```

Expected: FAIL because services do not exist.

- [ ] **Step 4: Implement compliance service**

Create `apps/api/app/services/compliance.py` with dataclasses:

```python
from dataclasses import dataclass
from datetime import datetime
from difflib import SequenceMatcher


@dataclass(frozen=True)
class SimilarityResult:
    score: float
    threshold: float
    is_warning: bool


@dataclass(frozen=True)
class RuleResult:
    allowed: bool
    message: str


def compare_text_similarity(left: str, right: str, threshold: float) -> SimilarityResult:
    score = SequenceMatcher(None, left.strip(), right.strip()).ratio()
    return SimilarityResult(score=score, threshold=threshold, is_warning=score >= threshold)


def check_ai_draft_can_be_scheduled(source: str, review_status: str) -> RuleResult:
    if source == "ai" and review_status != "approved":
        return RuleResult(False, "AI-generated content requires human review before scheduling.")
    return RuleResult(True, "Draft can be scheduled.")


def check_same_minute_account_conflict(
    new_account_id: str,
    new_scheduled_at: datetime,
    existing_tasks: list[dict],
) -> RuleResult:
    new_minute = new_scheduled_at.replace(second=0, microsecond=0)
    for task in existing_tasks:
        existing_minute = task["scheduled_at"].replace(second=0, microsecond=0)
        if task["account_id"] != new_account_id and existing_minute == new_minute:
            return RuleResult(False, "Multiple accounts cannot be scheduled in the same minute.")
    return RuleResult(True, "No same-minute multi-account conflict.")
```

- [ ] **Step 5: Implement storage service**

Create `apps/api/app/services/storage.py`:

```python
from pathlib import PurePosixPath


def build_media_storage_key(account_id: str, asset_id: str, filename: str) -> str:
    safe_name = PurePosixPath(filename).name
    return str(PurePosixPath("accounts", account_id, "media", asset_id, safe_name))
```

- [ ] **Step 6: Run tests to verify they pass**

Run:

```powershell
cd apps/api
python -m pytest tests/test_compliance.py tests/test_storage.py -q
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add apps/api
git commit -m "Update: add compliance and storage services"
```

---

### Task 4: MVP API Routers

**Files:**
- Create: `apps/api/app/api/accounts.py`
- Create: `apps/api/app/api/personas.py`
- Create: `apps/api/app/api/media.py`
- Create: `apps/api/app/api/drafts.py`
- Create: `apps/api/app/api/schedule.py`
- Create: `apps/api/app/api/publish_logs.py`
- Create: `apps/api/app/api/analytics.py`
- Create: `apps/api/app/api/risks.py`
- Create: `apps/api/app/api/settings.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_mvp_api.py`

- [ ] **Step 1: Write failing API workflow test**

Create `apps/api/tests/test_mvp_api.py`:

```python
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def auth_headers(client: TestClient) -> dict[str, str]:
    client.post("/auth/register", json={"email": "op@example.com", "password": "password123"})
    token = client.post(
        "/auth/login", json={"email": "op@example.com", "password": "password123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_operator_can_create_account_persona_draft_and_schedule():
    client = TestClient(app)
    headers = auth_headers(client)

    account = client.post(
        "/accounts",
        headers=headers,
        json={"display_name": "Beauty Account"},
    )
    assert account.status_code == 201
    account_id = account.json()["account_id"]

    persona = client.put(
        f"/accounts/{account_id}/persona",
        headers=headers,
        json={
            "positioning": "gentle beauty notes",
            "content_direction": "skincare",
            "tone": "warm and practical",
            "disabled_words": ["guaranteed"],
            "publish_frequency": "3/week",
        },
    )
    assert persona.status_code == 200

    draft = client.post(
        "/drafts",
        headers=headers,
        json={
            "account_id": account_id,
            "title": "夏天温和护肤清单",
            "body": "适合新手的温和护肤步骤，需要人工确认后再发布。",
            "tags": ["护肤", "新手"],
            "cover_text": "温和护肤",
            "source": "ai",
        },
    )
    assert draft.status_code == 201
    assert draft.json()["review_status"] == "needs_review"

    rejected = client.post(
        "/publish-tasks",
        headers=headers,
        json={
            "account_id": account_id,
            "draft_id": draft.json()["id"],
            "scheduled_at": datetime(2026, 6, 5, 10, 30, tzinfo=timezone.utc).isoformat(),
        },
    )
    assert rejected.status_code == 409

    approved = client.patch(
        f"/drafts/{draft.json()['id']}/review",
        headers=headers,
        json={"review_status": "approved"},
    )
    assert approved.status_code == 200

    scheduled = client.post(
        "/publish-tasks",
        headers=headers,
        json={
            "account_id": account_id,
            "draft_id": draft.json()["id"],
            "scheduled_at": datetime(2026, 6, 5, 10, 30, tzinfo=timezone.utc).isoformat(),
        },
    )
    assert scheduled.status_code == 201
```

- [ ] **Step 2: Run API workflow test to verify it fails**

Run:

```powershell
cd apps/api
python -m pytest tests/test_mvp_api.py -q
```

Expected: FAIL because MVP routers do not exist.

- [ ] **Step 3: Implement routers with minimal CRUD**

Implement each router with authenticated endpoints and SQLAlchemy persistence:

```text
POST /accounts
GET /accounts
PUT /accounts/{account_id}/persona
POST /media-assets
GET /accounts/{account_id}/media-assets
POST /drafts
PATCH /drafts/{draft_id}/review
POST /publish-tasks
GET /publish-tasks
POST /publish-logs
POST /analytics-records
GET /risk-logs
GET /settings
PUT /settings/{key}
```

Use the compliance service to reject unreviewed AI drafts and same-minute multi-account schedule conflicts. Create risk logs when a compliance rejection happens.

- [ ] **Step 4: Run API workflow test to verify it passes**

Run:

```powershell
cd apps/api
python -m pytest tests/test_mvp_api.py -q
```

Expected: PASS.

- [ ] **Step 5: Run all backend tests**

Run:

```powershell
cd apps/api
python -m pytest -q
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add apps/api
git commit -m "Update: add MVP API routers"
```

---

### Task 5: OpenAI Draft Generation

**Files:**
- Create: `apps/api/app/services/openai_writer.py`
- Create: `apps/api/app/api/ai.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_openai_writer.py`

- [ ] **Step 1: Write failing OpenAI service test**

Create `apps/api/tests/test_openai_writer.py`:

```python
from app.services.openai_writer import build_draft_prompt


def test_build_draft_prompt_includes_persona_and_compliance_language():
    prompt = build_draft_prompt(
        positioning="new mother skincare",
        content_direction="gentle routines",
        tone="warm",
        disabled_words=["guaranteed"],
        topic="summer moisturizer",
    )

    assert "new mother skincare" in prompt
    assert "gentle routines" in prompt
    assert "warm" in prompt
    assert "guaranteed" in prompt
    assert "manual review" in prompt.lower()
    assert "do not make exaggerated claims" in prompt.lower()
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```powershell
cd apps/api
python -m pytest tests/test_openai_writer.py -q
```

Expected: FAIL because OpenAI writer service does not exist.

- [ ] **Step 3: Implement prompt builder and generation service**

Create `apps/api/app/services/openai_writer.py` with:

```python
def build_draft_prompt(
    positioning: str,
    content_direction: str,
    tone: str,
    disabled_words: list[str],
    topic: str,
) -> str:
    disabled = ", ".join(disabled_words) if disabled_words else "none"
    return (
        "Generate Xiaohongshu content for compliant manual publishing.\n"
        f"Persona positioning: {positioning}\n"
        f"Content direction: {content_direction}\n"
        f"Tone: {tone}\n"
        f"Topic: {topic}\n"
        f"Disabled words: {disabled}\n"
        "Do not make exaggerated claims. Do not imply guaranteed outcomes. "
        "Return topic ideas, title, body, tags, and cover copy. "
        "All generated content requires manual review before scheduling."
    )
```

Add an async `generate_draft_content()` function that reads `OPENAI_API_KEY` from settings first, accepts a saved settings fallback, and returns structured fields. In tests, keep the prompt builder pure and do not call the real OpenAI API.

- [ ] **Step 4: Run OpenAI test to verify it passes**

Run:

```powershell
cd apps/api
python -m pytest tests/test_openai_writer.py -q
```

Expected: PASS.

- [ ] **Step 5: Add `/ai/generate-draft` router**

Create an authenticated endpoint that accepts `account_id` and `topic`, loads the persona, generates content, saves a draft with `source="ai"` and `review_status="needs_review"`, and returns the draft.

- [ ] **Step 6: Run all backend tests**

Run:

```powershell
cd apps/api
python -m pytest -q
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add apps/api
git commit -m "Update: add OpenAI draft generation service"
```

---

### Task 6: Desktop React And Electron Shell

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/index.html`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/electron/main.ts`
- Create: `apps/desktop/electron/preload.ts`
- Create: `apps/desktop/src/main.tsx`
- Create: `apps/desktop/src/App.tsx`
- Create: `apps/desktop/src/api/client.ts`
- Create: `apps/desktop/src/styles.css`
- Create: `apps/desktop/src/pages/*.tsx`

- [ ] **Step 1: Create desktop package**

Create `apps/desktop/package.json`:

```json
{
  "name": "redbook-desktop",
  "version": "0.1.0",
  "private": true,
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "electron:build": "npm run build && electron-builder --win",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^31.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "electron-builder": "^24.13.3",
    "typescript": "^5.5.0",
    "vite": "^5.3.0"
  },
  "build": {
    "appId": "com.redbook.ops",
    "productName": "RedBook Compliance Ops",
    "directories": {
      "output": "release"
    },
    "win": {
      "target": "nsis"
    }
  }
}
```

- [ ] **Step 2: Implement Electron main process**

Create `apps/desktop/electron/main.ts` with a browser window that loads Vite in development and bundled `index.html` in production. Add an IPC method for desktop notifications named `notifyPublishDue`.

- [ ] **Step 3: Implement React app shell**

Create `apps/desktop/src/App.tsx` with Apple-inspired navigation and these pages:

```text
Dashboard
Accounts
Personas
Media
Drafts
Compliance
Schedule
Publish Records
Settings
```

Each page should render a usable MVP panel with loading, empty, and basic form states. Media rows must render image previews when the asset content type starts with `image/`.

- [ ] **Step 4: Implement API client**

Create `apps/desktop/src/api/client.ts` with:

```typescript
const API_BASE_URL = localStorage.getItem("redbook.apiBaseUrl") || "http://127.0.0.1:8000";

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("redbook.token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}
```

- [ ] **Step 5: Add Apple-inspired CSS**

Create `apps/desktop/src/styles.css` with light background, rounded panels, subtle borders, calm badges, settings-style forms, clean tables, and responsive layout.

- [ ] **Step 6: Verify desktop build**

Run:

```powershell
cd apps/desktop
npm install
npm run build
```

Expected: TypeScript and Vite build succeed.

- [ ] **Step 7: Commit**

```powershell
git add apps/desktop
git commit -m "Update: add Electron React desktop shell"
```

---

### Task 7: Shared Constants, Docker, And Environment Templates

**Files:**
- Create: `package.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/src/constants.ts`
- Create: `infra/docker-compose.yml`
- Create: `infra/api.Dockerfile`
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Create shared constants**

Create `packages/shared/src/constants.ts`:

```typescript
export const COMPLIANCE_THRESHOLDS = {
  titleSimilarity: 0.7,
  bodySimilarity: 0.6
} as const;

export const DRAFT_REVIEW_STATUS = {
  needsReview: "needs_review",
  approved: "approved",
  rejected: "rejected"
} as const;

export const PUBLISH_TASK_STATUS = {
  scheduled: "scheduled",
  due: "due",
  completed: "completed",
  cancelled: "cancelled"
} as const;
```

- [ ] **Step 2: Create root package scripts**

Create root `package.json` with npm workspaces for `apps/desktop` and `packages/shared`, plus scripts:

```json
{
  "name": "redbook",
  "private": true,
  "workspaces": ["apps/desktop", "packages/shared"],
  "scripts": {
    "desktop:build": "npm --workspace apps/desktop run build",
    "desktop:package:win": "npm --workspace apps/desktop run electron:build"
  }
}
```

- [ ] **Step 3: Add Docker stack**

Create `infra/docker-compose.yml` with services:

```yaml
services:
  api:
    build:
      context: ..
      dockerfile: infra/api.Dockerfile
    environment:
      DATABASE_URL: postgresql+psycopg://redbook:redbook@postgres:5432/redbook
      S3_ENDPOINT_URL: http://minio:9000
      S3_BUCKET: redbook-media
      S3_REGION: us-east-1
      S3_ACCESS_KEY_ID: minioadmin
      S3_SECRET_ACCESS_KEY: minioadmin
      JWT_SECRET: change-me-in-production
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - minio

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: redbook
      POSTGRES_USER: redbook
      POSTGRES_PASSWORD: redbook
    volumes:
      - postgres-data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data

volumes:
  postgres-data:
  minio-data:
```

- [ ] **Step 4: Add safe environment template**

Create `.env.example` with non-secret sample values and document that real `.env` files are ignored:

```text
DATABASE_URL=sqlite:///./redbook.db
JWT_SECRET=replace-with-a-long-random-secret
OPENAI_API_KEY=
S3_ENDPOINT_URL=http://127.0.0.1:9000
S3_BUCKET=redbook-media
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

- [ ] **Step 5: Add README**

Create `README.md` with commands for:

```powershell
cd apps/api
python -m pip install -e ".[dev]"
python -m uvicorn app.main:app --reload

npm install
npm run desktop:build
npm run desktop:package:win

cd infra
docker compose up --build
```

- [ ] **Step 6: Verify root scripts and Docker config**

Run:

```powershell
npm install
npm run desktop:build
docker compose -f infra/docker-compose.yml config
```

Expected: npm build succeeds and Docker Compose config renders without errors.

- [ ] **Step 7: Commit**

```powershell
git add package.json packages infra .env.example README.md
git commit -m "Update: add shared config and Docker deployment"
```

---

### Task 8: Final Verification, Windows Packaging, And Push

**Files:**
- Modify only files needed to fix verification failures from previous tasks.

- [ ] **Step 1: Run backend tests**

Run:

```powershell
cd apps/api
python -m pytest -q
```

Expected: all backend tests PASS.

- [ ] **Step 2: Run desktop build**

Run:

```powershell
npm run desktop:build
```

Expected: TypeScript and Vite build PASS.

- [ ] **Step 3: Run Docker Compose validation**

Run:

```powershell
docker compose -f infra/docker-compose.yml config
```

Expected: Docker Compose config renders PASS.

- [ ] **Step 4: Run Windows package command**

Run:

```powershell
npm run desktop:package:win
```

Expected: electron-builder creates a Windows installer under `apps/desktop/release`. The generated `.exe` remains ignored by Git.

- [ ] **Step 5: Check git status**

Run:

```powershell
git status
```

Expected: no untracked secrets, no generated release files staged, and only intentional source changes if any verification fixes were needed.

- [ ] **Step 6: Commit verification fixes if needed**

If verification fixes changed source files, run:

```powershell
git add -A
git commit -m "Update: finalize RedBook MVP foundation"
```

If no source files changed, skip this commit.

- [ ] **Step 7: Push all commits**

Run:

```powershell
git push
```

Expected: push succeeds to `origin/master`.

---

## Self-Review

- Spec coverage: This plan covers the approved MVP foundation: monorepo, FastAPI, Electron + React, SQLite/PostgreSQL-ready models, S3-compatible storage, OpenAI draft generation, compliance checks, publishing schedule, manual publishing records, Docker, and Windows packaging.
- Deferred scope remains deferred: role permissions, team workspaces, SMS/email reminders, automatic platform import, and prohibited automation are not implemented.
- Red-flag scan: No deferred implementation notes or intentionally vague implementation steps remain.
- Type consistency: Draft review statuses use `needs_review` and `approved`; publish task statuses use `scheduled`, `due`, `completed`, and `cancelled`; storage keys use `accounts/{account_id}/media/{asset_id}/{filename}`.
