import {
  CatalogAnimal,
  UserCollectionItem,
  CollectionSummary,
  CreateCollectionPayload,
} from '../types';

export const getApiBaseUrl = (): string => {
  return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:8000';
};

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
  const response = await fetch(url, {
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

  const response = await fetch(url, {
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
    const response = await fetch(url, {
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

  const formData = new FormData();
  const filename = fileUri.split('/').pop() || 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

  // React Native FormData format for file uploads
  formData.append('file', {
    uri: fileUri,
    name: filename,
    type,
  } as any);

  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
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

  const response = await fetch(url, {
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

  const response = await fetch(url, {
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

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(token),
  });

  return response.ok;
}

