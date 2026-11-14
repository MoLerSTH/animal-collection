import { mergeClientHeaders } from '../clientHeaders';

describe('mergeClientHeaders', () => {
  it('returns default diagnostic headers when no caller headers provided', () => {
    const headers = mergeClientHeaders();
    expect(headers).toEqual({
      'X-App-Version': '1.0.1 (3)',
      'X-Platform': 'ios',
    });
  });

  it('merges caller headers without dropping defaults', () => {
    const headers = mergeClientHeaders({
      Authorization: 'Bearer token123',
      'Content-Type': 'application/json',
    });
    expect(headers).toEqual({
      'X-App-Version': '1.0.1 (3)',
      'X-Platform': 'ios',
      Authorization: 'Bearer token123',
      'Content-Type': 'application/json',
    });
  });

  it('overwrites defaults case-insensitively when caller supplies exact casing', () => {
    const headers = mergeClientHeaders({
      'X-App-Version': '2.4.0',
      'X-Platform': 'android',
    });
    expect(headers).toEqual({
      'X-App-Version': '2.4.0',
      'X-Platform': 'android',
    });
  });

  it('overwrites defaults case-insensitively when caller supplies lowercase keys without duplicating', () => {
    const headers = mergeClientHeaders({
      'x-app-version': '2.4.0',
      'x-platform': 'android',
    });
    expect(headers).toEqual({
      'x-app-version': '2.4.0',
      'x-platform': 'android',
    });
    expect(headers['X-App-Version']).toBeUndefined();
    expect(headers['X-Platform']).toBeUndefined();
  });

  it('handles Headers instance', () => {
    const initHeaders = new Headers();
    initHeaders.set('authorization', 'Bearer token');
    initHeaders.set('x-app-version', '3.0.0');

    const headers = mergeClientHeaders(initHeaders);
    expect(headers['X-Platform']).toBe('ios');
    expect(headers['authorization']).toBe('Bearer token');
    expect(headers['x-app-version']).toBe('3.0.0');
    expect(headers['X-App-Version']).toBeUndefined();
  });

  it('handles array of string tuples', () => {
    const headers = mergeClientHeaders([
      ['Content-Type', 'text/plain'],
      ['x-platform', 'custom-platform'],
    ]);
    expect(headers['X-App-Version']).toBe('1.0.1 (3)');
    expect(headers['Content-Type']).toBe('text/plain');
    expect(headers['x-platform']).toBe('custom-platform');
    expect(headers['X-Platform']).toBeUndefined();
  });

  it('ignores undefined header values in plain objects', () => {
    const headers = mergeClientHeaders({
      'X-Defined': 'ok',
      'X-Undefined': undefined,
    });
    expect(headers['X-Defined']).toBe('ok');
    expect('X-Undefined' in headers).toBe(false);
  });
});
