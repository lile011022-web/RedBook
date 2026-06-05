from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app
from app.services.openai_writer import DraftContent


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def auth_headers(client: TestClient) -> dict[str, str]:
    client.post("/auth/register", json={"email": "ai@example.com", "password": "password123"})
    token = client.post(
        "/auth/login", json={"email": "ai@example.com", "password": "password123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_account_with_persona(client: TestClient, headers: dict[str, str]) -> str:
    account = client.post("/accounts", headers=headers, json={"display_name": "AI Account"})
    assert account.status_code == 201
    account_id = account.json()["account_id"]

    persona = client.put(
        f"/accounts/{account_id}/persona",
        headers=headers,
        json={
            "positioning": "practical skincare notes",
            "content_direction": "gentle routines",
            "tone": "warm",
            "disabled_words": ["guaranteed"],
            "publish_frequency": "3/week",
        },
    )
    assert persona.status_code == 200
    return account_id


def test_ai_generate_draft_saves_generated_content_for_human_review(monkeypatch):
    from app.api import ai

    async def fake_generate_draft_content(*, api_key: str, prompt: str, model: str = "gpt-5.2"):
        assert api_key == "test-key"
        assert "practical skincare notes" in prompt
        assert "summer moisturizer" in prompt
        return DraftContent(
            title="Gentle summer moisturizer checklist",
            body="A warm draft that operators must review manually.",
            tags=["skincare", "summer"],
            cover_text="Gentle summer care",
        )

    monkeypatch.setattr(ai, "generate_draft_content", fake_generate_draft_content)
    monkeypatch.setattr(ai, "resolve_openai_api_key", lambda db: "test-key")

    client = TestClient(app)
    headers = auth_headers(client)
    account_id = create_account_with_persona(client, headers)
    generated = client.post(
        "/ai/generate-draft",
        headers=headers,
        json={"account_id": account_id, "topic": "summer moisturizer"},
    )

    assert generated.status_code == 201
    assert generated.json()["account_id"] == account_id
    assert generated.json()["title"] == "Gentle summer moisturizer checklist"
    assert generated.json()["source"] == "ai"
    assert generated.json()["review_status"] == "needs_review"
    assert generated.json()["tags"] == ["skincare", "summer"]
