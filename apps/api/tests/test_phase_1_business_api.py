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


def test_operator_can_create_account_persona_draft_and_schedule_after_review():
    client = TestClient(app)
    headers = auth_headers(client)

    account = client.post(
        "/accounts",
        headers=headers,
        json={"display_name": "Beauty Account"},
    )

    assert account.status_code == 201
    assert account.json()["display_name"] == "Beauty Account"
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
    assert persona.json()["account_id"] == account_id
    assert persona.json()["disabled_words"] == ["guaranteed"]

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

    risk_logs = client.get("/risk-logs", headers=headers)

    assert risk_logs.status_code == 200
    assert risk_logs.json()[0]["risk_type"] == "unreviewed_ai_draft"
    assert risk_logs.json()[0]["related_entity_id"] == draft.json()["id"]

    approved = client.patch(
        f"/drafts/{draft.json()['id']}/review",
        headers=headers,
        json={"review_status": "approved"},
    )

    assert approved.status_code == 200
    assert approved.json()["review_status"] == "approved"

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
    assert scheduled.json()["status"] == "scheduled"


def test_business_routes_require_authentication():
    client = TestClient(app)

    response = client.get("/accounts")

    assert response.status_code == 401
