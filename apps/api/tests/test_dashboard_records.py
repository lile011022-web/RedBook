from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def auth_headers(client: TestClient) -> dict[str, str]:
    client.post("/auth/register", json={"email": "dashboard@example.com", "password": "password123"})
    token = client.post(
        "/auth/login", json={"email": "dashboard@example.com", "password": "password123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_account(client: TestClient, headers: dict[str, str]) -> str:
    response = client.post("/accounts", headers=headers, json={"display_name": "小红书账号 A"})
    assert response.status_code == 201
    return response.json()["account_id"]


def dashboard_payload(account_id: str) -> dict[str, object]:
    return {
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
        "cover_click_change": "-2%",
        "profile_visit_change": "-57%",
        "notes": "截图手动录入，互动偏低。",
    }


def test_operator_can_create_and_list_dashboard_records():
    client = TestClient(app)
    headers = auth_headers(client)
    account_id = create_account(client, headers)

    created = client.post("/dashboard-records", headers=headers, json=dashboard_payload(account_id))

    assert created.status_code == 201
    assert created.json()["account_id"] == account_id
    assert created.json()["exposure_count"] == 51
    assert created.json()["cover_click_rate"] == 13.7
    assert created.json()["profile_visit_change"] == "-57%"

    all_records = client.get("/dashboard-records", headers=headers)
    assert all_records.status_code == 200
    assert len(all_records.json()) == 1

    account_records = client.get(f"/dashboard-records/accounts/{account_id}", headers=headers)
    assert account_records.status_code == 200
    assert account_records.json()[0]["view_count"] == 7


def test_dashboard_records_require_existing_account():
    client = TestClient(app)
    headers = auth_headers(client)

    created = client.post("/dashboard-records", headers=headers, json=dashboard_payload("missing-account"))

    assert created.status_code == 404
