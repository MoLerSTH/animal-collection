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


class TestBackendCollections(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        from src.db.seeds import seed_catalog_animals
        seed_catalog_animals(db)
        db.close()

        # Login a test user to get token
        payload = {"id_token": "mock_google_id_token_test_user"}
        resp = client.post("/api/v1/auth/google", json=payload)
        self.auth_token = resp.json()["accessToken"]
        self.headers = {"Authorization": f"Bearer {self.auth_token}"}

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)

    def test_get_catalog_animals(self):
        response = client.get("/api/v1/animals", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 18)
        self.assertEqual(data[0]["name"], "Hippopotamus")
        self.assertEqual(data[0]["isCaught"], False)

    def test_create_and_get_collection_entry(self):
        # 1. Create a caught animal record
        payload = {
            "animalId": "hippopotamus",
            "name": "Moodeng",
            "photoUrl": "https://example.com/moodeng.jpg",
            "story": "Found at Chiangmai Zoo splashing in the mud.",
            "favFood": "Crispy Cabbage",
            "temperament": "Very Bouncy",
            "isFavorite": True,
        }
        create_resp = client.post("/api/v1/collections", json=payload, headers=self.headers)
        self.assertEqual(create_resp.status_code, 201)
        created = create_resp.json()
        self.assertEqual(created["name"], "Moodeng")
        self.assertEqual(created["animalSpecies"], "Hippopotamus")
        self.assertTrue(created["isFavorite"])
        collection_id = created["id"]

        # 2. Check catalog dynamic status (Hippopotamus should now be isCaught = True)
        cat_resp = client.get("/api/v1/animals", headers=self.headers)
        hippo = [a for a in cat_resp.json() if a["name"] == "Hippopotamus"][0]
        self.assertTrue(hippo["isCaught"])
        self.assertEqual(hippo["caughtCount"], 1)
        self.assertTrue(hippo["isFavorite"])

        # 3. Check summary stats
        summary_resp = client.get("/api/v1/collections/summary", headers=self.headers)
        self.assertEqual(summary_resp.status_code, 200)
        summary = summary_resp.json()
        self.assertEqual(summary["caughtCount"], 1)
        self.assertEqual(summary["totalCatalog"], 18)
        self.assertEqual(summary["favoritesCount"], 1)

        # 4. Patch favorite flag
        patch_resp = client.patch(
            f"/api/v1/collections/{collection_id}",
            json={"isFavorite": False},
            headers=self.headers,
        )
        self.assertEqual(patch_resp.status_code, 200)
        self.assertFalse(patch_resp.json()["isFavorite"])

        # 5. Delete collection entry
        del_resp = client.delete(f"/api/v1/collections/{collection_id}", headers=self.headers)
        self.assertEqual(del_resp.status_code, 204)

        # 6. Verify deleted
        get_resp = client.get(f"/api/v1/collections/{collection_id}", headers=self.headers)
        self.assertEqual(get_resp.status_code, 404)

    def test_upload_and_stream_photo(self):
        file_content = b"fake-jpg-image-bytes"
        files = {"file": ("test_photo.jpg", file_content, "image/jpeg")}
        upload_resp = client.post("/api/v1/storage/upload", files=files, headers=self.headers)
        self.assertEqual(upload_resp.status_code, 200)
        upload_data = upload_resp.json()
        self.assertIn("photoUrl", upload_data)
        self.assertTrue(upload_data["photoUrl"].startswith("/api/v1/storage/photos/"))

        # Test streaming image back
        stream_resp = client.get(upload_data["photoUrl"])
        self.assertEqual(stream_resp.status_code, 200)
        self.assertEqual(stream_resp.content, file_content)


if __name__ == "__main__":
    unittest.main()

