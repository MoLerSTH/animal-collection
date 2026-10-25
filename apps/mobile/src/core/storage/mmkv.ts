interface StorageInterface {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
  clearAll: () => void;
}

let storageInstance: StorageInterface;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createMMKV } = require('react-native-mmkv');
  const native = createMMKV({ id: 'animal-collection-storage' });
  storageInstance = { getString: (key) => native.getString(key), set: (key, value) => native.set(key, value), delete: (key) => native.remove(key), clearAll: () => native.clearAll() };
} catch {
  // Fallback in Jest or environments where MMKV native module is not linked
  const memoryStore = new Map<string, string>();
  const web = typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : undefined;
  storageInstance = {
    getString: (key: string) => web?.getItem(key) ?? memoryStore.get(key),
    set: (key: string, value: string) => {
      if (web) web.setItem(key, value); else memoryStore.set(key, value);
    },
    delete: (key: string) => {
      web?.removeItem(key); memoryStore.delete(key);
    },
    clearAll: () => {
      memoryStore.clear();
    },
  };
}

// Session credentials live in Android Keystore / iOS Keychain. Migrate the
// previous MMKV value only after the secure write succeeds.
let secure: typeof import('expo-secure-store') | undefined;
try { secure = require('expo-secure-store'); } catch { /* Old development client needs rebuilding. */ }
let temporaryTokens: string | undefined;
const tokenKey = 'auth_tokens';
const secureGet = () => {
  if (!secure) {
    if (!__DEV__) throw new Error('Secure credential storage is unavailable.');
    return temporaryTokens || storageInstance.getString(tokenKey);
  }
  const legacy = storageInstance.getString(tokenKey);
  if (legacy) {
    secure.setItem(tokenKey, legacy);
    storageInstance.delete(tokenKey);
  }
  return secure.getItem(tokenKey) || undefined;
};
export const appStorage: StorageInterface = {
  getString: key => key === tokenKey ? secureGet() : storageInstance.getString(key),
  set: (key, value) => {
    if (key !== tokenKey) { storageInstance.set(key, value); return; }
    if (secure) { secure.setItem(key, value); storageInstance.delete(key); }
    else if (__DEV__) temporaryTokens = value;
    else throw new Error('Secure credential storage is unavailable.');
  },
  delete: key => {
    if (key === tokenKey) {
      // Synchronous tombstone avoids an async delete racing with a new login.
      secure?.setItem(key, ''); temporaryTokens = undefined;
    }
    storageInstance.delete(key);
  },
  clearAll: () => { secure?.setItem(tokenKey, ''); temporaryTokens = undefined; storageInstance.clearAll(); },
};

export const StorageKeys = {
  AUTH_USER: 'auth_user',
  AUTH_TOKENS: 'auth_tokens',
  IS_DEV_MODE: 'is_dev_mode',
  COLLECTIONS_DATA: 'collections_data',
  CATALOG_DATA: 'catalog_data',
  APP_LANGUAGE: 'app_language',
} as const;

