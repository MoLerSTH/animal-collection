# Production App Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade mobile app versioning from raw `app.json` imports and hardcoded tests to native-first production versioning (`expo-application` with `app.json` fallback), diagnostic HTTP headers, and dynamic unit tests.

**Architecture:** Introduce a single centralized module `apps/mobile/src/core/config/appVersion.ts` that resolves the native binary version and build number via `expo-application` with safe fallback to `app.json`. Consume this helper in `SettingsScreen.tsx` (footer row and problem report email) and merge `X-App-Version` / `X-Platform` metadata headers in `authenticatedFetch.ts` and `authApi.ts`.

**Tech Stack:** React Native / Expo SDK 56, `expo-application`, TypeScript, Jest + React Native Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-13-app-versioning-design.md](../specs/2026-11-13-app-versioning-design.md)

## Global Constraints
- Must support Expo SDK `~56.0.21` and maintain `npx tsc --noEmit` with zero errors.
- Must handle `expo-application` returning `null`, `undefined`, or empty strings cleanly without rendering `"null"`, `"undefined"`, or `"1.0.1 ()"`.
- Must never overwrite caller-provided `Authorization`, `Content-Type`, or explicit custom headers in HTTP helpers.
- Windows environment note: PowerShell blocks `npx.ps1`; run Expo CLI via `node .\node_modules\expo\bin\cli` when needed inside `apps/mobile`.
- Follow strict TDD: failing test -> verify failure -> minimal implementation -> verify pass -> commit.

## Review Focus
1. **Unbuilt native binary / Jest / Web null values:** `Application.nativeApplicationVersion` or `Application.nativeBuildVersion` is `null` or `undefined` -> must fall back cleanly to `app.json` (`expo.version`, Android `versionCode`, iOS `buildNumber`).
2. **Whitespace or empty build number:** If `buildNumber` evaluates to `""` or `"   "` (or matches unavailable fallback), `formatAppVersion()` must return `"1.0.1"` without trailing `" ()"`.
3. **Platform-specific build number fallback:** On `Platform.OS === 'ios'`, fallback build number must read `expo.ios.buildNumber`; on Android (or other), it must read `String(expo.android.versionCode)`.
4. **Header merge precedence on `Headers` / tuple arrays / plain objects:** Calling `authenticatedFetch(url, { headers: new Headers({ Authorization: ... }) })` or passing an explicit `X-App-Version` override must preserve caller headers while injecting default `X-App-Version` and `X-Platform`.
5. **Release version bumps must not break tests:** Changing `app.json` `"version"` or `expo-application` return values must not require editing hardcoded strings in `SettingsScreen.test.tsx`.

---

### Task 1: Install `expo-application` & Create `appVersion` Utility

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/jest.setup.ts:65-85`
- Create: `apps/mobile/src/core/config/appVersion.ts`
- Test: `apps/mobile/src/core/config/__tests__/appVersion.test.ts`

**Interfaces:**
- Consumes: `expo-application` (`nativeApplicationVersion`, `nativeBuildVersion`), `react-native` (`Platform`), `apps/mobile/app.json`
- Produces:
  - `export interface AppVersionInfo { readonly version: string; readonly buildNumber: string | null; readonly source: 'native' | 'config'; }`
  - `export function getAppVersionInfo(): AppVersionInfo`
  - `export function formatAppVersion(info?: AppVersionInfo): string`
  - `export function getClientMetadataHeaders(): Record<string, string>`

- [ ] **Step 1: Install `expo-application` (Expo SDK 56 compatible) and verify `package.json` updated**

Run inside `apps/mobile`:
```powershell
node .\node_modules\expo\bin\cli install expo-application
```
Expected: `expo-application` added to `apps/mobile/package.json` `dependencies`.

- [ ] **Step 2: Add default `expo-application` mock in `apps/mobile/jest.setup.ts`**

Append a Jest mock returning `{ nativeApplicationVersion: '1.0.1', nativeBuildVersion: '3', applicationId: 'com.thegentlemenofjuthathep.animalcollection' }` so tests run deterministically without native bindings while allowing per-test `jest.spyOn` / module mock overrides.

- [ ] **Step 3: Write the failing unit tests in `apps/mobile/src/core/config/__tests__/appVersion.test.ts`**

```ts
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import appConfig from '../../../../app.json';
import { formatAppVersion, getAppVersionInfo, getClientMetadataHeaders } from '../appVersion';

