import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrayerTimesWidget } from './PrayerTimesWidget';
import { calculatePrayerTimes, getNextPrayer, formatPrayerTime } from '../services/prayerService';

const PRAYER_LABELS: Record<string, string> = {
  fajr: 'Sabah', sunrise: 'Güneş', dhuhr: 'Öğle',
  asr: 'İkindi', maghrib: 'Akşam', isha: 'Yatsı',
};

function getCountdownShort(target: Date): string {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return 'Vakti geçti';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `${h}s ${m}dk`;
  return `${m} dk kaldı`;
}

async function getWidgetData() {
  try {
    const raw = await AsyncStorage.getItem('user_location');
    const loc = raw ? JSON.parse(raw) : { lat: 41.0082, lng: 28.9784, city: 'İstanbul' };
    const times = calculatePrayerTimes(loc.lat, loc.lng);
    const next  = getNextPrayer(times, loc.lat, loc.lng);
    return {
      nextPrayer: PRAYER_LABELS[next.key] ?? next.name,
      nextTime:   formatPrayerTime(next.time),
      countdown:  getCountdownShort(new Date(next.time)),
      city:       loc.city ?? 'İstanbul',
    };
  } catch {
    return { nextPrayer: '--', nextTime: '--:--', countdown: '', city: 'İstanbul' };
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await getWidgetData();
      props.renderWidget(
        React.createElement(PrayerTimesWidget, data)
      );
      break;
    }
    default:
      break;
  }
}
