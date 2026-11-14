# Animal Collection

An offline-first mobile field journal for photographing, identifying, and cataloging wildlife discoveries. Built with **React Native (Expo Prebuild)**, a **FastAPI** backend, **PostgreSQL**, **MinIO (S3)** object storage, and **Google Gemini Vision AI**.

---

## Architecture Overview

```text
+-----------------------------------+        HTTPS / REST        +-----------------------------------+
|      Mobile App (apps/mobile)     | -------------------------> |      Backend API (backend/)       |
|  Expo 56 · React Native 0.85 · TS |                            |  FastAPI · SQLAlchemy · PyJWT     |
|  VisionCamera · MMKV · TanStack   | <------------------------- |  Google Auth · Gemini AI · Boto3  |
+-----------------------------------+   JSON + X-App-Version     +---------+---------------+---------+
                 |                                                         |               |
                 | Presigned S3 / Local Cache                              v               v
                 +-----------------------------------------------> +---------------+ +---------------+
                                                                   | PostgreSQL 16 | |  MinIO (S3)   |
                                                                   |   (port 5433) | | (:9000/:9001) |
                                                                   +---------------+ +---------------+
```

### Key Engineering Principles
- **Offline-First & Optimistic Capture:** Shutter capture immediately stages the frame in `pending-captures/` and opens `AnimalDetailScreen`, running AI identification in the background without blocking the user on the viewfinder.
- **Native-First Versioning & Diagnostics:** App version and build number resolve natively via `expo-application` (guarded for dev clients) with `app.json` fallback, sent on API requests via `X-App-Version` and `X-Platform` headers.
- **Environment Isolation:** `NODE_ENV=development` loads `apps/mobile/.env.development` (pointing to local Docker), while `NODE_ENV=production` builds bundle against `apps/mobile/.env`.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Mobile (`apps/mobile`)** | React Native `0.85.3`, Expo `~56.0`, TypeScript `~6.0`, React Navigation 7, Zustand 5, TanStack Query 5, `react-native-mmkv`, `react-native-vision-camera`, `@react-native-google-signin/google-signin`, `@shopify/flash-list`, `expo-image` |
| **Backend (`backend`)** | Python, FastAPI, Uvicorn, SQLAlchemy 2, Pydantic 2, `google-auth`, PyJWT (`HS256`), `boto3`, Pillow, Google Gemini Vision API |
| **Infrastructure** | Docker Compose (`postgres:16-alpine`, `minio`, FastAPI container) |
| **Testing** | Jest (`jest-expo`, `@testing-library/react-native`), `tsc --noEmit`, `pytest` |

---

## Repository Structure

```text
animal-collection/
├── apps/
│   └── mobile/                     # Expo / React Native mobile client
│       ├── src/
│       │   ├── app/                # Root App.tsx, navigation, screens, UI components
│       │   ├── core/               # API clients, config (appVersion), database, i18n, network, storage
│       │   ├── features/           # Domain modules: auth, camera, collections, discovery
│       │   └── shared/             # Shared UI & helper utilities
│       ├── plugins/                # Expo config plugins (signing, build locale)
│       ├── app.json                # App metadata, version, versionCode/buildNumber, permissions
│       ├── eas.json                # EAS Build profiles (development, preview, production)
│       ├── jest.setup.ts           # Jest global mocks
│       └── package.json
├── backend/                        # FastAPI service
│   ├── src/
│   │   ├── api/                    # Versioned REST endpoints (/api/v1/...)
│   │   ├── core/                   # Settings, security, JWT/auth dependencies
│   │   ├── db/                     # SQLAlchemy engine & session setup
│   │   ├── models/                 # ORM models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   └── services/               # AI service (Gemini), S3/MinIO, business logic
│   ├── tests/                      # Pytest suite
│   ├── Dockerfile
│   └── requirements.txt
├── docs/                           # Design specs and implementation plans
├── scripts/                        # Utility scripts
└── docker-compose.yml              # Local stack: backend (:8000), postgres (:5433), minio (:9000/:9001)
```

---

## Prerequisites

- **Docker Desktop** (or Docker Engine + Compose v2)
- **Node.js** `v20+` (LTS)
- **Python** `3.11+` (for running backend tests outside Docker)
- **Java Development Kit (JDK)** `17`
- **Android Studio** with Android SDK (API 34+), Build-Tools, Platform-Tools (`adb`), and `ANDROID_HOME` configured

