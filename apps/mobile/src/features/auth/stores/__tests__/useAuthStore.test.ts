import { useAuthStore } from '../useAuthStore';
import { appStorage, StorageKeys } from '../../../../core/storage/mmkv';
import { executeGoogleSignIn, executeMockGoogleSignIn, executeGoogleSignOut, getSilentGoogleIdToken } from '../../services/googleAuth';

jest.mock('../../services/googleAuth', () => ({
  executeGoogleSignIn: jest.fn(), executeMockGoogleSignIn: jest.fn(), executeGoogleSignOut: jest.fn(),
  getSilentGoogleIdToken: jest.fn(), isGoogleClientConfigured: () => true,
}));
const user = { id: 'account-a', name: 'Animal Fan', email: 'a@example.com', googleId: 'google-a' };
const tokens = { accessToken: 'old.backend.jwt', idToken: 'old-google-id' };
const sessionResponse = { user, accessToken: 'fresh.backend.jwt', tokenType: 'Bearer' };
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data });
const originalFetch = globalThis.fetch;
function cacheSession() {
  appStorage.set(StorageKeys.AUTH_USER, JSON.stringify(user));
  appStorage.set(StorageKeys.AUTH_TOKENS, JSON.stringify(tokens));
  useAuthStore.setState({ user, tokens, isAuthenticated: true });
}
beforeEach(() => {
  jest.resetAllMocks();
  appStorage.clearAll();
  useAuthStore.setState({ user: null, tokens: null, isAuthenticated: false, isLoading: false, isInitializing: true });
  globalThis.fetch = jest.fn().mockResolvedValue(response(user));
  jest.mocked(executeGoogleSignOut).mockResolvedValue(undefined);
});
afterEach(() => { globalThis.fetch = originalFetch; });

it('restores a backend-validated session without opening Google sign-in', async () => {
  cacheSession();
  useAuthStore.setState({ user: null, tokens: null, isAuthenticated: false });
  await useAuthStore.getState().initializeAuth();
  expect(useAuthStore.getState()).toMatchObject({ user, tokens, isAuthenticated: true, isInitializing: false });
  expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.objectContaining({ headers: { Authorization: 'Bearer old.backend.jwt' } }));
  expect(executeGoogleSignIn).not.toHaveBeenCalled();
});

it('renews an expired backend JWT using a fresh silent Google credential', async () => {
  cacheSession();
  globalThis.fetch = jest.fn()
    .mockResolvedValueOnce(response({}, 401))
    .mockResolvedValueOnce(response({}, 401))
    .mockResolvedValueOnce(response(sessionResponse));
  jest.mocked(getSilentGoogleIdToken).mockResolvedValue('fresh-google-id');
  await useAuthStore.getState().initializeAuth();
  expect(useAuthStore.getState().tokens?.accessToken).toBe('fresh.backend.jwt');
  expect(getSilentGoogleIdToken).toHaveBeenCalledWith(user);
  expect(executeGoogleSignIn).not.toHaveBeenCalled();
  expect(JSON.parse(appStorage.getString(StorageKeys.AUTH_TOKENS)!)).toEqual({ accessToken: 'fresh.backend.jwt', idToken: 'fresh-google-id' });
});

it('keeps the cached account and album on a network outage', async () => {
  cacheSession();
  appStorage.set(StorageKeys.COLLECTIONS_DATA, '[{"id":"fish","userId":"account-a"}]');
  globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
  await useAuthStore.getState().initializeAuth();
  expect(useAuthStore.getState()).toMatchObject({ user, tokens, isAuthenticated: true, isInitializing: false });
  expect(appStorage.getString(StorageKeys.COLLECTIONS_DATA)).toContain('fish');
});

it('keeps an expired session cached if its renewal is temporarily unreachable', async () => {
  cacheSession();
  globalThis.fetch = jest.fn().mockResolvedValueOnce(response({}, 401)).mockRejectedValueOnce(new TypeError('Network request failed'));
  await useAuthStore.getState().initializeAuth();
  expect(useAuthStore.getState()).toMatchObject({ user, tokens, isAuthenticated: true, isInitializing: false });
});

it('requests login only when credentials cannot be restored, without deleting album caches', async () => {
  cacheSession();
  appStorage.set('collection_snapshot:account-a', '{"collections":[{"id":"fish"}]}');
  globalThis.fetch = jest.fn().mockResolvedValue(response({}, 401));
  jest.mocked(getSilentGoogleIdToken).mockResolvedValue(null);
  await useAuthStore.getState().initializeAuth();
  expect(useAuthStore.getState()).toMatchObject({ user: null, tokens: null, isAuthenticated: false, isInitializing: false });
  expect(appStorage.getString('collection_snapshot:account-a')).toContain('fish');
});

it('shares a single renewal between concurrent unauthorized requests', async () => {
  cacheSession();
  globalThis.fetch = jest.fn().mockResolvedValue(response(sessionResponse));
  const first = useAuthStore.getState().refreshSession();
  const second = useAuthStore.getState().refreshSession();
  expect(first).toBe(second);
  await expect(first).resolves.toBe('fresh.backend.jwt');
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});

it('does not restore an account after the user signs out during renewal', async () => {
  cacheSession();
  let finish!: (value: unknown) => void;
  globalThis.fetch = jest.fn().mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const pending = useAuthStore.getState().refreshSession();
  await useAuthStore.getState().signOut();
  finish(response(sessionResponse));
  await expect(pending).resolves.toBeNull();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(appStorage.getString(StorageKeys.AUTH_TOKENS)).toBeUndefined();
});

it('does not resurrect a stored session if sign-out happens during startup validation', async () => {
  cacheSession();
  let finish!: (value: unknown) => void;
  globalThis.fetch = jest.fn().mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const pending = useAuthStore.getState().initializeAuth();
  await useAuthStore.getState().signOut();
  finish(response(user));
  await pending;
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(appStorage.getString(StorageKeys.AUTH_TOKENS)).toBeUndefined();
});

it('persists the canonical backend identity after interactive login', async () => {
  jest.mocked(executeGoogleSignIn).mockResolvedValue({ user, tokens, isMock: false });
  await expect(useAuthStore.getState().signInWithGoogle()).resolves.toBe(true);
  expect(JSON.parse(appStorage.getString(StorageKeys.AUTH_USER)!)).toEqual(user);
});

it('does not change the account when interactive Google login fails', async () => {
  cacheSession();
  jest.mocked(executeGoogleSignIn).mockRejectedValue(new Error('Backend unavailable'));
  await expect(useAuthStore.getState().signInWithGoogle()).rejects.toThrow('Backend unavailable');
  expect(useAuthStore.getState().user).toEqual(user);
  expect(executeMockGoogleSignIn).not.toHaveBeenCalled();
});
