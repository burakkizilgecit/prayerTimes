import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Linking, ActivityIndicator, Animated,
  Dimensions, Image, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useTranslation } from '../../i18n';
import { SPACING, RADIUS, FONT_SIZE } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

const { height } = Dimensions.get('window');
const MOSQUE_IMG = require('../../assets/images/mosque-day.png');
const MAPS_KEY = 'AIzaSyCsJqytioV-H-SJGWSGZwQOOdZs-HQblWA';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0B0F1A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8A8FA8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0F1A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1E2640' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#252D3E' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#303B55' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#071428' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0A1A0F' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0F1520' }] },
];

const DISTANCE_PRESETS = [
  { label: '500 m', value: 500 },
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
  { label: '3 km', value: 3000 },
  { label: '5 km', value: 5000 },
];

interface Mosque {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  walkMin: number;
  openNow: boolean | null;
  photoUrl: string | null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

async function googleRequest(url: string): Promise<any[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    if (json.status === 'REQUEST_DENIED')
      throw new Error(json.error_message ?? 'API anahtarı geçersiz.');
    return json.results ?? [];
  } catch (e: any) {
    if (e.message?.includes('API') || e.message?.includes('anahtar')) throw e;
    return [];
  }
}

function toMosque(p: any, userLat: number, userLng: number): Mosque {
  const pLat: number = p.geometry.location.lat;
  const pLng: number = p.geometry.location.lng;
  const dist = haversine(userLat, userLng, pLat, pLng);
  const ref: string | null = p.photos?.[0]?.photo_reference ?? null;
  return {
    id: p.place_id,
    name: p.name,
    address: p.vicinity ?? p.formatted_address ?? '',
    lat: pLat,
    lng: pLng,
    distance: dist,
    walkMin: Math.max(1, Math.ceil(dist / 80)),
    openNow: p.opening_hours?.open_now ?? null,
    photoUrl: ref
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=120&photo_reference=${ref}&key=${MAPS_KEY}`
      : null,
  };
}

async function fetchNearbyMosques(lat: number, lng: number, radiusM = 5000): Promise<Mosque[]> {
  const nearby = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
  const text   = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
  const loc    = `location=${lat},${lng}`;
  const rad    = `radius=${radiusM}`;
  const k      = `key=${MAPS_KEY}`;

  // Text Search = Google Maps arama çubuğuyla aynı motor.
  // "cami" / "mescit" / "mosque" aramaları + Nearby type=mosque
  // → hepsini paralel çalıştırıp birleştiriyoruz.
  const searches = await Promise.allSettled([
    googleRequest(`${text}?query=cami&${loc}&${rad}&${k}`),
    googleRequest(`${text}?query=mescit&${loc}&${rad}&${k}`),
    googleRequest(`${text}?query=mosque&${loc}&${rad}&${k}`),
    googleRequest(`${nearby}?${loc}&${rad}&type=mosque&${k}`),
    googleRequest(`${nearby}?${loc}&${rad}&type=place_of_worship&keyword=cami&${k}`),
  ]);

  const allFailed = searches.every(r => r.status === 'rejected');
  if (allFailed) {
    const first = searches[0] as PromiseRejectedResult;
    throw first.reason instanceof Error ? first.reason : new Error('Camiler yüklenemedi.');
  }

  // Merge & deduplicate by place_id, filter to radiusM distance
  const seen = new Map<string, any>();
  for (const result of searches) {
    if (result.status === 'fulfilled') {
      for (const place of result.value) {
        if (!seen.has(place.place_id)) {
          seen.set(place.place_id, place);
        }
      }
    }
  }

  return Array.from(seen.values())
    .map(p => toMosque(p, lat, lng))
    .filter(m => m.distance <= radiusM)   // keep only within requested radius
    .sort((a, b) => a.distance - b.distance);
}

// ── Filter Modal ─────────────────────────────────────────────────────────────
function FilterModal({
  visible, current, onApply, onClose,
}: { visible: boolean; current: number; onApply: (v: number) => void; onClose: () => void }) {
  const { colors, fs } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, fs), [colors, fs]);
  const { t } = useTranslation();
  const [preset, setPreset] = useState<number | null>(current);
  const [custom, setCustom] = useState('');

  const apply = () => {
    const val = custom.trim() !== ''
      ? Math.max(100, Math.min(10000, parseInt(custom) || current))
      : (preset ?? current);
    onApply(val);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.filterSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{t('mosquesFilterTitle')}</Text>
          <Text style={styles.sheetHint}>{t('mosquesFilterHint')}</Text>

          {/* Presets */}
          <View style={styles.presetsRow}>
            {DISTANCE_PRESETS.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[styles.presetBtn, preset === p.value && custom === '' && styles.presetBtnActive]}
                onPress={() => { setPreset(p.value); setCustom(''); }}
              >
                <Text style={[styles.presetText, preset === p.value && custom === '' && styles.presetTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom input */}
          <View style={styles.customRow}>
            <Text style={styles.customLabel}>{t('mosquesCustomDist')}</Text>
            <View style={styles.customInputWrap}>
              <TextInput
                style={styles.customInput}
                value={custom}
                onChangeText={v => { setCustom(v.replace(/[^0-9]/g, '')); setPreset(null); }}
                placeholder="750"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={5}
              />
              <Text style={styles.customUnit}>{t('mosquesMeters')}</Text>
            </View>
          </View>

          {/* Active filter summary */}
          <View style={styles.summaryRow}>
            <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
            <Text style={styles.summaryText}>
              {t('mosquesActiveFilter' as any, { dist: custom.trim() !== '' ? `${custom} m` : fmtDistance(preset ?? current) })}
            </Text>
          </View>

          <TouchableOpacity style={styles.applyBtn} onPress={apply}>
            <Text style={styles.applyBtnText}>{t('mosquesApply')}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function MosquesScreen() {
  const { colors, fs } = useTheme();
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [allMosques, setAllMosques] = useState<Mosque[]>([]);
  const [maxDist, setMaxDist] = useState(3000);
  const [selected, setSelected] = useState<Mosque | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cityName, setCityName] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const slideAnim = useRef(new Animated.Value(120)).current;

  const styles = React.useMemo(() => makeStyles(colors, fs), [colors, fs]);
  const filteredMosques = allMosques.filter(m => m.distance <= maxDist);

  const loadData = async () => {
    if (!MAPS_KEY) {
      setErrorMsg('Google Maps API anahtarı yapılandırılmamış.');
      setLoading(false);
      return;
    }
    setFetching(true);
    setErrorMsg(null);
    setSelected(null);
    Animated.spring(slideAnim, { toValue: 120, useNativeDriver: true }).start();
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 41.0082, lng = 28.9784;
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude; lng = loc.coords.longitude;
        const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        setCityName([geo[0]?.district, geo[0]?.city].filter(Boolean).join(', ') || 'Konumunuz');
      } else {
        setCityName('İstanbul (varsayılan)');
      }
      setUserLoc({ lat, lng });
      mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.025, longitudeDelta: 0.025 }, 800);
      const data = await fetchNearbyMosques(lat, lng, 5000);
      setAllMosques(data);
      if (data.length === 0) setErrorMsg(t('mosquesNotFound'));
    } catch (e: any) {
      setErrorMsg(e.message?.includes('API') ? e.message : 'Camiler yüklenemedi. İnternet bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const selectMosque = (m: Mosque) => {
    const isSame = selected?.id === m.id;
    if (isSame) { deselectMosque(); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(m);
    mapRef.current?.animateToRegion({ latitude: m.lat, longitude: m.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80 }).start();
  };

  const deselectMosque = () => {
    setSelected(null);
    Animated.spring(slideAnim, { toValue: 120, useNativeDriver: true }).start();
  };

  const openNavigation = (m: Mosque) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}&travelmode=walking`);
  };

  const filterLabel = maxDist < 1000 ? `${maxDist} m` : `${(maxDist / 1000).toFixed(maxDist % 1000 === 0 ? 0 : 1)} km`;
  const hiddenCount = allMosques.length - filteredMosques.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <FilterModal
        visible={showFilter}
        current={maxDist}
        onApply={(v) => { setMaxDist(v); setSelected(null); }}
        onClose={() => setShowFilter(false)}
      />

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        initialRegion={{ latitude: userLoc?.lat ?? 41.0082, longitude: userLoc?.lng ?? 28.9784, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
        onPress={deselectMosque}
      >
        {userLoc && (
          <>
            <Circle center={{ latitude: userLoc.lat, longitude: userLoc.lng }} radius={maxDist} fillColor="rgba(200,168,83,0.05)" strokeColor="rgba(200,168,83,0.3)" strokeWidth={1} />
            <Circle center={{ latitude: userLoc.lat, longitude: userLoc.lng }} radius={200} fillColor="rgba(33,150,243,0.08)" strokeColor="rgba(33,150,243,0.25)" strokeWidth={1} />
          </>
        )}
        {filteredMosques.map(m => (
          <Marker key={m.id} coordinate={{ latitude: m.lat, longitude: m.lng }} onPress={() => selectMosque(m)} tracksViewChanges={false}>
            <View style={[styles.marker, selected?.id === m.id && styles.markerActive]}>
              <MaterialCommunityIcons name="mosque" size={16} color={selected?.id === m.id ? colors.background : colors.gold} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerWrap} pointerEvents="box-none">
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('mosquesTitle')}</Text>
            <Text style={styles.headerSub}>{t('mosquesSubtitle')}</Text>
          </View>
          <TouchableOpacity style={styles.locateBtn} onPress={loadData} disabled={fetching}>
            {fetching ? <ActivityIndicator size="small" color={colors.gold} /> : <Ionicons name="locate" size={20} color={colors.gold} />}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Recenter */}
      {userLoc && (
        <TouchableOpacity style={styles.recenterBtn} onPress={() => mapRef.current?.animateToRegion({ latitude: userLoc.lat, longitude: userLoc.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 600)}>
          <Ionicons name="navigate" size={20} color={colors.gold} />
        </TouchableOpacity>
      )}

      {/* Panel */}
      <View style={styles.panel}>

        {/* Sort + Filter row */}
        <View style={styles.sortRow}>
          <View style={styles.sortLeft}>
            <MaterialCommunityIcons name="sort" size={15} color={colors.gold} />
            <Text style={styles.sortText}>{t('mosquesSortNearest')}</Text>
            {allMosques.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{t('mosquesCount', { count: filteredMosques.length })}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={[styles.filterBtn, maxDist < 5000 && styles.filterBtnActive]} onPress={() => setShowFilter(true)}>
            <MaterialCommunityIcons name="tune-vertical" size={14} color={maxDist < 5000 ? colors.background : colors.gold} />
            <Text style={[styles.filterText, maxDist < 5000 && { color: colors.background }]}>
              {maxDist < 5000 ? `≤ ${filterLabel}` : t('mosquesFilter')}
            </Text>
          </TouchableOpacity>
        </View>

        {hiddenCount > 0 && (
          <TouchableOpacity style={styles.hiddenBanner} onPress={() => setShowFilter(true)}>
            <Ionicons name="eye-off-outline" size={14} color={colors.gold} />
            <Text style={styles.hiddenText}>{t('mosquesHidden', { count: hiddenCount })}</Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.gold} size="large" />
            <Text style={styles.statusText}>{t('mosquesSearching')}</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="mosque" size={40} color={colors.textMuted} />
            <Text style={styles.statusText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
              <Ionicons name="refresh" size={16} color={colors.background} />
              <Text style={styles.retryText}>{t('retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : filteredMosques.length === 0 ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="map-search" size={40} color={colors.textMuted} />
            <Text style={styles.statusText}>{t('mosquesNotFound')}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => setShowFilter(true)}>
              <MaterialCommunityIcons name="tune-vertical" size={16} color={colors.background} />
              <Text style={styles.retryText}>{t('mosquesIncreaseRange' as any)}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredMosques}
            keyExtractor={m => m.id}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 130 }}
            renderItem={({ item }) => {
              const isSelected = selected?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.card, isSelected && styles.cardActive]}
                  onPress={() => selectMosque(item)}
                  activeOpacity={0.75}
                >
                  <Image
                    source={item.photoUrl ? { uri: item.photoUrl } : MOSQUE_IMG}
                    style={styles.thumb}
                    defaultSource={MOSQUE_IMG}
                  />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: item.openNow === false ? colors.red : colors.green }]} />
                      <Text style={[styles.openText, { color: item.openNow === false ? colors.red : colors.green }]}>
                        {item.openNow === false ? t('mosquesClosed') : t('mosquesOpen')}
                      </Text>
                    </View>

                    {/* Inline Git button — visible when selected */}
                    {isSelected && (
                      <TouchableOpacity style={styles.inlineGoBtn} onPress={() => openNavigation(item)}>
                        <Ionicons name="navigate" size={14} color={colors.background} />
                        <Text style={styles.inlineGoBtnText}>{t('mosquesNavigate')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.distCol}>
                    <Text style={[styles.distValue, isSelected && { color: colors.gold }]}>
                      {fmtDistance(item.distance)}
                    </Text>
                    <View style={styles.walkRow}>
                      <Ionicons name="walk" size={12} color={colors.textMuted} />
                      <Text style={styles.walkText}>{item.walkMin} {t('mosquesWalkMin')}</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isSelected ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={isSelected ? colors.gold : colors.textMuted}
                    style={{ marginLeft: 2 }}
                  />
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.cardBorder, marginHorizontal: SPACING.md }} />}
          />
        )}
      </View>

      {/* Location bar */}
      {!loading && (
        <SafeAreaView edges={['bottom']} style={styles.locBar}>
          <View style={styles.locBarInner}>
            <Ionicons name="location" size={16} color={colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locCity}>{cityName}</Text>
              <Text style={styles.locHint}>{t('mosquesLocationHint' as any)}</Text>
            </View>
            <TouchableOpacity style={styles.updateBtn} onPress={loadData} disabled={fetching}>
              {fetching
                ? <ActivityIndicator size="small" color={colors.background} />
                : <><Text style={styles.updateText}>{t('mosquesUpdate')}</Text><Ionicons name="refresh" size={13} color={colors.background} /></>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const makeStyles = (colors: any, fs: (n: number) => number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { width: '100%', height: height * 0.42 },

  // Header
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: 'rgba(11,15,26,0.88)', borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: FONT_SIZE.lg, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 },
  locateBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(200,168,83,0.15)', borderWidth: 1, borderColor: 'rgba(200,168,83,0.35)', alignItems: 'center', justifyContent: 'center' },
  recenterBtn: { position: 'absolute', top: height * 0.42 - 48, right: SPACING.md, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center', zIndex: 10 },

  // Marker
  marker: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(11,15,26,0.92)', borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  markerActive: { backgroundColor: colors.gold, borderColor: '#fff', transform: [{ scale: 1.2 }] },

  // Panel
  panel: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: -20, zIndex: 20 },

  // Sort + Filter row
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  sortLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortText: { color: colors.textSecondary, fontSize: FONT_SIZE.xs, fontWeight: '500' },
  countBadge: { backgroundColor: 'rgba(200,168,83,0.15)', borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  countText: { color: colors.gold, fontSize: 11, fontWeight: '600' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.cardBg, borderRadius: RADIUS.full, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: SPACING.sm + 2, paddingVertical: 6 },
  filterBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  filterText: { color: colors.gold, fontSize: FONT_SIZE.xs, fontWeight: '600' },

  // Hidden banner
  hiddenBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: SPACING.md, marginBottom: SPACING.sm, backgroundColor: 'rgba(200,168,83,0.08)', borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm + 2, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(200,168,83,0.2)' },
  hiddenText: { color: colors.gold, fontSize: 11 },

  // States
  center: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  statusText: { color: colors.textMuted, fontSize: FONT_SIZE.sm, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  retryText: { color: colors.background, fontSize: FONT_SIZE.sm, fontWeight: '700' },

  // List
  list: { flex: 1 },
  card: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2 },
  cardActive: { backgroundColor: 'rgba(200,168,83,0.06)' },
  thumb: { width: 62, height: 62, borderRadius: RADIUS.md, backgroundColor: colors.cardBg, marginTop: 2 },
  cardInfo: { flex: 1, marginLeft: SPACING.md },
  cardName: { color: colors.textPrimary, fontSize: FONT_SIZE.md, fontWeight: '700' },
  cardAddress: { color: colors.textSecondary, fontSize: FONT_SIZE.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  openText: { fontSize: FONT_SIZE.xs, fontWeight: '600' },

  // Inline Go button
  inlineGoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.gold, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, marginTop: SPACING.sm, alignSelf: 'flex-start' },
  inlineGoBtnText: { color: colors.background, fontSize: FONT_SIZE.xs, fontWeight: '700' },

  distCol: { alignItems: 'flex-end', gap: 3, marginTop: 2 },
  distValue: { color: colors.green, fontSize: FONT_SIZE.md, fontWeight: '700' },
  walkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  walkText: { color: colors.textMuted, fontSize: FONT_SIZE.xs },

  // Location bar
  locBar: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  locBarInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: colors.cardBg, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2 },
  locCity: { color: colors.gold, fontSize: FONT_SIZE.xs, fontWeight: '600' },
  locHint: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  updateBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.gold, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.sm + 4, paddingVertical: SPACING.sm },
  updateText: { color: colors.background, fontSize: 11, fontWeight: '700' },

  // Filter Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  filterSheet: { backgroundColor: colors.cardBg, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderTopWidth: 1, borderColor: colors.cardBorder, padding: SPACING.lg, paddingBottom: 40 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder, alignSelf: 'center', marginBottom: SPACING.md },
  sheetTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: '700', marginBottom: 4 },
  sheetHint: { color: colors.textMuted, fontSize: FONT_SIZE.xs, marginBottom: SPACING.lg },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  presetBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.cardBorder },
  presetBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  presetText: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  presetTextActive: { color: colors.background },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  customLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm },
  customInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: SPACING.sm, gap: SPACING.xs },
  customInput: { flex: 1, color: colors.textPrimary, fontSize: FONT_SIZE.md, fontWeight: '600', paddingVertical: SPACING.sm },
  customUnit: { color: colors.textMuted, fontSize: FONT_SIZE.xs },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(200,168,83,0.08)', borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.md },
  summaryText: { color: colors.textSecondary, fontSize: FONT_SIZE.xs, flex: 1, lineHeight: 18 },
  applyBtn: { backgroundColor: colors.gold, borderRadius: RADIUS.lg, paddingVertical: SPACING.sm + 4, alignItems: 'center' },
  applyBtnText: { color: colors.background, fontSize: FONT_SIZE.md, fontWeight: '700' },
});