---

## Local Development Setup

### 1. Configure Environment Variables

Copy the templates and fill in real values (never commit `.env` files):

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Key variables to verify:
- **`backend/.env`**:
  - `GEMINI_API_KEY` — valid Google AI Studio key (`AIza...`) for `/api/v1/discovery/identify`
  - `GOOGLE_WEB_CLIENT_ID` — OAuth 2.0 Web Client ID for verifying Google ID tokens
  - `JWT_SECRET` — 32+ char signing secret
- **`apps/mobile/.env.development`** (loaded automatically by Expo dev server):
  - `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000` (Android Emulator) or `http://localhost:8000` (physical device with `adb reverse`)
  - `EXPO_PUBLIC_STORAGE_ENDPOINT=http://10.0.2.2:9000`

### 2. Start Backend Infrastructure

```bash
docker compose up -d
```

Services exposed locally:
- **Backend API:** `http://localhost:8000`
- **PostgreSQL:** `localhost:5433`
- **MinIO S3 API / Console:** `http://localhost:9000` / `http://localhost:9001`

### 3. Install & Run Mobile App (Android)

```bash
cd apps/mobile
npm install

# Forward Metro (8081), Backend (8000), and MinIO (9000) when using adb / USB device
npm run reverse

# Build and launch native Dev Client
npx expo run:android
```

If the native Dev Client is already installed on your emulator/device, start Metro directly:

```bash
cd apps/mobile
npx expo start -c
```

---

## Testing & Quality Checks

Run all checks before opening a Pull Request:

### Mobile (`apps/mobile`)
```bash
cd apps/mobile
npm test -- --maxWorkers=2
npx tsc --noEmit
```
*(On Windows PowerShell where `.ps1` execution policy is restricted, use `npm.cmd` and `npx.cmd`.)*

### Backend (`backend`)
```bash
cd backend
pytest
```

---

## Build & Release Workflow

### 1. Version Bump Checklist
Keep versions synchronized across:
- `apps/mobile/app.json` (`expo.version`, `expo.android.versionCode`, `expo.ios.buildNumber`)
- `apps/mobile/package.json` (`version`)
- `apps/mobile/android/app/build.gradle` (`versionCode`, `versionName`) when building locally with Gradle without re-running `expo prebuild`

> Google Play Console rejects `.aab` uploads unless `versionCode` is strictly greater than the previously uploaded bundle.

### 2. Build Signed Android App Bundle (`.aab`)

**Local Gradle Release Build** (requires `apps/mobile/android/app/animal-release-key.keystore` or `ANIMAL_RELEASE_*` Gradle properties):

```bash
cd apps/mobile/android
NODE_ENV=production ./gradlew bundleRelease
```

On Windows PowerShell:
```powershell
Set-Location apps/mobile/android
$env:NODE_ENV = "production"
.\gradlew.bat bundleRelease
```

> Setting `NODE_ENV=production` ensures Metro bundles `apps/mobile/.env` instead of `.env.development`.

Output artifact:
```text
apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

**EAS Cloud/Local Build** (configured in `apps/mobile/eas.json`):
```bash
cd apps/mobile
eas build --platform android --profile production
```

### 3. Git Branching & Promotion Flow

```text
feature/*  --->  dev (default)  --->  uat (UAT / release)
```

1. **Feature / Fix PRs -> `dev`:** `dev` is the default branch. All daily engineering work merges into `dev` using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`).
2. **Release Promotion (`dev` -> `uat`):** Once tests, `tsc --noEmit`, and release bundle builds pass, open a PR from `dev` into `uat` with release summary and verification results.
3. **Hotfix Rule:** Only merge `uat` back into `dev` if a hotfix was committed directly on `uat`.

---

## Troubleshooting

- **`The AI service is unavailable` (HTTP `502`) on Catch:** Check `docker logs animal_backend`. Usually caused by a missing or invalid `GEMINI_API_KEY` in `backend/.env`. After updating `backend/.env`, recreate the container:
  ```bash
  docker compose up -d --force-recreate backend
  ```
- **Emulator cannot reach Metro (`8081`) or local API (`8000`):** Re-run `npm run reverse` in `apps/mobile` (`adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8000 tcp:8000 && adb reverse tcp:9000 tcp:9000`).
