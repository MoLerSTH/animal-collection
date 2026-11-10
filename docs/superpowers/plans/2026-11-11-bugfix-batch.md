# Animal Collection Bug-Fix Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all six reported production bugs across starter gift syncing and multi-account provisioning, collection editing/deletion, username updates, discovered animal counting, and camera/location permission persistence.

**Architecture:** Align the FastAPI backend routes, SQLAlchemy models, and Pydantic schemas with the mobile client's offline-first contracts (`GET/POST /api/v1/collections/starter-gift`, `PATCH /api/v1/collections/{id}/name`, extended `UserCollection` metadata, and `PATCH/DELETE /api/v1/auth/me` with custom-name preservation on Google OAuth upsert). On the React Native/Expo mobile client, add full collection deletion and story/identification editing in `useCollectionStore` and `AnimalDetailScreen`, ensure starter gifts are counted consistently in discovered totals and provisioned per account, and persist/check granted camera and location permissions before prompting.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Pydantic v2, Pytest/Unittest (Backend); React Native 0.85, Expo SDK 56, TypeScript 6, Zustand 5, MMKV, `react-native-vision-camera`, `expo-image-picker`, `expo-location`, Jest + React Native Testing Library (Mobile).

**Spec:** User bug report (6 items, 2026-11-11) investigated via `superpowers:systematic-debugging`.

## Global Constraints

- On Windows PowerShell, always run `npm.cmd` or `npx.cmd` instead of `npm`/`npx`.
- All mobile code must pass `./node_modules/.bin/tsc.cmd --noEmit` in `apps/mobile` with zero errors.
- Never bypass `authenticatedFetch` or `request` for protected backend calls.
- Backend API responses must use `camelCase` field names via Pydantic schemas (`UserResponse`, `UserCollectionItem`, `CollectionSummaryResponse`).
- Existing mobile and backend test suites must remain 100% green.

## Review Focus

1. **Google token refresh after username change:** When `POST /api/v1/auth/google` runs during silent session renewal (`refreshSession`) or re-login, `upsert_google_user` must not overwrite a user's existing non-empty `user.name` with the Google profile display name (pinned in Task 1).
2. **Route ordering in FastAPI `collections.py`:** `GET /api/v1/collections/starter-gift` and `POST /api/v1/collections/starter-gift` must be registered before `@router.get("/{collection_id}")` so FastAPI does not match `"starter-gift"` as a `collection_id` UUID parameter and throw HTTP 400 (pinned in Task 2).
3. **Deleted starter gift tombstones:** Deleting a starter gift via `DELETE /api/v1/collections/{id}` must mark `user.starter_gift_status = "removed"` on the backend and `starter_gift_removed:<userId> = "true"` in mobile MMKV so subsequent `POST /api/v1/collections/starter-gift` returns HTTP `410 Gone` and `loadCollections()` never resurrects the deleted gift (pinned in Tasks 2 and 4).
4. **Discovered count with starter gift + captured animal of same species:** When a user has both the starter gift (`Hippopotamus`) and a captured animal, `GalleryScreen` (`discoveredCount`), `useCollectionStore` (`summary.caughtCount`), and backend `/api/v1/collections/summary` must include the starter gift in the discovered count without dropping it on catalog reload or `addCollection` (pinned in Tasks 2 and 3).
5. **Permission re-prompt when OS permission is already granted:** When `Camera.getCameraPermissionStatus()` is `'granted'` or `cameraPermissionGranted` is stored in `appStorage`, `CameraScreen`, `SpeedDialFab`, and `AnimalDetailScreen` must check existing permission status first and never display the permission prompt or call `request*Permission*` unnecessarily on subsequent days (pinned in Task 5).

---

## File Map

- **Backend:**
  - `backend/src/models/user.py` — Add `starter_gift_status` column (`"available"` | `"claimed"` | `"removed"`) to `User`.
  - `backend/src/models/collection.py` — Add `source`, `identified_species`, `animal_type`, `habitat_tags` (JSON string), `captured_at`, and `client_request_id` columns to `UserCollection` and serialize them in `to_dict()`.
  - `backend/src/main.py` — Add lightweight startup column migration helper so existing SQLite/PostgreSQL tables gain new columns automatically.
  - `backend/src/schemas/auth.py` — Add `UserUpdateRequest` (`name` 2–30 chars) and `DeleteAccountRequest` (`confirmation == "DELETE"`).
  - `backend/src/services/auth_service.py` — Preserve existing `user.name` in `upsert_google_user` instead of overwriting with Google profile name.
  - `backend/src/api/v1/auth.py` — Add `PATCH /api/v1/auth/me` and `DELETE /api/v1/auth/me`.
  - `backend/src/schemas/collection.py` — Add `source`, `identifiedSpecies`, `animalType`, `habitatTags`, `capturedAt`, `clientRequestId` to collection DTOs; add `CollectionNameUpdate`, `CollectionNameResponse`, and `StarterGiftStatusResponse`.
  - `backend/src/api/v1/collections.py` — Add `GET /starter-gift`, `POST /starter-gift`, `PATCH /{collection_id}/name`, idempotent `clientRequestId` handling in `POST ""`, taxonomy/identification persistence in `PATCH /{collection_id}`, starter gift tombstone in `DELETE /{collection_id}`, and starter gift inclusion in `GET /summary`.
  - `backend/tests/test_auth.py` & `backend/tests/run_tests.py` — Backend unit/integration tests.