describe('appVersion', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    jest.restoreAllMocks();
  });

  it('uses native version and build number when expo-application provides both', () => {
    jest.replaceProperty(Application, 'nativeApplicationVersion', '1.2.0');
    jest.replaceProperty(Application, 'nativeBuildVersion', '14');
    expect(getAppVersionInfo()).toEqual({ version: '1.2.0', buildNumber: '14', source: 'native' });
    expect(formatAppVersion()).toBe('1.2.0 (14)');
  });

  it('falls back to app.json version and android versionCode when native values are null', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    jest.replaceProperty(Application, 'nativeApplicationVersion', null);
    jest.replaceProperty(Application, 'nativeBuildVersion', null);
    expect(getAppVersionInfo()).toEqual({
      version: appConfig.expo.version,
      buildNumber: String(appConfig.expo.android.versionCode),
      source: 'config',
    });
  });

  it('uses ios.buildNumber fallback when Platform.OS is ios', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    jest.replaceProperty(Application, 'nativeApplicationVersion', null);
    jest.replaceProperty(Application, 'nativeBuildVersion', null);
    expect(getAppVersionInfo()).toEqual({
      version: appConfig.expo.version,
      buildNumber: appConfig.expo.ios.buildNumber,
      source: 'config',
    });
  });

  it('omits parentheses when buildNumber is empty or whitespace', () => {
    expect(formatAppVersion({ version: '2.0.0', buildNumber: '   ', source: 'native' })).toBe('2.0.0');
    expect(formatAppVersion({ version: '2.0.0', buildNumber: null, source: 'config' })).toBe('2.0.0');
  });

  it('builds X-App-Version and X-Platform headers from formatted version and Platform.OS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    jest.replaceProperty(Application, 'nativeApplicationVersion', '1.0.1');
    jest.replaceProperty(Application, 'nativeBuildVersion', '9');
    expect(getClientMetadataHeaders()).toEqual({
      'X-App-Version': '1.0.1 (9)',
      'X-Platform': 'android',
    });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run inside `apps/mobile`:
```powershell
npm test -- src/core/config/__tests__/appVersion.test.ts
```
Expected: FAIL because `../appVersion` does not exist yet.

- [ ] **Step 5: Implement `apps/mobile/src/core/config/appVersion.ts`**

Implement `getAppVersionInfo()`, `formatAppVersion(info?)`, and `getClientMetadataHeaders()` using `Application.nativeApplicationVersion`, `Application.nativeBuildVersion`, `Platform.OS`, and `appConfig.expo` fallback. Trim strings so empty/whitespace native strings fall back cleanly.

- [ ] **Step 6: Run test and verify it passes**

Run inside `apps/mobile`:
```powershell
npm test -- src/core/config/__tests__/appVersion.test.ts
```
Expected: PASS (5/5 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/package.json apps/mobile/package-lock.json apps/mobile/jest.setup.ts apps/mobile/src/core/config/appVersion.ts apps/mobile/src/core/config/__tests__/appVersion.test.ts
git commit -m "feat(mobile): add native-first appVersion utility with expo-application fallback"
```

---

### Task 2: Use `appVersion` in `SettingsScreen` and Remove Hardcoded Version Assertion

**Files:**
- Modify: `apps/mobile/src/app/screens/SettingsScreen.tsx:14,64-69,137`
- Test: `apps/mobile/src/app/screens/__tests__/SettingsScreen.test.tsx:73-105`

**Interfaces:**
- Consumes: `formatAppVersion` from `apps/mobile/src/core/config/appVersion`

- [ ] **Step 1: Write/update failing tests in `apps/mobile/src/app/screens/__tests__/SettingsScreen.test.tsx`**

Update the Settings version expectation to compute expected text dynamically from `formatAppVersion()`, add a test overriding `Application.nativeApplicationVersion` / `Application.nativeBuildVersion` (e.g., `'2.1.0'` and `'42'`) verifying both the rendered row (`Version 2.1.0 (42)`) and the `mailto:` URL in `reportProblem` include `App version: 2.1.0 (42)`.

- [ ] **Step 2: Run test to verify it fails**

Run inside `apps/mobile`:
```powershell
npm test -- src/app/screens/__tests__/SettingsScreen.test.tsx
```
Expected: FAIL because `SettingsScreen.tsx` still displays raw `appConfig.expo.version` without build number or native override support.

- [ ] **Step 3: Update `apps/mobile/src/app/screens/SettingsScreen.tsx`**

Remove `import appConfig from '../../../app.json';` and replace both `appConfig.expo.version` usages (`reportProblem` and `versionRow`) with `formatAppVersion()`.

- [ ] **Step 4: Run test to verify it passes**

Run inside `apps/mobile`:
```powershell
npm test -- src/app/screens/__tests__/SettingsScreen.test.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/app/screens/SettingsScreen.tsx apps/mobile/src/app/screens/__tests__/SettingsScreen.test.tsx
git commit -m "fix(settings): display native app version and build number dynamically"
```

---

### Task 3: Attach Diagnostic Client Headers in `authenticatedFetch` and `authApi`

**Files:**
- Modify: `apps/mobile/src/core/api/authenticatedFetch.ts:1-23`
- Modify: `apps/mobile/src/features/auth/api/authApi.ts:1-77`
- Test: `apps/mobile/src/core/api/__tests__/authenticatedFetch.test.ts`
- Create: `apps/mobile/src/features/auth/api/__tests__/authApi.test.ts`

**Interfaces:**
- Consumes: `getClientMetadataHeaders()` from `apps/mobile/src/core/config/appVersion`

- [ ] **Step 1: Write failing tests in `authenticatedFetch.test.ts` and `authApi.test.ts`**

- In `authenticatedFetch.test.ts`: verify `fetch` receives `X-App-Version` and `X-Platform` alongside `Authorization`, verify explicit caller `X-App-Version` is not overwritten, and keep strict assertions on token refresh retries.
- In `authApi.test.ts`: verify `fetchBackendUser`, `updateBackendUsername`, `requestBackendSession`, and `deleteBackendAccount` attach `X-App-Version` and `X-Platform` without dropping `Authorization` or `Content-Type`.

- [ ] **Step 2: Run tests to verify they fail**

Run inside `apps/mobile`:
```powershell
npm test -- src/core/api/__tests__/authenticatedFetch.test.ts src/features/auth/api/__tests__/authApi.test.ts
```
Expected: FAIL because `X-App-Version` and `X-Platform` are missing.

- [ ] **Step 3: Update `authenticatedFetch.ts` and `authApi.ts`**

Extract a small header-merging step using `getClientMetadataHeaders()` applied *before* copying `init.headers` and `Authorization` so caller headers always take precedence while all outgoing backend requests include `X-App-Version` and `X-Platform`.

- [ ] **Step 4: Run tests to verify they pass**

Run inside `apps/mobile`:
```powershell
npm test -- src/core/api/__tests__/authenticatedFetch.test.ts src/features/auth/api/__tests__/authApi.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/core/api/authenticatedFetch.ts apps/mobile/src/core/api/__tests__/authenticatedFetch.test.ts apps/mobile/src/features/auth/api/authApi.ts apps/mobile/src/features/auth/api/__tests__/authApi.test.ts
git commit -m "feat(api): send X-App-Version and X-Platform diagnostic headers on requests"
```

---

### Task 4: Sync `package.json` Version & Full Verification

**Files:**
- Modify: `apps/mobile/package.json:4`

- [ ] **Step 1: Align `apps/mobile/package.json` `"version"` (`"1.0.0"` -> `"1.0.1"`) with `apps/mobile/app.json`**

- [ ] **Step 2: Run full Jest suite and TypeScript type-check**

Run inside `apps/mobile`:
```powershell
npm test
npx tsc --noEmit
```
Expected: All test suites and tests PASS, `tsc --noEmit` exits 0 with zero errors.

- [ ] **Step 3: Note native rebuild requirement for Android/iOS binaries**

Before shipping `1.0.2` (or testing native `Application.nativeBuildVersion` on physical/emulator binaries instead of fallback), run `npx expo run:android` or an EAS Build so `expo-application` native code is compiled into the binary.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json
git commit -m "chore(mobile): align package.json version with app.json"
```
