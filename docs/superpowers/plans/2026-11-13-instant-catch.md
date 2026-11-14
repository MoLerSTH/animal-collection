# Instant Catch Photo Capture & Background Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate waiting on the live camera screen after pressing the Catch shutter button by staging the captured still image locally immediately and navigating straight to `AnimalDetailScreen` while AI identification runs in the background.

**Architecture:** `CameraScreen` captures and copies the still frame into a managed `pending-captures` directory, then navigates immediately to `AnimalDetailScreen` with `autoAnalyze: true` and `captureOwner`. A shared `useAnalysisCooldownStore` keeps `429` retry windows synchronized between `AnimalDetail` and `Catch`, while a dedicated `useAnimalIdentification` hook manages cancellable background `identifyAnimalApi` calls, account-switch guards, manual overrides, and retries.

**Tech Stack:** React Native (`expo` ~56, `react-native-vision-camera`, `expo-file-system`, `zustand`, TypeScript), Jest + React Native Testing Library.

**Spec:** [2026-11-13-instant-catch-design.md](../specs/2026-11-13-instant-catch-design.md)

## Global Constraints
- Run all mobile commands inside `apps/mobile` (`npm.cmd test -- --maxWorkers=2`, `npx.cmd tsc --noEmit`).
- Preserve all existing privacy-consent checks before `takePhoto()` and owner-scoping (`captureOwner`) before committing AI results or saving.
- Never auto-trigger AI when `AnimalDetailScreen` opens without `autoAnalyze: true` (e.g. from `SpeedDialFab` manual photo/gallery picks or existing `animalId` cards).
- Never mutate `identifiedSpecies` when editing the manual `"Animal name"` nickname input alone; keep manual identification inside `IdentificationFields` / catalog chips.
- Never delete files outside `Paths.document/pending-captures/` inside `discardPendingCapture`.
- Provide both English (`en`) and Thai (`th`) strings in `translations.ts`.

## Review Focus
1. **Manual `SpeedDialFab` flows must not trigger AI:** Navigating to `AnimalDetail` with `{ imageUri, capturedAt }` and omitting `autoAnalyze` must stay silent (`fetch` never called).
2. **External `AbortSignal` vs. 60s timeout in `identifyAnimalApi`:** Navigating back or cancelling via "Identify manually" mid-request must abort silently instead of raising `"Animal analysis took too long. Please try again."` or overwriting screen state after unmount.
3. **Cooldown synchronization across screens:** Receiving a `429` with `retryAfterSeconds` on `AnimalDetailScreen` must enforce the live countdown both on the Retry button there AND on `CameraScreen`'s shutter button if the user taps Retake.
4. **Account switching mid-analysis:** If `useAuthStore` user ID changes while `identifyAnimalApi` is in flight, the response/error/cooldown must be discarded and pending capture discarded.
5. **User edits preserved during background AI:** If the user modifies species/story manually or taps "Identify manually" while AI is still pending, an in-flight response arriving late (or cancelled) must not clobber user input, and `discardPendingCapture` must leave saved `captures/` files and gallery photos untouched.

---

### Task 1: Temporary Pending Capture Staging & Safe Cleanup

**Files:**
- Modify: `apps/mobile/src/features/collections/stores/captureFiles.ts`
- Test: `apps/mobile/src/features/collections/stores/__tests__/captureFiles.test.ts`

**Interfaces:**
- Consumes: `expo-file-system` (`Directory`, `File`, `Paths`)
- Produces:
  - `retainCapture(uri: string, requestId: string): string` (existing, preserved)
  - `stagePendingCapture(uri: string, captureId: string): string`
  - `discardPendingCapture(uri?: string): void`

- [ ] **Step 1: Write failing unit tests for `stagePendingCapture` and `discardPendingCapture`**

