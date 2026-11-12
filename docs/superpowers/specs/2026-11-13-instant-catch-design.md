# Instant Catch Photo Capture & Background Analysis Design

**Date:** 2026-11-13
**Status:** Proposed
**Branch:** `dev`

---

## Intent & Why

Currently, tapping the shutter button on the **Catch** screen ([CameraScreen.tsx](../../../apps/mobile/src/app/screens/CameraScreen.tsx)) calls `cameraRef.current.takePhoto(...)` immediately, but remains on the live camera viewfinder showing a small `"AI Analyzing..."` pill while awaiting `identifyAnimalApi()` (up to a 60-second timeout). Because users still see the live moving camera preview, it feels like the photo has not finished capturing and forces them to hold their phone steady pointed at the animal until AI finishes.

**Goal:** As soon as the user taps the shutter button and the camera captures a still image, persist a temporary local copy immediately and navigate straight to `AnimalDetailScreen` displaying that captured photo while AI identification runs in the background.

### Goals
- Eliminate waiting on the live camera preview after tapping the shutter button.
- Ensure the captured photo file is safely staged locally (`Paths.document/pending-captures/`) before leaving `CameraScreen`, so temporary OS camera cache files are never lost and can be retried or manually saved even if AI fails.
- Support smooth states on `AnimalDetailScreen` for **analyzing**, **identified**, **no animal found**, **network/quota error with retry**, **expired session (401/403)**, and **manual override**.
- Preserve all existing security and correctness invariants: AI privacy consent before `takePhoto()`, owner scoping (`captureOwner`), rate-limit cooldown enforcement (`429` `Retry-After`), clean `Camera` pause/release on navigation, and unaffected manual photo/gallery flows from `SpeedDialFab`.

### Non-Goals
- Multi-photo background queue / burst shooting across multiple concurrent animals (Approach C).
- Backend API contract changes (`POST /api/v1/discovery/identify` stays unchanged).
- Changing `SpeedDialFab` manual camera/gallery flows (`autoAnalyze` stays off for those).

### Anti-Goals
- Never auto-trigger AI for photos chosen via `SpeedDialFab` ("Take photo" / "Choose from gallery"), which intentionally bypass AI.
- Never overwrite user-edited species or story fields if the user starts typing while AI analysis is still in flight.
- Never leak AI results, error states, or pending capture files across an account switch.

---

## Approaches Considered

1. **Approach A — Freeze-Frame Preview Overlay on CameraScreen**
   - Keep user on `CameraScreen`, hide/pause live camera after `takePhoto()`, render frozen `<Image>` + Retake/Analyzing overlay, then navigate to `AnimalDetailScreen` on success.
   - *Tradeoff:* Smallest diff, keeps camera screen coupled to AI network/retry UI and still keeps users waiting on the camera tab before seeing their card.
2. **Approach B — Navigate Immediately to `AnimalDetailScreen` with Background Analysis *(Chosen)***
   - Capture + stage temp file on shutter press, navigate immediately to `AnimalDetailScreen` (`autoAnalyze: true`), show the captured photo at the top right away, and run `identifyAnimalApi()` asynchronously inside a dedicated identification hook while showing an analyzing status card, retry/retake options on failure, and live auto-fill on completion.
   - *Tradeoff:* Frees users from the camera screen immediately, separates camera hardware lifecycle from network calls cleanly, prevents losing captured photos on transient errors/screen locks, and only touches `CameraScreen`, `AnimalDetailScreen`, navigation types, `captureFiles`, and a small discovery hook/store.
3. **Approach C — Non-Blocking Multi-Photo Queue**
   - Enqueue captures into a persistent Zustand/MMKV job queue and return camera immediately for rapid burst shooting.
   - *Tradeoff:* High state/UI/draft-cleanup complexity and conflicts with existing strict per-minute/per-week AI rate limits.

**Why Approach B fits:** Users want to take one photo, put their phone down immediately, see their photo right away, and either save the AI-identified card or retry/edit manually if needed.

---

## Architecture & Key Decisions

### 1. Temporary Capture Staging (`captureFiles.ts`)
- Add `stagePendingCapture(uri: string, captureId: string): string`:
  - Validates the source `file://` exists and is non-empty (reusing validation logic shared with `retainCapture`).
  - Copies it into `new Directory(Paths.document, 'pending-captures')` as `${captureId}.jpg` (consistent with `jest.setup.ts` where `Paths.document` is available).
  - Non-`file://` URIs pass through safely (returning `uri`).
- Add `discardPendingCapture(uri?: string): void`:
  - Safely deletes `uri` only if it lives inside `Paths.document/pending-captures/`, ignoring already-missing files so it never touches permanent `captures/` files or external gallery URIs.
