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
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


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



def test_protected_route_with_expired_token():
    from datetime import timedelta
    from src.services.auth_service import create_access_token
    expired_token = create_access_token(user_id="test-user-id", email="test@example.com", expires_delta=timedelta(seconds=-10))
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
    assert "expired" in response.json().get("detail", "").lower()


def test_protected_route_with_invalid_token():
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer mock_jwt_access_token_1"})
    assert response.status_code == 401
    assert response.json().get("detail") == "Invalid or expired authentication token"


def test_protected_route_with_nonexistent_user():
    from src.services.auth_service import create_access_token
    valid_token_ghost_user = create_access_token(user_id="nonexistent-user-uuid", email="ghost@example.com")
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {valid_token_ghost_user}"})
    assert response.status_code == 401
    assert "not found" in response.json().get("detail", "").lower()



def test_update_username_and_preserve_across_relogin():
    # 1. Login user
    login_res = client.post("/api/v1/auth/google", json={"id_token": "mock_google_id_token_test_user"})
    assert login_res.status_code == 200
    token = login_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    assert login_res.json()["user"]["name"] == "Jane Doe (Dev)"

    # 2. Update username via PATCH /api/v1/auth/me
    patch_res = client.patch("/api/v1/auth/me", headers=headers, json={"name": "  นักสำรวจไพร  "})
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "นักสำรวจไพร"

    # 3. GET /api/v1/auth/me reflects the new name
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "นักสำรวจไพร"

    # 4. Re-login / token refresh with Google should PRESERVE custom username
    relogin_res = client.post("/api/v1/auth/google", json={"id_token": "mock_google_id_token_test_user"})
    assert relogin_res.status_code == 200
    assert relogin_res.json()["user"]["name"] == "นักสำรวจไพร"


def test_update_username_validation():
    login_res = client.post("/api/v1/auth/google", json={"id_token": "mock_google_id_token_test_user"})
    token = login_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # Too short
    res_short = client.patch("/api/v1/auth/me", headers=headers, json={"name": "a"})
    assert res_short.status_code == 422

    # Whitespace only
    res_space = client.patch("/api/v1/auth/me", headers=headers, json={"name": "   "})
    assert res_space.status_code == 422

    # Too long (> 30 chars)
    res_long = client.patch("/api/v1/auth/me", headers=headers, json={"name": "a" * 31})
    assert res_long.status_code == 422

    # Control characters / newline
    res_ctrl = client.patch("/api/v1/auth/me", headers=headers, json={"name": "Hello\nWorld"})
    assert res_ctrl.status_code == 422


def test_delete_account():
    login_res = client.post("/api/v1/auth/google", json={"id_token": "mock_google_id_token_test_user"})
    token = login_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # Wrong confirmation
    bad_del = client.request("DELETE", "/api/v1/auth/me", headers=headers, json={"confirmation": "NO"})
    assert bad_del.status_code == 400

    # Correct confirmation
    del_res = client.request("DELETE", "/api/v1/auth/me", headers=headers, json={"confirmation": "DELETE"})
    assert del_res.status_code == 204

    # Subsequent request with token should fail because user is gone
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 401
