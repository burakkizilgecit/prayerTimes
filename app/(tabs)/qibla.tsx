import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { usePrayerStore } from '../../store/usePrayerStore';
import { calculateQiblaDirection } from '../../services/prayerService';
import Svg, { Circle, Line, Text as SvgText, Path, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import { useTranslation } from '../../i18n';

const LOW_PASS = 0.12;

function shortestDiff(from: number, to: number): number {
  let d = ((to - from) % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

const makeStyles = (colors: any, fs: (n: number) => number) => StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background, alignItems: 'center' },
  header:         { paddingVertical: SPACING.md, alignItems: 'center' },
  headerTitle:    { color: colors.textPrimary, fontSize: fs(FONT_SIZE.xl), fontWeight: '700' },
  headerSub:      { color: colors.gold, fontSize: fs(FONT_SIZE.sm), marginTop: 2 },
  compassWrap:    { width: 320, height: 320, alignItems: 'center', justifyContent: 'center', marginVertical: SPACING.md },
  layer:          { position: 'absolute', width: 320, height: 320 },
  centerRing:     { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: colors.gold, zIndex: 10, alignItems: 'center', justifyContent: 'center' },
  centerInner:    { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.background },
  infoRow:        { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm, width: '100%' },
  infoBox:        { flex: 1, backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xs, alignItems: 'center', gap: 4 },
  infoBoxGold:    { borderColor: colors.gold },
  infoBoxGreen:   { borderColor: colors.green, backgroundColor: 'rgba(76,175,80,0.06)' },
  infoLabel:      { color: colors.textMuted, fontSize: fs(FONT_SIZE.xs), textAlign: 'center' },
  infoValue:      { color: colors.textPrimary, fontSize: fs(FONT_SIZE.md), fontWeight: '700' },
  alignedBanner:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md, backgroundColor: 'rgba(76,175,80,0.15)', borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  alignedText:    { color: colors.green, fontSize: fs(FONT_SIZE.md), fontWeight: '600' },
  permBanner:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginHorizontal: SPACING.md, marginTop: SPACING.md, backgroundColor: 'rgba(200,168,83,0.08)', borderRadius: RADIUS.md, padding: SPACING.md },
  permText:       { color: colors.textSecondary, fontSize: fs(FONT_SIZE.xs), flex: 1 },
});

