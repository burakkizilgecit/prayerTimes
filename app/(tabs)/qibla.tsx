import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { usePrayerStore } from '../../store/usePrayerStore';
import { calculateQiblaDirection } from '../../services/prayerService';
import Svg, { Circle, Line, Text as SvgText, Path } from 'react-native-svg';
import { useTranslation } from '../../i18n';

const LOW_PASS = 0.12;

function shortestDiff(from: number, to: number): number {
  let d = ((to - from) % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

const makeStyles = (colors: any, fs: (n: number) => number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center' },
  header: { paddingVertical: SPACING.md, alignItems: 'center' },
  headerTitle: { color: colors.textPrimary, fontSize: fs(FONT_SIZE.xl), fontWeight: '700' },
  headerSub: { color: colors.gold, fontSize: fs(FONT_SIZE.sm), marginTop: 2 },
  compassWrap: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center', marginVertical: SPACING.lg },
  layer: { position: 'absolute', width: 300, height: 300 },
  centerDot: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.gold, zIndex: 10 },
  infoRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm, marginTop: SPACING.lg },
  infoBox: { flex: 1, backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', gap: SPACING.xs },
  infoBoxCenter: { borderColor: colors.gold },
  alignedBox: { borderColor: colors.green, backgroundColor: 'rgba(76,175,80,0.08)' },
  infoLabel: { color: colors.textMuted, fontSize: fs(FONT_SIZE.xs) },
  infoValue: { color: colors.textPrimary, fontSize: fs(FONT_SIZE.md), fontWeight: '700' },
  alignedBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md, backgroundColor: 'rgba(76,175,80,0.15)', borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  alignedText: { color: colors.green, fontSize: fs(FONT_SIZE.md), fontWeight: '600' },
  permissionBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginHorizontal: SPACING.md, marginTop: SPACING.md, backgroundColor: 'rgba(200,168,83,0.1)', borderRadius: RADIUS.md, padding: SPACING.md },
  permissionText: { color: colors.textSecondary, fontSize: fs(FONT_SIZE.xs), flex: 1 },
});

