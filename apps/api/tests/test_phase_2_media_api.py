from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def auth_headers(client: TestClient) -> dict[str, str]:
    client.post("/auth/register", json={"email": "media@example.com", "password": "password123"})
    token = client.post(
        "/auth/login", json={"email": "media@example.com", "password": "password123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_account(client: TestClient, headers: dict[str, str], display_name: str) -> str:
    response = client.post("/accounts", headers=headers, json={"display_name": display_name})
    assert response.status_code == 201
    return response.json()["account_id"]


def test_operator_can_create_and_list_account_scoped_media_metadata():
    client = TestClient(app)
    headers = auth_headers(client)
    account_id = create_account(client, headers, "Beauty Account")

    created = client.post(
        "/media-assets",
        headers=headers,
        json={
            "account_id": account_id,
            "filename": "../cover.png",
            "content_type": "image/png",
            "preview_url": "https://example.com/cover.png",
            "sha256": "a" * 64,
        },
    )

    assert created.status_code == 201
    assert created.json()["account_id"] == account_id
    assert created.json()["filename"] == "cover.png"
    assert created.json()["preview_url"] == "https://example.com/cover.png"
    assert created.json()["storage_key"].startswith(f"accounts/{account_id}/media/")
    assert created.json()["storage_key"].endswith("/cover.png")

    listed = client.get(f"/accounts/{account_id}/media-assets", headers=headers)

    assert listed.status_code == 200
    assert listed.json()[0]["id"] == created.json()["id"]


def test_cross_account_media_reuse_creates_risk_log():
    client = TestClient(app)
    headers = auth_headers(client)
    first_account_id = create_account(client, headers, "First Account")
    second_account_id = create_account(client, headers, "Second Account")

    original = client.post(
        "/media-assets",
        headers=headers,
        json={
            "account_id": first_account_id,
            "filename": "cover.png",
            "content_type": "image/png",
            "sha256": "b" * 64,
        },
    )
    assert original.status_code == 201

    reused = client.post(
        "/media-assets",
        headers=headers,
        json={
            "account_id": second_account_id,
            "filename": "cover.png",
            "content_type": "image/png",
            "sha256": "b" * 64,
        },
    )

    assert reused.status_code == 201
    assert reused.json()["reused_from_asset_id"] == original.json()["id"]

    risk_logs = client.get("/risk-logs", headers=headers)

    assert risk_logs.status_code == 200
    assert risk_logs.json()[0]["risk_type"] == "cross_account_media_reuse"
    assert risk_logs.json()[0]["account_id"] == second_account_id