- **Mobile:**
  - `apps/mobile/src/features/collections/api/collectionApi.ts` — Throw descriptive error on non-OK response in `deleteCollectionApi`.
  - `apps/mobile/src/features/collections/stores/useCollectionStore.ts` — Fix `summary.caughtCount` in `claimStarterGift`, `loadCollections`, `addCollection`, `updateIdentification`; add `deleteCollection` and `updateStory`; support offline/mock starter gift availability for switched accounts; handle local starter gift in `updateIdentification`.
  - `apps/mobile/src/app/screens/GalleryScreen.tsx` — Count starter gift in `discoveredCount` alongside captured discoveries; exclude already-synced starter gifts from stuck pending banner.
  - `apps/mobile/src/app/screens/AnimalDetailScreen.tsx` — Add editable Field Notes (`story`) for existing cards, add Delete button with confirmation alert, and check `Location.getForegroundPermissionsAsync()` before requesting location permission.
  - `apps/mobile/src/app/screens/CameraScreen.tsx` — Persist camera permission grant in `appStorage` (`cameraPermissionGranted`) and re-verify/auto-request on screen focus so granted `"While using the app"` permission never shows the permission wall again.
  - `apps/mobile/src/app/components/SpeedDialFab.tsx` — Check `ImagePicker.getCameraPermissionsAsync()` and `ImagePicker.getMediaLibraryPermissionsAsync()` before requesting permissions.
  - `apps/mobile/src/core/i18n/translations.ts` — Add English and Thai strings for deleting a collection card and editing field notes.
  - `apps/mobile/app.json` & `apps/mobile/jest.setup.ts` — Declare Android foreground location permissions in `app.json` and mock permission getter methods in `jest.setup.ts`.

---

### Task 1: Backend Username Update, Account Deletion & Name Preservation (Bug 3)

**Files:**
- Modify: `backend/src/schemas/auth.py`
- Modify: `backend/src/services/auth_service.py:39-75`
- Modify: `backend/src/api/v1/auth.py`
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: `get_current_user` from `backend/src/api/deps.py`, `User` from `backend/src/models/user.py`
- Produces:
  - `PATCH /api/v1/auth/me` accepting `UserUpdateRequest(name: str)` -> returns `UserResponse`
  - `DELETE /api/v1/auth/me` accepting `DeleteAccountRequest(confirmation: str)` -> returns `204 No Content`
  - `upsert_google_user(db: Session, google_info: Dict[str, Any]) -> User` preserving custom `user.name`

- [ ] **Step 1: Write the failing tests in `backend/tests/test_auth.py`**

Append tests to `backend/tests/test_auth.py` covering `PATCH /api/v1/auth/me`, validation of invalid names, preservation of the updated username across subsequent `POST /api/v1/auth/google` logins/refreshes, and `DELETE /api/v1/auth/me`:

```python
def test_update_username_and_preserve_across_relogin():
    login_resp = client.post("/api/v1/auth/google", json={"id_token": "mock_google_id_token_test_user"})
    assert login_resp.status_code == 200
    token = login_resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update username via PATCH /api/v1/auth/me
    patch_resp = client.patch("/api/v1/auth/me", json={"name": "  นักสำรวจ  "}, headers=headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == "นักสำรวจ"

    # Re-login / token refresh with Google must NOT overwrite custom username
    relogin_resp = client.post("/api/v1/auth/google", json={"id_token": "mock_google_id_token_test_user"})
    assert relogin_resp.status_code == 200
    assert relogin_resp.json()["user"]["name"] == "นักสำรวจ"


def test_update_username_rejects_invalid_length_or_control_chars():
    login_resp = client.post("/api/v1/auth/google", json={"id_token": "mock_google_id_token_test_user"})
    token = login_resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    for invalid_name in [" ", "a", "x" * 31, "line1\nline2"]:
        resp = client.patch("/api/v1/auth/me", json={"name": invalid_name}, headers=headers)
        assert resp.status_code == 422


def test_delete_account_removes_user():
    login_resp = client.post("/api/v1/auth/google", json={"id_token": "mock_google_id_token_delete_me"})
    token = login_resp.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    del_resp = client.request("DELETE", "/api/v1/auth/me", json={"confirmation": "DELETE"}, headers=headers)
    assert del_resp.status_code in (200, 204)

    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 401
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_auth.py -v`
Expected: FAIL with `405 Method Not Allowed` on `PATCH /api/v1/auth/me` and `DELETE /api/v1/auth/me`.

- [ ] **Step 3: Implement `UserUpdateRequest`, `DeleteAccountRequest`, `PATCH /api/v1/auth/me`, `DELETE /api/v1/auth/me`, and `upsert_google_user` name preservation**

