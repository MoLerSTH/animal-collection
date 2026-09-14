import os
import sys
import unittest

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.core.database import Base, get_db

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


class TestBackendAuth(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)

    def test_health(self):
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_auth_health(self):
        response = client.get("/api/v1/auth/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["googleClientIdConfigured"])

    def test_google_login_dev_mock_and_profile_retrieval(self):
        payload = {"id_token": "mock_google_id_token_test_user"}
        response = client.post("/api/v1/auth/google", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("accessToken", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], "jane.doe@animalcollection.dev")
        self.assertEqual(data["tokenType"], "Bearer")

        # Test accessing protected endpoint /api/v1/auth/me with Bearer token
        token = data["accessToken"]
        headers = {"Authorization": f"Bearer {token}"}
        me_response = client.get("/api/v1/auth/me", headers=headers)
        self.assertEqual(me_response.status_code, 200)
        me_data = me_response.json()
        self.assertEqual(me_data["email"], "jane.doe@animalcollection.dev")
        self.assertEqual(me_data["id"], data["user"]["id"])

    def test_protected_route_without_token(self):
        response = client.get("/api/v1/auth/me")
        self.assertIn(response.status_code, [401, 403])


if __name__ == "__main__":
    unittest.main()
