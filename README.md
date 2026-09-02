# Animal Collection

An offline-first Android mobile application built with React Native (Expo Prebuild) and backed by local Docker services (PostgreSQL & MinIO S3 storage).

---

## Architecture & Tech Stack

* **Mobile (`apps/mobile`):**
  * **Framework:** React Native (Expo Dev Client / Prebuild)
  * **Camera:** `react-native-vision-camera` (Android CameraX)
  * **Auth:** `@react-native-google-signin/google-signin` (Google Play Services)
  * **State & Sync:** Zustand, TanStack Query, `react-native-mmkv`
  * **UI & Lists:** Shopify FlashList, `expo-image`
* **Infrastructure (`docker-compose.yml`):**
  * **Database:** PostgreSQL 16
  * **Object Storage:** MinIO (Local S3-compatible storage for photos)

---

## Prerequisites

Ensure your development machine has the following installed:

1. **Docker Desktop** (or Docker Engine + Compose v2)
2. **Node.js**: v20+ (LTS recommended)
3. **Java Development Kit (JDK)**: JDK 17
4. **Android Studio**:
   * Android SDK (API 34+)
   * Android SDK Build-Tools & Platform-Tools
   * Set `ANDROID_HOME` in your environment variables

---

## Quick Start

### 1. Start Docker Infrastructure
From the project root:

```bash
# Copy root environment variables
cp .env.example .env

# Start PostgreSQL and MinIO
docker compose up -d
```

### 2. Setup Mobile Application
```bash
cd apps/mobile

# Copy mobile environment variables
# On Windows: copy .env.example .env
cp .env.example .env

# Install locked dependencies
npm install
```

### Run on Android
```bash
cd apps/mobile
npx expo run:android
```

## Repository Structure
```text
animal-collection/
├── apps/
│   └── mobile/                       # React Native application workspace
│       ├── src/
│       │   ├── app/                  # App entry point, root providers, navigation
│       │   │   ├── navigation/       # Type-safe AppNavigator and TabNavigators
│       │   │   └── App.tsx
│       │   ├── core/                 # App-wide infrastructure singletons
│       │   │   ├── config/           # Dynamic environment config
│       │   │   ├── database/         # Local SQLite client & migrations
│       │   │   ├── network/          # Axios/fetch clients & S3 uploaders
│       │   │   └── storage/          # MMKV key-value storage client
│       │   ├── features/             # Self-contained business domains
│       │   │   ├── auth/             # Google sign-in, session store, tokens
│       │   │   ├── camera/           # CameraX viewfinder, shutter, image resizer
│       │   │   └── collection/       # Animal gallery, FlashList grids, sync worker
│       │   └── shared/               # Reusable UI components, hooks, theme tokens
│       ├── app.json                  # Native build plugins & permission declarations
│       ├── package.json
│       └── tsconfig.json             # Absolute path mappings (@/*, @/features/*)
├── backend/                          # Backend API service (Auth verification, S3 Presigned URLs, DB)
│   ├── src/                          # API routing, controllers, services, database models
│   ├── .env.example                  # Backend specific environment variables
│   ├── Dockerfile                    # Docker build definition for API service
│   └── requirements.txt              # (หรือ package.json ขึ้นอยู่กับภาษาที่เลือกใช้)
├── docker-compose.yml                # Orchestration (PostgreSQL + MinIO + Backend API)
├── .env.example                      # Root environment configuration blueprint
└── README.md