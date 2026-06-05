from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def auth_headers(client: TestClient) -> dict[str, str]:
    client.post("/auth/register", json={"email": "desktop@example.com", "password": "password123"})
    token = client.post(
        "/auth/login", json={"email": "desktop@example.com", "password": "password123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_desktop_can_read_persona_and_draft_lists():
    client = TestClient(app)
    headers = auth_headers(client)

    account = client.post("/accounts", headers=headers, json={"display_name": "Desktop Account"})
    assert account.status_code == 201
    account_id = account.json()["account_id"]

    client.put(
        f"/accounts/{account_id}/persona",
        headers=headers,
        json={
            "positioning": "desktop notes",
            "content_direction": "operations",
            "tone": "calm",
            "disabled_words": ["guaranteed"],
            "publish_frequency": "3/week",
        },
    )
    draft = client.post(
        "/drafts",
        headers=headers,
        json={
            "account_id": account_id,
            "title": "Desktop draft",
            "body": "Draft for desktop display.",
            "tags": ["desktop"],
            "cover_text": "Desktop",
            "source": "manual",
        },
    )
    assert draft.status_code == 201

    persona = client.get(f"/accounts/{account_id}/persona", headers=headers)
    drafts = client.get("/drafts", headers=headers)

    assert persona.status_code == 200
    assert persona.json()["account_id"] == account_id
    assert persona.json()["positioning"] == "desktop notes"
    assert drafts.status_code == 200
    assert drafts.json()[0]["id"] == draft.json()["id"]
