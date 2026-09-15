interface StorageInterface {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
  clearAll: () => void;
}

let storageInstance: StorageInterface;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MMKV } = require('react-native-mmkv');
  storageInstance = new MMKV({ id: 'animal-collection-storage' });
} catch {
  // Fallback in Jest or environments where MMKV native module is not linked
  const memoryStore = new Map<string, string>();
  storageInstance = {
    getString: (key: string) => memoryStore.get(key),
    set: (key: string, value: string) => {
      memoryStore.set(key, value);
    },
    delete: (key: string) => {
      memoryStore.delete(key);
    },
    clearAll: () => {
      memoryStore.clear();
    },
  };
}

export const appStorage = storageInstance;

export const StorageKeys = {
  AUTH_USER: 'auth_user',
  AUTH_TOKENS: 'auth_tokens',
  IS_DEV_MODE: 'is_dev_mode',
  COLLECTIONS_DATA: 'collections_data',
  CATALOG_DATA: 'catalog_data',
} as const;

