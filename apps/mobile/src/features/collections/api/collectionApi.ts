import {
  CatalogAnimal,
  UserCollectionItem,
  CollectionSummary,
  CreateCollectionPayload,
} from '../types';
import { createPhotoFormData } from '../../../core/api/photoFormData';
import { request } from '../../../core/api/request';
import { getApiBaseUrl } from '../../../core/api/config';
import { authenticatedFetch } from '../../../core/api/authenticatedFetch';

export { getApiBaseUrl } from '../../../core/api/config';

export class StarterGiftClaimError extends Error {
  constructor(public readonly status: number) { super('Could not sync the starter gift.'); }
}

export async function fetchStarterGiftStatusApi(token?: string): Promise<'available' | 'claimed' | 'removed'> {
  const response = await request(`${getApiBaseUrl()}/api/v1/collections/starter-gift`, {
    method: 'GET', headers: token ? {Authorization: `Bearer ${token}`} : {},
  });
  if (!response.ok) throw new Error('Could not check the starter gift.');
  const result = await response.json();
  if (!['available', 'claimed', 'removed'].includes(result?.status)) throw new Error('Invalid starter gift status.');
  return result.status;
}

export class NameSaveTimeoutError extends Error {
  constructor() { super('Could not confirm the new name. Check your connection and try again.'); }
}

// Bound the complete operation, including session renewal and response.json().
// An aborted shared auth refresh may finish independently; it never delays this caller.
async function boundedJson<T>(url: string, init: RequestInit, parse: (response: Response) => Promise<T>, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {controller.abort(); reject(new NameSaveTimeoutError());}, Math.max(1, Math.min(8000, timeoutMs)));
  });
  try {
    return await Promise.race([authenticatedFetch(url, {...init, signal: controller.signal}).then(parse), expired]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function renameCollectionApi(id: string, name: string, timeoutMs = 8000): Promise<{id: string; name: string}> {
  const started = Date.now();
  return boundedJson(`${getApiBaseUrl()}/api/v1/collections/${id}/name`, {
    method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name}),
  }, async response => {
    if (!response.ok) throw new Error(`Could not save card name (${response.status})`);
    const result = await response.json();
    if (result?.id !== id || typeof result.name !== 'string' || !result.name.trim()) throw new Error('Invalid card name response');
    if (__DEV__) console.info('[Collections] Name save timing', {totalMs: Date.now() - started, serverTiming: response.headers?.get?.('Server-Timing') || undefined});
    return result;
  }, timeoutMs);
}

export async function claimStarterGiftApi(fast = false): Promise<UserCollectionItem> {
  if (fast) return boundedJson(`${getApiBaseUrl()}/api/v1/collections/starter-gift`, {method:'POST'}, async response => {
    if (!response.ok) throw new StarterGiftClaimError(response.status);
    return response.json();
  });
  const response = await request(`${getApiBaseUrl()}/api/v1/collections/starter-gift`, { method: 'POST' });
  if (!response.ok) throw new StarterGiftClaimError(response.status);
  return response.json();
}

/**
 * Resolves relative backend storage URLs (/api/v1/storage/...) to full URLs.
 * Leaves remote URLs (https://) and local device URIs (file://) intact.
 */
export function resolvePhotoUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('/')) {
    return `${getApiBaseUrl()}${url}`;
  }
  return url;
}

const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function fetchCatalogApi(token?: string): Promise<CatalogAnimal[]> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/animals`;
  const response = await request(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch animal catalog: ${response.status}`);
  }
  return response.json();
}

export async function fetchUserCollectionsApi(
  token?: string,
  favorite?: boolean
): Promise<UserCollectionItem[]> {
  const baseUrl = getApiBaseUrl();
  let url = `${baseUrl}/api/v1/collections`;
  if (favorite !== undefined) {
    url += `?favorite=${favorite}`;
  }

  const response = await request(url, {
    method: 'GET',
    headers: getHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user collections: ${response.status}`);
  }
  return response.json();
}

export async function fetchCollectionSummaryApi(token?: string): Promise<CollectionSummary | null> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/collections/summary`;
  try {
    const response = await request(url, {
      method: 'GET',
      headers: getHeaders(token),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function uploadPhotoApi(fileUri: string, token?: string): Promise<string | null> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/storage/upload`;

  try {
    const formData = createPhotoFormData(fileUri);
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await request(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      console.warn('Failed to upload photo to backend storage:', response.status);
      return null;
    }

    const data = await response.json();
    return data.photoUrl;
  } catch (err) {
    console.warn('Network error uploading photo to backend:', err);
    return null;
  }
}

export async function createCollectionApi(
  payload: CreateCollectionPayload,
  token?: string
): Promise<UserCollectionItem> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/collections`;

  const response = await request(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to create collection entry (${response.status})`);
  }

  return response.json();
}

export async function updateCollectionApi(
  id: string,
  updates: Partial<UserCollectionItem>,
  token?: string
): Promise<UserCollectionItem> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/collections/${id}`;

  const response = await request(url, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update collection entry: ${response.status}`);
  }

  return response.json();
}

export async function deleteCollectionApi(id: string, token?: string): Promise<boolean> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/v1/collections/${id}`;

  const response = await request(url, {
    method: 'DELETE',
    headers: getHeaders(token),
  });

  return response.ok;
}

