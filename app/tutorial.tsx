import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  FlatList, Animated, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, FONT_SIZE } from '../constants/theme';
import { useTutorialStore } from '../store/useTutorialStore';
import { useSettingsStore } from '../store/useSettingsStore';

const { width, height } = Dimensions.get('window');

type SlideType = 'regular' | 'theme-picker' | 'font-picker';

interface Slide {
  id: string;
  type: SlideType;
  icon: string;
  iconLib: 'ion' | 'mci';
  accent: string;
  title: string;
  desc: string;
}

const SLIDES: Slide[] = [
  {
    id: '1', type: 'regular', iconLib: 'mci', icon: 'mosque',
    accent: '#C8A853',
    title: 'Ezan Vakti\'ne\nHoş Geldiniz',
    desc: 'Günlük ibadetlerinizi düzenli tutmanıza yardımcı olan kapsamlı İslami yaşam uygulaması.',
  },
  {
    id: '2', type: 'regular', iconLib: 'ion', icon: 'home-outline',
    accent: '#7BB8F5',
    title: 'Ana Sayfa',
    desc: 'Sıradaki namaz vaktine geri sayım, günün hadisi ve duası, bugünkü namaz takibi — hepsi tek ekranda.',
  },
  {
    id: '3', type: 'regular', iconLib: 'mci', icon: 'clock-time-five-outline',
    accent: '#A78BFA',
    title: 'Namaz Vakitleri',
    desc: 'Konumunuza göre hesaplanan günlük vakitler. Kıldığınız namazları işaretleyin, haftalık takibi görün.',
  },
  {
    id: '4', type: 'regular', iconLib: 'ion', icon: 'compass-outline',
    accent: '#34D399',
    title: 'Kıble & En Yakın Cami',
    desc: 'Cihazınızın pusulasıyla kıble yönünü bulun. Yakınınızdaki camileri haritada görüp yol tarifi alın.',
  },
  {
    id: '5', type: 'regular', iconLib: 'mci', icon: 'circle-double',
    accent: '#F472B6',
    title: 'Zikirmatik',
    desc: 'Tespih, salavat ve istiğfarı sayın. Haftalık zikir geçmişinizi grafik olarak takip edin.',
  },
  {
    id: '6', type: 'regular', iconLib: 'mci', icon: 'book-open-page-variant-outline',
    accent: '#FBBF24',
    title: 'Kur\'an-ı Kerim',
    desc: '114 surenin tamamını okuyun, Al-Afasy sesiyle dinleyin. Ayet ayet veya tüm sure sesli tilavetiyle.',
  },
  {
    id: '7', type: 'regular', iconLib: 'ion', icon: 'notifications-outline',
    accent: '#FB923C',
    title: 'Bildirimler',
    desc: 'Namaz vakitlerinde ve 10 dakika öncesinde hatırlatma alın. Ayarlar\'dan istediğinizi açıp kapatın.',
  },
  {
    id: '8', type: 'theme-picker', iconLib: 'ion', icon: 'color-palette-outline',
    accent: '#C8A853',
    title: 'Tema Seçin',
    desc: 'Size en uygun görünümü seçin',
  },
  {
    id: '9', type: 'font-picker', iconLib: 'ion', icon: 'text-outline',
    accent: '#7BB8F5',
    title: 'Yazı Boyutu',
    desc: 'Okuma rahatlığınıza göre ayarlayın',
  },
  {
    id: '10', type: 'regular', iconLib: 'ion', icon: 'checkmark-circle-outline',
    accent: '#4ADE80',
    title: 'Her Şey Hazır!',
    desc: 'Ezan Vakti ile günlük ibadetlerinizi düzenli, bilinçli ve huzurlu şekilde sürdürün.\n\nAllah kabul etsin 🤲',
  },
];

