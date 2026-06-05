from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.main import app
from app.models import User


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


def test_registered_password_is_hashed():
    client = TestClient(app)
    client.post(
        "/auth/register",
        json={"email": "operator@example.com", "password": "strong-password"},
    )

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == "operator@example.com").one()

    assert user.password_hash != "strong-password"
    assert user.password_hash
