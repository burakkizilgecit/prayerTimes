import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { usePrayerStore } from '../../store/usePrayerStore';
import { formatPrayerTime, getNextPrayer } from '../../services/prayerService';
import { formatGregorianDate } from '../../services/hijriService';
import { calculatePrayerTimes } from '../../services/prayerService';
import { useTranslation } from '../../i18n';

type RekatType = 'farz' | 'sunnet' | 'vacip';

interface PrayerPart {
  label: string;
  rakats: number;
  type: RekatType;
  note?: string;
}

interface PrayerInfo {
  nameKey: string;
  totalRakats: number;
  parts: PrayerPart[];
  tipKey: string;
}

const PRAYER_INFO_KEYS: Record<string, PrayerInfo> = {
  fajr: {
    nameKey: 'prayerInfoFajrName', totalRakats: 4, tipKey: 'prayerInfoFajrTip',
    parts: [
      { label: 'prayerInfoSunnet', rakats: 2, type: 'sunnet', note: 'prayerInfoSunnetMuakkede' },
      { label: 'prayerInfoFarz', rakats: 2, type: 'farz' },
    ],
  },
  dhuhr: {
    nameKey: 'prayerInfoDhuhrName', totalRakats: 10, tipKey: 'prayerInfoDhuhrTip',
    parts: [
      { label: 'prayerInfoFirstSunnet', rakats: 4, type: 'sunnet', note: 'prayerInfoSunnetMuakkede' },
      { label: 'prayerInfoFarz', rakats: 4, type: 'farz' },
      { label: 'prayerInfoLastSunnet', rakats: 2, type: 'sunnet', note: 'prayerInfoSunnetMuakkede' },
    ],
  },
  asr: {
    nameKey: 'prayerInfoAsrName', totalRakats: 8, tipKey: 'prayerInfoAsrTip',
    parts: [
      { label: 'prayerInfoSunnet', rakats: 4, type: 'sunnet', note: 'prayerInfoSunnetGayr' },
      { label: 'prayerInfoFarz', rakats: 4, type: 'farz' },
    ],
  },
  maghrib: {
    nameKey: 'prayerInfoMaghribName', totalRakats: 5, tipKey: 'prayerInfoMaghribTip',
    parts: [
      { label: 'prayerInfoFarz', rakats: 3, type: 'farz' },
      { label: 'prayerInfoSunnet', rakats: 2, type: 'sunnet', note: 'prayerInfoSunnetMuakkede' },
    ],
  },
  isha: {
    nameKey: 'prayerInfoIshaName', totalRakats: 13, tipKey: 'prayerInfoIshaTip',
    parts: [
      { label: 'prayerInfoFirstSunnet', rakats: 4, type: 'sunnet', note: 'prayerInfoSunnetGayr' },
      { label: 'prayerInfoFarz', rakats: 4, type: 'farz' },
      { label: 'prayerInfoLastSunnet', rakats: 2, type: 'sunnet', note: 'prayerInfoSunnetMuakkede' },
      { label: 'prayerInfoVitr', rakats: 3, type: 'vacip', note: 'prayerInfoVacipNote' },
    ],
  },
};

const PRAYER_ICONS: Record<string, string> = {
  fajr: 'weather-night', sunrise: 'weather-sunset-up',
  dhuhr: 'weather-sunny', asr: 'weather-partly-cloudy',
  maghrib: 'weather-sunset-down', isha: 'moon-waning-crescent',
};

