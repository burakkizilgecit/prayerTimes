import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, ImageBackground, Dimensions,
  Modal, FlatList, Share, Switch,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import ShareCard from '../../components/ShareCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { usePrayerStore } from '../../store/usePrayerStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTranslation, applyRTL, type Language } from '../../i18n';
import { formatPrayerTime, getNextPrayer, getCountdown } from '../../services/prayerService';
import { formatGregorianDate, formatHijriDate, getDayName } from '../../services/hijriService';
import { getDailyHadith } from '../../data/hadiths';
import { getDailyDua } from '../../data/duas';

const NOTIF_ICONS: Record<string, string> = {
  prayer: 'clock-time-five-outline',
  hadith: 'format-quote-close',
  dua: 'hands-pray',
  dhikr: 'circle-outline',
  event: 'calendar-star',
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa önce`;
  return `${Math.floor(h / 24)}g önce`;
}

const { width } = Dimensions.get('window');

const MOSQUE_DAY = require('../../assets/images/mosque-day.png');
const MOSQUE_NIGHT = require('../../assets/images/mosque-night.png');

const PRAYER_ICONS: Record<string, string> = {
  fajr: 'weather-night', sunrise: 'weather-sunset-up',
  dhuhr: 'weather-sunny', asr: 'weather-partly-cloudy',
  maghrib: 'weather-sunset-down', isha: 'moon-waning-crescent',
};

const PRAYER_LABEL_KEYS: Record<string, string> = {
  fajr: 'prayerFajr', sunrise: 'prayerSunrise', dhuhr: 'prayerDhuhr',
  asr: 'prayerAsr', maghrib: 'prayerMaghrib', isha: 'prayerIsha',
};

const makeStyles = (colors: any, fs: (n: number) => number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { width, minHeight: 340 },
  heroOverlay: { flex: 1, minHeight: 340, backgroundColor: 'rgba(5,8,18,0.62)', paddingBottom: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2 },
  headerBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cityText: { color: '#FFFFFF', fontSize: fs(FONT_SIZE.lg), fontWeight: '700', letterSpacing: 0.3 },
  dateContainer: { alignItems: 'center', paddingTop: SPACING.sm, paddingBottom: SPACING.lg },
  dayText:   { color: 'rgba(255,255,255,0.55)', fontSize: fs(FONT_SIZE.xs), letterSpacing: 2, textTransform: 'uppercase' },
  dateText:  { color: '#FFFFFF', fontSize: fs(FONT_SIZE.xxl), fontWeight: '700', marginVertical: 3, letterSpacing: 0.3 },
  hijriText: { color: colors.gold, fontSize: fs(FONT_SIZE.sm), letterSpacing: 0.5, opacity: 0.9 },
  nextPrayerCard: { marginHorizontal: SPACING.md, backgroundColor: 'rgba(8,12,22,0.82)', borderColor: 'rgba(212,168,75,0.35)', borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACING.md, paddingHorizontal: SPACING.lg, overflow: 'hidden' },
  nextPrayerLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  nextPrayerName:  { color: '#FFFFFF', fontSize: fs(FONT_SIZE.lg), fontWeight: '700', marginBottom: SPACING.sm },
  nextPrayerLeft:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  nextPrayerIconBox: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(212,168,75,0.15)', alignItems: 'center', justifyContent: 'center' },
  countdownBox:  { alignItems: 'flex-end', marginTop: 4 },
  countdownText: { color: colors.gold, fontSize: fs(FONT_SIZE.xxxl), fontWeight: '800', letterSpacing: 4, fontVariant: ['tabular-nums'], includeFontPadding: false },
  countdownLabel: { color: 'rgba(255,255,255,0.6)', fontSize: fs(FONT_SIZE.xs), letterSpacing: 1, marginTop: 2 },
  section:      { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: SPACING.sm },
  card: { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: RADIUS.xl, overflow: 'hidden' },
  prayerRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: 14 },
  prayerRowBorder: { borderBottomColor: colors.cardBorder, borderBottomWidth: 1 },
  prayerRowActive: { backgroundColor: colors.goldGlow },
  prayerLeft:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm + 2 },
  prayerName:  { color: colors.textPrimary, fontSize: fs(FONT_SIZE.md), fontWeight: '500' },
  prayerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  prayerTime:  { color: colors.textPrimary, fontSize: fs(FONT_SIZE.md), fontWeight: '700', fontVariant: ['tabular-nums'] },
  infoCard: { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACING.lg, borderLeftColor: colors.gold, borderLeftWidth: 3 },
  infoCardHeader:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  infoCardTitle:   { color: colors.gold, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, flex: 1 },
  infoCardTitle2:  { color: colors.textPrimary, fontSize: fs(FONT_SIZE.md), fontWeight: '700', marginBottom: SPACING.sm },
  infoCardText:    { color: colors.textSecondary, fontSize: fs(FONT_SIZE.sm), lineHeight: 22 },
  arabicText:      { color: colors.textPrimary, fontSize: fs(FONT_SIZE.xl), lineHeight: 38, textAlign: 'right', marginVertical: SPACING.sm, fontWeight: '300' },
  infoCardSource:  { color: colors.textMuted, fontSize: fs(FONT_SIZE.xs), marginTop: SPACING.sm, letterSpacing: 0.3 },
  shareBtn:        { padding: 6, marginLeft: 'auto' as any },
  headerBtnGroup: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  badge:          { position: 'absolute', top: 6, right: 6, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText:      { color: '#fff', fontSize: 9, fontWeight: '800' },
  notifSettingsSheet:  { marginHorizontal: SPACING.md, marginBottom: SPACING.xl, backgroundColor: colors.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: colors.cardBorderActive, padding: SPACING.lg, paddingBottom: SPACING.xl },
  sheetHandle:         { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder, alignSelf: 'center', marginBottom: SPACING.md },
  notifSettingsHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  notifSettingsTitle:  { color: colors.textPrimary, fontSize: fs(FONT_SIZE.lg), fontWeight: '700' },
  notifSettingRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm + 2 },
  notifSettingBorder:  { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  notifSettingIcon:    { marginRight: SPACING.sm },
  notifSettingLabel:   { flex: 1, color: colors.textPrimary, fontSize: fs(FONT_SIZE.sm), fontWeight: '500' },
  themeRow:            { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  themeLabel:          { color: colors.textMuted, fontSize: fs(FONT_SIZE.xs), flex: 1 },
  themeBtn:            { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: colors.cardBorder },
  themeBtnActive:      { borderColor: colors.gold, backgroundColor: colors.goldGlow },
  themeBtnText:        { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  themeBtnTextActive:  { color: colors.gold },
  notifLangRow:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, marginBottom: SPACING.xs },
  notifLangTitle:      { color: colors.textMuted, fontSize: fs(FONT_SIZE.xs), flex: 1 },
  notifLangBtn:        { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: colors.cardBorder },
  notifLangBtnActive:  { borderColor: colors.gold, backgroundColor: 'rgba(200,168,83,0.15)' },
  notifLangBtnText:    { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  notifLangBtnTextActive: { color: colors.gold },
  modalBackdrop:  { flex: 1, backgroundColor: colors.overlay },
  notifPanel:     { margin: SPACING.md, marginTop: 90, backgroundColor: colors.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: colors.cardBorderActive, overflow: 'hidden' },
  notifPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  notifPanelTitle: { color: colors.textPrimary, fontSize: fs(FONT_SIZE.lg), fontWeight: '700' },
  markAllBtn:     { paddingHorizontal: SPACING.sm, paddingVertical: 5, backgroundColor: colors.goldGlow, borderRadius: RADIUS.full },
  markAllText:    { color: colors.gold, fontSize: fs(FONT_SIZE.xs), fontWeight: '700' },
  notifEmpty:     { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  notifEmptyText: { color: colors.textMuted, fontSize: fs(FONT_SIZE.sm) },
  notifItem:      { flexDirection: 'row', alignItems: 'flex-start', padding: SPACING.md, gap: SPACING.sm, backgroundColor: 'rgba(212,168,75,0.04)' },
  notifItemRead:  { backgroundColor: 'transparent' },
  notifIconBox:   { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.goldGlow, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifContent:   { flex: 1 },
  notifTitle:     { color: colors.textPrimary, fontSize: fs(FONT_SIZE.sm), fontWeight: '700', marginBottom: 2 },
  notifBody:      { color: colors.textSecondary, fontSize: fs(FONT_SIZE.xs), lineHeight: 17 },
  notifTime:      { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  unreadDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold, marginTop: 5, flexShrink: 0 },
  shareModalBg:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: SPACING.md },
  shareModalContent: { width: '100%', alignItems: 'center', gap: SPACING.md },
  shareModalTitle:   { color: colors.textPrimary, fontSize: fs(FONT_SIZE.lg), fontWeight: '700' },
  shareModalBtns:    { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  shareCancelBtn:    { flex: 1, paddingVertical: SPACING.sm + 4, borderRadius: RADIUS.lg, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorderActive },
  shareCancelText:   { color: colors.textSecondary, fontSize: fs(FONT_SIZE.sm), fontWeight: '600' },
  shareConfirmBtn:   { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: SPACING.sm + 4, borderRadius: RADIUS.lg, backgroundColor: colors.gold },
  shareConfirmText:  { color: colors.background, fontSize: fs(FONT_SIZE.md), fontWeight: '800' },
});

const NOTIF_ROUTES: Record<string, string> = {
  prayer: '/(tabs)/prayer-times',
  hadith: '/(tabs)',
  dua:    '/(tabs)/duas',
  dhikr:  '/(tabs)/dhikr',
  event:  '/upcoming-events',
};

export default function HomeScreen() {
  const { colors, fs } = useTheme();
  const router = useRouter();
  const { prayerTimes, location, setLocation, loadCompletion, togglePrayer, getTodayCompletion } = usePrayerStore();
  const { notifications, loadNotifications, markRead, markAllRead, getUnreadCount, generateDailyIfNeeded } = useNotificationStore();
  const [countdown, setCountdown] = useState('--:--:--');
  const [nextPrayer, setNextPrayer] = useState<{ key: string; name: string; time: Date } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const { settings, toggleNotification, updateSettings } = useSettingsStore();
  const { t, language } = useTranslation();

  const styles = React.useMemo(() => makeStyles(colors, fs), [colors, fs]);

  const handleLangChange = (lang: Language) => {
    updateSettings({ language: lang });
    applyRTL(lang);
  };
  const shareCardRef = useRef<ViewShot>(null);
  const unreadCount = getUnreadCount();

  const captureAndShare = async () => {
    try {
      const uri = await shareCardRef.current?.capture?.();
      if (!uri) return;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Paylaş' });
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
        }
      }
    } catch {}
    setShareData(null);
  };
  const hadith = getDailyHadith();
  const dua = getDailyDua();
  const hadithText   = language === 'ar' ? hadith.ar  : language === 'en' ? hadith.en  : hadith.text;
  const duaTitle     = language === 'ar' ? dua.title  : language === 'en' ? dua.title_en : dua.title;
  const duaMeaning   = language === 'ar' ? dua.arabic : language === 'en' ? dua.english  : dua.turkish;
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 18 || hour < 6;
  const mosqueImage = isNight ? MOSQUE_NIGHT : MOSQUE_DAY;
  const completion = getTodayCompletion();
  const todayKey = now.toISOString().split('T')[0];

  useEffect(() => {
    loadCompletion();
    loadNotifications();
    generateDailyIfNeeded(hadith.text, dua.title);
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          const city = geo[0]?.city ?? geo[0]?.region ?? 'Bilinmiyor';
          setLocation(loc.coords.latitude, loc.coords.longitude, city);
        } else {
          setLocation(41.0082, 28.9784, 'İstanbul');
        }
      } catch {
        setLocation(41.0082, 28.9784, 'İstanbul');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Restart interval whenever prayerTimes updates (location changes)
  useEffect(() => {
    if (!prayerTimes) return;
    const lat = location?.lat ?? 41.0082;
    const lng = location?.lng ?? 28.9784;

    const tick = () => {
      const n = getNextPrayer(prayerTimes, lat, lng);
      setNextPrayer(n);
      setCountdown(getCountdown(n.time));
    };

    tick(); // run immediately — no 1-second blank wait
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [prayerTimes]);

  const prayerKeys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const toggleablePrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Notification Panel Modal */}
      <Modal visible={showNotifs} transparent animationType="fade" onRequestClose={() => setShowNotifs(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowNotifs(false)}>
          <View style={styles.notifPanel} onStartShouldSetResponder={() => true}>
            <View style={styles.notifPanelHeader}>
              <Text style={styles.notifPanelTitle}>Bildirimler</Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
                  <Text style={styles.markAllText}>Tümünü Oku</Text>
                </TouchableOpacity>
              )}
            </View>
            {notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
                <Text style={styles.notifEmptyText}>Henüz bildirim yok</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={item => item.id}
                style={{ maxHeight: 420 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.notifItem, item.read && styles.notifItemRead]}
                    onPress={() => {
                      markRead(item.id);
                      const route = NOTIF_ROUTES[item.type];
                      if (route) {
                        setShowNotifs(false);
                        setTimeout(() => router.push(route as any), 150);
                      }
                    }}
                  >
                    <View style={[styles.notifIconBox, item.read && { opacity: 0.5 }]}>
                      <MaterialCommunityIcons name={NOTIF_ICONS[item.type] as any} size={20} color={colors.gold} />
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={[styles.notifTitle, item.read && { color: colors.textMuted }]}>{item.title}</Text>
                      <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                      <Text style={styles.notifTime}>{timeAgo(item.timestamp)}</Text>
                    </View>
                    {!item.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.cardBorder }} />}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal visible={showNotifSettings} transparent animationType="slide" onRequestClose={() => setShowNotifSettings(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowNotifSettings(false)}>
          <View style={styles.notifSettingsSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <View style={styles.notifSettingsHeader}>
              <Ionicons name="notifications-outline" size={20} color={colors.gold} />
              <Text style={styles.notifSettingsTitle}>{t('settingsNotifications')}</Text>
            </View>

            {/* Theme toggle */}
            <View style={styles.themeRow}>
              <Ionicons name="contrast-outline" size={16} color={colors.textMuted} />
              <Text style={styles.themeLabel}>{t('settingsTheme' as any) ?? 'Tema'}:</Text>
              {(['dark', 'light'] as const).map((t_) => {
                const active = (settings.theme ?? 'dark') === t_;
                const label  = t_ === 'dark' ? '🌙 Gece' : '☀️ Gündüz';
                return (
                  <TouchableOpacity
                    key={t_}
                    style={[styles.themeBtn, active && styles.themeBtnActive]}
                    onPress={() => updateSettings({ theme: t_ })}
                  >
                    <Text style={[styles.themeBtnText, active && styles.themeBtnTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Language quick-switcher */}
            <View style={styles.notifLangRow}>
              <Ionicons name="language-outline" size={16} color={colors.textMuted} />
              <Text style={styles.notifLangTitle}>{t('settingsLanguage')}:</Text>
              {(['tr', 'en', 'ar'] as Language[]).map((lang) => {
                const active = (settings.language ?? 'tr') === lang;
                const label = lang === 'tr' ? '🇹🇷 TR' : lang === 'en' ? '🇬🇧 EN' : '🇸🇦 AR';
                return (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.notifLangBtn, active && styles.notifLangBtnActive]}
                    onPress={() => handleLangChange(lang)}
                  >
                    <Text style={[styles.notifLangBtnText, active && styles.notifLangBtnTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {([
              { key: 'prayerTimes',   labelKey: 'notifPrayerTimes',   icon: 'clock-time-five-outline' },
              { key: 'earlyReminder', labelKey: 'notifEarlyReminder', icon: 'bell-ring-outline' },
              { key: 'dailyHadith',   labelKey: 'notifDailyHadith',   icon: 'format-quote-close' },
              { key: 'dailyDua',      labelKey: 'notifDailyDua',      icon: 'hands-pray' },
              { key: 'dhikrReminder', labelKey: 'notifDhikr',         icon: 'circle-outline' },
            ] as const).map((item, i, arr) => (
              <View key={item.key} style={[styles.notifSettingRow, i < arr.length - 1 && styles.notifSettingBorder]}>
                <MaterialCommunityIcons name={item.icon as any} size={18} color={colors.gold} style={styles.notifSettingIcon} />
                <Text style={styles.notifSettingLabel}>{t(item.labelKey as any)}</Text>
                <Switch
                  value={settings.notifications[item.key]}
                  onValueChange={() => toggleNotification(item.key)}
                  trackColor={{ false: colors.cardBorder, true: colors.gold + '66' }}
                  thumbColor={settings.notifications[item.key] ? colors.gold : colors.textMuted}
                />
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Hero with mosque background */}
        <ImageBackground source={mosqueImage} style={styles.hero} resizeMode="cover">
          <View style={styles.heroOverlay}>
            <SafeAreaView edges={['top']}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerBtn} />
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={14} color={colors.gold} />
                  <Text style={styles.cityText}>{location?.city ?? '...'}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.gold} />
                </View>
                <View style={styles.headerBtnGroup}>
                  <TouchableOpacity style={styles.headerBtn} onPress={() => setShowNotifSettings(true)}>
                    <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.headerBtn} onPress={() => setShowNotifs(true)}>
                    <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
                    {unreadCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date */}
              <View style={styles.dateContainer}>
                <Text style={styles.dayText}>{getDayName(now, language)}</Text>
                <Text style={styles.dateText}>{formatGregorianDate(now, language)}</Text>
                <Text style={styles.hijriText}>{formatHijriDate(now, language)}</Text>
              </View>

              {/* Next Prayer Card — countdown is the hero */}
              <View style={styles.nextPrayerCard}>
                {loading ? (
                  <ActivityIndicator color={colors.gold} size="large" />
                ) : (
                  <>
                    <View style={styles.nextPrayerLeft}>
                      <View style={styles.nextPrayerIconBox}>
                        <MaterialCommunityIcons
                          name={isNight ? 'moon-waning-crescent' : 'weather-sunny'}
                          size={20} color={colors.gold}
                        />
                      </View>
                      <View>
                        <Text style={styles.nextPrayerLabel}>{t('prayerNext').toUpperCase()}</Text>
                        <Text style={styles.nextPrayerName}>
                          {nextPrayer ? t(PRAYER_LABEL_KEYS[nextPrayer.key] as any) : t('homePrayerDone')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.countdownBox}>
                      <Text style={styles.countdownText}>{countdown}</Text>
                      <Text style={styles.countdownLabel}>K A L D I</Text>
                    </View>
                  </>
                )}
              </View>
            </SafeAreaView>
          </View>
        </ImageBackground>

        {/* Prayer Times */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Namaz Vakitleri</Text>
          <View style={styles.card}>
            {prayerKeys.map((key, i) => {
              const time = prayerTimes?.[key];
              const isPast = time ? time < now : false;
              const isNext = nextPrayer?.key === key;
              const isToggleable = toggleablePrayers.includes(key as any);
              const isDone = isToggleable && completion[key as keyof typeof completion];

              return (
                <View key={key} style={[styles.prayerRow, isNext && styles.prayerRowActive, i < 5 && styles.prayerRowBorder]}>
                  <View style={styles.prayerLeft}>
                    <MaterialCommunityIcons
                      name={PRAYER_ICONS[key] as any}
                      size={20}
                      color={isNext ? colors.gold : isPast ? colors.textMuted : colors.textSecondary}
                    />
                    <Text style={[styles.prayerName, isNext && { color: colors.gold }, isPast && !isNext && { color: colors.textMuted }]}>
                      {t(PRAYER_LABEL_KEYS[key] as any)}
                    </Text>
                  </View>
                  <View style={styles.prayerRight}>
                    <Text style={[styles.prayerTime, isNext && { color: colors.gold }, isPast && !isNext && { color: colors.textMuted }]}>
                      {time ? formatPrayerTime(time) : '--:--'}
                    </Text>
                    {isToggleable ? (
                      <TouchableOpacity
                        onPress={() => isPast && togglePrayer(todayKey, key as any)}
                        style={{ marginLeft: SPACING.sm, opacity: isPast ? 1 : 0.3 }}
                      >
                        <Ionicons
                          name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={isDone ? colors.green : colors.textMuted}
                        />
                      </TouchableOpacity>
                    ) : (
                      <Ionicons name="notifications-outline" size={18} color={colors.textMuted} style={{ marginLeft: SPACING.sm }} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Daily Hadith */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <MaterialIcons name="format-quote" size={20} color={colors.gold} />
              <Text style={styles.infoCardTitle}>{language === 'ar' ? 'حديث اليوم' : language === 'en' ? 'Daily Hadith' : 'Günün Hadisi'}</Text>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => setShareData({ type: 'hadith', text: hadithText, source: hadith.source })}
              >
                <Ionicons name="share-social-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.infoCardText, language === 'ar' && { textAlign: 'right' }]}>"{hadithText}"</Text>
            <Text style={styles.infoCardSource}>({hadith.source})</Text>
          </View>
        </View>

        {/* Daily Dua */}
        <View style={[styles.section, { marginBottom: SPACING.xl }]}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <MaterialCommunityIcons name="hands-pray" size={20} color={colors.gold} />
              <Text style={styles.infoCardTitle}>{language === 'ar' ? 'دعاء اليوم' : language === 'en' ? 'Daily Supplication' : 'Günün Duası'}</Text>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => setShareData({ type: 'dua', title: duaTitle, arabic: dua.arabic, turkish: duaMeaning, source: dua.source })}
              >
                <Ionicons name="share-social-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoCardTitle2}>{duaTitle}</Text>
            <Text style={styles.arabicText}>{dua.arabic}</Text>
            {language !== 'ar' && <Text style={styles.infoCardText}>{duaMeaning}</Text>}
            <Text style={styles.infoCardSource}>({dua.source})</Text>
          </View>
        </View>

        {/* Share Preview Modal */}
        {shareData && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setShareData(null)}>
            <View style={styles.shareModalBg}>
              <View style={styles.shareModalContent}>
                <Text style={styles.shareModalTitle}>Paylaşım Önizlemesi</Text>
                <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 1 }}>
                  <ShareCard data={shareData} />
                </ViewShot>
                <View style={styles.shareModalBtns}>
                  <TouchableOpacity style={styles.shareCancelBtn} onPress={() => setShareData(null)}>
                    <Text style={styles.shareCancelText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.shareConfirmBtn} onPress={captureAndShare}>
                    <Ionicons name="share-social" size={18} color={colors.background} />
                    <Text style={styles.shareConfirmText}>Paylaş</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
    </View>
  );
}

