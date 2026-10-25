import { useLanguageStore } from '../useLanguageStore';
import { appStorage, StorageKeys } from '../../storage/mmkv';

describe('useLanguageStore', () => {
  beforeEach(() => {
    appStorage.delete(StorageKeys.APP_LANGUAGE);
    useLanguageStore.getState().setLanguage('en');
  });

  afterEach(() => {
    useLanguageStore.getState().setLanguage('en');
  });

  it('defaults to English when no language is saved', () => {
    const state = useLanguageStore.getState();
    expect(state.language).toBe('en');
    expect(state.t.settings.title).toBe('Settings');
    expect(state.t.tabs.gallery).toBe('Gallery');
  });

  it('switches language to Thai and persists to storage', () => {
    useLanguageStore.getState().setLanguage('th');

    const state = useLanguageStore.getState();
    expect(state.language).toBe('th');
    expect(state.t.settings.title).toBe('การตั้งค่า');
    expect(state.t.tabs.gallery).toBe('คอลเลกชัน');
    expect(appStorage.getString(StorageKeys.APP_LANGUAGE)).toBe('th');
  });

  it('switches language back to English and persists to storage', () => {
    useLanguageStore.getState().setLanguage('th');
    expect(useLanguageStore.getState().language).toBe('th');

    useLanguageStore.getState().setLanguage('en');
    expect(useLanguageStore.getState().language).toBe('en');
    expect(useLanguageStore.getState().t.tabs.gallery).toBe('Gallery');
    expect(appStorage.getString(StorageKeys.APP_LANGUAGE)).toBe('en');
  });
});
