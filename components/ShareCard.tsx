import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../constants/theme';

export type ShareCardData =
  | { type: 'hadith';  text: string; source: string }
  | { type: 'dua';     title: string; arabic: string; turkish: string; source: string }
  | { type: 'verse';   surah: string; verseNo: number; arabic: string; turkish: string }
  | { type: 'prayer';  name: string; time: string; date: string };

interface Props { data: ShareCardData }

const ShareCard = forwardRef<View, Props>(({ data }, ref) => {
  const nightImage = require('../assets/images/mosque-night.png');

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {/* Background image */}
      <Image source={nightImage} style={styles.bg} resizeMode="cover" />
      <View style={styles.overlay} />

      {/* Gold border accent */}
      <View style={styles.topAccent} />

      {/* Content */}
      <View style={styles.content}>
        {data.type === 'hadith' && (
          <>
            <View style={styles.typeRow}>
              <MaterialCommunityIcons name="format-quote-open" size={16} color={COLORS.gold} />
              <Text style={styles.typeLabel}>GÜNÜN HADİSİ</Text>
            </View>
            <Text style={styles.mainText}>"{data.text}"</Text>
            <Text style={styles.sourceText}>{data.source}</Text>
          </>
        )}

        {data.type === 'dua' && (
          <>
            <View style={styles.typeRow}>
              <MaterialCommunityIcons name="hands-pray" size={16} color={COLORS.gold} />
              <Text style={styles.typeLabel}>DUA</Text>
            </View>
            <Text style={styles.titleText}>{data.title}</Text>
            <Text style={styles.arabicText}>{data.arabic}</Text>
            <Text style={styles.mainText}>{data.turkish}</Text>
            <Text style={styles.sourceText}>{data.source}</Text>
          </>
        )}

        {data.type === 'verse' && (
          <>
            <View style={styles.typeRow}>
              <MaterialCommunityIcons name="book-open-variant" size={16} color={COLORS.gold} />
              <Text style={styles.typeLabel}>KUR'AN-I KERİM</Text>
            </View>
            <Text style={styles.titleText}>{data.surah} · {data.verseNo}. Ayet</Text>
            <Text style={styles.arabicText}>{data.arabic}</Text>
            <Text style={styles.mainText}>"{data.turkish}"</Text>
          </>
        )}

        {data.type === 'prayer' && (
          <>
            <View style={styles.typeRow}>
              <MaterialCommunityIcons name="mosque" size={16} color={COLORS.gold} />
              <Text style={styles.typeLabel}>NAMAZ VAKTİ</Text>
            </View>
            <Text style={styles.prayerName}>{data.name} Namazı</Text>
            <Text style={styles.prayerTime}>{data.time}</Text>
            <Text style={styles.sourceText}>{data.date}</Text>
          </>
        )}
      </View>

      {/* Bottom accent */}
      <View style={styles.bottomAccent} />

      {/* Footer */}
      <View style={styles.footer}>
        <MaterialCommunityIcons name="mosque" size={16} color={COLORS.gold} />
        <Text style={styles.footerText}>Ezan Vakti</Text>
      </View>
    </View>
  );
});

ShareCard.displayName = 'ShareCard';
export default ShareCard;

const styles = StyleSheet.create({
  card: {
    width: 360, backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(200,168,83,0.4)',
  },
  bg:           { position: 'absolute', width: '100%', height: '100%', opacity: 0.25 },
  overlay:      { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(11,15,26,0.82)' },
  topAccent:    { height: 3, backgroundColor: COLORS.gold, marginHorizontal: 24, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  content:      { padding: SPACING.lg, gap: SPACING.sm },
  typeRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeLabel:    { color: COLORS.gold, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  titleText:    { color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: '700' },
  arabicText:   { color: COLORS.textPrimary, fontSize: 20, lineHeight: 38, textAlign: 'right', fontWeight: '300' },
  mainText:     { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 22 },
  sourceText:   { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  prayerName:   { color: COLORS.textPrimary, fontSize: FONT_SIZE.xxl, fontWeight: '700' },
  prayerTime:   { color: COLORS.gold, fontSize: 42, fontWeight: '700', letterSpacing: 2 },
  bottomAccent: { height: 2, backgroundColor: 'rgba(200,168,83,0.3)', marginHorizontal: 24 },
  footer:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING.sm },
  footerText:   { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, fontWeight: '600' },
});
