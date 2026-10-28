import { ANIMAL_TYPES, AnimalType, HabitatTag } from '../../collections/types';
import { getApiBaseUrl } from '../../collections/api/collectionApi';
import { createPhotoFormData, PhotoFileError } from '../../../core/api/photoFormData';
import { authenticatedFetch } from '../../../core/api/authenticatedFetch';

export interface AnimalIdentification {
  found: boolean;
  species: string;
  story: string;
  animalType?: AnimalType;
  habitatTags?: HabitatTag[];
}

export class AnimalAnalysisError extends Error {
  constructor(message: string, public readonly status?: number,
    public readonly quota?: {code?: string; retryAfterSeconds?: number; resetsAt?: string}) {
    super(message);
  }
}

const statusMessages: Record<number, string> = {
  401: 'Please sign in again before analyzing a photo.',
  403: 'Please sign in again before analyzing a photo.',
  413: 'This photo is too large to analyze. Please try another photo.',
  422: 'The analysis service could not read this photo. Please take another photo.',
  429: 'Animal analysis limit reached. Please try again later.',
  502: 'The AI service is unavailable. Please try again later.',
  503: 'Animal analysis is not configured yet. Please try again later.',
  504: 'Animal analysis took too long. Please try again.',
};

const quotaMessages: Record<string, string> = {
  service_busy: 'The analysis service is busy. Please wait a moment.',
  service_daily_limit: 'The analysis service has reached today’s limit.',
  user_daily_limit: 'You have used today’s analysis allowance.',
  user_weekly_limit: 'You have used this week’s analysis allowance (7 times per week).',
  user_minute_limit: 'You are taking photos too quickly. Please wait a moment.',
};

async function analysisResponseError(response: Response) {
  const fallback = statusMessages[response.status] ?? 'Animal analysis is unavailable. Please try again later.';
  if (response.status !== 429) return new AnimalAnalysisError(fallback, response.status);
  let detail: Record<string, unknown> = {};
  try {
    const body = await response.json();
    if (body?.detail && typeof body.detail === 'object') detail = body.detail;
  } catch { /* Older servers can return a plain or empty 429 response. */ }
  const code = typeof detail.code === 'string' && Object.prototype.hasOwnProperty.call(quotaMessages, detail.code) ? detail.code : undefined;
  const header = response.headers?.get?.('Retry-After');
  const rawRetry = header && /^\d+$/.test(header) ? Number(header) : detail.retryAfterSeconds;
  const retryAfterSeconds = typeof rawRetry === 'number' && Number.isFinite(rawRetry) && rawRetry > 0
    ? Math.min(172800, Math.ceil(rawRetry)) : undefined;
  const resetsAt = typeof detail.resetsAt === 'string' && Number.isFinite(Date.parse(detail.resetsAt)) ? detail.resetsAt : undefined;
  return new AnimalAnalysisError(code ? quotaMessages[code] : fallback, 429, {code, retryAfterSeconds, resetsAt});
}

export async function identifyAnimalApi(imageUri: string, token?: string): Promise<AnimalIdentification> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const body = createPhotoFormData(imageUri);
    const response = await authenticatedFetch(`${getApiBaseUrl()}/api/v1/discovery/identify`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw await analysisResponseError(response);
    }
    let result: unknown;
    try {
      result = await response.json();
    } catch {
      throw new AnimalAnalysisError('The analysis service returned an invalid response. Please try again.');
    }
    if (
      !result || typeof result !== 'object' ||
      !('found' in result) || typeof result.found !== 'boolean' ||
      !('species' in result) || typeof result.species !== 'string' ||
      !('story' in result) || typeof result.story !== 'string' ||
      (result.found && !result.species.trim())
    ) {
      throw new AnimalAnalysisError('The analysis service returned an invalid response. Please try again.');
    }
    const metadata = result as Record<string, unknown>;
    if ((metadata.animalType !== undefined && !ANIMAL_TYPES.includes(metadata.animalType as AnimalType)) ||
        (metadata.habitatTags !== undefined && (!Array.isArray(metadata.habitatTags) ||
          metadata.habitatTags.some(tag => !['aquatic', 'mountain', 'safari'].includes(tag))))) {
      throw new AnimalAnalysisError('The analysis service returned an invalid response. Please try again.');
    }
    return { found: result.found, species: result.species, story: result.story,
      ...(metadata.animalType !== undefined ? { animalType: metadata.animalType as AnimalType } : {}),
      ...(metadata.habitatTags !== undefined ? { habitatTags: metadata.habitatTags as HabitatTag[] } : {}),
    };
  } catch (error) {
    console.warn('[Discovery] identifyAnimalApi failed:', error);
    if (controller.signal.aborted) {
      throw new AnimalAnalysisError('Animal analysis took too long. Please try again.');
    }
    if (error instanceof AnimalAnalysisError) throw error;
    if (error instanceof PhotoFileError) throw new AnimalAnalysisError(error.message);
    throw new AnimalAnalysisError('Cannot reach the analysis service. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}