1. In `backend/src/schemas/auth.py`, add `UserUpdateRequest` with a `@field_validator("name")` that strips whitespace, requires length `2..30`, and rejects control characters (`[\x00-\x1f\x7f]`), plus `DeleteAccountRequest(confirmation: str)`.
2. In `backend/src/services/auth_service.py:55-62`, when `user` already exists, only set `user.name = name` if `not user.name or not user.name.strip()`.
3. In `backend/src/api/v1/auth.py`, add `@router.patch("/me", response_model=UserResponse)` to update `current_user.name` and `@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)` to verify `payload.confirmation == "DELETE"` and delete `current_user`.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_auth.py -v`
Expected: PASS (all tests in `test_auth.py` green).

- [ ] **Step 5: Commit**

```bash
git add backend/src/schemas/auth.py backend/src/services/auth_service.py backend/src/api/v1/auth.py backend/tests/test_auth.py
git commit -m "fix(auth): add PATCH/DELETE /auth/me endpoints and preserve custom username on login"
```

---

### Task 2: Backend Starter Gift Endpoints, Card Rename Route & Collection Metadata (Bugs 1, 2, 4, 5)

**Files:**
- Modify: `backend/src/models/user.py`
- Modify: `backend/src/models/collection.py`
- Modify: `backend/src/main.py`
- Modify: `backend/src/schemas/collection.py`
- Modify: `backend/src/api/v1/collections.py`
- Test: `backend/tests/run_tests.py`

**Interfaces:**
- Consumes: `User` (`backend/src/models/user.py`), `Animal` (`backend/src/models/animal.py`), `UserCollection` (`backend/src/models/collection.py`)
- Produces:
  - `GET /api/v1/collections/starter-gift` -> `{"status": "available" | "claimed" | "removed"}`
  - `POST /api/v1/collections/starter-gift` -> `UserCollectionItem` (or HTTP `410 Gone` if `starter_gift_status == "removed"`)
  - `PATCH /api/v1/collections/{collection_id}/name` accepting `{"name": str}` -> `{"id": str, "name": str}`
  - Extended `UserCollectionItem` with `source`, `identifiedSpecies`, `animalType`, `habitatTags`, `capturedAt`, `clientRequestId`
  - `DELETE /api/v1/collections/{collection_id}` marking `current_user.starter_gift_status = "removed"` when deleting a starter gift entry

- [ ] **Step 1: Write the failing backend tests in `backend/tests/run_tests.py`**

Add test methods in `TestBackendCollections` (`backend/tests/run_tests.py`):

```python
    def test_starter_gift_lifecycle_and_second_account_isolation(self):
        # 1. Initial status is 'available'
        status_resp = client.get("/api/v1/collections/starter-gift", headers=self.headers)
        self.assertEqual(status_resp.status_code, 200)
        self.assertEqual(status_resp.json(), {"status": "available"})

        # 2. Claim starter gift (idempotent)
        claim_resp = client.post("/api/v1/collections/starter-gift", headers=self.headers)
        self.assertIn(claim_resp.status_code, [200, 201])
        gift = claim_resp.json()
        self.assertEqual(gift["animalCode"], "hippopotamus")
        self.assertEqual(gift["source"], "starter_gift")
        self.assertEqual(gift["animalType"], "Mammal")
        self.assertEqual(gift["habitatTags"], ["aquatic"])

        claim_again = client.post("/api/v1/collections/starter-gift", headers=self.headers)
        self.assertEqual(claim_again.json()["id"], gift["id"])

        # 3. Summary counts starter gift
        summary_resp = client.get("/api/v1/collections/summary", headers=self.headers)
        self.assertEqual(summary_resp.json()["caughtCount"], 1)

        # 4. Second account on same backend still has 'available' starter gift
        resp_b = client.post("/api/v1/auth/google", json={"id_token": "mock_google_id_token_second_user"})
        headers_b = {"Authorization": f"Bearer {resp_b.json()['accessToken']}"}
        status_b = client.get("/api/v1/collections/starter-gift", headers=headers_b)
        self.assertEqual(status_b.json(), {"status": "available"})

        # 5. Deleting starter gift marks it 'removed' and returns 410 on re-claim
        del_resp = client.delete(f"/api/v1/collections/{gift['id']}", headers=self.headers)
        self.assertEqual(del_resp.status_code, 204)
        status_after = client.get("/api/v1/collections/starter-gift", headers=self.headers)
        self.assertEqual(status_after.json(), {"status": "removed"})
        reclaim_resp = client.post("/api/v1/collections/starter-gift", headers=self.headers)
        self.assertEqual(reclaim_resp.status_code, 410)

    def test_rename_and_update_identification_fields(self):
        create_resp = client.post(
            "/api/v1/collections",
            json={
                "clientRequestId": "12345678-1234-4234-8234-123456789abc",
                "name": "Mystery Pet",
                "photoUrl": "https://example.com/pet.jpg",
                "identifiedSpecies": "Goldfish",
                "animalType": "Fish",
                "habitatTags": ["aquatic"],
            },
            headers=self.headers,
        )
        self.assertEqual(create_resp.status_code, 201)
        card_id = create_resp.json()["id"]

        # Rename via PATCH /collections/{id}/name
        rename_resp = client.patch(
            f"/api/v1/collections/{card_id}/name",
            json={"name": "ปลาอ้วน"},
            headers=self.headers,
        )
        self.assertEqual(rename_resp.status_code, 200)
        self.assertEqual(rename_resp.json(), {"id": card_id, "name": "ปลาอ้วน"})

        # Update identification via PATCH /collections/{id}
        patch_resp = client.patch(
            f"/api/v1/collections/{card_id}",
            json={"identifiedSpecies": "Koi", "animalType": "Fish", "habitatTags": ["aquatic"], "story": "Updated story"},
            headers=self.headers,
        )
        self.assertEqual(patch_resp.status_code, 200)
        updated = patch_resp.json()
        self.assertEqual(updated["identifiedSpecies"], "Koi")
        self.assertEqual(updated["animalType"], "Fish")
        self.assertEqual(updated["habitatTags"], ["aquatic"])
        self.assertEqual(updated["story"], "Updated story")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python backend/tests/run_tests.py`
Expected: FAIL (`400 Bad Request` on `GET /api/v1/collections/starter-gift` and `404 Not Found` on `PATCH /api/v1/collections/{id}/name`).

- [ ] **Step 3: Implement model columns, schema fields, startup migration, and collection routes**

1. In `backend/src/models/user.py`: add `starter_gift_status = Column(String(20), nullable=False, default="available")`.
2. In `backend/src/models/collection.py`: add columns `source = Column(String(30), nullable=False, default="capture")`, `identified_species = Column(String(100), nullable=True)`, `animal_type = Column(String(50), nullable=True, default="Unknown")`, `habitat_tags = Column(Text, nullable=True, default="[]")`, `captured_at = Column(String(64), nullable=True)`, `client_request_id = Column(String(64), nullable=True, index=True)`. Update `to_dict()` to return `source`, `identifiedSpecies`, `animalType`, `habitatTags` (parsed JSON list), `capturedAt`, and `clientRequestId`.
3. In `backend/src/main.py`: add `ensure_schema_columns(engine)` in `lifespan` after `Base.metadata.create_all(bind=engine)` using SQLAlchemy `inspect(engine)` + `ALTER TABLE` to add any missing columns on existing databases.
4. In `backend/src/schemas/collection.py`: add the new optional fields to `UserCollectionCreate`, `UserCollectionUpdate`, and `UserCollectionItem`, plus `CollectionNameUpdate(name: str = Field(..., min_length=1, max_length=100))`, `CollectionNameResponse(id: str, name: str)`, and `StarterGiftStatusResponse(status: Literal["available", "claimed", "removed"])`.
5. In `backend/src/api/v1/collections.py`:
   - Place `@router.get("/starter-gift", response_model=StarterGiftStatusResponse)` and `@router.post("/starter-gift", response_model=UserCollectionItem)` **above** `@router.get("/{collection_id}")`.
   - In `GET /starter-gift`: if `current_user.starter_gift_status == "removed"`, return `{"status": "removed"}`; if user has a `starter_gift` row in `user_collections` or `current_user.starter_gift_status == "claimed"`, return `{"status": "claimed"}`; otherwise `{"status": "available"}`.
   - In `POST /starter-gift`: if `current_user.starter_gift_status == "removed"`, raise `HTTPException(status_code=410, detail="Starter gift was removed")`. If a `starter_gift` row already exists for `current_user.id`, ensure `current_user.starter_gift_status = "claimed"` and return it. Otherwise find the `hippopotamus` catalog `Animal`, create a `UserCollection` with `source="starter_gift"`, `identified_species=hippo.name`, `animal_type="Mammal"`, `habitat_tags='["aquatic"]'`, set `current_user.starter_gift_status = "claimed"`, commit, and return `UserCollectionItem`.
   - In `POST ""`: if `payload.clientRequestId` is provided and an entry for `(current_user.id, payload.clientRequestId)` already exists, return it idempotently (and if `payload.clientRequestId` is a valid UUID, use it as `collection.id`). Save `identified_species`, `animal_type`, `habitat_tags`, `captured_at`, `client_request_id`, and `source="capture"`.
   - Add `@router.patch("/{collection_id}/name", response_model=CollectionNameResponse)` to validate and update `record.custom_name = payload.name.strip()`.
   - In `@router.patch("/{collection_id}")`: also update `identified_species`, `animal_type`, `habitat_tags`, and re-link `animal_id` when `identifiedSpecies` or `animalId` changes.
   - In `@router.delete("/{collection_id}")`: if `record.source == "starter_gift"`, set `current_user.starter_gift_status = "removed"` before committing.
   - In `@router.get("/summary")`: count starter gift entries plus distinct captured species so starter gifts are always counted in `caughtCount`.

- [ ] **Step 4: Run test to verify it passes**

Run: `python backend/tests/run_tests.py`
Expected: PASS (all unit and integration tests pass).

- [ ] **Step 5: Commit**

```bash
git add backend/src/models/user.py backend/src/models/collection.py backend/src/main.py backend/src/schemas/collection.py backend/src/api/v1/collections.py backend/tests/run_tests.py
git commit -m "feat(collections): add starter-gift and card rename endpoints and persist identification metadata"
```

---

### Task 3: Mobile Starter Gift Account Switching & Discovered Animals Count (Bugs 1, 4, 5)

**Files:**
- Modify: `apps/mobile/src/features/collections/stores/useCollectionStore.ts`
- Modify: `apps/mobile/src/app/screens/GalleryScreen.tsx`
- Test: `apps/mobile/src/features/collections/stores/__tests__/collectionSession.test.ts`
- Test: `apps/mobile/src/app/screens/__tests__/GalleryScreen.test.tsx`

**Interfaces:**
- Consumes: `fetchStarterGiftStatusApi`, `claimStarterGiftApi` from `apps/mobile/src/features/collections/api/collectionApi.ts`
- Produces:
  - Consistent `discoveredCount` in `GalleryScreen.tsx` and `summary.caughtCount` in `useCollectionStore.ts` that always counts the starter gift alongside captured animals
  - Automatic starter gift availability / claiming support when switching to a new account on the same device (including dev/mock sessions)

- [ ] **Step 1: Write the failing tests in `collectionSession.test.ts` and `GalleryScreen.test.tsx`**

1. In `apps/mobile/src/app/screens/__tests__/GalleryScreen.test.tsx`, add a test verifying that when a user has both the starter gift (`Hippopotamus`) and a captured `Hippopotamus`, `Total Discovered` counts the starter gift as well (`2 Species`), and that a synced starter gift does not trigger the pending-sync retry banner:

```tsx
it('counts the starter gift in Total Discovered even when the same species is also photographed', () => {
  useCollectionStore.setState({
    collections: [
      {
        id: 'gift-1', userId: 'gallery-test', name: 'Hippopotamus', animalId: 'a1',
        animalCode: 'hippopotamus', animalSpecies: 'Hippopotamus', identifiedSpecies: 'Hippopotamus',
        category: 'Zoo', photoUrl: 'https://example.com/hippo.jpg', story: '', favFood: '',
        temperament: '', isFavorite: false, source: 'starter_gift', animalType: 'Mammal',
      },
      {
        id: 'capture-1', userId: 'gallery-test', name: 'Moo Deng', animalId: 'a1',
        animalCode: 'hippopotamus', animalSpecies: 'Hippopotamus', identifiedSpecies: 'Hippopotamus',
        category: 'Zoo', photoUrl: 'file:///moodeng.jpg', story: '', favFood: '',
        temperament: '', isFavorite: true, source: 'capture', animalType: 'Mammal',
      },
    ],
  });
  render(<GalleryScreen />);
  expect(screen.getByText('Total Discovered: 2 Species')).toBeTruthy();
});
```

2. In `apps/mobile/src/features/collections/stores/__tests__/collectionSession.test.ts`, add a test verifying that `claimStarterGift()` and `addCollection()` both include the starter gift in `summary.caughtCount`:

```ts
it('counts the starter gift in summary.caughtCount when claimed and after adding another capture', async () => {
  const hippo = { ...catalog[0], id: 'hippo', code: 'hippopotamus', name: 'Hippopotamus' };
  useCollectionStore.setState({ ownerId: 'a', catalog: [hippo], collections: [] });
  jest.mocked(claimStarterGiftApi).mockResolvedValue({
    ...fish('a'), id: 'gift-a', animalId: 'hippo', animalCode: 'hippopotamus',
    animalSpecies: 'Hippopotamus', identifiedSpecies: 'Hippopotamus', name: 'Hippopotamus', source: 'starter_gift',
  });
  useCollectionStore.getState().claimStarterGift();
  expect(useCollectionStore.getState().summary.caughtCount).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile; npm.cmd test -- --testPathPattern="GalleryScreen|collectionSession"`
Expected: FAIL (`Total Discovered: 1 Species` instead of `2 Species`, and `summary.caughtCount` is `0` immediately after `claimStarterGift()`).

- [ ] **Step 3: Implement starter gift counting & account-switch handling in `useCollectionStore.ts` and `GalleryScreen.tsx`**

1. Create a helper `countDiscovered(items: Array<{ species?: string; animalSpecies?: string; identifiedSpecies?: string; name: string; source?: string }>): number` in `useCollectionStore.ts` (and use the same logic in `GalleryScreen.tsx`):
   - Starter gift cards (`item.source === 'starter_gift'`) each count toward the total (`giftCount`), plus distinct species among non-gift cards (`new Set(nonGift.map(...)).size`). When the user has 1 starter gift and 0 captures, count is `1`; when 1 starter gift Hippo + 1 captured Hippo, count is `2`.
2. In `useCollectionStore.ts`:
   - In `claimStarterGift()`: update `summary.caughtCount` immediately when restoring the starter gift into `collections`.
   - In `loadCollections()`:
     - Update `summary.caughtCount` immediately after `restoreStarterGift` at the start of `loadCollections`.
     - If `fetchStarterGiftStatusApi` fails ONLY because the user is in dev mock mode (`token?.startsWith('mock_jwt_')`) and the user has no `giftClaimedKey(userId)`, `giftServerKey(userId)`, or `giftRemovedKey(userId)`, treat `giftStatus` as `'available'` so switching mock accounts on the same device also offers the starter gift.
     - Compute `summary.caughtCount` as `Math.max(summaryData?.caughtCount ?? 0, countDiscovered(grid))` when `!pendingGift`, or `countDiscovered(grid)` when `pendingGift`, so a local or newly claimed starter gift is never omitted from `summary.caughtCount`.
   - In `addCollection()`: compute `caughtCount` using `countDiscovered(updatedCollections)` so adding a capture never drops the starter gift from `summary.caughtCount`.
3. In `GalleryScreen.tsx`:
   - Compute `discoveredCount` as `animals.filter(a => a.source === 'starter_gift').length + new Set(animals.filter(a => a.source !== 'starter_gift').map(animal => animal.species.trim().toLowerCase())).size`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile; npm.cmd test -- --testPathPattern="GalleryScreen|collectionSession"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/collections/stores/useCollectionStore.ts apps/mobile/src/app/screens/GalleryScreen.tsx apps/mobile/src/features/collections/stores/__tests__/collectionSession.test.ts apps/mobile/src/app/screens/__tests__/GalleryScreen.test.tsx
git commit -m "fix(collections): include starter gift in discovered counts and support multi-account gift provisioning"
```

---

### Task 4: Mobile Collection Edit (Story & Identification) and Delete Flow (Bug 2)

**Files:**
- Modify: `apps/mobile/src/features/collections/api/collectionApi.ts:212-222`
- Modify: `apps/mobile/src/features/collections/stores/useCollectionStore.ts`
- Modify: `apps/mobile/src/app/screens/AnimalDetailScreen.tsx`
- Modify: `apps/mobile/src/core/i18n/translations.ts`
- Test: `apps/mobile/src/features/collections/stores/__tests__/catalogEdits.test.ts`
- Test: `apps/mobile/src/app/screens/__tests__/AnimalDetailScreen.test.tsx`

**Interfaces:**
- Consumes: `updateCollectionApi`, `deleteCollectionApi`, `claimStarterGiftApi` from `apps/mobile/src/features/collections/api/collectionApi.ts`
- Produces:
  - `useCollectionStore.getState().deleteCollection(id: string): Promise<void>`
  - `useCollectionStore.getState().updateStory(id: string, story: string): Promise<void>`
  - Delete button & editable Field Notes (`story`) UI in `AnimalDetailScreen.tsx`

- [ ] **Step 1: Write the failing tests in `catalogEdits.test.ts` and `AnimalDetailScreen.test.tsx`**

1. In `apps/mobile/src/features/collections/stores/__tests__/catalogEdits.test.ts`, add tests for `deleteCollection` (both regular synced card and starter gift tombstone) and `updateStory`:

```ts
it('deletes a collection entry, updates catalog/summary, and persists to cache', async () => {
  const { deleteCollectionApi } = require('../../api/collectionApi');
  jest.spyOn(require('../../api/collectionApi'), 'deleteCollectionApi').mockResolvedValue(true);
  await useCollectionStore.getState().deleteCollection(fish.id);
  expect(deleteCollectionApi).toHaveBeenCalledWith(fish.id, 'session');
  expect(useCollectionStore.getState().collections).toHaveLength(0);
  expect(readCollectionCache(user.id, []).collections).toHaveLength(0);
});

it('marks starter gift as removed when deleting a starter gift card so it does not return', async () => {
  jest.spyOn(require('../../api/collectionApi'), 'deleteCollectionApi').mockResolvedValue(true);
  const gift: UserCollectionItem = { ...fish, id: 'server-gift', source: 'starter_gift', animalCode: 'hippopotamus' };
  useCollectionStore.setState({ collections: [gift] });
  await useCollectionStore.getState().deleteCollection('server-gift');
  expect(appStorage.getString(`starter_gift_removed:${user.id}`)).toBe('true');
  expect(useCollectionStore.getState().collections).toHaveLength(0);
});

it('updates story on an existing collection entry and persists it to cache', async () => {
  jest.spyOn(require('../../api/collectionApi'), 'updateCollectionApi').mockResolvedValue({ ...fish, story: 'Updated field notes' });
  await useCollectionStore.getState().updateStory(fish.id, '  Updated field notes  ');
  expect(useCollectionStore.getState().collections[0].story).toBe('Updated field notes');
  expect(readCollectionCache(user.id, []).collections[0].story).toBe('Updated field notes');
});
```

2. In `apps/mobile/src/app/screens/__tests__/AnimalDetailScreen.test.tsx`, add tests for editing field notes and deleting a card from `AnimalDetailScreen`:

```tsx
it('edits and saves field notes on an existing card', async () => {
  const updateStory = jest.fn().mockImplementation(async (id, story) => {
    useCollectionStore.setState(state => ({
      collections: state.collections.map(item => item.id === id ? { ...item, story } : item),
    }));
  });
  useCollectionStore.setState({ updateStory } as any);
  render(<AnimalDetailScreen navigation={nav} route={{ params: { animalId: 'a1' } } as any} />);
  fireEvent.press(screen.getByRole('button', { name: 'Edit field notes' }));
  fireEvent.changeText(screen.getByLabelText('Animal story'), 'Found swimming happily');
  fireEvent.press(screen.getByRole('button', { name: 'Save field notes' }));
  await waitFor(() => expect(updateStory).toHaveBeenCalledWith('a1', 'Found swimming happily'));
  expect(screen.getByText('Found swimming happily')).toBeTruthy();
});

it('confirms and deletes an existing collection card then navigates back', async () => {
  const { Alert } = require('react-native');
  const alertSpy = jest.spyOn(Alert, 'alert');
  const deleteCollection = jest.fn().mockResolvedValue(undefined);
  useCollectionStore.setState({ deleteCollection } as any);
  render(<AnimalDetailScreen navigation={nav} route={{ params: { animalId: 'a1' } } as any} />);
  fireEvent.press(screen.getByRole('button', { name: 'Delete from collection' }));
  expect(alertSpy).toHaveBeenCalled();
  const buttons = alertSpy.mock.calls[0][2]!;
  await act(async () => {
    await buttons.find((b: any) => b.style === 'destructive')!.onPress!();
  });
  expect(deleteCollection).toHaveBeenCalledWith('a1');
  expect(nav.goBack).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile; npm.cmd test -- --testPathPattern="catalogEdits|AnimalDetailScreen"`
Expected: FAIL (`deleteCollection is not a function`, `updateStory is not a function`, `Unable to find an element with accessibilityLabel: "Delete from collection"`).

- [ ] **Step 3: Implement `deleteCollection`, `updateStory`, `updateIdentification` improvements, and `AnimalDetailScreen` edit/delete controls**

1. In `apps/mobile/src/core/i18n/translations.ts`, add to `detail` (both `en` and `th`):
   - `editFieldNotes`: `'Edit field notes'` / `'แก้ไขบันทึกภาคสนาม'`
   - `saveFieldNotes`: `'Save field notes'` / `'บันทึกเรื่องราว'`
   - `cancelFieldNotes`: `'Cancel'` / `'ยกเลิก'`
   - `deleteCard`: `'Delete from collection'` / `'ลบออกจากคอลเลกชัน'`
   - `deleteConfirmTitle`: `'Delete this card?'` / `'ลบการ์ดใบนี้?'`
   - `deleteConfirmMessage`: `'This card will be removed from your collection.'` / `'การ์ดสัตว์ใบนี้จะถูกลบออกจากคอลเลกชันของคุณ'`
2. In `apps/mobile/src/features/collections/api/collectionApi.ts`:
   - Import and export `deleteCollectionApi` in `useCollectionStore.ts`. In `deleteCollectionApi`, if `!response.ok && response.status !== 404`, throw `new Error(\`Failed to delete collection entry: \${response.status}\`)`.
3. In `apps/mobile/src/features/collections/stores/useCollectionStore.ts`:
   - In `updateIdentification(id, facts)`:
     - Resolve `target` by `item.id === id || item.localId === id`.
     - If `isLocalStarterGift(target)` and `userId !== 'local_user'`, claim the starter gift first via `claimStarterGiftApi(true)` (just like `renameCollection` does) so the gift gets a server ID before patching.
     - Send `{ ...facts, name, animalId: matching?.id }` to `updateCollectionApi`.
   - Implement `updateStory(id: string, story: string): Promise<void>`:
     - Trim `story`. Find `target` by `item.id === id || item.localId === id`.
     - If `!target.id.startsWith('local_coll_')`, call `updateCollectionApi(target.id, { story: trimmed }, token)`.
     - Update `collections` in state and call `writeCollectionCache(userId, get())`.
   - Implement `deleteCollection(id: string): Promise<void>`:
     - Find `target` by `item.id === id || item.localId === id`.
     - Check if `isGift = isLocalStarterGift(target) || target.source === 'starter_gift' || target.id === appStorage.getString(giftServerKey(userId))`.
     - If `!target.id.startsWith('local_coll_')`, call `await deleteCollectionApi(target.id, token)`.
     - If `isGift`, set `appStorage.set(giftRemovedKey(userId), 'true')` and `appStorage.delete(giftServerKey(userId))`.
     - Remove `target` from `collections`, recompute `catalog` flags (`isCaught`, `caughtCount`, `userPhotoUrl`, `isFavorite`) and `summary`, and persist with `writeCollectionCache(userId, get())`.
4. In `apps/mobile/src/app/screens/AnimalDetailScreen.tsx`:
   - Add `[editingStory, setEditingStory] = useState(false)` and edit button (`accessibilityLabel={t.detail.editFieldNotes}`) in the Field Notes header when `existing && !existing.isLocked`.
   - When `editingStory` is true, render the `TextInput` (`accessibilityLabel="Animal story"`) and Save (`t.detail.saveFieldNotes`) / Cancel (`t.detail.cancelFieldNotes`) buttons calling `store.updateStory(savedRecord?.id || existing.id, story)`.
   - In `actionSection` when `existing && !existing.isLocked`, render a Delete button (`accessibilityLabel={t.detail.deleteCard}`) that opens `Alert.alert(t.detail.deleteConfirmTitle, t.detail.deleteConfirmMessage, [...])` and, on destructive confirm, awaits `store.deleteCollection(savedRecord?.id || existing.id)` and calls `navigation.goBack()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile; npm.cmd test -- --testPathPattern="catalogEdits|AnimalDetailScreen"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/core/i18n/translations.ts apps/mobile/src/features/collections/api/collectionApi.ts apps/mobile/src/features/collections/stores/useCollectionStore.ts apps/mobile/src/app/screens/AnimalDetailScreen.tsx apps/mobile/src/features/collections/stores/__tests__/catalogEdits.test.ts apps/mobile/src/app/screens/__tests__/AnimalDetailScreen.test.tsx
git commit -m "feat(collections): add collection deletion and field notes editing"
```

---

### Task 5: Camera & Location Permission Persistence Across Sessions (Bug 6)

**Files:**
- Modify: `apps/mobile/jest.setup.ts`
- Modify: `apps/mobile/app.json`
- Modify: `apps/mobile/src/app/screens/CameraScreen.tsx`
- Modify: `apps/mobile/src/app/components/SpeedDialFab.tsx`
- Modify: `apps/mobile/src/app/screens/AnimalDetailScreen.tsx`
- Test: `apps/mobile/src/app/screens/__tests__/CameraScreen.test.tsx`
- Test: `apps/mobile/src/app/components/__tests__/SpeedDialFab.test.tsx`

**Interfaces:**
- Consumes: `Camera`, `useCameraPermission` (`react-native-vision-camera`), `ImagePicker` (`expo-image-picker`), `Location` (`expo-location`), `appStorage` (`apps/mobile/src/core/storage/mmkv.ts`)
- Produces:
  - `CAMERA_PERMISSION_GRANTED_KEY = 'camera_permission_granted'` in `appStorage`
  - Automatic silent verification/renewal on `CameraScreen` focus when permission was previously granted `"While using the app"`, plus check-before-request in `SpeedDialFab` and `AnimalDetailScreen`

- [ ] **Step 1: Update `jest.setup.ts` mocks and write the failing tests in `CameraScreen.test.tsx` and `SpeedDialFab.test.tsx`**

1. In `apps/mobile/jest.setup.ts`:
   - Add `getCameraPermissionStatus: jest.fn(() => 'granted')` and `requestCameraPermission: jest.fn(async () => 'granted')` to `Camera` in the `react-native-vision-camera` mock.
   - Add `getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', granted: false, canAskAgain: true }))` to the `expo-location` mock.
   - Add `getCameraPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', granted: false, canAskAgain: true }))` and `getMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'undetermined', granted: false, canAskAgain: true }))` to the `expo-image-picker` mock.
2. In `apps/mobile/src/app/screens/__tests__/CameraScreen.test.tsx`, add a test verifying that when the user previously granted camera permission ("While using the app" persisted in `appStorage`), reopening `CameraScreen` on a subsequent day when `useCameraPermission().hasPermission` starts `false` automatically restores permission without showing the `"Grant Camera Access"` prompt wall:

```tsx
it('does not require manual permission prompt again when camera permission was previously granted', async () => {
  const requestPermission = jest.fn().mockResolvedValue(true);
  appStorage.set('camera_permission_granted', 'true');
  jest.mocked(useCameraPermission).mockReturnValue({
    hasPermission: false,
    requestPermission,
  } as any);

  renderScreen();

  await waitFor(() => {
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Grant Camera Access' })).toBeNull();
  });
});
```

3. In `apps/mobile/src/app/components/__tests__/SpeedDialFab.test.tsx`, add a test verifying that `SpeedDialFab` checks `getCameraPermissionsAsync()` first and does not call `requestCameraPermissionsAsync()` when already granted:

```tsx
it('does not re-request camera permission when getCameraPermissionsAsync reports already granted', async () => {
  jest.mocked(ImagePicker.getCameraPermissionsAsync).mockResolvedValueOnce({
    status: ImagePicker.PermissionStatus.GRANTED,
    granted: true,
    canAskAgain: true,
    expires: 'never',
  });
  render(<SpeedDialFab />);
  fireEvent.press(screen.getByTestId('speed-dial-main-button'));
  await act(async () => {
    fireEvent.press(screen.getAllByLabelText('Take photo with camera')[0]);
  });
  await waitFor(() => expect(ImagePicker.launchCameraAsync).toHaveBeenCalled());
  expect(ImagePicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile; npm.cmd test -- --testPathPattern="CameraScreen|SpeedDialFab"`
Expected: FAIL (`requestPermission` not called automatically in `CameraScreen`, and `requestCameraPermissionsAsync` still called in `SpeedDialFab`).

- [ ] **Step 3: Implement permission persistence & check-before-request in `CameraScreen.tsx`, `SpeedDialFab.tsx`, `AnimalDetailScreen.tsx`, and `app.json`**

1. In `apps/mobile/src/app/screens/CameraScreen.tsx`:
   - Define `const CAMERA_PERMISSION_KEY = 'camera_permission_granted';`.
   - Track `[permissionGranted, setPermissionGranted] = useState(() => hasPermission || Camera.getCameraPermissionStatus?.() === 'granted')`.
   - When `hasPermission` is `true`, set `setPermissionGranted(true)` and `appStorage.set(CAMERA_PERMISSION_KEY, 'true')`.
   - In a `useEffect` Watching `[focused, appState, hasPermission]`:
     - Check `const osGranted = hasPermission || Camera.getCameraPermissionStatus?.() === 'granted'`.
     - If `osGranted`, set `setPermissionGranted(true)` and `appStorage.set(CAMERA_PERMISSION_KEY, 'true')`.
     - Else if `focused && appState === 'active' && appStorage.getString(CAMERA_PERMISSION_KEY) === 'true'`, call `requestPermission().then(granted => { if (granted) { setPermissionGranted(true); appStorage.set(CAMERA_PERMISSION_KEY, 'true'); } else { appStorage.delete(CAMERA_PERMISSION_KEY); setPermissionGranted(false); } })`.
   - Wrap the manual `"Grant Camera Access"` button handler so when `await requestPermission()` resolves `true`, it saves `appStorage.set(CAMERA_PERMISSION_KEY, 'true')` and sets `setPermissionGranted(true)`.
   - Gate the permission wall on `if (!permissionGranted && !hasPermission)`.
   - Also in `handleCapture`, check `appStorage.getString(consentKey) === 'v1' || appStorage.getString('analysisConsent:local_user') === 'v1'` (migrating `'analysisConsent:local_user'` to `consentKey`) so signing in does not re-trigger the AI consent alert.
2. In `apps/mobile/src/app/components/SpeedDialFab.tsx`:
   - In `handleLaunchCamera`: call `const current = await ImagePicker.getCameraPermissionsAsync?.(); const permission = current?.granted ? current : await ImagePicker.requestCameraPermissionsAsync();`. If `permission.granted`, also set `appStorage.set('camera_permission_granted', 'true')`.
   - In `handleLaunchGallery`: call `const current = await ImagePicker.getMediaLibraryPermissionsAsync?.(); const permission = current?.granted ? current : await ImagePicker.requestMediaLibraryPermissionsAsync();`.
3. In `apps/mobile/src/app/screens/AnimalDetailScreen.tsx`:
   - In `save()`: call `const currentPerm = await Location.getForegroundPermissionsAsync?.(); const permission = currentPerm?.granted ? currentPerm : (currentPerm && currentPerm.canAskAgain === false ? currentPerm : await Location.requestForegroundPermissionsAsync());`.
4. In `apps/mobile/app.json`:
   - Add `"android.permission.ACCESS_COARSE_LOCATION"` and `"android.permission.ACCESS_FINE_LOCATION"` to `expo.android.permissions`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile; npm.cmd test -- --testPathPattern="CameraScreen|SpeedDialFab|AnimalDetailScreen"`
Expected: PASS.

- [ ] **Step 5: Run full verification suites across mobile and backend and commit**

Run:
```bash
python -m pytest backend/tests/test_auth.py backend/tests/test_discovery.py backend/tests/test_security.py -v
python backend/tests/run_tests.py
cd apps/mobile; ./node_modules/.bin/tsc.cmd --noEmit
cd apps/mobile; npm.cmd test
```
Expected: All backend tests pass, TypeScript check exits 0, all mobile Jest test suites pass.

Commit:
```bash
git add apps/mobile/jest.setup.ts apps/mobile/app.json apps/mobile/src/app/screens/CameraScreen.tsx apps/mobile/src/app/components/SpeedDialFab.tsx apps/mobile/src/app/screens/AnimalDetailScreen.tsx apps/mobile/src/app/screens/__tests__/CameraScreen.test.tsx apps/mobile/src/app/components/__tests__/SpeedDialFab.test.tsx
git commit -m "fix(permissions): persist camera permission state and check existing grants before prompting"
```
