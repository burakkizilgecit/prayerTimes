import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { usePrayerStore } from '../../store/usePrayerStore';
import { calculateQiblaDirection } from '../../services/prayerService';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTranslation } from '../../i18n';

const MECCA = { lat: 21.3891, lng: 39.8579 };

const makeStyles = (colors: any, fs: (n: number) => number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center' },
  header: { paddingVertical: SPACING.md, alignItems: 'center' },
  headerTitle: { color: colors.textPrimary, fontSize: fs(FONT_SIZE.xl), fontWeight: '700' },
  headerSub: { color: colors.gold, fontSize: fs(FONT_SIZE.sm), marginTop: 2 },
  compassContainer: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center', marginVertical: SPACING.lg },
  compassRose: { position: 'absolute', width: 280, height: 280 },
  arrowContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.gold, zIndex: 10 },
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
  const [magnetometer, setMagnetometer] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const prevAngle = useRef(0);

  useEffect(() => {
    if (location) {
      const angle = calculateQiblaDirection(location.lat, location.lng);
      setQiblaAngle(angle);
    } else {
      setQiblaAngle(calculateQiblaDirection(41.0082, 28.9784));
    }
  }, [location]);

  useEffect(() => {
    let subscription: any;
    (async () => {
      const { granted } = await Magnetometer.requestPermissionsAsync();
      setHasPermission(granted);
      if (granted) {
        Magnetometer.setUpdateInterval(100);
        subscription = Magnetometer.addListener(({ x, y }) => {
          let angle = Math.atan2(x, y) * (180 / Math.PI);
          angle = (angle + 360) % 360;
          setMagnetometer(angle);
        });
      }
    })();
    return () => subscription?.remove();
  }, []);

  const styles = React.useMemo(() => makeStyles(colors, fs), [colors, fs]);
  const compassRotation = hasPermission ? (360 - magnetometer) % 360 : 0;
  const arrowRotation = (qiblaAngle - magnetometer + 360) % 360;

  const compassDeg = `${compassRotation.toFixed(0)}°`;
  const qiblaDeg = `${qiblaAngle.toFixed(0)}°`;
  const diff = Math.abs(((arrowRotation + 180) % 360) - 180);
  const isAligned = diff < 5;

  const cardinals = [
    { label: t('qiblaDirN'), angle: 0 }, { label: t('qiblaDirE'), angle: 90 },
    { label: t('qiblaDirS'), angle: 180 }, { label: t('qiblaDirW'), angle: 270 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('qiblaTitle')}</Text>
        <Text style={styles.headerSub}>{location?.city ?? 'İstanbul'} → Mekke</Text>
      </View>

      <View style={styles.compassContainer}>
        {/* Compass Rose */}
        <Animated.View
          style={[
            styles.compassRose,
            { transform: [{ rotate: `${compassRotation}deg` }] },
          ]}
        >
          <Svg width={280} height={280} viewBox="0 0 280 280">
            {/* Outer ring */}
            <Circle cx="140" cy="140" r="130" stroke={colors.cardBorder} strokeWidth="2" fill="none" />
            <Circle cx="140" cy="140" r="110" stroke={colors.cardBorder} strokeWidth="1" fill="none" strokeDasharray="4 8" />
            {/* Degree marks */}
            {Array.from({ length: 36 }, (_, i) => {
              const a = (i * 10 * Math.PI) / 180;
              const r1 = i % 9 === 0 ? 115 : i % 3 === 0 ? 118 : 121;
              const r2 = 130;
              const x1 = 140 + r1 * Math.sin(a);
              const y1 = 140 - r1 * Math.cos(a);
              const x2 = 140 + r2 * Math.sin(a);
              const y2 = 140 - r2 * Math.cos(a);
              return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 9 === 0 ? colors.gold : colors.cardBorder} strokeWidth={i % 9 === 0 ? 2 : 1} />;
            })}
            {/* Cardinal labels */}
            {cardinals.map(({ label, angle }) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <SvgText key={label} x={140 + 97 * Math.sin(rad)} y={140 - 97 * Math.cos(rad) + 5} textAnchor="middle" fill={angle === 0 ? colors.red : colors.textSecondary} fontSize="14" fontWeight="bold">
                  {label}
                </SvgText>
              );
            })}
          </Svg>
        </Animated.View>

        {/* Qibla Arrow */}
        <View style={[styles.arrowContainer, { transform: [{ rotate: `${arrowRotation}deg` }] }]}>
          <MaterialCommunityIcons
            name="navigation"
            size={60}
            color={isAligned ? colors.green : colors.gold}
          />
        </View>

        {/* Center dot */}
        <View style={styles.centerDot} />
      </View>

      {/* Info */}
      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <Ionicons name="compass-outline" size={20} color={colors.gold} />
          <Text style={styles.infoLabel}>{t('qiblaCompass')}</Text>
          <Text style={styles.infoValue}>{compassDeg}</Text>
        </View>
        <View style={[styles.infoBox, styles.infoBoxCenter, isAligned && styles.alignedBox]}>
          <MaterialCommunityIcons name="mosque" size={20} color={isAligned ? colors.green : colors.gold} />
          <Text style={styles.infoLabel}>{t('tabQibla')}</Text>
          <Text style={[styles.infoValue, isAligned && { color: colors.green }]}>{qiblaDeg}</Text>
        </View>
        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="map-marker-distance" size={20} color={colors.gold} />
          <Text style={styles.infoLabel}>{t('qiblaStatus')}</Text>
          <Text style={[styles.infoValue, { fontSize: FONT_SIZE.xs, color: isAligned ? colors.green : colors.textSecondary }]}>
            {isAligned ? t('qiblaAligned') : `${diff.toFixed(0)}° ${t('qiblaDiff')}`}
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

