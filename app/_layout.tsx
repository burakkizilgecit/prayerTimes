import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { ThemeProvider } from '../context/ThemeContext';
import { useTheme } from '../context/ThemeContext';
import { requestWidgetUpdate } from 'react-native-android-widget';
import * as Notifications from 'expo-notifications';
import { usePrayerStore } from '../store/usePrayerStore';
import { useDhikrStore } from '../store/useDhikrStore';
import { useGoalsStore } from '../store/useGoalsStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useTutorialStore } from '../store/useTutorialStore';
import {
  setupNotificationChannel,
  setupCustomNotificationChannel,
  setupNotificationHandler,
  requestNotificationPermission,
  scheduleAllNotifications,
} from '../services/notificationService';

function RootLayoutInner() {
  const router = useRouter();
  const { isDark } = useTheme();
  const loadCompletion    = usePrayerStore(s => s.loadCompletion);
  const loadDhikr         = useDhikrStore(s => s.loadData);
  const loadGoals         = useGoalsStore(s => s.loadGoals);
  const loadSettings      = useSettingsStore(s => s.loadSettings);
  const loadNotifications = useNotificationStore(s => s.loadNotifications);
  const location          = usePrayerStore(s => s.location);
  const settings          = useSettingsStore(s => s.settings);
  const { load: loadTutorial, completed: tutorialDone, loaded: tutorialLoaded } = useTutorialStore();
  const notifListener     = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    loadCompletion();
    loadDhikr();
    loadGoals();
    loadSettings();
    loadNotifications();
    loadTutorial();

    // Set up notification infrastructure
    setupNotificationHandler();
    setupNotificationChannel();

    // Handle notification taps
    notifListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.type === 'prayer' || data?.type === 'early') {
        router.push('/(tabs)/prayer-times' as any);
      } else if (data?.type === 'dhikr') {
        router.push('/(tabs)/dhikr' as any);
      } else if (data?.type === 'dua') {
        router.push('/(tabs)/duas' as any);
      }
    });

    // Request permission
    requestNotificationPermission();

    return () => { notifListener.current?.remove(); };
  }, []);

  // Tutorial: ilk yüklenince tamamlanmamışsa yönlendir
  useEffect(() => {
    if (tutorialLoaded && !tutorialDone) {
      router.replace('/tutorial' as any);
    }
  }, [tutorialLoaded, tutorialDone]);

  // Restore custom notification channel on startup if user had one saved
  useEffect(() => {
    if (settings.notificationSound === 'custom' && settings.customSoundUri) {
      setupCustomNotificationChannel(settings.customSoundUri).catch(() => {});
    }
  }, [settings.customSoundUri]);

  // Reschedule notifications + update widget when location or settings change
  useEffect(() => {
    if (!location) return;
    scheduleAllNotifications(location.lat, location.lng, settings).catch(() => {});
    if (Platform.OS === 'android') {
      requestWidgetUpdate({ widgetName: 'PrayerWidget', renderWidget: () => undefined as any }).catch(() => {});
    }
  }, [location?.lat, location?.lng, settings.notifications, settings.silentHours, settings.notificationSound, settings.customSoundUri]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="worship-tracking" />
        <Stack.Screen name="islamic-calendar" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="achievements" />
        <Stack.Screen name="statistics" />
        <Stack.Screen name="daily-goals" />
        <Stack.Screen name="upcoming-events" />
        <Stack.Screen name="quran" />
        <Stack.Screen name="quran-surah" />
        <Stack.Screen name="tutorial" options={{ gestureEnabled: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