export default function QiblaScreen() {
  const { colors, fs } = useTheme();
  const { location } = usePrayerStore();
  const { t } = useTranslation();

  const [qiblaAngle, setQiblaAngle] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAligned, setIsAligned] = useState(false);
  const [displayMag, setDisplayMag] = useState(0);

  const rawMag    = useRef(0);
  const qiblaRef  = useRef(0);
  const compassAcc = useRef(0);
  const arrowAcc   = useRef(0);

  const compassAnim = useRef(new Animated.Value(0)).current;
  const arrowAnim   = useRef(new Animated.Value(0)).current;

  const compassRotate = compassAnim.interpolate({
    inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend',
  });
  const arrowRotate = arrowAnim.interpolate({
    inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend',
  });

  useEffect(() => {
    const angle = calculateQiblaDirection(
      location?.lat ?? 41.0082,
      location?.lng ?? 28.9784,
    );
    setQiblaAngle(angle);
    qiblaRef.current = angle;
  }, [location]);

  useEffect(() => {
    let sub: ReturnType<typeof Magnetometer.addListener> | undefined;
    (async () => {
      const { granted } = await Magnetometer.requestPermissionsAsync();
      setHasPermission(granted);
      if (!granted) return;

      Magnetometer.setUpdateInterval(50);
      sub = Magnetometer.addListener(({ x, y }) => {
        // atan2(-x, y) → degrees clockwise from North for a flat/tilted phone
        let raw = Math.atan2(-x, y) * (180 / Math.PI);
        raw = ((raw % 360) + 360) % 360;

        // Low-pass filter (smooth noise, keep responsiveness)
        rawMag.current = ((rawMag.current + LOW_PASS * shortestDiff(rawMag.current, raw)) % 360 + 360) % 360;
        const mag = rawMag.current;

        // Compass rose: rotate opposite to device heading
        const tCompass = (360 - mag) % 360;
        compassAcc.current += shortestDiff(((compassAcc.current % 360) + 360) % 360, tCompass);

        // Qibla arrow: how many degrees from phone top to Mecca
        const tArrow = ((qiblaRef.current - mag) % 360 + 360) % 360;
        arrowAcc.current += shortestDiff(((arrowAcc.current % 360) + 360) % 360, tArrow);

        const absDiff = Math.abs(((tArrow + 180) % 360) - 180);
        setIsAligned(absDiff < 5);
        setDisplayMag(Math.round(mag));

        Animated.spring(compassAnim, { toValue: compassAcc.current, useNativeDriver: true, tension: 55, friction: 11 }).start();
        Animated.spring(arrowAnim,   { toValue: arrowAcc.current,   useNativeDriver: true, tension: 55, friction: 11 }).start();
      });
    })();
    return () => sub?.remove();
  }, []);

  const styles = React.useMemo(() => makeStyles(colors, fs), [colors, fs]);

  const cardinals = [
    { label: t('qiblaDirN'), angle: 0  },
    { label: t('qiblaDirE'), angle: 90 },
    { label: t('qiblaDirS'), angle: 180 },
    { label: t('qiblaDirW'), angle: 270 },
  ];

  const arrowColor = isAligned ? colors.green : colors.gold;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('qiblaTitle')}</Text>
        <Text style={styles.headerSub}>{location?.city ?? 'İstanbul'} → Mekke</Text>
      </View>

      <View style={styles.compassWrap}>
        {/* Compass rose (rotates with phone orientation) */}
        <Animated.View style={[styles.layer, { transform: [{ rotate: compassRotate }] }]}>
          <Svg width={300} height={300} viewBox="0 0 300 300">
            <Circle cx="150" cy="150" r="138" stroke={colors.cardBorder} strokeWidth="2" fill="none" />
            <Circle cx="150" cy="150" r="116" stroke={colors.cardBorder} strokeWidth="1" fill="none" strokeDasharray="4 8" />
            {Array.from({ length: 36 }, (_, i) => {
              const a = (i * 10 * Math.PI) / 180;
              const isMajor = i % 9 === 0;
              const isMid   = i % 3 === 0;
              const r1 = isMajor ? 120 : isMid ? 125 : 129;
              return (
                <Line
                  key={i}
                  x1={150 + r1 * Math.sin(a)}   y1={150 - r1 * Math.cos(a)}
                  x2={150 + 138 * Math.sin(a)}  y2={150 - 138 * Math.cos(a)}
                  stroke={isMajor ? colors.gold : colors.cardBorder}
                  strokeWidth={isMajor ? 2.5 : 1}
                />
              );
            })}
            {cardinals.map(({ label, angle }) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <SvgText
                  key={label}
                  x={150 + 100 * Math.sin(rad)}
                  y={150 - 100 * Math.cos(rad) + 6}
                  textAnchor="middle"
                  fill={angle === 0 ? colors.red : colors.textSecondary}
                  fontSize="16"
                  fontWeight="bold"
                >
                  {label}
                </SvgText>
              );
            })}
          </Svg>
        </Animated.View>

        {/* Qibla arrow (points toward Mecca) */}
        <Animated.View style={[styles.layer, { transform: [{ rotate: arrowRotate }] }]}>
          <Svg width={300} height={300} viewBox="0 0 300 300">
            {/* Arrow head */}
            <Path
              d="M150 58 L172 118 L160 112 L160 210 L140 210 L140 112 L128 118 Z"
              fill={arrowColor}
              opacity={0.95}
            />
            {/* Subtle glow ring at tip */}
            <Circle cx="150" cy="56" r="10" fill={arrowColor} opacity={0.25} />
            <Circle cx="150" cy="56" r="5" fill={arrowColor} />
          </Svg>
        </Animated.View>

        {/* Center dot */}
        <View style={styles.centerDot} />
      </View>

      {/* Info row */}
      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <Ionicons name="compass-outline" size={20} color={colors.gold} />
          <Text style={styles.infoLabel}>{t('qiblaCompass')}</Text>
          <Text style={styles.infoValue}>{hasPermission ? `${displayMag}°` : '--'}</Text>
        </View>
        <View style={[styles.infoBox, styles.infoBoxCenter, isAligned && styles.alignedBox]}>
          <MaterialCommunityIcons name="mosque" size={20} color={isAligned ? colors.green : colors.gold} />
          <Text style={styles.infoLabel}>{t('tabQibla')}</Text>
          <Text style={[styles.infoValue, isAligned && { color: colors.green }]}>{`${qiblaAngle.toFixed(0)}°`}</Text>
        </View>
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="map-marker-distance" size={20} color={colors.gold} />
          <Text style={styles.infoLabel}>{t('qiblaStatus')}</Text>
          <Text style={[styles.infoValue, { fontSize: FONT_SIZE.xs, color: isAligned ? colors.green : colors.textSecondary }]}>
            {isAligned
              ? t('qiblaAligned')
              : hasPermission
                ? `${Math.abs(((((qiblaAngle - displayMag) % 360) + 360) % 360 + 180) % 360 - 180).toFixed(0)}° ${t('qiblaDiff')}`
                : '--'}
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
        <View style={styles.permissionBanner}>
          <Ionicons name="warning-outline" size={18} color={colors.gold} />
          <Text style={styles.permissionText}>{t('qiblaSensorNote')}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
