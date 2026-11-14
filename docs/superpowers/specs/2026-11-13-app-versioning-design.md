# App Versioning Production Design (Approach A)

**Date:** 2026-11-13  
**Status:** Approved (Approach A selected)

## Intent & Problem Statement

Currently, [SettingsScreen.tsx](../../../apps/mobile/src/app/screens/SettingsScreen.tsx) imports `apps/mobile/app.json` directly and renders `appConfig.expo.version` (`1.0.1`) in both the Settings footer and the `Report a problem` email template. Meanwhile:
- [eas.json](../../../apps/mobile/eas.json) uses `"appVersionSource": "remote"` with `"autoIncrement": true`, meaning native build numbers (`versionCode` on Android, `buildNumber` on iOS) advance on EAS builds without modifying `app.json`.
- If OTA updates are ever introduced or an older binary runs newer JS, reading only `app.json` hides the actual native binary version and build number.
- [SettingsScreen.test.tsx](../../../apps/mobile/src/app/screens/__tests__/SettingsScreen.test.tsx) hardcodes `'Version 1.0.1'`, causing false test failures whenever the release version bumps.
- [authenticatedFetch.ts](../../../apps/mobile/src/core/api/authenticatedFetch.ts) and [authApi.ts](../../../apps/mobile/src/features/auth/api/authApi.ts) do not send app version or platform headers for backend/production diagnostics.

## Goals & Non-Goals

### Goals
1. Read installed native app version and build number via `expo-application` (`Application.nativeApplicationVersion`, `Application.nativeBuildVersion`), with safe fallback to `app.json` (`expo.version`, `expo.android.versionCode`, `expo.ios.buildNumber`) in Jest, Web, Expo Go, or pre-rebuild dev clients.
2. Centralize version formatting (`<version> (<build>)`, e.g. `1.0.1 (3)`, omitting empty/null build numbers cleanly) in a single utility module consumed by UI, email problem reports, and HTTP request headers.
3. Attach `X-App-Version` and `X-Platform` headers across authenticated and auth HTTP requests without overriding caller headers (`Authorization`, `Content-Type`).
4. Replace brittle hardcoded version assertions in tests with dynamic assertions and align `apps/mobile/package.json` version with `apps/mobile/app.json`.

### Non-Goals
- Adding backend version enforcement endpoints (`/health` min-supported version) or force-update blocking modals (Approach B — deferred until store distribution requires breaking-API gating).
- Modifying `backend` business logic (backend CORS already allows `*` headers in [backend/src/main.py](../../../backend/src/main.py)).

## Constraints
- Expo SDK `~56.0.21` compatibility (`expo-application` installed via Expo CLI).
- Graceful behavior when `Application.nativeApplicationVersion` or `Application.nativeBuildVersion` is `null`, `undefined`, or whitespace (common in Jest, web, or dev client binaries built before `expo-application` is linked).
- Existing strict header assertions in `authenticatedFetch.test.ts` must continue verifying `Authorization` and retry semantics.
- Native rebuild (`expo run:android` / EAS Build) is required for device binaries to populate native values from `expo-application`; JS fallback ensures zero breakage prior to rebuild.

## Approaches Considered

| Approach | Summary | Tradeoff | Decision |
| :--- | :--- | :--- | :--- |
| **Approach A (Chosen)** | Client native versioning (`expo-application` + fallback) + formatted `1.0.1 (3)` UI/report + `X-App-Version`/`X-Platform` headers + dynamic tests | Minimal surface area, zero backend migration/downtime risk; requires native rebuild for on-device native build numbers | **Selected** |
| **Approach B** | Approach A + Backend `minSupportedVersion` endpoint + SemVer comparison + Force/Soft Update modal | Prevents outdated clients from hitting changed APIs, but introduces backend config, store URLs, and blocking UX prematurely | Deferred |

## Architecture Overview
- `apps/mobile/src/core/config/appVersion.ts`: Single source of truth exposing `getAppVersionInfo()`, `formatAppVersion()`, and `getClientMetadataHeaders()`.
- `apps/mobile/src/app/screens/SettingsScreen.tsx`: Consumes `formatAppVersion()` for both the version row and `reportProblem` email body.
- `apps/mobile/src/core/api/authenticatedFetch.ts` & `apps/mobile/src/features/auth/api/authApi.ts`: Merge `getClientMetadataHeaders()` as base headers on outgoing requests.
- `apps/mobile/package.json`: Align `"version"` with `apps/mobile/app.json` (`1.0.1`) and add `expo-application`.