Create `apps/mobile/src/features/collections/stores/__tests__/captureFiles.test.ts`:
```ts
import { Directory, File, Paths } from 'expo-file-system';
import { discardPendingCapture, retainCapture, stagePendingCapture } from '../captureFiles';

describe('captureFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stages a file:// photo inside pending-captures after verifying existence', () => {
    const uri = stagePendingCapture('file:///tmp/photo-1.jpg', 'pending-123');
    expect(Directory).toHaveBeenCalledWith(Paths.document, 'pending-captures');
    expect(File).toHaveBeenCalledWith(expect.objectContaining({ uri: 'file:///documents/pending-captures' }), 'pending-123.jpg');
    expect(uri).toBe('file:///documents/pending-captures/pending-123.jpg');
  });

  it('throws when the source capture file does not exist or is empty', () => {
    jest.mocked(File).mockImplementationOnce(() => ({
      uri: 'file:///tmp/missing.jpg',
      exists: false,
      size: 0,
    }) as any);
    expect(() => stagePendingCapture('file:///tmp/missing.jpg', 'pending-123')).toThrow(
      'Could not read the captured photo. Please take another photo.',
    );
  });

  it('passes through non-file URIs without staging', () => {
    expect(stagePendingCapture('https://example.com/cat.jpg', 'pending-123')).toBe('https://example.com/cat.jpg');
  });

  it('deletes pending capture files inside pending-captures/ and ignores other paths', () => {
    const deleteMock = jest.fn();
    jest.mocked(File).mockImplementation((...parts: any[]) => ({
      uri: parts.map(part => part.uri || part).join('/'),
      exists: true,
      size: 4,
      copy: jest.fn(),
      delete: deleteMock,
    }) as any);

    discardPendingCapture('file:///documents/pending-captures/pending-123.jpg');
    expect(deleteMock).toHaveBeenCalledTimes(1);

    discardPendingCapture('file:///documents/captures/saved-1.jpg');
    discardPendingCapture('file:///gallery/user-photo.jpg');
    discardPendingCapture(undefined);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it('keeps retainCapture saving permanent copies inside captures/', () => {
    const uri = retainCapture('file:///documents/pending-captures/pending-123.jpg', 'req-1');
    expect(uri).toBe('file:///documents/captures/req-1.jpg');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/mobile`): `npx.cmd jest src/features/collections/stores/__tests__/captureFiles.test.ts`
Expected: FAIL (`stagePendingCapture` / `discardPendingCapture` not exported).

- [ ] **Step 3: Implement shared staging helper, `stagePendingCapture`, and `discardPendingCapture` in `apps/mobile/src/features/collections/stores/captureFiles.ts`**

- Extract a private `copyCaptureToSubdir(uri: string, subdir: string, fileId: string): string` shared by both `retainCapture(uri, requestId)` (`'captures'`) and `stagePendingCapture(uri, captureId)` (`'pending-captures'`) so file validation and directory creation logic are not duplicated.
- Implement `discardPendingCapture(uri?: string): void`: verify `uri` starts with `` `${pendingDir.uri}/` ``, check `file.exists`, and wrap `file.delete()` in `try { ... } catch {}` so missing/already-cleaned files never throw.

- [ ] **Step 4: Run test to verify it passes**

Run (from `apps/mobile`): `npx.cmd jest src/features/collections/stores/__tests__/captureFiles.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/collections/stores/captureFiles.ts apps/mobile/src/features/collections/stores/__tests__/captureFiles.test.ts
git commit -m "feat(mobile): add temporary pending capture staging and safe cleanup"
```

---

### Task 2: Shared Analysis Cooldown Store & Cancellable Identification API

**Files:**
- Create: `apps/mobile/src/features/discovery/stores/useAnalysisCooldownStore.ts`
- Modify: `apps/mobile/src/features/discovery/api/identifyAnimalApi.ts`
- Create: `apps/mobile/src/features/discovery/stores/__tests__/useAnalysisCooldownStore.test.ts`
- Modify: `apps/mobile/src/features/discovery/api/__tests__/identifyAnimalApi.test.ts`

**Interfaces:**
- Produces:
  - `useAnalysisCooldownStore` with `{ ownerId?: string; retryUntil: number; setCooldown(retryAfterSeconds: number, ownerId?: string): void; syncOwner(ownerId?: string): void; clearCooldown(): void }`
  - `identifyAnimalApi(imageUri: string, token?: string, options?: { signal?: AbortSignal }): Promise<AnimalIdentification>`
  - `AnalysisCancelledError` (exported from `identifyAnimalApi.ts` when external `options?.signal` aborts, distinct from timeout `AnimalAnalysisError`)

- [ ] **Step 1: Write failing tests for cooldown store and external `AbortSignal` cancellation**

