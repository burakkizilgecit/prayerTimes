import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveData<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadData<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function removeData(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export const STORAGE_KEYS = {
  DHIKR_COUNTS: 'dhikr_counts',
  DHIKR_HISTORY: 'dhikr_history',
  DAILY_GOALS: 'daily_goals',
  PRAYER_COMPLETION: 'prayer_completion',
  SETTINGS: 'app_settings',
  ACHIEVEMENTS: 'achievements',
  STATISTICS: 'statistics',
  LOCATION: 'user_location',
};
