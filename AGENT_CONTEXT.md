# AGENT_CONTEXT.md

## 1. Project Overview & Tech Stack

- **Domain Summary:** Animal Collection is an offline-first mobile application paired with a containerized backend. Users discover, photograph, catalog, and collect animal observations with geolocation tagging, offline caching, and automatic cloud synchronization.
- **Tech Stack:**
  - **Mobile:** React Native `0.85.3`, Expo SDK `56` (Prebuild / Dev Client), TypeScript `6.0.3` (Strict mode), Zustand `5.0.15` (State Management), React Navigation `7.x` (Native Stack & Bottom Tabs), Shopify FlashList `2.0.2`, `react-native-mmkv` `4.3.2` (Local cache), `expo-secure-store` `56.0.4` (Credential vault), `react-native-vision-camera` `4.7.2` (CameraX), `@react-native-google-signin/google-signin` `16.1.4`, `@tanstack/react-query` `5.102.8`.
  - **Backend API:** Python `3.13` / `3.12`, FastAPI `0.110+`, SQLAlchemy `2.0.28+`, Pydantic `2.6+` / `pydantic-settings`, PyJWT `2.8+`, Google Auth `2.28+`, Boto3 `1.34+`, Uvicorn.
  - **Database & Storage:** PostgreSQL `16-alpine` (Production / Docker), SQLite (Local fallback / Unit tests), MinIO Object Storage (S3-compatible bucket `animal-photos` with local directory fallback at `backend/uploads`).
  - **Infra Orchestration:** Docker Compose v2.

---

## 2. Architecture & Data Flow

### Directory Map

```text
animal-collection/
├── apps/
│   └── mobile/                       # React Native / Expo mobile application
│       ├── android/                  # Generated native Android project
│       ├── assets/                   # Static app icons, splash screens, badges
│       ├── plugins/                  # Custom Expo config plugins (signing, locale)
│       └── src/
│           ├── app/                  # Application root, navigation, shared screens & design primitives
│           │   ├── components/       # Cross-cutting UI cards, badges, icons, design tokens
│           │   ├── data/             # Static game data, missions, achievements, mock animals
│           │   ├── navigation/       # Type-safe Stack and Bottom Tab navigators
│           │   └── screens/          # Core views (Gallery, Camera, Details, Profile, Settings)
│           ├── core/                 # App-wide singleton infrastructure
│           │   ├── api/              # Authenticated fetch client, request wrapper, endpoints config
│           │   └── storage/          # MMKV client, SecureStore credential vault, session keys
│           ├── features/             # Domain-driven modular features
│           │   ├── auth/             # Google Sign-In, token refresh, auth Zustand store
│           │   ├── collections/      # Catalog sync, capture files, outbox queue, collection store
│           │   └── discovery/        # AI species identification & analysis usage APIs
│           └── shared/               # Shared general utilities and helpers
├── backend/                          # FastAPI REST API service
│   ├── src/
│   │   ├── api/                      # Routing layer & dependencies
│   │   │   ├── deps.py               # Authentication & DB session dependency injection
│   │   │   └── v1/                   # Versioned endpoints (auth, animals, collections, storage, discovery)
│   │   ├── core/                     # Application settings (Pydantic) & SQLAlchemy DB engine
│   │   ├── db/                       # SQL schema definition and seed scripts
│   │   ├── models/                   # SQLAlchemy declarative ORM models (User, Animal, Collection, UserAnalysisUsage)
│   │   ├── schemas/                  # Pydantic request/response validation DTOs
│   │   └── services/                 # Business logic singletons (AuthService, StorageService, AIService)
│   ├── tests/                        # Pytest & unittest suites (SQLite in-memory)
│   ├── uploads/                      # Local fallback directory for photo uploads
│   └── Dockerfile                    # Container definition for backend service
└── docker-compose.yml                # Multi-service stack (backend, postgres, minio)
```

