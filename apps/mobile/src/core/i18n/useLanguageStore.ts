import { create } from 'zustand';
import { appStorage, StorageKeys } from '../storage/mmkv';
import { SupportedLanguage, TranslationDictionary, translations } from './translations';

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: TranslationDictionary;
}

const getInitialLanguage = (): SupportedLanguage => {
  const saved = appStorage.getString(StorageKeys.APP_LANGUAGE);
  if (saved === 'th' || saved === 'en') {
    return saved;
  }
  return 'en';
};

export const useLanguageStore = create<LanguageState>((set) => ({
  language: getInitialLanguage(),
  t: translations[getInitialLanguage()],
  setLanguage: (language: SupportedLanguage) => {
    appStorage.set(StorageKeys.APP_LANGUAGE, language);
    set({
      language,
      t: translations[language],
    });
  },
}));

/**
 * Convenience hook returning the reactive translation dictionary and setter.
 */
export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const t = useLanguageStore((state) => state.t);

  return { language, setLanguage, t };
}