- **Lifecycle:**
  - `CameraScreen` stages the photo immediately after `takePhoto()` using a generated ID (or timestamp/UUID), then passes `{ imageUri: stagedUri, capturedAt, autoAnalyze: true, captureOwner }` to `AnimalDetail`.
  - When `AnimalDetailScreen` successfully saves via `store.addCollection(...)` (which copies to `Paths.document/captures/{requestId}.jpg` via `retainCapture`), it discards the temporary pending file via `discardPendingCapture(route.params.imageUri)`.
  - When user taps **Back** or **Retake Photo** without saving (or `captureOwner` mismatches), `AnimalDetailScreen` discards the pending file via `discardPendingCapture`.

### 2. Shared Analysis Cooldown Store (`useAnalysisCooldownStore.ts`)
- Previously `retryUntil` was local state inside `CameraScreen`. Moving AI analysis into `AnimalDetailScreen` means a `429` (`retryAfterSeconds`) response happens on `AnimalDetailScreen`, while **both** `AnimalDetailScreen` (Retry button) and `CameraScreen` (if user taps Retake and goes back) must honor that cooldown.
- Small Zustand store `useAnalysisCooldownStore`:
  - State: `ownerId?: string`, `retryUntil: number`
  - Actions: `setCooldown(retryAfterSeconds: number, ownerId?: string)`, `syncOwner(ownerId?: string)` (resets `retryUntil` to `0` whenever `ownerId` changes), `clearCooldown()`.

### 3. Background Analysis API & Hook (`identifyAnimalApi.ts`, `useAnimalIdentification.ts`)
- **Cancellation support in `identifyAnimalApi`:** Add optional third argument `options?: { signal?: AbortSignal }`. Combine external `signal` with the existing 60-second `AbortController` timeout:
  - If external `signal` aborts (e.g. user navigates back / retakes / switches account), clean up listeners/timers and reject cleanly with an `AbortError` (not surfaced as a network error banner).
  - If the 60-second timeout fires, preserve `"Animal analysis took too long. Please try again."`.
- **`useAnimalIdentification({ imageUri, enabled, captureOwner })` hook:**
  - Triggered on mount when `enabled === true` and `imageUri` is set (and whenever `retry()` is called).
  - Reads `token` from `useAuthStore.getState().tokens?.accessToken`.
  - Aborts in-flight request on unmount or `captureOwner` mismatch; discards late results if `useAuthStore.getState().user?.id !== captureOwner`.
  - Maps outcomes:
    - `analyzing`: `{ status: 'analyzing', result: null, errorMessage: '', errorHint: '', requiresSignIn: false }`
    - `found === true`: `{ status: 'identified', result }`
    - `found === false`: `{ status: 'not_found', result: null }` (`"No animal found - Try another photo"` / `"Move closer and keep the animal in focus."` — localized via `translations.ts`)
    - `error`: maps `AnimalAnalysisError` (`401/403` -> `requiresSignIn: true`; `429 quota` -> calls `useAnalysisCooldownStore.getState().setCooldown(retryAfterSeconds, captureOwner)` and sets `errorHint` with Thailand reset time if `dailyReset`, or allowance notice, or fallback hint).

### 4. `CameraScreen.tsx` Changes
- `handleCapture`:
  1. Perform existing guards (`capturing`, `!cameraVisible`, `cameraError`, `!cameraReady`, `!device`, `!cameraRef.current`, `retryUntil > Date.now()`).
  2. Perform existing AI privacy consent check (`Alert.alert`) before calling `takePhoto()`.
  3. Set `capturing = true` during hardware capture + staging.
  4. `const photo = await cameraRef.current.takePhoto(...)` -> `stagePendingCapture(formattedUri, captureId)`.
  5. Navigate immediately: `navigation.navigate('AnimalDetail', { imageUri: stagedUri, capturedAt, autoAnalyze: true, captureOwner })`.
  6. `finally { setCapturing(false); }` — note `CameraScreen` no longer calls `identifyAnimalApi()`!
- On `cameraError` / `takePhoto` / `stagePendingCapture` failure: show the existing hardware error modal (`Could not capture photo. Please try again.` / `The camera is not ready yet. Please try again.`).
- Read `retryUntil` from `useAnalysisCooldownStore` (synced with `userId`) so returning from `AnimalDetail` after a `429` still enforces cooldown countdown on the shutter button.
- Refresh `analysisUsageApi()` on focus (`cameraVisible && userId`) as today so remaining AI quota stays accurate after returning from `AnimalDetail`.

