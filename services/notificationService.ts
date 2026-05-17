import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { calculatePrayerTimes } from './prayerService';
import type { AppSettings } from '../store/useSettingsStore';

// ── Android channels ───────────────────────────────────────────────────────
export async function setupNotificationChannel() {
  if (Platform.OS !== 'android') return;

  const prayerBase = {
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 200, 400],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  };

  await Notifications.setNotificationChannelAsync('prayer_ezan', {
    ...prayerBase, name: 'Namaz Vakitleri (Ezan)', sound: 'ezan.wav',
  });
  await Notifications.setNotificationChannelAsync('prayer_ilahi', {
    ...prayerBase, name: 'Namaz Vakitleri (İlahi)', sound: 'ilahi.wav',
  });
  await Notifications.setNotificationChannelAsync('prayer_salavat', {
    ...prayerBase, name: 'Namaz Vakitleri (Salavat)', sound: 'salavat.wav',
  });
  await Notifications.setNotificationChannelAsync('reminder', {
    name: 'Hatırlatmalar',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
  });
}

// Creates (or recreates) the custom sound channel — must be called before scheduling
export async function setupCustomNotificationChannel(soundUri: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  // Android locks channel sound after first use, so delete + recreate
  await Notifications.deleteNotificationChannelAsync('prayer_custom');
  await Notifications.setNotificationChannelAsync('prayer_custom', {
    name: 'Namaz Vakitleri (Özel Ses)',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 400, 200, 400],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
    sound: soundUri,
  });
}

// ── Permission ────────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === 'granted';
}

export async function getNotificationPermission(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function isInSilentHours(date: Date, start: string, end: string): boolean {
  const h = date.getHours(), m = date.getMinutes();
  const cur  = h * 60 + m;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const s = sh * 60 + sm, e = eh * 60 + em;
  return s < e ? cur >= s && cur <= e : cur >= s || cur <= e;
}

// ── Prayer messages ────────────────────────────────────────────────────────
const MESSAGES: Record<string, { title: string; body: string }> = {
  fajr:    { title: '🌙 Sabah Namazı Vakti',  body: 'Sabahın feyzinden istifade edin. Hayırlı namazlar!' },
  dhuhr:   { title: '☀️ Öğle Namazı Vakti',   body: 'Gün ortasında kısa bir mola — Rabbinizle buluşun.' },
  asr:     { title: '🌤️ İkindi Namazı Vakti', body: 'İkindi namazı vakti geldi. Allah kabul etsin.' },
  maghrib: { title: '🌅 Akşam Namazı Vakti',  body: 'Günün yorgunluğu namazla huzura dönüşsün.' },
  isha:    { title: '🌙 Yatsı Namazı Vakti',  body: 'Günün son namazı. Hayırlı akşamlar.' },
};

const EARLY_MESSAGES: Record<string, { title: string; body: string }> = {
  fajr:    { title: '⏰ Sabaha 10 Dakika Kaldı',  body: 'Sabah namazına hazırlanın.' },
  dhuhr:   { title: '⏰ Öğleye 10 Dakika Kaldı',  body: 'Öğle namazına hazırlanın.' },
  asr:     { title: '⏰ İkindiye 10 Dakika Kaldı', body: 'İkindi namazına hazırlanın.' },
  maghrib: { title: '⏰ Akşama 10 Dakika Kaldı',  body: 'Akşam namazına hazırlanın.' },
  isha:    { title: '⏰ Yatsıya 10 Dakika Kaldı',  body: 'Yatsı namazına hazırlanın.' },
};

// ── Main scheduling ────────────────────────────────────────────────────────
export async function scheduleAllNotifications(
  lat: number,
  lng: number,
  settings: AppSettings,
) {
  // Cancel all previously scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (!settings.notifications.prayerTimes) return;

  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const now = Date.now();
  const DAYS = 7; // schedule ahead

  for (let d = 0; d < DAYS; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    date.setHours(0, 0, 0, 0);

    const times = calculatePrayerTimes(lat, lng, date);

    for (const prayer of prayers) {
      const pTime = new Date(times[prayer]);
      if (pTime.getTime() <= now) continue;

      // Skip if in silent hours
      if (isInSilentHours(pTime, settings.silentHours.start, settings.silentHours.end)) continue;

      // Main prayer notification
      const msg = MESSAGES[prayer];
      const prayerChannelId = `prayer_${settings.notificationSound ?? 'ezan'}`;
      await Notifications.scheduleNotificationAsync({
        identifier: `prayer_${prayer}_${d}`,
        content: {
          title: msg.title,
          body: msg.body,
          sound: Platform.OS === 'ios' ? `${settings.notificationSound ?? 'ezan'}.wav` : true,
          data: { type: 'prayer', prayer },
          ...(Platform.OS === 'android' && { channelId: prayerChannelId }),
        },
        trigger: { date: pTime, type: Notifications.SchedulableTriggerInputTypes.DATE },
      });

      // Early reminder (10 min before)
      if (settings.notifications.earlyReminder) {
        const earlyTime = new Date(pTime.getTime() - 10 * 60 * 1000);
        if (earlyTime.getTime() > now) {
          const earlyMsg = EARLY_MESSAGES[prayer];
          await Notifications.scheduleNotificationAsync({
            identifier: `early_${prayer}_${d}`,
            content: {
              title: earlyMsg.title,
              body: earlyMsg.body,
              sound: true,
              data: { type: 'early', prayer },
              ...(Platform.OS === 'android' && { channelId: 'reminder' }),
            },
            trigger: { date: earlyTime, type: Notifications.SchedulableTriggerInputTypes.DATE },
          });
        }
      }
    }
  }

  // Daily dhikr reminder at 21:00
  if (settings.notifications.dhikrReminder) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'dhikr_daily',
      content: {
        title: '📿 Zikir Hatırlatması',
        body: 'Bugün zikir yapmayı unutmayın. Kalpler ancak Allah\'ı zikirle huzur bulur.',
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'reminder' }),
      },
      trigger: {
        hour: 21, minute: 0,
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
      },
    });
  }
}

// ── Notification handler ────────────────────────────────────────────────────
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
