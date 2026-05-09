import { create } from 'zustand';
import { PrayerTimesData, calculatePrayerTimes } from '../services/prayerService';
import { saveData, loadData, STORAGE_KEYS } from '../services/storageService';

export interface PrayerCompletion {
  [dateKey: string]: {
    fajr: boolean;
    dhuhr: boolean;
    asr: boolean;
    maghrib: boolean;
    isha: boolean;
  };
}

interface PrayerStore {
  prayerTimes: PrayerTimesData | null;
  location: { lat: number; lng: number; city: string } | null;
  completion: PrayerCompletion;
  setPrayerTimes: (times: PrayerTimesData) => void;
  setLocation: (lat: number, lng: number, city: string) => void;
  togglePrayer: (dateKey: string, prayer: keyof PrayerCompletion[string]) => void;
  loadCompletion: () => Promise<void>;
  getTodayCompletion: () => PrayerCompletion[string];
}

const todayKey = () => new Date().toISOString().split('T')[0];
const emptyDay = () => ({ fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false });

// Default to Istanbul so prayer times are available immediately on first render
const DEFAULT_LAT = 41.0082;
const DEFAULT_LNG = 28.9784;

export const usePrayerStore = create<PrayerStore>((set, get) => ({
  prayerTimes: calculatePrayerTimes(DEFAULT_LAT, DEFAULT_LNG),
  location: { lat: DEFAULT_LAT, lng: DEFAULT_LNG, city: 'İstanbul' },
  completion: {},

  setPrayerTimes: (times) => set({ prayerTimes: times }),

  setLocation: (lat, lng, city) => {
    const times = calculatePrayerTimes(lat, lng);
    set({ location: { lat, lng, city }, prayerTimes: times });
    saveData(STORAGE_KEYS.LOCATION, { lat, lng, city });
  },

  togglePrayer: (dateKey, prayer) => {
    const current = get().completion;
    const day = current[dateKey] ?? emptyDay();
    const updated = { ...current, [dateKey]: { ...day, [prayer]: !day[prayer] } };
    set({ completion: updated });
    saveData(STORAGE_KEYS.PRAYER_COMPLETION, updated);
  },

  loadCompletion: async () => {
    const data = await loadData<PrayerCompletion>(STORAGE_KEYS.PRAYER_COMPLETION);
    if (data) set({ completion: data });
  },

  getTodayCompletion: () => {
    const key = todayKey();
    return get().completion[key] ?? emptyDay();
  },
}));
