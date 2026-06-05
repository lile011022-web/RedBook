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
    assert created.json()["source"] == "external"
    assert created.json()["file_size"] == 0
    assert created.json()["storage_key"].startswith(f"accounts/{account_id}/media/")
    assert created.json()["storage_key"].endswith("/cover.png")

    listed = client.get(f"/accounts/{account_id}/media-assets", headers=headers)

    assert listed.status_code == 200
    assert listed.json()[0]["id"] == created.json()["id"]


def test_operator_can_upload_and_preview_account_scoped_media_file():
    client = TestClient(app)
    headers = auth_headers(client)
    first_account_id = create_account(client, headers, "First Media Account")
    second_account_id = create_account(client, headers, "Second Media Account")

    uploaded = client.post(
        f"/accounts/{first_account_id}/media-assets/upload",
        headers=headers,
        files={"file": ("cover.png", b"fake-image-content", "image/png")},
    )

    assert uploaded.status_code == 201
    assert uploaded.json()["account_id"] == first_account_id
    assert uploaded.json()["source"] == "upload"
    assert uploaded.json()["file_size"] == len(b"fake-image-content")
    assert uploaded.json()["preview_url"] == f"/media-assets/{uploaded.json()['id']}/file"

    first_list = client.get(f"/accounts/{first_account_id}/media-assets", headers=headers)
    second_list = client.get(f"/accounts/{second_account_id}/media-assets", headers=headers)

    assert len(first_list.json()) == 1
    assert second_list.json() == []

    preview = client.get(uploaded.json()["preview_url"])

    assert preview.status_code == 200
    assert preview.content == b"fake-image-content"


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


def test_ai_media_ideas_and_generated_image_are_account_scoped(monkeypatch):
    from app.api import media
    from app.services.openai_writer import MediaIdeas

    async def fake_generate_media_ideas(*, api_key: str, prompt: str, model: str = "gpt-5.2"):
        assert api_key == "test-key"
        assert "合肥本地生活博主" in prompt
        return MediaIdeas(
            cover_concepts=["直播预告封面"],
            shooting_script=["开场介绍岗位亮点"],
            video_storyboard=["3 秒展示工作场景"],
            asset_checklist=["门店外景", "主播工作台"],
        )

    async def fake_generate_image_bytes(*, api_key: str, prompt: str, model: str = "gpt-image-1"):
        assert api_key == "test-key"
        assert "直播招聘封面" in prompt
        return b"generated-image"

    monkeypatch.setattr(media, "generate_media_ideas", fake_generate_media_ideas)
    monkeypatch.setattr(media, "generate_image_bytes", fake_generate_image_bytes)
    monkeypatch.setattr(media, "resolve_openai_api_key", lambda db: "test-key")

    client = TestClient(app)
    headers = auth_headers(client)
    account_id = create_account(client, headers, "AI Media Account")
    persona = client.put(
        f"/accounts/{account_id}/persona",
        headers=headers,
        json={
            "positioning": "合肥本地生活博主",
            "content_direction": "直播招聘",
            "tone": "真诚",
            "disabled_words": ["保证"],
            "publish_frequency": "3/week",
        },
    )
    assert persona.status_code == 200

    ideas = client.post(
        f"/accounts/{account_id}/media-ideas",
        headers=headers,
        json={"goal": "直播招聘预热"},
    )
    assert ideas.status_code == 200
    assert ideas.json()["cover_concepts"] == ["直播预告封面"]

    generated = client.post(
        f"/accounts/{account_id}/media-assets/generate-image",
        headers=headers,
        json={"prompt": "直播招聘封面", "style": "真实手机摄影"},
    )

    assert generated.status_code == 201
    assert generated.json()["source"] == "ai_image"
    assert generated.json()["content_type"] == "image/png"
    assert generated.json()["file_size"] == len(b"generated-image")
