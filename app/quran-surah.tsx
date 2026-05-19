import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useTranslation } from '../i18n';
import { SPACING, RADIUS, FONT_SIZE } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { fetchSurah, type Verse, type SurahMeta } from '../data/quranData';

export default function QuranSurahScreen() {
  const { t } = useTranslation();
  const { colors, fs } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, fs), [colors, fs]);
  const { number } = useLocalSearchParams<{ number: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<SurahMeta | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [playingVerse, setPlayingVerse] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingAllRef = useRef(false);

  useEffect(() => {
    loadSurah();
    return () => {
      soundRef.current?.unloadAsync();
      isPlayingAllRef.current = false;
    };
  }, [number]);

  const loadSurah = async () => {
    setLoading(true); setError(null);
    try {
      const data = await fetchSurah(parseInt(number ?? '1'));
      setMeta(data.meta);
      setVerses(data.verses);
    } catch (e: any) {
      setError(t('quranError'));
    } finally {
      setLoading(false);
    }
  };

  const stopSound = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const playAudio = async (verse: Verse) => {
    try {
      if (isPlayingAllRef.current) {
        isPlayingAllRef.current = false;
        setIsPlayingAll(false);
      }
      await stopSound();
      if (playingVerse === verse.number) {
        setPlayingVerse(null);
        return;
      }
      setPlayingVerse(verse.number);
      const { sound } = await Audio.Sound.createAsync(
        { uri: verse.audioUrl },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingVerse(null);
        }
      });
    } catch {
      setPlayingVerse(null);
    }
  };

  const playAllVerses = async () => {
    if (isPlayingAllRef.current) {
      isPlayingAllRef.current = false;
      setIsPlayingAll(false);
      await stopSound();
      setPlayingVerse(null);
      return;
    }

    isPlayingAllRef.current = true;
    setIsPlayingAll(true);

    const playNext = async (index: number) => {
      if (!isPlayingAllRef.current || index >= verses.length) {
        isPlayingAllRef.current = false;
        setIsPlayingAll(false);
        setPlayingVerse(null);
        return;
      }
      const verse = verses[index];
      setPlayingVerse(verse.number);
      try {
        await stopSound();
        const { sound } = await Audio.Sound.createAsync(
          { uri: verse.audioUrl },
          { shouldPlay: true },
        );
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded && status.didJustFinish) {
            playNext(index + 1);
          }
        });
      } catch {
        playNext(index + 1);
      }
    };

    playNext(0);
  };

  const shareVerse = async (verse: Verse) => {
    const text = `${meta?.nameTurkish} Suresi, ${verse.number}. Ayet\n\n${verse.arabic}\n\n"${verse.turkish}"\n\n— Ezan Vakti`;
    await Share.share({ message: text });
  };

  const toggleBookmark = (n: number) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  };

  const renderVerse = ({ item }: { item: Verse }) => {
    const isPlaying = playingVerse === item.number;
    const isBookmarked = bookmarks.has(item.number);
    const isBismillah = parseInt(number ?? '1') !== 1 && item.number === 1;

    return (
      <View style={styles.verseCard}>
        {isBismillah && (
          <Text style={styles.bismillah}>بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</Text>
        )}
        {/* Arabic */}
        <Text style={styles.arabicText}>{item.arabic}</Text>

        {/* Actions row */}
        <View style={styles.verseActions}>
          <View style={styles.verseNumBadge}>
            <Text style={styles.verseNum}>{item.number}</Text>
          </View>
          <View style={styles.actionBtns}>
            <TouchableOpacity style={[styles.actionBtn, isPlaying && styles.actionBtnActive]} onPress={() => playAudio(item)}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={16} color={isPlaying ? colors.background : colors.gold} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => toggleBookmark(item.number)}>
              <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={16} color={isBookmarked ? colors.gold : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => shareVerse(item)}>
              <Ionicons name="share-social-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Turkish */}
        <Text style={styles.turkishText}>{item.turkish}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {meta && (
            <>
              <Text style={styles.headerArabic}>{meta.nameArabic}</Text>
              <Text style={styles.headerTitle}>{meta.nameTurkish} · {meta.verseCount} Ayet</Text>
            </>
          )}
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={loadSurah}>
          <Ionicons name="refresh" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
          <Text style={styles.loadingText}>Sure yükleniyor...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="book-open-variant" size={40} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadSurah}>
            <Ionicons name="refresh" size={16} color={colors.background} />
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={verses}
          keyExtractor={v => String(v.number)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: SPACING.xl }}
          ListHeaderComponent={
            <View style={styles.surahHeader}>
              <Text style={styles.surahHeaderAr}>{meta?.nameArabic}</Text>
              <Text style={styles.surahHeaderTr}>{meta?.nameTurkish} Suresi</Text>
              <View style={styles.surahHeaderMeta}>
                <View style={[styles.revBadge, { backgroundColor: meta?.revelationType === 'Meccan' ? 'rgba(200,168,83,0.15)' : 'rgba(76,175,80,0.15)' }]}>
                  <Text style={[styles.revBadgeText, { color: meta?.revelationType === 'Meccan' ? colors.gold : colors.green }]}>
                    {meta?.revelationType === 'Meccan' ? '🕋 Mekke' : '🕌 Medine'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.playAllBtn, isPlayingAll && styles.playAllBtnActive]}
                onPress={playAllVerses}
              >
                <Ionicons
                  name={isPlayingAll ? 'stop-circle' : 'play-circle'}
                  size={18}
                  color={isPlayingAll ? colors.background : colors.gold}
                />
                <Text style={[styles.playAllText, isPlayingAll && styles.playAllTextActive]}>
                  {isPlayingAll ? t('quranStop') : t('quranPlayAll')}
                </Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={renderVerse}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, fs: (n: number) => number) => StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter:     { flex: 1, alignItems: 'center' },
  headerArabic:     { color: colors.gold, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  headerTitle:      { color: colors.textSecondary, fontSize: FONT_SIZE.xs },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  loadingText:      { color: colors.textMuted, fontSize: FONT_SIZE.sm },
  errorText:        { color: colors.textMuted, fontSize: FONT_SIZE.sm, textAlign: 'center', paddingHorizontal: SPACING.lg },
  retryBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  retryText:        { color: colors.background, fontSize: FONT_SIZE.sm, fontWeight: '700' },
  surahHeader:      { alignItems: 'center', paddingVertical: SPACING.lg, marginBottom: SPACING.md, backgroundColor: colors.cardBg, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: colors.cardBorder },
  surahHeaderAr:    { color: colors.textPrimary, fontSize: 36, fontWeight: '300', marginBottom: 4 },
  surahHeaderTr:    { color: colors.gold, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  surahHeaderMeta:  { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  revBadge:         { borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4 },
  revBadgeText:     { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  bismillah:        { color: colors.gold, fontSize: 22, textAlign: 'center', marginBottom: SPACING.md, lineHeight: 36 },
  verseCard:        { backgroundColor: colors.cardBg, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: colors.cardBorder, padding: SPACING.md },
  arabicText:       { color: colors.textPrimary, fontSize: 24, lineHeight: 46, textAlign: 'right', fontWeight: '400', marginBottom: SPACING.sm },
  verseActions:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: SPACING.sm },
  verseNumBadge:    { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(200,168,83,0.15)', alignItems: 'center', justifyContent: 'center' },
  verseNum:         { color: colors.gold, fontSize: FONT_SIZE.xs, fontWeight: '700' },
  actionBtns:       { flexDirection: 'row', gap: SPACING.xs },
  actionBtn:        { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center' },
  actionBtnActive:  { backgroundColor: colors.gold, borderColor: colors.gold },
  turkishText:      { color: colors.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 22 },
  playAllBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: colors.gold },
  playAllBtnActive: { backgroundColor: colors.gold },
  playAllText:      { color: colors.gold, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  playAllTextActive:{ color: colors.background },
});
