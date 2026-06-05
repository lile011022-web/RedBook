from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app
from app.services.openai_writer import DashboardAnalysis, DraftContent


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def auth_headers(client: TestClient) -> dict[str, str]:
    client.post("/auth/register", json={"email": "phase8@example.com", "password": "password123"})
    token = client.post(
        "/auth/login", json={"email": "phase8@example.com", "password": "password123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_account_with_persona(client: TestClient, headers: dict[str, str]) -> str:
    account = client.post("/accounts", headers=headers, json={"display_name": "运营账号"})
    assert account.status_code == 201
    account_id = account.json()["account_id"]
    persona = client.put(
        f"/accounts/{account_id}/persona",
        headers=headers,
        json={
            "positioning": "合肥本地生活博主",
            "content_direction": "探店与直播预告",
            "tone": "真诚直接",
            "disabled_words": ["保证"],
            "publish_frequency": "每周 3 篇",
        },
    )
    assert persona.status_code == 200
    return account_id


def create_dashboard_record(client: TestClient, headers: dict[str, str], account_id: str) -> str:
    response = client.post(
        "/dashboard-records",
        headers=headers,
        json={
            "account_id": account_id,
            "period_label": "近7日",
            "period_start": "2026-05-29",
            "period_end": "2026-06-04",
            "exposure_count": 51,
            "view_count": 7,
            "like_count": 0,
            "comment_count": 0,
            "net_follower_count": 0,
            "new_follow_count": 0,
            "cover_click_rate": 13.7,
            "video_completion_rate": 0,
            "favorite_count": 0,
            "share_count": 0,
            "unfollow_count": 0,
            "profile_visit_count": 8,
            "exposure_change": "-40%",
            "view_change": "-46%",
            "profile_visit_change": "-57%",
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_ai_generate_draft_options_saves_multiple_reviewable_drafts(monkeypatch):
    from app.api import ai

    async def fake_generate_draft_options(*, api_key: str, prompt: str, model: str = "gpt-5.2"):
        assert api_key == "test-key"
        assert "合肥本地生活博主" in prompt
        assert "直播预告" in prompt
        return [
            DraftContent(title="今晚直播看点", body="第一版正文", tags=["直播"], cover_text="今晚开播"),
            DraftContent(title="合肥好物清单", body="第二版正文", tags=["合肥"], cover_text="好物清单"),
        ]

    monkeypatch.setattr(ai, "generate_draft_options", fake_generate_draft_options)
    monkeypatch.setattr(ai, "resolve_openai_api_key", lambda db: "test-key")

    client = TestClient(app)
    headers = auth_headers(client)
    account_id = create_account_with_persona(client, headers)

    response = client.post(
        "/ai/generate-draft-options",
        headers=headers,
        json={
            "account_id": account_id,
            "topic": "直播预告",
            "count": 2,
            "extra_requirements": "一版偏转化，一版偏种草",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert len(payload) == 2
    assert payload[0]["source"] == "ai"
    assert payload[0]["review_status"] == "needs_review"
    assert payload[1]["title"] == "合肥好物清单"


def test_ai_analyze_dashboard_returns_structured_recommendations(monkeypatch):
    from app.api import ai

    async def fake_generate_dashboard_analysis(*, api_key: str, prompt: str, model: str = "gpt-5.2"):
        assert api_key == "test-key"
        assert "51" in prompt
        assert "合肥本地生活博主" in prompt
        return DashboardAnalysis(
            summary="曝光和观看下降，主页访客仍有少量兴趣。",
            diagnosis=["曝光下降，需要优化选题入口。"],
            recommendations=["优先测试更具体的本地利益点标题。"],
            next_actions=["录入下一周期数据后对比封面点击率。"],
            content_angles=["合肥周末直播清单"],
        )

    monkeypatch.setattr(ai, "generate_dashboard_analysis", fake_generate_dashboard_analysis)
    monkeypatch.setattr(ai, "resolve_openai_api_key", lambda db: "test-key")

    client = TestClient(app)
    headers = auth_headers(client)
    account_id = create_account_with_persona(client, headers)
    record_id = create_dashboard_record(client, headers, account_id)

    response = client.post(
        "/ai/analyze-dashboard",
        headers=headers,
        json={"account_id": account_id, "dashboard_record_id": record_id},
    )

    assert response.status_code == 200
    assert response.json()["summary"] == "曝光和观看下降，主页访客仍有少量兴趣。"
    assert response.json()["content_angles"] == ["合肥周末直播清单"]
