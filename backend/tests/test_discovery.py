import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from PIL import Image

from src.main import app
from src.core.database import Base, get_db
from src.services.auth_service import create_access_token
from src.models.user import User

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


def create_sample_jpeg() -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (50, 50), color="blue")
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def auth_headers():
    db = TestingSessionLocal()
    user_id = "8237395d-2ff5-4539-80f6-79dcb1696009"
    user = User(
        id=user_id,
        email="test_user@example.com",
        name="Test Collector",
        google_id="google_test_123",
    )
    db.add(user)
    db.commit()
    db.close()

    token = create_access_token(user_id, "test_user@example.com")
    return {"Authorization": f"Bearer {token}"}


def test_discovery_usage_unauthenticated():
    response = client.get("/api/v1/discovery/usage")
    assert response.status_code == 200
    data = response.json()
    assert data["used"] == 0
    assert data["limit"] == 50
    assert data["remaining"] == 50
    assert "resetsAt" in data


def test_discovery_usage_authenticated(auth_headers):
    response = client.get("/api/v1/discovery/usage", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["used"] == 0
    assert data["remaining"] == 50


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
    assert usage_resp.json()["remaining"] == 49


def test_identify_animal_empty_file(auth_headers):
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = client.post("/api/v1/discovery/identify", files=files, headers=auth_headers)
    assert response.status_code == 422
