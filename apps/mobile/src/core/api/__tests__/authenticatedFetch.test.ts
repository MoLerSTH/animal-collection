import { authenticatedFetch } from '../authenticatedFetch';
import { useAuthStore } from '../../../features/auth/stores/useAuthStore';
const originalFetch = globalThis.fetch;
const originalRefresh = useAuthStore.getState().refreshSession;
const user = { id: 'a', name: 'A', email: 'a@example.com' };
beforeEach(() => {
  useAuthStore.setState({ user, tokens: { accessToken: 'old-jwt' }, isAuthenticated: true, refreshSession: jest.fn() });
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthStore.setState({ refreshSession: originalRefresh });
});

it('renews a rejected session and retries the same upload once with fresh authorization', async () => {
  const body = new FormData();
  const ok = { status: 200, ok: true };
  globalThis.fetch = jest.fn().mockResolvedValueOnce({ status: 401 }).mockResolvedValueOnce(ok);
  jest.mocked(useAuthStore.getState().refreshSession).mockImplementation(async () => {
    useAuthStore.setState({ tokens: { accessToken: 'new-jwt' } });
    return 'new-jwt';
  });
  await expect(authenticatedFetch('http://backend/identify', { method: 'POST', body })).resolves.toBe(ok);
  expect(globalThis.fetch).toHaveBeenNthCalledWith(2, 'http://backend/identify', expect.objectContaining({ body, headers: { Authorization: 'Bearer new-jwt' } }));
  expect(globalThis.fetch).toHaveBeenCalledTimes(2);
});

it('does not retry quota/provider failures or consume another AI request', async () => {
  const limit = { status: 429 };
  globalThis.fetch = jest.fn().mockResolvedValue(limit);
  await expect(authenticatedFetch('http://backend/identify')).resolves.toBe(limit);
  expect(useAuthStore.getState().refreshSession).not.toHaveBeenCalled();
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});

it('does not retry an old account’s action after switching accounts', async () => {
  let finish!: (value: unknown) => void;
  globalThis.fetch = jest.fn().mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const pending = authenticatedFetch('http://backend/identify');
  useAuthStore.setState({ user: { ...user, id: 'b' } });
  finish({ status: 401 });
  await expect(pending).rejects.toThrow('account changed');
  expect(useAuthStore.getState().refreshSession).not.toHaveBeenCalled();
});

it('does not loop if a renewed session is rejected again', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({ status: 401 });
  jest.mocked(useAuthStore.getState().refreshSession).mockResolvedValue('new-jwt');
  await expect(authenticatedFetch('http://backend/identify')).resolves.toMatchObject({ status: 401 });
  expect(globalThis.fetch).toHaveBeenCalledTimes(2);
});