### Execution & Data Flow

```text
[Mobile UI: Camera / Gallery]
       │
       ▼
[Zustand Store: useCollectionStore] ──► [MMKV Storage / FileSystem (Immediate Local Persistence)]
       │
       ▼ (Background / Online Sync)
[Core API: authenticatedFetch] ─────► Bearer JWT Injection & Auto Silent Refresh
       │
       ▼ HTTP / REST
[Backend: FastAPI Router (/api/v1)]
       │
       ▼
[Dependency Guard: get_current_user] ─► Decode JWT & verify User existence
       │
       ▼
[Storage Service / S3 Client] ────────► Upload image to MinIO (or local uploads/ fallback)
       │
       ▼
[SQLAlchemy ORM / Session] ──────────► Write UserCollection record to PostgreSQL (or SQLite fallback)
       │
       ▼
[Pydantic Response Schema] ──────────► Formatted JSON returned with camelCase fields
```

---

## 3. Canonical Reference Files (Golden Examples)

Inspect these references before adding or modifying code in each layer:

- **Entry Point / App Bootstrap:**
  - Backend: `backend/src/main.py` (FastAPI lifespan, auto-table creation, S3 bucket init, catalog seed, CORS).
  - Mobile: `apps/mobile/App.tsx` & `apps/mobile/src/app/App.tsx` (Root SafeAreaProvider, StatusBar, AppNavigator).
- **Routing / Controller Pattern:**
  - Backend: `backend/src/api/v1/collections.py` (REST routes with FastAPI deps, status codes, query filters).
  - Mobile: `apps/mobile/src/app/navigation/AppNavigator.tsx` & `apps/mobile/src/app/navigation/MainTabNavigator.tsx` (Type-safe stack and tab routes).
- **Business Logic / Service Pattern:**
  - Backend: `backend/src/services/storage_service.py` (S3 client handling with fallback) and `backend/src/services/auth_service.py` (Google token verification and user upsert).
  - Mobile: `apps/mobile/src/features/collections/stores/useCollectionStore.ts` (Zustand store managing local cache, outbox queue, and offline sync reconciliation).
- **Data Access / Schema / ORM Pattern:**
  - Backend ORM: `backend/src/models/collection.py` (SQLAlchemy model, GUID types, UTC timestamps, `to_dict` serializer).
  - Backend Schemas: `backend/src/schemas/collection.py` (Pydantic DTOs for create, update, and response).
  - Mobile Types: `apps/mobile/src/features/collections/types/index.ts` (TypeScript interfaces matching API payloads).
- **Auth / Middleware / Guard Pattern:**
  - Backend: `backend/src/api/deps.py` (`get_current_user` and `get_optional_current_user` with `HTTPBearer`).
  - Mobile: `apps/mobile/src/core/api/authenticatedFetch.ts` (Automatic 401 interceptor, silent token renewal, concurrency-safe).
- **Error Handling & Validation Pattern:**
  - Backend: `backend/src/schemas/collection.py` (Pydantic Field validations) and `backend/src/api/v1/collections.py` (HTTPException with status codes).
  - Mobile: `apps/mobile/src/features/collections/api/collectionApi.ts` (Custom typed errors `StarterGiftClaimError`, bounded timeout wrapper `boundedJson`).
- **UI Component / State Pattern:**
  - Component: `apps/mobile/src/app/components/AnimalCard.tsx` (Accessible pressable, locked state, placeholder handling).
  - Screen: `apps/mobile/src/app/screens/GalleryScreen.tsx` (Zustand subscription, pull-to-refresh, background sync timer, search/filter).

---

## 4. Coding Conventions & Strict Rules (Do's & Don'ts)

### Naming Conventions
- **Mobile (TypeScript/React):**
  - Files: PascalCase for components/screens (`AnimalCard.tsx`, `GalleryScreen.tsx`); camelCase for hooks, stores, and utilities (`useAuthStore.ts`, `authenticatedFetch.ts`).
  - Variables & Functions: `camelCase`.
  - Types / Interfaces: `PascalCase` (defined in `types/index.ts` or local `types.ts`).
