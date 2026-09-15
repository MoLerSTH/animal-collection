import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.core.database import Base, get_db

# In-memory SQLite for fast testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_auth_health():
    response = client.get("/api/v1/auth/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["googleClientIdConfigured"] is True


def test_google_login_dev_mock():
    payload = {"id_token": "mock_google_id_token_test_user"}
    response = client.post("/api/v1/auth/google", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "accessToken" in data
    assert "user" in data
    assert data["user"]["email"] == "jane.doe@animalcollection.dev"
    assert data["tokenType"] == "Bearer"

    # Test accessing protected endpoint with the returned token
    token = data["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    me_response = client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["email"] == "jane.doe@animalcollection.dev"
    assert me_data["id"] == data["user"]["id"]


def test_protected_route_without_token():
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 403 or response.status_code == 401