### 5. `AnimalDetailScreen.tsx` & `types.ts` Changes
- Extend `RootStackParamList['AnimalDetail']` in [types.ts](../../../apps/mobile/src/app/navigation/types.ts) with `autoAnalyze?: boolean` and `captureOwner?: string`.
- Guard auto-analysis so it runs only when `route.params.autoAnalyze && !existing && !!route.params.imageUri && !manualMode`.
- **Non-blocking status UI** shown below the Hero Photo Card (the Hero Photo renders **immediately**):
  - **`analyzing`:** Banner with `ActivityIndicator` + bilingual copy (`"Identifying animal…"` / `"You can put your phone down — AI is analyzing your photo."`) plus a compact **Identify manually** button (which aborts the in-flight AI request so the user never gets stuck waiting on slow networks) and **Retake photo** (`discardPendingCapture` + `navigation.goBack()`).
  - **Save gating & field rules during `analyzing`:**
    - `Add to Collection` remains disabled while `status === 'analyzing'` to avoid racing post-save mutations with in-flight AI results. Selecting **"Identify manually"** (or receiving `not_found`/`error`) immediately exits `analyzing` cleanly.
    - Track user edits via refs (`userEditedSpeciesRef`, `userEditedIdentificationRef`, `userEditedStoryRef`). When `status === 'identified'` arrives: populate `species` only if `!userEditedSpeciesRef.current`; populate `identifiedSpecies`, `animalType`, and `tags` only if `!userEditedIdentificationRef.current`; populate `story` only if `!userEditedStoryRef.current`.
    - Manual `"Animal name"` (`setSpecies`) stays separate from `identifiedSpecies` per existing catalog/nickname rules; tapping **Identify manually** (from `analyzing`, `not_found`, or `error`) expands `IdentificationFields` (`setEditingIdentification(true)`) so `Identified species`, `Type`, and `Habitat` are immediately visible alongside catalog chips and `Add to Collection` gating stays unchanged.
  - **`not_found`:** Non-blocking warning card showing `"No animal found - Try another photo"` + hint (`"Move closer and keep the animal in focus."`), with **Retake photo** button (`discardPendingCapture` + `navigation.goBack()`) and **Identify manually** button (expands `IdentificationFields`).
  - **`error`:** Non-blocking error card showing `errorMessage` + `errorHint`:
    - If `requiresSignIn`: **Sign in again** button (`discardPendingCapture` + `navigation.navigate('Login')`, keeping `LoginScreen` resetting to `MainTabs` unchanged).
    - Otherwise: **Retry analysis** button (shows live countdown `Try again in 0:XX` and disabled while `retrySeconds > 0`, calls `identification.retry()` on the same `imageUri`), **Identify manually**, and **Retake photo** (`discardPendingCapture` + `navigation.goBack()`).
- **Temp-file cleanup on unmount / save:**
  - On successful `save()`, discard the temporary `pending-captures/` file once `store.addCollection(...)` finishes persisting its own permanent copy via `retainCapture`.
  - On `AnimalDetailContent` unmount while still unsaved (`!savedIdRef.current`), call `discardPendingCapture(route.params.imageUri)` so backed-out, expired-session, or killed screens never leak orphaned files in `pending-captures/`.
- **Translations (`translations.ts`):** Add clean `en` and `th` strings under `detail` for analyzing banner, sub-hint (`"You can put your phone down — AI is analyzing your photo."`), `"Identify manually"`, `"Retry analysis"`, `"Retake photo"`, retry countdown, and `"No animal found"` guidance.

---

## Testing Strategy
1. `captureFiles.test.ts`: Verify `stagePendingCapture` validates missing/empty files, copies into `pending-captures/`, and `discardPendingCapture` deletes only files inside `pending-captures/`.
2. `useAnalysisCooldownStore.test.ts`: Verify cooldown calculation, clearing, and automatic reset when `ownerId` changes.
3. `identifyAnimalApi.test.ts`: Verify external `AbortSignal` aborts cleanly without throwing `"Animal analysis took too long"`.
4. `useAnimalIdentification.test.ts`: Verify `analyzing -> identified`, `not_found`, `401/403` sign-in state, `429` cooldown population, `retry()`, unmount abort, and account-switch discard.
5. `CameraScreen.test.tsx`: Verify shutter press calls `takePhoto`, stages file, navigates immediately to `AnimalDetail` with `autoAnalyze: true` WITHOUT calling `fetch`/`identifyAnimalApi`, respects shared cooldown from `useAnalysisCooldownStore`, and keeps hardware error / consent / permission / lifecycle tests passing.
6. `AnimalDetailScreen.test.tsx`: Verify `autoAnalyze: true` displays captured photo immediately while analyzing, auto-fills fields on success, preserves user-edited species if edited while waiting, displays not-found & error retry/sign-in controls, Retake cleans up temp file and calls `goBack()`, and `SpeedDialFab`-style `autoAnalyze: undefined` never triggers AI fetch.