export default function QiblaScreen() {
  const { colors, fs } = useTheme();
  const { location } = usePrayerStore();
  const { t } = useTranslation();

  const [qiblaAngle, setQiblaAngle]   = useState(0);
  const [hasPermission, setHasPerm]   = useState(false);
  const [isAligned, setIsAligned]     = useState(false);
  const [displayMag, setDisplayMag]   = useState(0);

  const rawMag     = useRef(0);
  const qiblaRef   = useRef(0);
  const compassAcc = useRef(0);
  const arrowAcc   = useRef(0);

  const compassAnim = useRef(new Animated.Value(0)).current;
  const arrowAnim   = useRef(new Animated.Value(0)).current;

  const compassRotate = compassAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });
  const arrowRotate   = arrowAnim.interpolate({   inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });

  useEffect(() => {
    const angle = calculateQiblaDirection(location?.lat ?? 41.0082, location?.lng ?? 28.9784);
    setQiblaAngle(angle);
    qiblaRef.current = angle;
  }, [location]);

  useEffect(() => {
    let sub: ReturnType<typeof Magnetometer.addListener> | undefined;
    (async () => {
      const { granted } = await Magnetometer.requestPermissionsAsync();
      setHasPerm(granted);
      if (!granted) return;

      Magnetometer.setUpdateInterval(50);
      sub = Magnetometer.addListener(({ x, y }) => {
        let raw = Math.atan2(-x, y) * (180 / Math.PI);
        raw = ((raw % 360) + 360) % 360;

        rawMag.current = ((rawMag.current + LOW_PASS * shortestDiff(rawMag.current, raw)) % 360 + 360) % 360;
        const mag = rawMag.current;

        const tCompass = (360 - mag) % 360;
        compassAcc.current += shortestDiff(((compassAcc.current % 360) + 360) % 360, tCompass);

        const tArrow = ((qiblaRef.current - mag) % 360 + 360) % 360;
        arrowAcc.current += shortestDiff(((arrowAcc.current % 360) + 360) % 360, tArrow);

        setIsAligned(Math.abs(((tArrow + 180) % 360) - 180) < 5);
        setDisplayMag(Math.round(mag));

        Animated.spring(compassAnim, { toValue: compassAcc.current, useNativeDriver: true, tension: 55, friction: 11 }).start();
        Animated.spring(arrowAnim,   { toValue: arrowAcc.current,   useNativeDriver: true, tension: 55, friction: 11 }).start();
      });
    })();
    return () => sub?.remove();
  }, []);

  const styles = React.useMemo(() => makeStyles(colors, fs), [colors, fs]);

  const cardinals = [
    { label: t('qiblaDirN'), angle: 0   },
    { label: t('qiblaDirE'), angle: 90  },
    { label: t('qiblaDirS'), angle: 180 },
    { label: t('qiblaDirW'), angle: 270 },
  ];

  const cx = 160, cy = 160, R = 148;
  const arrowColor = isAligned ? colors.green : colors.gold;

  const diffDeg = Math.abs(((((qiblaAngle - displayMag) % 360) + 360) % 360 + 180) % 360 - 180);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('qiblaTitle')}</Text>
        <Text style={styles.headerSub}>{location?.city ?? 'İstanbul'} → Mekke</Text>
      </View>

      <View style={styles.compassWrap}>

        {/* ── Compass Rose ── */}
        <Animated.View style={[styles.layer, { transform: [{ rotate: compassRotate }] }]}>
          <Svg width={320} height={320} viewBox="0 0 320 320">
            <Defs>
              <RadialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor={colors.cardBg}    stopOpacity="0.6" />
                <Stop offset="100%" stopColor={colors.background} stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Background fill */}
            <Circle cx={cx} cy={cy} r={R} fill="url(#bgGrad)" />

            {/* Outer decorative ring */}
            <Circle cx={cx} cy={cy} r={R}     stroke={colors.gold}       strokeWidth="1.5" fill="none" opacity="0.4" />
            <Circle cx={cx} cy={cy} r={R - 8} stroke={colors.cardBorder} strokeWidth="1"   fill="none" />
            {/* Inner dashed ring */}
            <Circle cx={cx} cy={cy} r={R - 28} stroke={colors.cardBorder} strokeWidth="1" fill="none" strokeDasharray="3 7" opacity="0.6" />

            {/* Tick marks */}
            {Array.from({ length: 72 }, (_, i) => {
              const deg     = i * 5;
              const a       = (deg * Math.PI) / 180;
              const isMaj   = deg % 90 === 0;
              const isMed   = deg % 45 === 0;
              const isSm    = deg % 10 === 0;
              const r1 = isMaj ? R - 28 : isMed ? R - 20 : isSm ? R - 14 : R - 10;
              const r2 = R - 8;
              return (
                <Line
                  key={i}
                  x1={cx + r1 * Math.sin(a)} y1={cy - r1 * Math.cos(a)}
                  x2={cx + r2 * Math.sin(a)} y2={cy - r2 * Math.cos(a)}
                  stroke={isMaj ? colors.gold : isMed ? colors.textSecondary : colors.cardBorder}
                  strokeWidth={isMaj ? 2.5 : isMed ? 1.5 : 0.8}
                  opacity={isMaj ? 1 : isMed ? 0.8 : 0.5}
                />
              );
            })}

            {/* Cardinal labels */}
            {cardinals.map(({ label, angle }) => {
              const rad = (angle * Math.PI) / 180;
              const isN = angle === 0;
              const lr  = R - 44;
              return (
                <G key={label}>
                  {isN && (
                    // Red triangle above N
                    <Path
                      d={`M${cx + lr * Math.sin(rad)} ${cy - lr * Math.cos(rad) - 14} l6 12 l-12 0 Z`}
                      fill={colors.red}
                      opacity="0.85"
                    />
                  )}
                  <SvgText
                    x={cx + lr * Math.sin(rad)}
                    y={cy - lr * Math.cos(rad) + (isN ? 16 : 6)}
                    textAnchor="middle"
                    fill={isN ? colors.red : colors.textSecondary}
                    fontSize={isN ? '17' : '14'}
                    fontWeight="bold"
                    opacity={isN ? '1' : '0.85'}
                  >
                    {label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </Animated.View>

        {/* ── Qibla Needle ── */}
        <Animated.View style={[styles.layer, { transform: [{ rotate: arrowRotate }] }]}>
          <Svg width={320} height={320} viewBox="0 0 320 320">
            <Defs>
              <RadialGradient id="glowGrad" cx="50%" cy="15%" r="40%">
                <Stop offset="0%"   stopColor={arrowColor} stopOpacity="0.35" />
                <Stop offset="100%" stopColor={arrowColor} stopOpacity="0"    />
              </RadialGradient>
            </Defs>

            {/* Glow behind needle tip */}
            <Circle cx={cx} cy={cy - 85} r="32" fill="url(#glowGrad)" />

            {/* Upper needle (toward Mecca) — gold/green */}
            <Path
              d={`M${cx} ${cy - 100} L${cx + 14} ${cy - 4} L${cx} ${cy + 8} L${cx - 14} ${cy - 4} Z`}
              fill={arrowColor}
              opacity="0.95"
            />

            {/* Lower needle (opposite) — muted */}
            <Path
              d={`M${cx} ${cy + 100} L${cx + 10} ${cy + 6} L${cx} ${cy - 6} L${cx - 10} ${cy + 6} Z`}
              fill={arrowColor}
              opacity="0.22"
            />

            {/* Mosque icon at tip */}
            <SvgText
              x={cx}
              y={cy - 108}
              textAnchor="middle"
              fontSize="18"
              fill={arrowColor}
            >
              🕌
            </SvgText>
          </Svg>
        </Animated.View>

        {/* Center ring */}
        <View style={styles.centerRing}>
          <View style={styles.centerInner} />
        </View>
      </View>

      {/* Info cards */}
      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <Ionicons name="compass-outline" size={22} color={colors.gold} />
          <Text style={styles.infoLabel}>{t('qiblaCompass')}</Text>
          <Text style={styles.infoValue}>{hasPermission ? `${displayMag}°` : '--'}</Text>
        </View>

        <View style={[styles.infoBox, styles.infoBoxGold, isAligned && styles.infoBoxGreen]}>
          <MaterialCommunityIcons name="mosque" size={22} color={isAligned ? colors.green : colors.gold} />
          <Text style={styles.infoLabel}>{t('tabQibla')}</Text>
          <Text style={[styles.infoValue, isAligned && { color: colors.green }]}>
            {`${qiblaAngle.toFixed(0)}°`}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="map-marker-distance" size={22} color={colors.gold} />
          <Text style={styles.infoLabel}>{t('qiblaStatus')}</Text>
          <Text style={[styles.infoValue, { fontSize: FONT_SIZE.xs, color: isAligned ? colors.green : colors.textSecondary }]}>
            {isAligned
              ? t('qiblaAligned')
              : hasPermission ? `${diffDeg.toFixed(0)}° ${t('qiblaDiff')}` : '--'}
          </Text>
        </View>
      </View>

      {isAligned && (
        <View style={styles.alignedBanner}>
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.green} />
          <Text style={styles.alignedText}>{t('qiblaDirected')}</Text>
        </View>
      )}

      {!hasPermission && (
        <View style={styles.permBanner}>
          <Ionicons name="warning-outline" size={18} color={colors.gold} />
          <Text style={styles.permText}>{t('qiblaSensorNote')}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