Create `apps/mobile/src/features/discovery/stores/__tests__/useAnalysisCooldownStore.test.ts`:
```ts
import { useAnalysisCooldownStore } from '../useAnalysisCooldownStore';

describe('useAnalysisCooldownStore', () => {
  beforeEach(() => {
    useAnalysisCooldownStore.setState({ ownerId: undefined, retryUntil: 0 });
  });

  it('stores cooldown end timestamp scoped to ownerId and clears it when owner changes', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(10_000);
    try {
      useAnalysisCooldownStore.getState().setCooldown(30, 'user-a');
      expect(useAnalysisCooldownStore.getState().retryUntil).toBe(40_000);
      expect(useAnalysisCooldownStore.getState().ownerId).toBe('user-a');

      useAnalysisCooldownStore.getState().syncOwner('user-a');
      expect(useAnalysisCooldownStore.getState().retryUntil).toBe(40_000);

      useAnalysisCooldownStore.getState().syncOwner('user-b');
      expect(useAnalysisCooldownStore.getState().retryUntil).toBe(0);
      expect(useAnalysisCooldownStore.getState().ownerId).toBe('user-b');
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('ignores non-positive retry durations and clears cooldown on demand', () => {
    useAnalysisCooldownStore.getState().setCooldown(0, 'user-a');
    expect(useAnalysisCooldownStore.getState().retryUntil).toBe(0);
    useAnalysisCooldownStore.getState().setCooldown(5, 'user-a');
    useAnalysisCooldownStore.getState().clearCooldown();
    expect(useAnalysisCooldownStore.getState().retryUntil).toBe(0);
  });
});
```

Append test to `apps/mobile/src/features/discovery/api/__tests__/identifyAnimalApi.test.ts`:
```ts
it('throws AnalysisCancelledError without timeout message when external signal aborts', async () => {
  const external = new AbortController();
  globalThis.fetch = jest.fn().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
    (init as RequestInit)?.signal?.addEventListener('abort', () => {
      reject(new DOMException('Aborted', 'AbortError'));
    });
  }));
  const promise = identifyAnimalApi('file:///capture.jpg', undefined, { signal: external.signal });
  external.abort();
  await expect(promise).rejects.toMatchObject({ name: 'AnalysisCancelledError' });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `apps/mobile`): `npx.cmd jest src/features/discovery/stores/__tests__/useAnalysisCooldownStore.test.ts src/features/discovery/api/__tests__/identifyAnimalApi.test.ts`
Expected: FAIL (module missing / `identifyAnimalApi` ignores 3rd arg).

- [ ] **Step 3: Implement `useAnalysisCooldownStore.ts` and external signal cancellation in `identifyAnimalApi.ts`**

- In `useAnalysisCooldownStore.ts`: Zustand store implementing `setCooldown`, `syncOwner`, and `clearCooldown`.
- In `identifyAnimalApi.ts`:
  - Export `AnalysisCancelledError extends Error` (`this.name = 'AnalysisCancelledError'`).
  - Track `let timedOut = false;` on the 60s `setTimeout(() => { timedOut = true; controller.abort(); }, 60_000)`.
  - Wire `options?.signal`: if already aborted, call `controller.abort()`; otherwise attach an `abort` listener that calls `controller.abort()` and remove the listener inside `finally`.
  - In `catch`: check `if (options?.signal?.aborted && !timedOut) throw new AnalysisCancelledError();` before the existing `if (controller.signal.aborted)` timeout error!

- [ ] **Step 4: Run tests to verify they pass**

Run (from `apps/mobile`): `npx.cmd jest src/features/discovery/stores/__tests__/useAnalysisCooldownStore.test.ts src/features/discovery/api/__tests__/identifyAnimalApi.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/discovery/stores/useAnalysisCooldownStore.ts apps/mobile/src/features/discovery/stores/__tests__/useAnalysisCooldownStore.test.ts apps/mobile/src/features/discovery/api/identifyAnimalApi.ts apps/mobile/src/features/discovery/api/__tests__/identifyAnimalApi.test.ts
git commit -m "feat(discovery): add shared cooldown store and cancellable identify API"
```

---

### Task 3: Background `useAnimalIdentification` Hook

**Files:**
- Create: `apps/mobile/src/features/discovery/hooks/useAnimalIdentification.ts`
- Create: `apps/mobile/src/features/discovery/hooks/__tests__/useAnimalIdentification.test.ts`

**Interfaces:**
- Consumes: `identifyAnimalApi`, `AnimalAnalysisError`, `AnalysisCancelledError`, `useAuthStore`, `useAnalysisCooldownStore`
- Produces:
  ```ts
  export type IdentificationStatus = 'idle' | 'analyzing' | 'identified' | 'not_found' | 'error';
  export interface UseAnimalIdentificationResult {
    status: IdentificationStatus;
    result: AnimalIdentification | null;
    errorMessage: string;
    errorHint: string;
    requiresSignIn: boolean;
    retry: () => void;
    cancel: () => void;
  }
  export function useAnimalIdentification(params: {
    imageUri?: string;
    enabled: boolean;
    captureOwner?: string;
  }): UseAnimalIdentificationResult
  ```

- [ ] **Step 1: Write failing tests for `useAnimalIdentification`**

Create `apps/mobile/src/features/discovery/hooks/__tests__/useAnimalIdentification.test.ts` covering:
1. Immediate `analyzing` state on mount when `enabled: true`, resolving to `identified` with species/story/animalType/habitatTags.
2. When `enabled: false` (e.g. `SpeedDialFab` manual photo or existing `animalId`), stays `idle` and does not call `identifyAnimalApi`.
3. When `found: false`, transitions to `not_found` (`'No animal found - Try another photo'`).
4. On `429` with `retryAfterSeconds`, updates `useAnalysisCooldownStore` and sets `error` with allowance hint; calling `retry()` re-runs identification on the same `imageUri`.
5. On `401`/`403`, sets `requiresSignIn: true` and `'Sign in to connect your account to the analysis service.'` hint.
6. On account switch (`useAuthStore.setState({ user: { id: 'other-user', ... } })`) while pending or on `unmount()`, aborts request and discards response cleanly without updating `useAnalysisCooldownStore`.

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/mobile`): `npx.cmd jest src/features/discovery/hooks/__tests__/useAnimalIdentification.test.ts`
Expected: FAIL (`Cannot find module '../useAnimalIdentification'`).

