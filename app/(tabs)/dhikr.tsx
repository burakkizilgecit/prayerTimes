import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Animated, Modal, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from '../../i18n';
import { SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useDhikrStore } from '../../store/useDhikrStore';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = SPACING.sm;
const CARD_W = (SCREEN_W - SPACING.md * 2 - CARD_GAP) / 2;
const RING_R = 44;
const RING_CIRCUM = 2 * Math.PI * RING_R;

const makeStyles = (colors: any, fs: (n: number) => number) => StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2 },
  headerTitle:   { color: colors.textPrimary, fontSize: fs(FONT_SIZE.xxl), fontWeight: '800' },
  historyBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: RADIUS.md, borderColor: colors.cardBorderActive, borderWidth: 1 },
  tabs:          { flexDirection: 'row', marginHorizontal: SPACING.md, backgroundColor: colors.surface, borderRadius: RADIUS.full, padding: 4, borderColor: colors.cardBorderActive, borderWidth: 1, marginBottom: SPACING.md },
  tab:           { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.full },
  tabActive:     { backgroundColor: colors.gold },
  tabLabel:      { color: colors.textMuted, fontSize: fs(FONT_SIZE.sm), fontWeight: '600' },
  tabLabelActive:{ color: colors.background, fontWeight: '800' },

  grid:          { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: CARD_GAP, marginBottom: SPACING.md },
  card:          { width: CARD_W, backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: RADIUS.xl, alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm },
  cardDone:      { borderColor: colors.gold },
  cardName:      { color: colors.textMuted, fontSize: fs(9), fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.sm, textAlign: 'center' },
  ringWrap:      { width: 108, height: 108, alignItems: 'center', justifyContent: 'center' },
  ringCenter:    { position: 'absolute', alignItems: 'center' },
  countValue:    { color: colors.textPrimary, fontSize: fs(30), fontWeight: '800', lineHeight: 34, fontVariant: ['tabular-nums'] },
  countTarget:   { color: colors.textMuted, fontSize: fs(11), fontVariant: ['tabular-nums'] },

  resetBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: colors.surface, borderColor: colors.cardBorderActive, borderWidth: 1, borderRadius: RADIUS.xl, paddingVertical: SPACING.sm + 4, marginHorizontal: SPACING.md, marginBottom: SPACING.md },
  resetText:     { color: colors.textSecondary, fontSize: fs(FONT_SIZE.sm), fontWeight: '600' },

  weekSection:   { marginHorizontal: SPACING.md, backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.xl },
  weekHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  weekTitle:     { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  weekTotal:     { color: colors.gold, fontSize: fs(FONT_SIZE.sm), fontWeight: '700' },
  weekBars:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 90 },
  weekBarCol:    { flex: 1, alignItems: 'center', gap: 4 },
  weekBarValue:  { color: colors.textMuted, fontSize: 9 },
  weekBarTrack:  { width: 22, height: 60, backgroundColor: colors.surface, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  weekBarFill:   { backgroundColor: colors.gold, borderRadius: 6, width: '100%' },
  weekBarDay:    { color: colors.textMuted, fontSize: fs(FONT_SIZE.xs) },
  reminderBanner:{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: colors.goldGlow, borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm },
  reminderText:  { color: colors.textSecondary, fontSize: fs(FONT_SIZE.sm) },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: colors.cardBg, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, paddingBottom: SPACING.xl },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.lg },
  modalTitle:    { color: colors.textPrimary, fontSize: fs(FONT_SIZE.lg), fontWeight: '700' },
  modalClose:    { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modalBars:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: SPACING.lg },
  modalBarCol:   { flex: 1, alignItems: 'center', gap: 4 },
  modalBarValue: { color: colors.textSecondary, fontSize: fs(FONT_SIZE.xs), fontWeight: '600' },
  modalBarTrack: { width: 28, backgroundColor: colors.surface, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  modalTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(200,168,83,0.1)', borderRadius: RADIUS.md, padding: SPACING.md },
  modalTotalLabel:{ color: colors.textSecondary, fontSize: fs(FONT_SIZE.sm), fontWeight: '600' },
  modalTotalValue:{ color: colors.gold, fontSize: fs(FONT_SIZE.lg), fontWeight: '800' },
});

const CATEGORIES = [
  { id: 'tespih', label: 'Tespih' },
  { id: 'salavat', label: 'Salavat' },
  { id: 'istigfar', label: 'İstiğfar' },
  { id: 'diger', label: 'Diğer' },
] as const;

