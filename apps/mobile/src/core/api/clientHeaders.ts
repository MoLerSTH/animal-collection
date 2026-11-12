import { getClientMetadataHeaders } from '../config/appVersion';

/**
 * Merges default client diagnostic headers (X-App-Version, X-Platform) with caller headers.
 * Caller headers always take precedence and case-insensitively replace matching defaults.
 */
export function mergeClientHeaders(
  initHeaders?: HeadersInit | Record<string, string | undefined>,
): Record<string, string> {
  const headers: Record<string, string> = { ...getClientMetadataHeaders() };

  const setHeader = (name: string, value: string) => {
    const lower = name.toLowerCase();
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === lower) {
        delete headers[key];
      }
    }
    headers[name] = value;
  };

  if (typeof Headers !== 'undefined' && initHeaders instanceof Headers) {
    initHeaders.forEach((value, name) => {
      setHeader(name, value);
    });
  } else if (Array.isArray(initHeaders)) {
    for (const [name, value] of initHeaders) {
      if (typeof name === 'string' && value !== undefined) {
        setHeader(name, String(value));
      }
    }
  } else if (initHeaders && typeof initHeaders === 'object') {
    for (const [name, value] of Object.entries(initHeaders)) {
      if (value !== undefined) {
        setHeader(name, String(value));
      }
    }
  }

  return headers;
}
