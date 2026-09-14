import { AuthTokens, AuthUser } from '../types';

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

const getApiBaseUrl = (): string => {
  return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8000';
};

/**
 * Exchanges Google ID Token with Backend API for a signed JWT Session Token
 */
export async function exchangeGoogleTokenWithBackend(
  idToken: string
): Promise<{ user: AuthUser; tokens: AuthTokens } | null> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/auth/google`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_token: idToken }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.warn('Backend rejected Google token:', response.status, errorData);
      return null;
    }

    const data: BackendAuthResponse = await response.json();
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        avatarUri: data.user.avatarUrl,
        googleId: data.user.googleId,
      },
      tokens: {
        accessToken: data.accessToken,
        idToken,
      },
    };
  } catch (error) {
    console.warn(`Could not reach Backend API at ${url}. Running in Client-First mode.`, error);
    return null;
  }
}

