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
  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    1,
    'http://backend/identify',
    expect.objectContaining({
      body,
      headers: expect.objectContaining({
        Authorization: 'Bearer old-jwt',
        'X-App-Version': '1.0.1 (3)',
        'X-Platform': 'ios',
      }),
    }),
  );
  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    2,
    'http://backend/identify',
    expect.objectContaining({
      body,
      headers: expect.objectContaining({
        Authorization: 'Bearer new-jwt',
        'X-App-Version': '1.0.1 (3)',
        'X-Platform': 'ios',
      }),
    }),
  );
  expect(globalThis.fetch).toHaveBeenCalledTimes(2);
});

it('attaches X-App-Version and X-Platform diagnostic headers alongside Authorization', async () => {
  const ok = { status: 200, ok: true };
  globalThis.fetch = jest.fn().mockResolvedValue(ok);
  await authenticatedFetch('http://backend/items');
  expect(globalThis.fetch).toHaveBeenCalledWith(
    'http://backend/items',
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer old-jwt',
        'X-App-Version': '1.0.1 (3)',
        'X-Platform': 'ios',
      }),
    }),
  );
});

it('preserves caller-supplied X-App-Version override without dropping default platform', async () => {
  const ok = { status: 200, ok: true };
  globalThis.fetch = jest.fn().mockResolvedValue(ok);
  await authenticatedFetch('http://backend/items', {
    headers: { 'X-App-Version': '9.9.9' },
  });
  expect(globalThis.fetch).toHaveBeenCalledWith(
    'http://backend/items',
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer old-jwt',
        'X-App-Version': '9.9.9',
        'X-Platform': 'ios',
      }),
    }),
  );
});

it('handles case-insensitive overrides like lowercase x-app-version without duplicate keys', async () => {
  const ok = { status: 200, ok: true };
  globalThis.fetch = jest.fn().mockResolvedValue(ok);
  await authenticatedFetch('http://backend/items', {
    headers: { 'x-app-version': '9.9.9' },
  });
  const headers = (jest.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit).headers as Record<string, string>;
  expect(headers['X-App-Version']).toBeUndefined();
  expect(headers['x-app-version']).toBe('9.9.9');
  expect(headers['X-Platform']).toBe('ios');
  expect(headers['Authorization']).toBe('Bearer old-jwt');
});

it('supports caller headers provided as Headers instance and tuple array', async () => {
  const ok = { status: 200, ok: true };
  globalThis.fetch = jest.fn().mockResolvedValue(ok);

  const headerObj = new Headers();
  headerObj.set('x-custom', 'custom-value');
  await authenticatedFetch('http://backend/headers-instance', { headers: headerObj });
  expect(globalThis.fetch).toHaveBeenCalledWith(
    'http://backend/headers-instance',
    expect.objectContaining({
      headers: expect.objectContaining({
        'x-custom': 'custom-value',
        'X-App-Version': '1.0.1 (3)',
        'X-Platform': 'ios',
      }),
    }),
  );

  await authenticatedFetch('http://backend/tuple-array', {
    headers: [['x-platform', 'custom-os']],
  });
  const tupleHeaders = (jest.mocked(globalThis.fetch).mock.calls[1][1] as RequestInit).headers as Record<string, string>;
  expect(tupleHeaders['X-Platform']).toBeUndefined();
  expect(tupleHeaders['x-platform']).toBe('custom-os');
  expect(tupleHeaders['X-App-Version']).toBe('1.0.1 (3)');
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
