import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Switch, StatusBar, Modal, Linking, ActivityIndicator, Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { useTutorialStore } from '../store/useTutorialStore';
import type { NotificationSound } from '../store/useSettingsStore';
import { useTranslation, applyRTL, type Language } from '../i18n';
import { pickSystemRingtone, pickAudioFile } from '../services/soundPickerService';
import { setupCustomNotificationChannel } from '../services/notificationService';
import { scheduleAllNotifications } from '../services/notificationService';
import { usePrayerStore } from '../store/usePrayerStore';

const SOUNDS: { key: NotificationSound; label: string; desc: string; icon: string; file: any }[] = [
  {
    key: 'ezan',
    label: 'Ezan',
    desc: 'Geleneksel Arapça ezan sesi',
    icon: 'mosque',
    file: require('../assets/sounds/ezan.mp3'),
  },
  {
    key: 'ilahi',
    label: 'İlahi',
    desc: 'Türkçe dinî ilahi melodisi',
    icon: 'music-note',
    file: require('../assets/sounds/ilahi.mp3'),
  },
];
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../constants/theme';
import { useSettingsStore, type AppSettings } from '../store/useSettingsStore';

const PRIVACY_POLICY_URL = 'https://burakkizilgecit.github.io/islamicibadet-privacy/privacy-policy.html';
const APP_VERSION = '1.0.0';

type NotifKey = keyof AppSettings['notifications'];

interface SettingItem {
  key: NotifKey;
  label: string;
  desc: string;
  icon: string;
}

const NOTIFICATION_SETTINGS: SettingItem[] = [
  { key: 'prayerTimes',   label: 'Namaz Vakitleri',         desc: 'Tüm vakitler için bildirim al',    icon: 'clock-time-five-outline' },
  { key: 'earlyReminder', label: 'Vakit Öncesi Hatırlatma', desc: 'Namazdan 10 dk önce hatırlat',     icon: 'bell-ring-outline' },
  { key: 'dailyHadith',   label: 'Günlük Hadis',            desc: 'Her gün yeni hadis bildirimi al',  icon: 'format-quote-close' },
  { key: 'dailyDua',      label: 'Günlük Dua',              desc: 'Her gün yeni dua bildirimi al',    icon: 'hands-pray' },
  { key: 'dhikrReminder', label: 'Zikir Hatırlatması',      desc: 'Bugünkü zikiri hatırlatır',        icon: 'circle-outline' },
  { key: 'islamicDays',   label: 'Dini Günler',             desc: 'Bayramlar, kandiller için bildirim', icon: 'calendar-star' },
];

// ── Time Picker ──────────────────────────────────────────────────────────────

interface TimeParts { h: number; m: number }

function parseTime(t: string): TimeParts {
  const [h, m] = t.split(':').map(Number);
  return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
}
function fmt(p: TimeParts) {
  return `${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}`;
}

interface TimePickerProps {
  visible: boolean;
  startTime: string;
  endTime: string;
  onSave: (start: string, end: string) => void;
  onClose: () => void;
}

