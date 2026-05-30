import { useSettingsStore } from '../store/useSettingsStore';
import { tr, type TKey } from './tr';
import { en } from './en';
import { ar } from './ar';

export type Language = 'tr' | 'en' | 'ar';

const maps: Record<Language, Record<TKey, string>> = { tr, en, ar };

export function useTranslation() {
  const language = (useSettingsStore(s => s.settings.language) ?? 'tr') as Language;

  const t = (key: TKey, params?: Record<string, string | number>): string => {
    let str = maps[language]?.[key] ?? tr[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };

  return { t, language };
}
