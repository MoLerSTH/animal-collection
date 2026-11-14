import { useAuthStore } from '../../features/auth/stores/useAuthStore';
import { mergeClientHeaders } from './clientHeaders';

/** Retry once after an auth rejection; refreshes never open a login prompt or choose a mock user. */
export async function authenticatedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const original = useAuthStore.getState();
  const userId = original.user?.id;
  const request = (token?: string) => {
    const headers = mergeClientHeaders(init.headers);
    if (token) {
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === 'authorization') {
          delete headers[key];
        }
      }
      headers.Authorization = `Bearer ${token}`;
    }
    return fetch(url, { ...init, headers });
  };
  const response = await request(original.tokens?.accessToken);
  if (response.status !== 401 || !userId || init.signal?.aborted) return response;
  const current = useAuthStore.getState();
  if (current.user?.id !== userId) throw new Error('The account changed. Please try again.');
  const token = current.tokens?.accessToken !== original.tokens?.accessToken
    ? current.tokens?.accessToken : await current.refreshSession();
  if (!token || useAuthStore.getState().user?.id !== userId) return response;
  return request(token);
}
