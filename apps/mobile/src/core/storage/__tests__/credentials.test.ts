import * as SecureStore from 'expo-secure-store';
import { appStorage, StorageKeys } from '../mmkv';
it('stores and removes credentials through secure storage', () => {
  appStorage.set(StorageKeys.AUTH_TOKENS, '{"accessToken":"secret-session"}');
  expect(SecureStore.getItem('auth_tokens')).toBe('{"accessToken":"secret-session"}');
  expect(appStorage.getString(StorageKeys.AUTH_TOKENS)).toContain('secret-session');
  appStorage.delete(StorageKeys.AUTH_TOKENS);
  expect(SecureStore.getItem('auth_tokens')).toBeFalsy();
  expect(appStorage.getString(StorageKeys.AUTH_TOKENS)).toBeUndefined();
});

it('migrates legacy plaintext tokens only after the secure write succeeds', () => {
  const values = new Map<string, string>([['auth_tokens', 'legacy-test-session']]);
  jest.isolateModules(() => {
    jest.doMock('react-native-mmkv', () => ({createMMKV: () => ({
      getString: (key: string) => values.get(key), set: (key: string, value: string) => values.set(key, value),
      remove: (key: string) => values.delete(key), clearAll: () => values.clear(),
    })}));
    const isolatedSecure = require('expo-secure-store');
    const {appStorage: storage} = require('../mmkv');
    const write = jest.spyOn(isolatedSecure, 'setItem').mockImplementationOnce(() => {throw new Error('Keychain unavailable');});
    expect(() => storage.getString('auth_tokens')).toThrow('Keychain unavailable');
    expect(values.get('auth_tokens')).toBe('legacy-test-session');
    write.mockRestore();
    expect(storage.getString('auth_tokens')).toBe('legacy-test-session');
    expect(values.has('auth_tokens')).toBe(false);
    expect(isolatedSecure.getItem('auth_tokens')).toBe('legacy-test-session');
  });
});