function DhikrCard({ item, onPress, colors, fs }: {
  item: { id: string; name: string; count: number; target: number };
  onPress: () => void;
  colors: any;
  fs: (n: number) => number;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const styles = React.useMemo(() => makeStyles(colors, fs), [colors, fs]);
  const progress = Math.min(item.count / item.target, 1);
  const offset = RING_CIRCUM * (1 - progress);
  const done = item.count >= item.target;

  const handlePress = () => {
    onPress();
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, tension: 300, friction: 8 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 6 }),
    ]).start();
  };

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
      <Animated.View style={[styles.card, done && styles.cardDone, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.ringWrap}>
          <Svg width={108} height={108} viewBox="0 0 108 108">
            <Circle cx="54" cy="54" r={RING_R} stroke={colors.cardBorder} strokeWidth={8} fill="none" />
            <Circle
              cx="54" cy="54" r={RING_R}
              stroke={done ? colors.green : colors.gold}
              strokeWidth={8}
              fill="none"
              strokeDasharray={RING_CIRCUM}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 54 54)"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.countValue, done && { color: colors.green }]}>{item.count}</Text>
            <Text style={styles.countTarget}>/ {item.target}</Text>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function DhikrScreen() {
  const { colors, fs } = useTheme();
  const { t } = useTranslation();
  const { items, activeCategory, increment, reset, setCategory, getTotalToday, loadData, getWeeklyHistory } = useDhikrStore();
  const [showHistory, setShowHistory] = useState(false);
  const styles = React.useMemo(() => makeStyles(colors, fs), [colors, fs]);

  useEffect(() => { loadData(); }, []);

  const filteredItems = items.filter(i => i.category === activeCategory);
  const total = getTotalToday();
  const weekHistory = getWeeklyHistory();

  const handleIncrement = async (id: string) => {
    increment(id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Zikirmatik</Text>
        <TouchableOpacity style={styles.historyBtn} onPress={() => setShowHistory(true)}>
          <MaterialCommunityIcons name="chart-bar" size={22} color={colors.gold} />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabs}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.tab, activeCategory === cat.id && styles.tabActive]}
            onPress={() => setCategory(cat.id)}
          >
            <Text style={[styles.tabLabel, activeCategory === cat.id && styles.tabLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Counter Grid */}
        <View style={styles.grid}>
          {filteredItems.map(item => (
            <DhikrCard
              key={item.id}
              item={item}
              onPress={() => handleIncrement(item.id)}
              colors={colors}
              fs={fs}
            />
          ))}
        </View>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetBtn} onPress={reset}>
          <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          <Text style={styles.resetText}>Sıfırla</Text>
        </TouchableOpacity>

        {/* Weekly Record */}
        <View style={styles.weekSection}>
          <View style={styles.weekHeader}>
            <Text style={styles.weekTitle}>Haftalık Kayıt</Text>
            <Text style={styles.weekTotal}>Toplam: {total}</Text>
          </View>
          <View style={styles.weekBars}>
            {weekHistory.map((w, i) => {
              const maxVal = Math.max(...weekHistory.map(x => x.total), 1);
              const height = Math.max((w.total / maxVal) * 60, 4);
              return (
                <View key={i} style={styles.weekBarCol}>
                  <Text style={styles.weekBarValue}>{w.total > 0 ? w.total : ''}</Text>
                  <View style={styles.weekBarTrack}>
                    <View style={[styles.weekBarFill, { height }]} />
                  </View>
                  <Text style={styles.weekBarDay}>{w.day}</Text>
                </View>
              );
            })}
          </View>
          {total === 0 && (
            <View style={styles.reminderBanner}>
              <Ionicons name="notifications-outline" size={18} color={colors.gold} />
              <Text style={styles.reminderText}>Bugün zikir yapılmadı.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* History Modal */}
      <Modal visible={showHistory} transparent animationType="slide" onRequestClose={() => setShowHistory(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Haftalık Zikir Geçmişi</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBars}>
              {weekHistory.map((w, i) => {
                const maxVal = Math.max(...weekHistory.map(x => x.total), 1);
                const height = Math.max((w.total / maxVal) * 120, 4);
                return (
                  <View key={i} style={styles.modalBarCol}>
                    <Text style={styles.modalBarValue}>{w.total > 0 ? w.total : ''}</Text>
                    <View style={[styles.modalBarTrack, { height: 120 }]}>
                      <View style={[styles.weekBarFill, { height }]} />
                    </View>
                    <Text style={styles.weekBarDay}>{w.day}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.modalTotalRow}>
              <Text style={styles.modalTotalLabel}>Haftalık Toplam</Text>
              <Text style={styles.modalTotalValue}>{weekHistory.reduce((s, w) => s + w.total, 0)}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
