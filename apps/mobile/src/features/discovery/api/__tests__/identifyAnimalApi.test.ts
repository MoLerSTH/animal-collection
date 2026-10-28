import { AnimalAnalysisError, identifyAnimalApi } from '../identifyAnimalApi';
import { File } from 'expo-file-system';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
});

it('exposes the service wait time separately from a personal daily limit', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({ok: false, status: 429,
    headers: new Headers({'Retry-After': '42'}),
    json: async () => ({detail: {code: 'service_busy', retryAfterSeconds: 42, resetsAt: '2026-10-24T12:01:00Z'}}),
  });
  const error = await identifyAnimalApi('file:///capture.jpg').catch(value => value);
  expect(error).toBeInstanceOf(AnimalAnalysisError);
  expect(error.message).toContain('service is busy');
  expect(error.quota).toEqual({code: 'service_busy', retryAfterSeconds: 42, resetsAt: '2026-10-24T12:01:00Z'});
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});

it('shows provider-day reset information without confusing it with personal allowance', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({ok: false, status: 429,
    json: async () => ({detail: {code: 'service_daily_limit', retryAfterSeconds: 7200, resetsAt: '2026-10-24T07:00:00Z'}}),
  });
  await expect(identifyAnimalApi('file:///capture.jpg')).rejects.toMatchObject({
    message: 'The analysis service has reached today’s limit.',
    quota: {code: 'service_daily_limit', retryAfterSeconds: 7200},
  });
});

it('shows user weekly allowance reset information accurately', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue({ok: false, status: 429,
    json: async () => ({detail: {code: 'user_weekly_limit', retryAfterSeconds: 86400, resetsAt: '2026-11-02T00:00:00Z'}}),
  });
  await expect(identifyAnimalApi('file:///capture.jpg')).rejects.toMatchObject({
    message: 'You have used this week’s analysis allowance (7 times per week).',
    quota: {code: 'user_weekly_limit', retryAfterSeconds: 86400, resetsAt: '2026-11-02T00:00:00Z'},
  });
});

it('uploads the captured photo with authentication and accepts an identified goldfish', async () => {
  const result = { found: true, species: 'Goldfish', story: 'A freshwater fish.', confidence: 0.96 };
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => result });
  await expect(identifyAnimalApi('file:///capture.jpg', 'test-session')).resolves.toEqual({
    found: true, species: 'Goldfish', story: 'A freshwater fish.',
  });
  expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/v1/discovery/identify'), expect.objectContaining({
    method: 'POST', headers: { Authorization: 'Bearer test-session' },
    body: expect.any(FormData), signal: expect.any(AbortSignal),
  }));
});

it.each([
  [401, /sign in again/],
  [403, /sign in again/],
  [413, /too large/],
  [422, /could not read/],
  [429, /limit reached/],
  [502, /AI service is unavailable/],
  [503, /not configured/],
  [504, /took too long/],
])('explains HTTP %s without reporting a photo capture failure', async (status, message) => {
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status });
  await expect(identifyAnimalApi('file:///capture.jpg')).rejects.toThrow(message);
});

it('reports a network failure separately from no animal found', async () => {
  globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
  await expect(identifyAnimalApi('file:///capture.jpg')).rejects.toThrow('Cannot reach the analysis service');
});

it('does not report an unreadable photo as a connection failure or send it to AI', async () => {
  jest.mocked(File).mockImplementationOnce(() => ({ exists: false }) as File);
  globalThis.fetch = jest.fn();
  await expect(identifyAnimalApi('file:///missing.jpg')).rejects.toThrow('Could not read the captured photo');
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it('aborts an unresponsive upload instead of leaving AI Analyzing indefinitely', async () => {
  jest.useFakeTimers();
  globalThis.fetch = jest.fn().mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Aborted')));
  }));
  const assertion = expect(identifyAnimalApi('file:///capture.jpg')).rejects.toThrow('took too long');
  await jest.advanceTimersByTimeAsync(60_000);
  await assertion;
  expect(jest.getTimerCount()).toBe(0);
});

it.each([
  {},
  { found: 'true', species: 'Goldfish', story: 'Fish' },
  { found: true, species: '', story: 'Fish' },
])('rejects an invalid identification response instead of treating it as no animal found', async result => {
  globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => result });
  await expect(identifyAnimalApi('file:///capture.jpg')).rejects.toThrow('invalid response');
});

it('passes structured type and habitats from AI to the capture flow', async () => {
  const result = {found: true, species: 'Goldfish', story: 'A freshwater fish.', animalType: 'Fish', habitatTags: ['aquatic']};
  globalThis.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => result});
  await expect(identifyAnimalApi('file:///capture.jpg')).resolves.toEqual(result);
});
it.each([{animalType: 'Dragon'}, {habitatTags: 'aquatic'}, {habitatTags: ['unknown']}])('rejects invalid classification metadata %s', async metadata => {
  globalThis.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => ({found: true, species: 'Goldfish', story: 'Fish', ...metadata})});
  await expect(identifyAnimalApi('file:///capture.jpg')).rejects.toThrow('invalid response');
});