const makeStyles = (colors: any, fs: (n: number) => number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, alignItems: 'center' },
  headerTitle: { color: colors.textPrimary, fontSize: fs(FONT_SIZE.xl), fontWeight: '700' },
  headerCity: { color: colors.gold, fontSize: fs(FONT_SIZE.sm), marginTop: 2 },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomColor: colors.cardBorder, borderBottomWidth: 1 },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dateCenterBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  dateNavText: { color: colors.textPrimary, fontSize: fs(FONT_SIZE.md), fontWeight: '600' },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  prayerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  prayerCardActive: { borderColor: colors.gold, backgroundColor: 'rgba(200,168,83,0.08)' },
  iconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(200,168,83,0.15)', alignItems: 'center', justifyContent: 'center' },
  iconCircleActive: { backgroundColor: colors.gold },
  prayerInfo: { flex: 1, marginLeft: SPACING.md },
  prayerName: { color: colors.textPrimary, fontSize: fs(FONT_SIZE.md), fontWeight: '600' },
  nextLabel: { color: colors.gold, fontSize: fs(FONT_SIZE.xs), marginTop: 2 },
  doneLabel: { color: colors.green, fontSize: fs(FONT_SIZE.xs), marginTop: 2 },
  pastLabel: { color: colors.textMuted, fontSize: fs(FONT_SIZE.xs), marginTop: 2 },
  prayerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  prayerTime: { color: colors.textPrimary, fontSize: fs(FONT_SIZE.lg), fontWeight: '700' },
  checkBtn: { marginLeft: SPACING.xs },
  weekCard: { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.sm, marginBottom: SPACING.xl },
  weekTitle: { color: colors.textSecondary, fontSize: fs(FONT_SIZE.sm), fontWeight: '600', marginBottom: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.sm },
  weekDayActive: { backgroundColor: 'rgba(200,168,83,0.15)' },
  weekDayLabel: { color: colors.textMuted, fontSize: fs(FONT_SIZE.xs), marginBottom: 4 },
  weekDayNum: { color: colors.textSecondary, fontSize: fs(FONT_SIZE.sm), fontWeight: '600' },
  prayerNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoBtn:        { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  infoBtnText:    { color: colors.textMuted, fontSize: 10, fontWeight: '700', lineHeight: 13 },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:     { backgroundColor: colors.cardBg, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xl },
  modalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  modalTitle:     { color: colors.textPrimary, fontSize: fs(FONT_SIZE.lg), fontWeight: '700' },
  modalClose:     { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  totalRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(200,168,83,0.1)', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginBottom: SPACING.md },
  totalLabel:     { color: colors.textSecondary, fontSize: fs(FONT_SIZE.sm), fontWeight: '600' },
  totalValue:     { color: colors.gold, fontSize: fs(FONT_SIZE.md), fontWeight: '700' },
  partsTable:     { borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, marginBottom: SPACING.md },
  tableHeader:    { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  tableCell:      { color: colors.textMuted, fontSize: fs(FONT_SIZE.xs), fontWeight: '600', textTransform: 'uppercase', width: 40, textAlign: 'center' },
  tableCellFlex:  { flex: 1 },
  tableCellType:  { width: 72, alignItems: 'center' },
  tableRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm },
  tableRowAlt:    { backgroundColor: 'rgba(255,255,255,0.03)' },
  partLabel:      { color: colors.textPrimary, fontSize: fs(FONT_SIZE.sm), fontWeight: '600' },
  partNote:       { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  partRakats:     { color: colors.textPrimary, fontSize: fs(FONT_SIZE.md), fontWeight: '700', width: 40, textAlign: 'center' },
  typeBadge:      { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(76,175,80,0.15)' },
  typeFarz:       { backgroundColor: 'rgba(200,168,83,0.15)' },
  typeVacip:      { backgroundColor: 'rgba(229,115,115,0.15)' },
  typeBadgeText:  { color: colors.green, fontSize: 10, fontWeight: '700' },
  tipBox:         { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(200,168,83,0.07)', borderRadius: RADIUS.md, padding: SPACING.sm, borderLeftWidth: 2, borderLeftColor: colors.gold },
  tipText:        { flex: 1, color: colors.textSecondary, fontSize: fs(FONT_SIZE.xs), lineHeight: 18 },
});

export default function PrayerTimesScreen() {
  const { colors, fs } = useTheme();
  const { prayerTimes, location, togglePrayer, getTodayCompletion } = usePrayerStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shownTimes, setShownTimes] = useState(prayerTimes);
  const [infoModal, setInfoModal] = useState<{ key: string; info: PrayerInfo } | null>(null);
  const { t, language } = useTranslation();
  const now = new Date();
  const todayKey = now.toISOString().split('T')[0];
  const completion = getTodayCompletion();
  const nextPrayer = prayerTimes ? getNextPrayer(prayerTimes) : null;
  const PRAYER_LABEL_KEYS: Record<string, string> = {
    fajr: 'prayerFajr', sunrise: 'prayerSunrise', dhuhr: 'prayerDhuhr',
    asr: 'prayerAsr', maghrib: 'prayerMaghrib', isha: 'prayerIsha',
  };
  const styles = React.useMemo(() => makeStyles(colors, fs), [colors, fs]);
  const DAY_KEYS = ['daySun','dayMon','dayTue','dayWed','dayThu','dayFri','daySat'] as const;
  const isToday = selectedDate.toDateString() === now.toDateString();

  useEffect(() => {
    if (!location) return;
    setShownTimes(calculatePrayerTimes(location.lat, location.lng, selectedDate));
  }, [selectedDate, location]);

  const changeDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const toggleablePrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('prayerTimesTitle')}</Text>
        <Text style={styles.headerCity}>{location?.city ?? '...'}</Text>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => changeDay(-1)} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.gold} />
        </TouchableOpacity>
        <View style={styles.dateCenterBox}>
          <Text style={styles.dateNavText}>{formatGregorianDate(selectedDate, language)}</Text>
          {isToday && <View style={styles.todayDot} />}
        </View>
        <TouchableOpacity onPress={() => changeDay(1)} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={colors.gold} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.md }}>
        {/* Prayer Times Cards */}
        {(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((key) => {
          const time = shownTimes?.[key];
          const isPast = time ? time < now : false;
          const isNext = isToday && nextPrayer?.key === key;
          const isToggleable = toggleablePrayers.includes(key as any);
          const isDone = isToday && isToggleable && completion[key as keyof typeof completion];

          return (
            <View key={key} style={[styles.prayerCard, isNext && styles.prayerCardActive]}>
              <View style={[styles.iconCircle, isNext && styles.iconCircleActive]}>
                <MaterialCommunityIcons
                  name={PRAYER_ICONS[key] as any}
                  size={24}
                  color={isNext ? colors.background : isDone ? colors.green : colors.gold}
                />
              </View>
              <View style={styles.prayerInfo}>
                <View style={styles.prayerNameRow}>
                  <Text style={[styles.prayerName, isNext && { color: colors.gold }]}>{t(PRAYER_LABEL_KEYS[key] as any)}</Text>
                  {PRAYER_INFO_KEYS[key] && (
                    <TouchableOpacity
                      style={styles.infoBtn}
                      onPress={() => setInfoModal({ key, info: PRAYER_INFO_KEYS[key] })}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.infoBtnText}>i</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {isNext && <Text style={styles.nextLabel}>{t('prayerNext')}</Text>}
                {isDone && <Text style={styles.doneLabel}>{t('prayerDoneLabel')}</Text>}
                {isPast && !isNext && !isDone && isToday && (
                  <Text style={styles.pastLabel}>{t('prayerPast')}</Text>
                )}
              </View>
              <View style={styles.prayerRight}>
                <Text style={[styles.prayerTime, isNext && { color: colors.gold }, isPast && !isNext && { color: colors.textMuted }]}>
                  {time ? formatPrayerTime(time) : '--:--'}
                </Text>
                {isToday && isToggleable && (
                  <TouchableOpacity
                    onPress={() => isPast && togglePrayer(todayKey, key as any)}
                    style={[styles.checkBtn, !isPast && { opacity: 0.3 }]}
                  >
                    <Ionicons
                      name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                      size={26}
                      color={isDone ? colors.green : colors.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {/* Prayer Info Modal */}
        <Modal visible={!!infoModal} transparent animationType="fade" onRequestClose={() => setInfoModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setInfoModal(null)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{infoModal ? t(infoModal.info.nameKey as any) : ''}</Text>
                <TouchableOpacity onPress={() => setInfoModal(null)} style={styles.modalClose}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('prayerInfoTotal')}</Text>
                <Text style={styles.totalValue}>{infoModal?.info.totalRakats} {t('prayerInfoRakats')}</Text>
              </View>

              <View style={styles.partsTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.tableCellFlex]}>{t('prayerInfoName')}</Text>
                  <Text style={styles.tableCell}>{t('prayerInfoRakats')}</Text>
                  <Text style={[styles.tableCell, styles.tableCellType]}>{t('prayerInfoType')}</Text>
                </View>
                {infoModal?.info.parts.map((part, idx) => (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                    <View style={styles.tableCellFlex}>
                      <Text style={styles.partLabel}>{t(part.label as any)}</Text>
                      {part.note && <Text style={styles.partNote}>{t(part.note as any)}</Text>}
                    </View>
                    <Text style={styles.partRakats}>{part.rakats}</Text>
                    <View style={styles.tableCellType}>
                      <View style={[styles.typeBadge,
                        part.type === 'farz' && styles.typeFarz,
                        part.type === 'vacip' && styles.typeVacip,
                      ]}>
                        <Text style={[styles.typeBadgeText,
                          part.type === 'farz' && { color: colors.gold },
                          part.type === 'vacip' && { color: '#e57373' },
                        ]}>{t(('prayerType' + part.type.charAt(0).toUpperCase() + part.type.slice(1)) as any)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {infoModal?.info.tipKey && (
                <View style={styles.tipBox}>
                  <Ionicons name="bulb-outline" size={14} color={colors.gold} style={{ marginTop: 1 }} />
                  <Text style={styles.tipText}>{t(infoModal.info.tipKey as any)}</Text>
                </View>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Weekly Summary */}
        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>{t('weeklyTitle')}</Text>
          <View style={styles.weekRow}>
            {DAY_KEYS.map((dayKey, i) => {
              const day = t(dayKey);
              const d = new Date();
              const dayOfWeek = d.getDay() === 0 ? 6 : d.getDay() - 1;
              const diff = i - dayOfWeek;
              const weekDate = new Date(d);
              weekDate.setDate(d.getDate() + diff);
              const isToday = weekDate.toDateString() === now.toDateString();
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.weekDay, isToday && styles.weekDayActive]}
                  onPress={() => setSelectedDate(weekDate)}
                >
                  <Text style={[styles.weekDayLabel, isToday && { color: colors.gold }]}>{day}</Text>
                  <Text style={[styles.weekDayNum, isToday && { color: colors.gold }]}>{weekDate.getDate()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