- **Backend (Python):**
  - Files & Modules: `snake_case` (`auth_service.py`, `storage_service.py`).
  - Classes & Models: `PascalCase` (`User`, `UserCollection`, `CollectionSummaryResponse`).
  - Functions & Variables: `snake_case`.
  - Database Tables & Columns: `snake_case` in SQL (`user_collections`, `custom_name`, `photo_url`).
  - API JSON DTOs: `camelCase` for API payloads/responses (`photoUrl`, `isFavorite`, `caughtAt`) mapped via Pydantic or `to_dict()`.

### Type & Schema System
- All new mobile modules must be fully typed in TypeScript; never use `any` when a domain type can be defined.
- Backend requests and responses must use Pydantic models from `backend/src/schemas/`. Do not return raw ORM instances directly without validation or schema transformation (`from_attributes = True`).

### Error & Logging Strategy
- Backend uses FastAPI `HTTPException` with explicit `status_code` and descriptive `detail`.
- Mobile uses strongly typed custom error subclasses extending `Error` (e.g., `AuthApiError`, `NameSaveTimeoutError`).
- Backend logs use clear prefix tags: `[Database]`, `[Warning]`, `[Storage]`, `[Seeds]`. Avoid generic unlabelled prints.

### Strict Anti-Patterns (NEVER DO THIS)
- ❌ **NEVER execute raw SQL queries inside route handlers**: Always use SQLAlchemy ORM queries or defined service abstractions.
- ❌ **NEVER write sensitive credentials (JWT secrets, private keys) into Expo public constants**: All public mobile environment variables must use `EXPO_PUBLIC_` and contain only non-secret identifiers (like Google Web Client ID).
- ❌ **NEVER block the mobile UI thread for network operations**: Captures must be saved immediately to local disk/MMKV before triggering async cloud sync.
- ❌ **NEVER bypass `authenticatedFetch` or manual token refresh logic**: Direct unauthenticated requests to protected endpoints will fail upon token expiration.
- ❌ **NEVER install duplicate libraries**: Use existing project dependencies (`react-native-mmkv` for KV cache, `expo-secure-store` for credentials, Zustand for client state, Boto3 for S3).

---

## 5. Development, Testing & Verification Commands

### Environment & Windows Shell Gotchas
> On Windows PowerShell, running `npm` or `npx` may trigger `PSSecurityException` due to script execution policies. Always use `npm.cmd` or `npx.cmd` in Windows terminal environments.

### Local Development & Docker Orchestration
```bash
# 1. Start backend infrastructure (PostgreSQL & MinIO) from project root:
docker compose up -d

# 2. Start backend locally (if running outside Docker):
cd backend
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# 3. Start mobile Expo development server:
cd apps/mobile
npm.cmd start

# 4. Run on Android device/emulator:
cd apps/mobile
npm.cmd run android
```

### Database Seeding & Startup
- Backend automatically initializes tables and seeds the 18 master catalog animals during FastAPI lifespan startup via `seed_catalog_animals(db)` in `backend/src/db/seeds.py`.
- Manual PostgreSQL seed script is available at `backend/src/db/schema.sql`.

### Type-Checking & Linting
```bash
# Mobile TypeScript verification:
cd apps/mobile
./node_modules/.bin/tsc.cmd --noEmit
```

### Running Tests
```bash
# Mobile tests (Jest + React Native Testing Library):
cd apps/mobile
npm.cmd test                                    # Run all tests
npm.cmd test -- --testPathPattern="achievements" # Run single test file

# Backend tests (Pytest / Unittest with SQLite in-memory):
python -m pytest backend/tests/test_auth.py     # Run single test via pytest
python backend/tests/run_tests.py               # Run backend integration suite
```
