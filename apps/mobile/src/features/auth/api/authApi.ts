import { AuthTokens, AuthUser } from '../types';
import { getApiBaseUrl } from '../../../core/api/config';

export class AuthApiError extends Error {
  constructor(public readonly status: number) {
    super(status === 401 || status === 403 || status === 404
      ? 'Please sign in again.' : 'The account service is unavailable. Please try again.');
  }
}

export type BackendSession = { user: AuthUser; tokens: AuthTokens };

function mapUser(user: BackendAuthResponse['user']): AuthUser {
  return { id: user.id, email: user.email, name: user.name, avatarUri: user.avatarUrl, googleId: user.googleId };
}

export interface BackendAuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    googleId?: string;
  };
  accessToken: string;
  tokenType: string;
}

async function authRequest(path: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/${path}`, { ...init, signal: controller.signal });
    if (!response.ok) throw new AuthApiError(response.status);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBackendUser(token: string): Promise<AuthUser> {
  const user = await authRequest('me', { headers: { Authorization: `Bearer ${token}` } });
  if (!user?.id || !user.email || !user.name) throw new Error('The account service returned an invalid profile.');
  return mapUser(user);
}

export async function updateBackendUsername(name: string, token: string): Promise<AuthUser> {
  const user = await authRequest('me', {
    method: 'PATCH', headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({name}),
  });
  if (!user?.id || !user.email || !user.name) throw new Error('The account service returned an invalid profile.');
  return mapUser(user);
}

export async function requestBackendSession(idToken: string): Promise<BackendSession> {
  const data: BackendAuthResponse = await authRequest('google', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_token: idToken }),
  });
  if (!data.accessToken || !data.user?.id) throw new Error('The account service returned an invalid session.');
  return { user: mapUser(data.user), tokens: { accessToken: data.accessToken, idToken } };
}

export async function deleteBackendAccount(token: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE' }), signal: controller.signal,
    });
    // A lost successful response can be safely retried using the same app token.
    if (response.status === 404 && (await response.json().catch(() => null))?.detail === 'User not found') return;
    if (!response.ok) throw new AuthApiError(response.status);
  } finally { clearTimeout(timeout); }
}

/**
 * Exchanges Google ID Token with Backend API for a signed JWT Session Token
 */
export async function exchangeGoogleTokenWithBackend(
  idToken: string
): Promise<{ user: AuthUser; tokens: AuthTokens } | null> {
  try {
    return await requestBackendSession(idToken);
  } catch {
    // Explicit development mock sign-in can still work offline.
    return null;
  }
}

