from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def auth_headers(client: TestClient) -> dict[str, str]:
    client.post("/auth/register", json={"email": "records@example.com", "password": "password123"})
    token = client.post(
        "/auth/login", json={"email": "records@example.com", "password": "password123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_account_and_draft(client: TestClient, headers: dict[str, str]) -> tuple[str, str]:
    account = client.post("/accounts", headers=headers, json={"display_name": "Manual Account"})
    assert account.status_code == 201
    account_id = account.json()["account_id"]

    draft = client.post(
        "/drafts",
        headers=headers,
        json={
            "account_id": account_id,
            "title": "Manual publish note",
            "body": "Human reviewed content for manual publishing.",
            "tags": ["manual"],
            "cover_text": "Manual",
            "source": "manual",
        },
    )
    assert draft.status_code == 201
    return account_id, draft.json()["id"]


def test_operator_can_record_publish_result_and_analytics_numbers():
    client = TestClient(app)
    headers = auth_headers(client)
    account_id, draft_id = create_account_and_draft(client, headers)

    published_at = datetime(2026, 6, 5, 12, 0, tzinfo=timezone.utc).isoformat()
    publish_log = client.post(
        "/publish-logs",
        headers=headers,
        json={
            "account_id": account_id,
            "draft_id": draft_id,
            "published_at": published_at,
            "note_url": "https://www.xiaohongshu.com/explore/manual-note",
        },
    )

    assert publish_log.status_code == 201
    assert publish_log.json()["account_id"] == account_id
    assert publish_log.json()["draft_id"] == draft_id

    listed_publish_logs = client.get("/publish-logs", headers=headers)

    assert listed_publish_logs.status_code == 200
    assert listed_publish_logs.json()[0]["id"] == publish_log.json()["id"]

    analytics = client.post(
        "/analytics-records",
        headers=headers,
        json={
            "account_id": account_id,
            "publish_log_id": publish_log.json()["id"],
            "views": 1200,
            "likes": 88,
            "favorites": 34,
            "comments": 12,
            "recorded_at": datetime(2026, 6, 6, 9, 0, tzinfo=timezone.utc).isoformat(),
        },
    )

    assert analytics.status_code == 201
    assert analytics.json()["views"] == 1200
    assert analytics.json()["likes"] == 88

    listed_analytics = client.get("/analytics-records", headers=headers)

    assert listed_analytics.status_code == 200
    assert listed_analytics.json()[0]["publish_log_id"] == publish_log.json()["id"]


def test_settings_return_secret_placeholders_without_exposing_secret_values():
    client = TestClient(app)
    headers = auth_headers(client)

    non_secret = client.put(
        "/settings/api_base_url",
        headers=headers,
        json={"value": "http://127.0.0.1:8000", "is_secret": False},
    )

    assert non_secret.status_code == 200
    assert non_secret.json()["value"] == "http://127.0.0.1:8000"

    secret = client.put(
        "/settings/openai_api_key",
        headers=headers,
        json={"value": "sk-test-secret", "is_secret": True},
    )

    assert secret.status_code == 200
    assert secret.json()["value"] == "********"
    assert "sk-test-secret" not in str(secret.json())

    settings = client.get("/settings", headers=headers)

    assert settings.status_code == 200
    values_by_key = {setting["key"]: setting["value"] for setting in settings.json()}
    assert values_by_key["api_base_url"] == "http://127.0.0.1:8000"
    assert values_by_key["openai_api_key"] == "********"
