import { authenticatedFetch } from './authenticatedFetch';

export async function request(url: string, init: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) abort();
  init.signal?.addEventListener('abort', abort, {once: true});
  const timer = setTimeout(abort, timeoutMs);
  try { return await authenticatedFetch(url, {...init, signal: controller.signal}); }
  finally { clearTimeout(timer); init.signal?.removeEventListener('abort', abort); }
}
