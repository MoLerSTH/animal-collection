from unittest.mock import patch
import io
import pytest
import uuid
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.core.database import Base, get_db
from src.services.auth_service import create_access_token
from src.models.user import User
from src.models.analysis_usage import UserAnalysisUsage

# Use SQLite in-memory for testing discovery endpoints with StaticPool
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


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


def create_sample_jpeg():
    file = io.BytesIO()
    image = Image.new("RGB", (100, 100), color="blue")
    image.save(file, "jpeg")
    file.seek(0)
    return file.read()


@pytest.fixture
def auth_headers():
    db = TestingSessionLocal()
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=f"test_{user_id[:8]}@example.com",
        name="Test User",
        google_id=f"google_{user_id[:8]}",
    )
    db.add(user)
    db.commit()
    db.close()

    token = create_access_token(user_id, f"test_{user_id[:8]}@example.com")
    return {"Authorization": f"Bearer {token}"}


def test_discovery_usage_unauthenticated():
    response = client.get("/api/v1/discovery/usage")
    assert response.status_code == 200
    data = response.json()
    assert data["used"] == 0
    assert data["limit"] == 7
    assert data["remaining"] == 7
    assert "resetsAt" in data


def test_discovery_usage_authenticated(auth_headers):
    response = client.get("/api/v1/discovery/usage", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["used"] == 0
    assert data["limit"] == 7
    assert data["remaining"] == 7


def test_identify_animal_success(auth_headers):
    fake_result = {
        "found": True,
        "species": "Hippopotamus",
        "story": "A cute pygmy hippo loving cabbage.",
        "animalType": "Mammal",
        "habitatTags": ["aquatic"],
    }

    with patch("src.api.v1.discovery.ai_service.identify_animal", return_value=fake_result):
        sample_img = create_sample_jpeg()
        files = {"file": ("test.jpg", sample_img, "image/jpeg")}
        response = client.post("/api/v1/discovery/identify", files=files, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["found"] is True
        assert data["species"] == "Hippopotamus"
        assert data["animalType"] == "Mammal"
        assert "aquatic" in data["habitatTags"]

    # Verify usage incremented
    usage_resp = client.get("/api/v1/discovery/usage", headers=auth_headers)
    assert usage_resp.json()["used"] == 1
    assert usage_resp.json()["remaining"] == 6


def test_identify_animal_weekly_rate_limit_exceeded(auth_headers):
    fake_result = {
        "found": True,
        "species": "Otter",
        "story": "A playful river otter.",
        "animalType": "Mammal",
        "habitatTags": ["aquatic"],
    }

    with patch("src.api.v1.discovery.ai_service.identify_animal", return_value=fake_result):
        sample_img = create_sample_jpeg()
        # For this user, execute 7 requests to reach quota
        for _ in range(7):
            files = {"file": ("test.jpg", sample_img, "image/jpeg")}
            res = client.post("/api/v1/discovery/identify", files=files, headers=auth_headers)
            assert res.status_code == 200

        # Verify usage is now 7/7
        usage_resp = client.get("/api/v1/discovery/usage", headers=auth_headers)
        assert usage_resp.json()["used"] == 7
        assert usage_resp.json()["remaining"] == 0

        # 8th attempt must be rejected by weekly rate limit
        files = {"file": ("test.jpg", sample_img, "image/jpeg")}
        response = client.post("/api/v1/discovery/identify", files=files, headers=auth_headers)
        assert response.status_code == 429
        detail = response.json()["detail"]
        assert detail["code"] == "user_weekly_limit"
        assert "retryAfterSeconds" in detail
        assert "resetsAt" in detail
        assert "Retry-After" in response.headers


def test_identify_animal_empty_file(auth_headers):
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = client.post("/api/v1/discovery/identify", files=files, headers=auth_headers)
    assert response.status_code == 422