- [ ] **Step 3: Implement `useAnimalIdentification.ts`**

- Manage `attempt` counter (`setAttempt(n => n + 1)` in `retry()`) + `cancelled` flag (`cancel()` aborts the active `AbortController` and resets state to `'idle'`).
- Inside `useEffect`:
  - Skip and reset to `'idle'` if `!enabled || !imageUri`.
  - Create `AbortController`, invoke `identifyAnimalApi(imageUri, token, { signal: controller.signal })`.
  - Guard against unmount (`active`) and account switch (`useAuthStore.getState().user?.id !== captureOwner`).
  - Handle `AnalysisCancelledError` silently.
  - Format quota reset hints consistently with Bangkok timezone formatting and update `useAnalysisCooldownStore.getState().setCooldown(quota.retryAfterSeconds, captureOwner)` on rate limits.

- [ ] **Step 4: Run test to verify it passes**

Run (from `apps/mobile`): `npx.cmd jest src/features/discovery/hooks/__tests__/useAnimalIdentification.test.ts`
Expected: PASS (all 6 cases).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/discovery/hooks/useAnimalIdentification.ts apps/mobile/src/features/discovery/hooks/__tests__/useAnimalIdentification.test.ts
git commit -m "feat(discovery): add useAnimalIdentification background analysis hook"
```

---

### Task 4: Instant Capture Navigation in `CameraScreen` & Route Types

**Files:**
- Modify: `apps/mobile/src/app/navigation/types.ts`
- Modify: `apps/mobile/src/app/screens/CameraScreen.tsx`
- Modify: `apps/mobile/src/app/screens/__tests__/CameraScreen.test.tsx`

**Interfaces:**
- Consumes: `stagePendingCapture` (Task 1), `useAnalysisCooldownStore` (Task 2), `expo-crypto` (`randomUUID`)
- Produces: `RootStackParamList['AnimalDetail']` extended with `autoAnalyze?: boolean; captureOwner?: string;`

- [ ] **Step 1: Update `CameraScreen.test.tsx` for instant capture & shared cooldown (failing against current `CameraScreen.tsx`)**

Update `apps/mobile/src/app/screens/__tests__/CameraScreen.test.tsx`:
- Update `'navigates to AnimalDetail with the captured photo path on shutter press'` so `globalThis.fetch` is NOT mocked/called; assert shutter press resolves immediately after `takePhoto()` and navigates synchronously to:
  ```ts
  expect(navigation.navigate).toHaveBeenCalledWith('AnimalDetail', {
    imageUri: expect.stringMatching(/^file:\/\/\/documents\/pending-captures\/.+\.jpg$/),
    capturedAt: expect.any(String),
    autoAnalyze: true,
    captureOwner: useAuthStore.getState().user?.id,
  });
  expect(globalThis.fetch).not.toHaveBeenCalled();
  ```
- Update the cooldown test so setting `useAnalysisCooldownStore.getState().setCooldown(2, useAuthStore.getState().user?.id)` disables the shutter button with `"Try again in 0:02"`, and advancing fake timers by 2 seconds re-enables `"Capture photo"`.
- Remove obsolete tests inside `CameraScreen.test.tsx` that tested AI HTTP errors / 401 / `found: false` / account-switch inside `CameraScreen` itself (now covered in Task 3 and Task 5 on `useAnimalIdentification` and `AnimalDetailScreen`). Keep all camera permission, `AppState` lifecycle, `camera-not-ready` hardware capture error, and privacy consent tests intact.

- [ ] **Step 2: Run `CameraScreen.test.tsx` to verify the updated expectations fail**

Run (from `apps/mobile`): `npx.cmd jest src/app/screens/__tests__/CameraScreen.test.tsx`
Expected: FAIL (`CameraScreen` still calls `fetch` and passes `identifiedSpecies` instead of `autoAnalyze: true`).

- [ ] **Step 3: Update `types.ts` and `CameraScreen.tsx`**

- In `apps/mobile/src/app/navigation/types.ts`, add `autoAnalyze?: boolean;` and `captureOwner?: string;` to `RootStackParamList['AnimalDetail']`.
- In `apps/mobile/src/app/screens/CameraScreen.tsx`:
  - Sync `useAnalysisCooldownStore(state => state.retryUntil)` and call `syncOwner(userId)` when `userId` changes.
  - Inside `handleCapture`: keep privacy consent flow untouched; call `cameraRef.current.takePhoto(...)`, stage via `stagePendingCapture(formattedUri, randomUUID())`, call `navigation.navigate('AnimalDetail', { imageUri: stagedUri, capturedAt, autoAnalyze: true, captureOwner })` immediately, and reset `capturing` in `finally`.
  - Remove `identifyAnimalApi` import, AI analyzing pill, `identified` chip, and AI error modal state/UI (keep hardware capture error alert/modal for `takePhoto` / `stagePendingCapture` errors).

- [ ] **Step 4: Run `CameraScreen.test.tsx` to verify it passes**

Run (from `apps/mobile`): `npx.cmd jest src/app/screens/__tests__/CameraScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/app/navigation/types.ts apps/mobile/src/app/screens/CameraScreen.tsx apps/mobile/src/app/screens/__tests__/CameraScreen.test.tsx
git commit -m "feat(camera): navigate immediately to AnimalDetail after photo capture"
```

---

### Task 5: Background Identification UX & Temp-File Lifecycle on `AnimalDetailScreen`

**Files:**
- Modify: `apps/mobile/src/core/i18n/translations.ts`
- Modify: `apps/mobile/src/app/screens/AnimalDetailScreen.tsx`
- Modify: `apps/mobile/src/app/screens/__tests__/AnimalDetailScreen.test.tsx`

**Interfaces:**
- Consumes: `useAnimalIdentification` (Task 3), `useAnalysisCooldownStore` (Task 2), `discardPendingCapture` (Task 1)
- Produces: Non-blocking identification status banner, `Identify manually`, `Retry analysis` (with cooldown timer), `Retake photo`, `Sign in again`, and full bilingual `en`/`th` copy.

- [ ] **Step 1: Write failing tests in `AnimalDetailScreen.test.tsx`**

Append test cases to `apps/mobile/src/app/screens/__tests__/AnimalDetailScreen.test.tsx` covering:
1. **Immediate display + background fill:** Rendering with `{ imageUri: 'file:///documents/pending-captures/c1.jpg', autoAnalyze: true, capturedAt: '...', captureOwner: 'u1' }` immediately shows the photo and `"Identifying animal…"` (`"You can put your phone down"`), keeps `"Add to Collection"` disabled while analyzing, and populates `species`, `Animal story`, `animalType`, and enables `"Add to Collection"` once fetch resolves. Discards pending capture after saving.
2. **Manual pick (`autoAnalyze` absent) does not call AI:** Rendering `{ imageUri: 'file:///gallery-pick.jpg', capturedAt: '...' }` never calls `globalThis.fetch` and keeps manual catalog chips / `"Add to Collection"` behavior intact.
3. **Cancel AI to identify manually & user edit preservation:** Tapping `"Identify manually"` during `'analyzing'` cancels background AI, expands `IdentificationFields`, and late/in-flight resolutions never overwrite user-entered species/story.
4. **Not found & error recovery:** When AI returns `found: false`, shows `"No animal found - Try another photo"` with working `"Retake photo"` (calls `discardPendingCapture` + `navigation.goBack()`) and `"Identify manually"` buttons. When AI fails with `429` cooldown, disables `"Retry analysis"` with live countdown (`Try again in 0:02`) until expired, then lets `"Retry analysis"` re-run fetch cleanly. When AI fails with `401`, tapping `"Sign in again"` discards pending capture and navigates to `'Login'`.
5. **Cleanup on unmount without saving:** Backing out without saving calls `discardPendingCapture` on the pending capture path.

- [ ] **Step 2: Run `AnimalDetailScreen.test.tsx` to verify new tests fail**

Run (from `apps/mobile`): `npx.cmd jest src/app/screens/__tests__/AnimalDetailScreen.test.tsx`
Expected: FAIL (`"Identifying animal…"` not rendered).

- [ ] **Step 3: Add `en`/`th` localization keys and update `AnimalDetailScreen.tsx`**

- Add `detail` translation keys in `apps/mobile/src/core/i18n/translations.ts` (`en` and `th`):
  - `analyzingTitle`: `'Identifying animal…'` / `'กำลังวิเคราะห์ภาพสัตว์…'`
  - `analyzingSubtitle`: `'You can put your phone down — AI is analyzing your photo.'` / `'วางมือถือลงได้เลย ระบบกำลังวิเคราะห์ภาพของคุณ'`
  - `identifyManually`: `'Identify manually'` / `'ระบุชื่อสัตว์เอง'`
  - `retakePhoto`: `'Retake photo'` / `'ถ่ายใหม่'`
  - `retryAnalysis`: `'Retry analysis'` / `'ลองวิเคราะห์ใหม่'`
  - `signInAgain`: `'Sign in again'` / `'เข้าสู่ระบบอีกครั้ง'`
  - `notFoundTitle`: `'No animal found - Try another photo'` / `'ไม่พบสัตว์ในภาพ - ลองถ่ายภาพใหม่อีกครั้ง'`
  - `notFoundHint`: `'Move closer and keep the animal in focus.'` / `'ขยับเข้าใกล้ขึ้นและโฟกัสที่ตัวสัตว์ให้ชัดเจน'`
- Update `AnimalDetailScreen.tsx`:
  - Wire `manualMode` state + `useAnimalIdentification({ imageUri: route.params.imageUri, enabled: Boolean(route.params.autoAnalyze && !existing && !savedId && !manualMode), captureOwner: route.params.captureOwner })`.
  - Track `userEditedSpeciesRef`, `userEditedIdentificationRef`, `userEditedStoryRef`, and `savedIdRef` so user edits are never clobbered and unmount cleanup discards unsaved `pending-captures/` files cleanly.
  - Subscribe to `useAnalysisCooldownStore` + 1-second timer when `retryUntil > Date.now()` to display live countdown on `"Retry analysis"`.
  - Render status card immediately below `heroPhotoWrapper` for `'analyzing'`, `'not_found'`, and `'error'`.
  - Call `discardPendingCapture(route.params.imageUri)` after `store.addCollection(...)` succeeds, on `"Retake photo"`, on `"Sign in again"`, and on unsaved unmount.

- [ ] **Step 4: Run full mobile Jest test suite & TypeScript check**

Run (from `apps/mobile`):
- `npm.cmd test -- --maxWorkers=2` -> Expected: ALL suites pass (0 failed).
- `npx.cmd tsc --noEmit` -> Expected: Exit code 0 (0 TypeScript errors).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/core/i18n/translations.ts apps/mobile/src/app/screens/AnimalDetailScreen.tsx apps/mobile/src/app/screens/__tests__/AnimalDetailScreen.test.tsx
git commit -m "feat(detail): run background animal identification with immediate photo preview"
```

---

## Plan Self-Review Checklist
- **Spec coverage:** Staging + cleanup (Task 1), shared cooldown store + external `AbortSignal` cancellation (Task 2), background hook with account-switch & retry handling (Task 3), immediate shutter navigation & route params (Task 4), non-blocking `AnimalDetail` UX + bilingual copy + manual-mode/user-edit preservation (Task 5).
- **Review Focus coverage:** Every item from `Review Focus` has dedicated failing-then-passing tests across Tasks 1–5.
- **Type consistency:** `stagePendingCapture`, `discardPendingCapture`, `useAnalysisCooldownStore`, `AnalysisCancelledError`, `useAnimalIdentification`, and `RootStackParamList['AnimalDetail']` names match identically across all 5 tasks.