export default function TutorialScreen() {
  const router = useRouter();
  const { complete } = useTutorialStore();
  const { updateSettings, settings } = useSettingsStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light' | null>(null);
  const [selectedFont, setSelectedFont] = useState<'normal' | 'large' | 'xlarge' | null>(null);
  const flatRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isLast = activeIndex === SLIDES.length - 1;
  const currentSlide = SLIDES[activeIndex];

  // Check if current special slide has a selection
  const canProceed = () => {
    if (currentSlide.type === 'theme-picker') return selectedTheme !== null;
    if (currentSlide.type === 'font-picker') return selectedFont !== null;
    return true;
  };

  const goTo = (index: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.4, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setActiveIndex(index);
    flatRef.current?.scrollToIndex({ index, animated: true });
  };

  const next = () => {
    if (!canProceed()) return;
    if (isLast) finish();
    else goTo(activeIndex + 1);
  };

  const finish = async () => {
    await complete();
    router.replace('/(tabs)');
  };

  const handleThemeSelect = (theme: 'dark' | 'light') => {
    setSelectedTheme(theme);
    updateSettings({ theme });
  };

  const handleFontSelect = (fontSize: 'normal' | 'large' | 'xlarge') => {
    setSelectedFont(fontSize);
    updateSettings({ fontSize });
  };

  const renderThemePicker = () => (
    <View style={styles.pickerContainer}>
      <View style={styles.themeCards}>
        {/* Dark Theme Card */}
        <TouchableOpacity
          style={[
            styles.themeCard,
            { backgroundColor: '#141B2D', borderColor: selectedTheme === 'dark' ? '#D4A84B' : '#1E2A40' },
            selectedTheme === 'dark' && styles.themeCardSelected,
          ]}
          onPress={() => handleThemeSelect('dark')}
          activeOpacity={0.8}
        >
          <View style={[styles.themePreview, { backgroundColor: '#080C16' }]}>
            <View style={[styles.previewBar, { backgroundColor: '#D4A84B' }]} />
            <View style={[styles.previewLine, { backgroundColor: '#8B95B0', width: '80%' }]} />
            <View style={[styles.previewLine, { backgroundColor: '#4E5A75', width: '60%' }]} />
          </View>
          <Text style={[styles.themeLabel, { color: '#F8F9FC' }]}>Gece Modu</Text>
          {selectedTheme === 'dark' && (
            <View style={[styles.selectedBadge, { backgroundColor: '#D4A84B' }]}>
              <Ionicons name="checkmark" size={12} color="#080C16" />
            </View>
          )}
        </TouchableOpacity>

        {/* Light Theme Card */}
        <TouchableOpacity
          style={[
            styles.themeCard,
            { backgroundColor: '#FFFFFF', borderColor: selectedTheme === 'light' ? '#C4922A' : '#E0D5C2' },
            selectedTheme === 'light' && styles.themeCardSelected,
          ]}
          onPress={() => handleThemeSelect('light')}
          activeOpacity={0.8}
        >
          <View style={[styles.themePreview, { backgroundColor: '#FBF8F2' }]}>
            <View style={[styles.previewBar, { backgroundColor: '#C4922A' }]} />
            <View style={[styles.previewLine, { backgroundColor: '#6B5438', width: '80%' }]} />
            <View style={[styles.previewLine, { backgroundColor: '#A8916A', width: '60%' }]} />
          </View>
          <Text style={[styles.themeLabel, { color: '#1C1308' }]}>Gündüz Modu</Text>
          {selectedTheme === 'light' && (
            <View style={[styles.selectedBadge, { backgroundColor: '#C4922A' }]}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFontPicker = () => (
    <View style={styles.pickerContainer}>
      {(['normal', 'large', 'xlarge'] as const).map((size) => {
        const isSelected = selectedFont === size;
        const fontSize = size === 'normal' ? 20 : size === 'large' ? 28 : 36;
        const label = size === 'normal' ? 'Standart' : size === 'large' ? 'Büyük' : 'Çok Büyük — Yaşlı Dostu';
        return (
          <TouchableOpacity
            key={size}
            style={[
              styles.fontCard,
              { borderColor: isSelected ? COLORS.gold : COLORS.cardBorder },
              isSelected && styles.fontCardSelected,
            ]}
            onPress={() => handleFontSelect(size)}
            activeOpacity={0.8}
          >
            <Text style={[styles.fontPreviewAa, { fontSize }]}>Aa</Text>
            <Text style={[styles.fontLabel, isSelected && { color: COLORS.gold }]}>{label}</Text>
            {isSelected && (
              <View style={styles.fontCheckmark}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.gold} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderSlide = ({ item, index }: { item: Slide; index: number }) => (
    <Animated.View style={[styles.slide, { opacity: index === activeIndex ? fadeAnim : 1 }]}>
      <View style={[styles.iconWrap, { backgroundColor: item.accent + '22', borderColor: item.accent + '44' }]}>
        {item.iconLib === 'mci'
          ? <MaterialCommunityIcons name={item.icon as any} size={64} color={item.accent} />
          : <Ionicons name={item.icon as any} size={64} color={item.accent} />
        }
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.desc}>{item.desc}</Text>

      {item.type === 'theme-picker' && renderThemePicker()}
      {item.type === 'font-picker' && renderFontPicker()}
    </Animated.View>
  );

  const buttonDisabled = !canProceed();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Skip */}
      {!isLast && currentSlide.type === 'regular' && (
        <TouchableOpacity style={styles.skipBtn} onPress={finish}>
          <Text style={styles.skipText}>Geç</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={s => s.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.list}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[
              styles.dot,
              i === activeIndex && styles.dotActive,
              { backgroundColor: i === activeIndex ? SLIDES[activeIndex].accent : COLORS.cardBorder },
            ]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom buttons */}
      <View style={styles.bottomRow}>
        {activeIndex > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => goTo(activeIndex - 1)}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        <TouchableOpacity
          style={[
            styles.nextBtn,
            { backgroundColor: buttonDisabled ? COLORS.cardBorder : SLIDES[activeIndex].accent },
          ]}
          onPress={next}
          activeOpacity={buttonDisabled ? 1 : 0.85}
          disabled={buttonDisabled}
        >
          {isLast ? (
            <>
              <Text style={[styles.nextText, { color: buttonDisabled ? COLORS.textMuted : COLORS.background }]}>Başlayalım</Text>
              <Ionicons name="rocket-outline" size={18} color={buttonDisabled ? COLORS.textMuted : COLORS.background} />
            </>
          ) : (
            <>
              <Text style={[styles.nextText, { color: buttonDisabled ? COLORS.textMuted : COLORS.background }]}>İleri</Text>
              <Ionicons name="arrow-forward" size={18} color={buttonDisabled ? COLORS.textMuted : COLORS.background} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.background },

  skipBtn:    { position: 'absolute', top: SPACING.lg + 8, right: SPACING.lg, zIndex: 10, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.full },
  skipText:   { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, fontWeight: '600' },

  list:       { flex: 1 },
  slide:      { width, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl, paddingBottom: 60 },

  iconWrap:   { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, borderWidth: 1.5 },

  title:      { color: COLORS.textPrimary, fontSize: FONT_SIZE.xxxl, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.sm, lineHeight: 42 },
  desc:       { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, textAlign: 'center', lineHeight: 26, maxWidth: 320 },

  dots:       { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xs, paddingBottom: SPACING.lg },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  dotActive:  { width: 24, borderRadius: 4 },

  bottomRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, gap: SPACING.md },
  backBtn:    { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.cardBorder },
  nextBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, height: 52, borderRadius: RADIUS.xl },
  nextText:   { fontSize: FONT_SIZE.md, fontWeight: '800' },

  // Picker shared
  pickerContainer: { width: '100%', marginTop: SPACING.md },

  // Theme picker
  themeCards:      { flexDirection: 'row', gap: SPACING.md, justifyContent: 'center' },
  themeCard:       { width: 130, borderRadius: RADIUS.lg, borderWidth: 2, padding: SPACING.sm, alignItems: 'center', gap: SPACING.xs, position: 'relative' },
  themeCardSelected: { borderWidth: 2.5 },
  themePreview:    { width: '100%', height: 70, borderRadius: RADIUS.sm, padding: SPACING.xs, gap: 4, justifyContent: 'center' },
  previewBar:      { height: 8, borderRadius: 4, width: '50%' },
  previewLine:     { height: 5, borderRadius: 3 },
  themeLabel:      { fontSize: FONT_SIZE.sm, fontWeight: '700', textAlign: 'center' },
  selectedBadge:   { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Font picker
  fontCard:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1.5, marginBottom: SPACING.sm, backgroundColor: COLORS.cardBg, gap: SPACING.md },
  fontCardSelected:{ backgroundColor: 'rgba(212,168,75,0.1)' },
  fontPreviewAa:   { color: COLORS.textPrimary, fontWeight: '700', width: 56, textAlign: 'center' },
  fontLabel:       { flex: 1, color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500' },
  fontCheckmark:   { marginLeft: 'auto' },
});