function TimePicker({ visible, startTime, endTime, onSave, onClose }: TimePickerProps) {
  const [start, setStart] = useState<TimeParts>(parseTime(startTime));
  const [end, setEnd] = useState<TimeParts>(parseTime(endTime));

  const adjust = (which: 'start' | 'end', field: 'h' | 'm', delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const max = field === 'h' ? 24 : 60;
    const setter = which === 'start' ? setStart : setEnd;
    setter(prev => ({ ...prev, [field]: (prev[field] + delta + max) % max }));
  };

  const Wheel = ({ value, field, which }: { value: number; field: 'h' | 'm'; which: 'start' | 'end' }) => (
    <View style={styles.wheel}>
      <TouchableOpacity onPress={() => adjust(which, field, 1)} style={styles.wheelBtn} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
        <Ionicons name="chevron-up" size={22} color={COLORS.gold} />
      </TouchableOpacity>
      <Text style={styles.wheelValue}>{String(value).padStart(2, '0')}</Text>
      <TouchableOpacity onPress={() => adjust(which, field, -1)} style={styles.wheelBtn} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
        <Ionicons name="chevron-down" size={22} color={COLORS.gold} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>Sessiz Saatler</Text>
          <Text style={styles.pickerHint}>Bu saatler arasında bildirim gönderilmez.</Text>

          <View style={styles.pickerRow}>
            {/* Start */}
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Başlangıç</Text>
              <View style={styles.timeDisplay}>
                <Wheel value={start.h} field="h" which="start" />
                <Text style={styles.timeSep}>:</Text>
                <Wheel value={start.m} field="m" which="start" />
              </View>
            </View>

            <View style={styles.pickerArrow}>
              <Ionicons name="arrow-forward" size={20} color={COLORS.textMuted} />
            </View>

            {/* End */}
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Bitiş</Text>
              <View style={styles.timeDisplay}>
                <Wheel value={end.h} field="h" which="end" />
                <Text style={styles.timeSep}>:</Text>
                <Wheel value={end.m} field="m" which="end" />
              </View>
            </View>
          </View>

          <View style={styles.pickerBtns}>
            <TouchableOpacity style={styles.pickerCancelBtn} onPress={onClose}>
              <Text style={styles.pickerCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pickerSaveBtn}
              onPress={() => { onSave(fmt(start), fmt(end)); onClose(); }}
            >
              <Text style={styles.pickerSaveText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, toggleNotification, updateSettings } = useSettingsStore();
  const { reset: resetTutorial } = useTutorialStore();
  const location = usePrayerStore(s => s.location);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [isSoundLoading, setIsSoundLoading] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const stopPreview = async () => {
    if (soundRef.current) { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null; }
    setPlayingKey(null);
  };

  const previewSound = async (sound: NotificationSound) => {
    try {
      if (playingKey === sound) { await stopPreview(); return; }
      await stopPreview();
      const file = SOUNDS.find(s => s.key === sound)?.file;
      if (!file) return;
      setPlayingKey(sound);
      const { sound: s } = await Audio.Sound.createAsync(file, { shouldPlay: true });
      soundRef.current = s;
      s.setOnPlaybackStatusUpdate(st => {
        if (st.isLoaded && st.didJustFinish) { s.unloadAsync(); setPlayingKey(null); }
      });
    } catch { setPlayingKey(null); }
  };

  const previewCustomSound = async (uri: string) => {
    try {
      if (playingKey === 'custom') { await stopPreview(); return; }
      await stopPreview();
      setPlayingKey('custom');
      const { sound: s } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
      soundRef.current = s;
      s.setOnPlaybackStatusUpdate(st => {
        if (st.isLoaded && st.didJustFinish) { s.unloadAsync(); setPlayingKey(null); }
      });
    } catch { setPlayingKey(null); }
  };

  const applyCustomSound = async (uri: string, name: string) => {
    setShowSoundPicker(false);
    setIsSoundLoading(true);
    try {
      await setupCustomNotificationChannel(uri);
      updateSettings({ notificationSound: 'custom', customSoundUri: uri, customSoundName: name });
      if (location) {
        await scheduleAllNotifications(location.lat, location.lng, {
          ...settings,
          notificationSound: 'custom',
          customSoundUri: uri,
          customSoundName: name,
        });
      }
    } catch {
      Alert.alert('Hata', 'Ses ayarlanamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsSoundLoading(false);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handlePickRingtone = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Bilgi', 'Zil sesi seçimi yalnızca Android\'de desteklenmektedir.');
      return;
    }
    setShowSoundPicker(false);
    const picked = await pickSystemRingtone();
    if (picked) await applyCustomSound(picked.uri, picked.name);
  };

  const handlePickAudioFile = async () => {
    setShowSoundPicker(false);
    const picked = await pickAudioFile();
    if (picked) await applyCustomSound(picked.uri, picked.name);
  };

  const { t } = useTranslation();

  const handleLanguageChange = (lang: Language) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ language: lang });
    const needsRestart = applyRTL(lang);
    if (needsRestart) {
      Alert.alert(
        lang === 'ar' ? 'إعادة التشغيل مطلوبة' : 'Yeniden Başlatma',
        lang === 'ar' ? 'أغلق التطبيق وأعد فتحه لتفعيل اللغة العربية.' : 'Dil değişikliğinin tam olarak uygulanması için uygulamayı kapatıp yeniden açın.',
        [{ text: lang === 'ar' ? 'حسناً' : 'Tamam' }]
      );
    }
  };

  const handleReplayTutorial = async () => {
    await resetTutorial();
    router.replace('/tutorial' as any);
  };

  const handleVibrationToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateSettings({ vibration: !settings.vibration });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <TimePicker
        visible={showTimePicker}
        startTime={settings.silentHours.start}
        endTime={settings.silentHours.end}
        onSave={(start, end) => updateSettings({ silentHours: { start, end } })}
        onClose={() => setShowTimePicker(false)}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Sound Picker Modal */}
      <Modal visible={showSoundPicker} transparent animationType="fade" onRequestClose={() => setShowSoundPicker(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Ses Kaynağı Seç</Text>
            <Text style={styles.pickerHint}>Bildirim sesi için kaynak türünü belirleyin.</Text>

            <TouchableOpacity style={styles.soundPickerRow} onPress={handlePickRingtone} activeOpacity={0.7}>
              <View style={styles.soundPickerIconBox}>
                <Ionicons name="musical-notes-outline" size={22} color={COLORS.gold} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Zil Seslerinden Seç</Text>
                <Text style={styles.settingDesc2}>Telefonunuzdaki sistem zil seslerini görüntüleyin</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: COLORS.cardBorder, marginVertical: SPACING.xs }} />

            <TouchableOpacity style={styles.soundPickerRow} onPress={handlePickAudioFile} activeOpacity={0.7}>
              <View style={styles.soundPickerIconBox}>
                <Ionicons name="folder-open-outline" size={22} color={COLORS.gold} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Ses Dosyasından Seç</Text>
                <Text style={styles.settingDesc2}>Müzik, ses kaydı veya herhangi bir ses dosyası</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.pickerCancelBtn, { marginTop: SPACING.md }]} onPress={() => setShowSoundPicker(false)}>
              <Text style={styles.pickerCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.md }}>
        {/* Notification Settings */}
        <Text style={styles.sectionTitle}>Bildirim Ayarları</Text>
        <Text style={styles.sectionDesc}>Önemli hatırlatmalar için bildirimleri ayarlayabilirsiniz.</Text>
        <View style={styles.card}>
          {NOTIFICATION_SETTINGS.map((item, i) => (
            <View key={item.key} style={[styles.settingRow, i < NOTIFICATION_SETTINGS.length - 1 && styles.rowBorder]}>
              <View style={styles.settingIcon}>
                <MaterialCommunityIcons name={item.icon as any} size={20} color={COLORS.gold} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Text style={styles.settingDesc2}>{item.desc}</Text>
              </View>
              <Switch
                value={settings.notifications[item.key]}
                onValueChange={() => toggleNotification(item.key)}
                trackColor={{ false: COLORS.cardBorder, true: COLORS.gold + '66' }}
                thumbColor={settings.notifications[item.key] ? COLORS.gold : COLORS.textMuted}
              />
            </View>
          ))}
        </View>

        {/* Language */}
        <Text style={styles.sectionTitle}>{t('settingsLanguage')}</Text>
        <Text style={styles.sectionDesc}>{t('settingsLanguageDesc')}</Text>
        <View style={styles.langCard}>
          {(['tr', 'en', 'ar'] as Language[]).map((lang) => {
            const active = (settings.language ?? 'tr') === lang;
            const label = lang === 'tr' ? 'Türkçe' : lang === 'en' ? 'English' : 'العربية';
            const flag  = lang === 'tr' ? '🇹🇷' : lang === 'en' ? '🇬🇧' : '🇸🇦';
            return (
              <TouchableOpacity
                key={lang}
                style={[styles.langBtn, active && styles.langBtnActive]}
                onPress={() => handleLanguageChange(lang)}
                activeOpacity={0.75}
              >
                <Text style={styles.langFlag}>{flag}</Text>
                <Text style={[styles.langLabel, active && styles.langLabelActive]}>{label}</Text>
                {active && <View style={styles.langDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notification Sound */}
        <Text style={styles.sectionTitle}>{t('settingsSound')}</Text>
        <Text style={styles.sectionDesc}>Namaz vakti bildirimlerinde çalacak sesi seçin.</Text>
        <View style={styles.card}>
          {SOUNDS.map((s) => {
            const active = settings.notificationSound === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.soundRow, styles.rowBorder]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateSettings({ notificationSound: s.key }); }}
                activeOpacity={0.7}
              >
                <View style={[styles.soundIconBox, active && styles.soundIconBoxActive]}>
                  <MaterialCommunityIcons name={s.icon as any} size={20} color={active ? COLORS.background : COLORS.gold} />
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, active && { color: COLORS.gold }]}>{s.label}</Text>
                  <Text style={styles.settingDesc2}>{s.desc}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.previewBtn, playingKey === s.key && styles.previewBtnActive]}
                  onPress={() => previewSound(s.key)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={playingKey === s.key ? 'pause-circle' : 'play-circle-outline'}
                    size={24}
                    color={playingKey === s.key ? COLORS.gold : COLORS.textMuted}
                  />
                </TouchableOpacity>
                <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                  {active && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Custom sound from device */}
          {(() => {
            const active = settings.notificationSound === 'custom';
            const hasCustom = !!settings.customSoundUri;
            return (
              <TouchableOpacity
                style={styles.soundRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSoundPicker(true);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.soundIconBox, active && styles.soundIconBoxActive]}>
                  {isSoundLoading
                    ? <ActivityIndicator size="small" color={active ? COLORS.background : COLORS.gold} />
                    : <Ionicons name="phone-portrait-outline" size={20} color={active ? COLORS.background : COLORS.gold} />
                  }
                </View>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingLabel, active && { color: COLORS.gold }]}>
                    {active && hasCustom ? settings.customSoundName! : 'Telefondan Seç'}
                  </Text>
                  <Text style={styles.settingDesc2}>
                    {active ? 'Değiştirmek için dokun' : 'Zil sesi veya ses dosyası seç'}
                  </Text>
                </View>
                {active && hasCustom && (
                  <TouchableOpacity
                    style={[styles.previewBtn, playingKey === 'custom' && styles.previewBtnActive]}
                    onPress={() => previewCustomSound(settings.customSoundUri!)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={playingKey === 'custom' ? 'pause-circle' : 'play-circle-outline'}
                      size={24}
                      color={playingKey === 'custom' ? COLORS.gold : COLORS.textMuted}
                    />
                  </TouchableOpacity>
                )}
                <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                  {active && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* Other Settings */}
        <Text style={styles.sectionTitle}>Diğer Ayarlar</Text>
        <View style={styles.card}>
          {/* Silent Hours */}
          <TouchableOpacity
            style={[styles.settingRow, styles.rowBorder]}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="moon-outline" size={20} color={COLORS.gold} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sessiz Saatler</Text>
              <Text style={styles.settingDesc2}>Bu saatler arasında bildirim gelmez</Text>
            </View>
            <View style={styles.valueRow}>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>{settings.silentHours.start}</Text>
              </View>
              <Text style={styles.timeDash}>–</Text>
              <View style={styles.timeBadge}>
                <Text style={styles.timeBadgeText}>{settings.silentHours.end}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          {/* Vibration */}
          <View style={[styles.settingRow, styles.rowBorder]}>
            <View style={styles.settingIcon}>
              <Ionicons name="phone-portrait-outline" size={20} color={COLORS.gold} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Titreşim</Text>
              <Text style={styles.settingDesc2}>Bildirimlerde titreşim {settings.vibration ? 'açık' : 'kapalı'}</Text>
            </View>
            <Switch
              value={settings.vibration}
              onValueChange={handleVibrationToggle}
              trackColor={{ false: COLORS.cardBorder, true: COLORS.gold + '66' }}
              thumbColor={settings.vibration ? COLORS.gold : COLORS.textMuted}
            />
          </View>

          {/* Calculation Method */}
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="location-outline" size={20} color={COLORS.gold} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Hesaplama Metodu</Text>
              <Text style={styles.settingDesc2}>Namaz vakti hesaplama yöntemi</Text>
            </View>
            <View style={styles.valueRow}>
              <Text style={styles.valueText}>{settings.calculationMethod}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </View>
          </View>
        </View>

        {/* Hakkında */}
        <Text style={styles.sectionTitle}>Hakkında</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.settingRow, styles.rowBorder]}
            onPress={handleReplayTutorial}
            activeOpacity={0.7}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="play-circle-outline" size={20} color={COLORS.gold} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Tanıtımı Tekrar Gör</Text>
              <Text style={styles.settingDesc2}>Uygulama kullanım kılavuzunu baştan izle</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, styles.rowBorder]}
            onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
            activeOpacity={0.7}
          >
            <View style={styles.settingIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.gold} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Gizlilik Politikası</Text>
              <Text style={styles.settingDesc2}>Verilerinizin nasıl kullanıldığını öğrenin</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>

          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.gold} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Uygulama Sürümü</Text>
              <Text style={styles.settingDesc2}>İbadet Rehberi v{APP_VERSION}</Text>
            </View>
          </View>
        </View>

        <View style={styles.appInfo}>
          <MaterialCommunityIcons name="mosque" size={32} color={COLORS.gold} style={{ opacity: 0.5 }} />
          <Text style={styles.appName}>İbadet Rehberi</Text>
          <Text style={styles.appVersion}>Sürüm {APP_VERSION}</Text>
          <Text style={styles.appCopyright}>© 2025 Tüm hakları saklıdır.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xl, fontWeight: '700' },
  sectionTitle: { color: COLORS.gold, fontSize: FONT_SIZE.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.xs, marginTop: SPACING.lg },
  sectionDesc: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginBottom: SPACING.sm },
  card: { backgroundColor: COLORS.cardBg, borderColor: COLORS.cardBorder, borderWidth: 1, borderRadius: RADIUS.lg, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2, gap: SPACING.sm },
  rowBorder: { borderBottomColor: COLORS.cardBorder, borderBottomWidth: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(200,168,83,0.12)', alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1 },
  settingLabel: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: '500' },
  settingDesc2: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  valueText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs },
  timeBadge: { backgroundColor: 'rgba(200,168,83,0.15)', borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(200,168,83,0.3)' },
  timeBadgeText: { color: COLORS.gold, fontSize: FONT_SIZE.sm, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timeDash: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  appInfo: { alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.xl, gap: SPACING.xs },
  appName: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, fontWeight: '600' },
  appVersion: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  appCopyright: { color: COLORS.textMuted, fontSize: 10 },

  soundRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2, gap: SPACING.sm },
  soundIconBox:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(200,168,83,0.12)', alignItems: 'center', justifyContent: 'center' },
  soundIconBoxActive:{ backgroundColor: COLORS.gold },
  previewBtn:        { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  previewBtnActive:  { opacity: 1 },
  radioOuter:        { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.cardBorder, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive:  { borderColor: COLORS.gold },
  radioInner:        { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.gold },

  langCard:          { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  langBtn:           { flex: 1, alignItems: 'center', paddingVertical: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.cardBorder, gap: 4 },
  langBtnActive:     { borderColor: COLORS.gold, backgroundColor: 'rgba(200,168,83,0.1)' },
  langFlag:          { fontSize: 22 },
  langLabel:         { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  langLabelActive:   { color: COLORS.gold, fontWeight: '800' },
  langDot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gold },

  soundPickerRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 4, gap: SPACING.sm },
  soundPickerIconBox:{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(200,168,83,0.12)', alignItems: 'center', justifyContent: 'center' },

  // Time Picker Modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  pickerCard: { width: '88%', backgroundColor: COLORS.cardBg, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.cardBorder, padding: SPACING.lg },
  pickerTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  pickerHint: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, textAlign: 'center', marginBottom: SPACING.lg },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  pickerSection: { alignItems: 'center', flex: 1 },
  pickerLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  timeDisplay: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeSep: { color: COLORS.gold, fontSize: 28, fontWeight: '700', marginBottom: 4 },
  pickerArrow: { paddingHorizontal: SPACING.sm, marginTop: 20 },
  wheel: { alignItems: 'center', gap: SPACING.xs },
  wheelBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  wheelValue: { color: COLORS.textPrimary, fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 44, textAlign: 'center' },
  pickerBtns: { flexDirection: 'row', gap: SPACING.sm },
  pickerCancelBtn: { flex: 1, padding: SPACING.sm + 2, borderRadius: RADIUS.lg, backgroundColor: COLORS.cardBorder, alignItems: 'center' },
  pickerCancelText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  pickerSaveBtn: { flex: 1, padding: SPACING.sm + 2, borderRadius: RADIUS.lg, backgroundColor: COLORS.gold, alignItems: 'center' },
  pickerSaveText: { color: COLORS.background, fontSize: FONT_SIZE.sm, fontWeight: '700' },
});
