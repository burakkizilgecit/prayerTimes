import { create } from 'zustand';
import { saveData, loadData, STORAGE_KEYS } from '../services/storageService';

export type NotificationSound = 'ezan' | 'ilahi' | 'custom';
export type Language = 'tr' | 'en' | 'ar';

export interface AppSettings {
  notifications: {
    prayerTimes: boolean;
    earlyReminder: boolean;
    dailyHadith: boolean;
    dailyDua: boolean;
    dhikrReminder: boolean;
    islamicDays: boolean;
  };
  silentHours: { start: string; end: string };
  vibration: boolean;
  calculationMethod: string;
  notificationSound: NotificationSound;
  customSoundUri?: string;
  customSoundName?: string;
  language: Language;
  theme?: 'dark' | 'light';
  fontSize?: 'normal' | 'large' | 'xlarge';
}

const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    prayerTimes: true,
    earlyReminder: true,
    dailyHadith: true,
    dailyDua: true,
    dhikrReminder: true,
    islamicDays: true,
  },
  silentHours: { start: '22:00', end: '07:00' },
  vibration: true,
  calculationMethod: 'Turkey',
  notificationSound: 'ezan',
  language: 'tr',
  theme: 'dark',
  fontSize: 'normal',
};

interface SettingsStore {
  settings: AppSettings;
  toggleNotification: (key: keyof AppSettings['notifications']) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,

  toggleNotification: (key) => {
    const settings = get().settings;
    const updated = {
      ...settings,
      notifications: { ...settings.notifications, [key]: !settings.notifications[key] },
    };
    set({ settings: updated });
    saveData(STORAGE_KEYS.SETTINGS, updated);
  },

  updateSettings: (partial) => {
    const updated = { ...get().settings, ...partial };
    set({ settings: updated });
    saveData(STORAGE_KEYS.SETTINGS, updated);
  },

  loadSettings: async () => {
    const data = await loadData<AppSettings>(STORAGE_KEYS.SETTINGS);
    if (data) set({ settings: data });
  },
}));
