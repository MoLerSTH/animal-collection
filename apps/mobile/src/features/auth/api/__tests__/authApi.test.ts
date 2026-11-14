import {
  deleteBackendAccount,
  fetchBackendUser,
  requestBackendSession,
  updateBackendUsername,
} from '../authApi';

const originalFetch = globalThis.fetch;

describe('authApi client diagnostic headers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('attaches X-App-Version and X-Platform to fetchBackendUser without dropping Authorization', async () => {
    const mockUserResponse = {
      id: 'usr_1',
      email: 'pilot@example.com',
      name: 'Test Pilot',
      avatarUrl: 'https://example.com/avatar.png',
      googleId: 'g_123',
    };
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockUserResponse,
    });

    const user = await fetchBackendUser('test-jwt-token');

    expect(user).toEqual({
      id: 'usr_1',
      email: 'pilot@example.com',
      name: 'Test Pilot',
      avatarUri: 'https://example.com/avatar.png',
      googleId: 'g_123',
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/me'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt-token',
          'X-App-Version': '1.0.1 (3)',
          'X-Platform': 'ios',
        }),
      }),
    );
  });

  it('attaches X-App-Version and X-Platform to updateBackendUsername without dropping Authorization or Content-Type', async () => {
    const mockUserResponse = {
      id: 'usr_1',
      email: 'pilot@example.com',
      name: 'Updated Pilot',
    };
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockUserResponse,
    });

    const updated = await updateBackendUsername('Updated Pilot', 'test-jwt-token');

    expect(updated.name).toBe('Updated Pilot');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/me'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Pilot' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt-token',
          'Content-Type': 'application/json',
          'X-App-Version': '1.0.1 (3)',
          'X-Platform': 'ios',
        }),
      }),
    );
  });

  it('attaches X-App-Version and X-Platform to requestBackendSession without dropping Content-Type', async () => {
    const mockSessionResponse = {
      accessToken: 'backend-jwt-token',
      tokenType: 'Bearer',
      user: {
        id: 'usr_1',
        email: 'pilot@example.com',
        name: 'Test Pilot',
      },
    };
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSessionResponse,
    });

    const session = await requestBackendSession('google-id-token-xyz');

    expect(session.tokens.accessToken).toBe('backend-jwt-token');
    expect(session.tokens.idToken).toBe('google-id-token-xyz');
    expect(session.user.id).toBe('usr_1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/google'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ id_token: 'google-id-token-xyz' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-App-Version': '1.0.1 (3)',
          'X-Platform': 'ios',
        }),
      }),
    );
  });

  it('attaches X-App-Version and X-Platform to deleteBackendAccount without dropping Authorization or Content-Type', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await deleteBackendAccount('test-jwt-token');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/me'),
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt-token',
          'Content-Type': 'application/json',
          'X-App-Version': '1.0.1 (3)',
          'X-Platform': 'ios',
        }),
      }),
    );
  });
});
