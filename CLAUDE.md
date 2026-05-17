# İbadet Saati — Claude Kılavuzu

## Proje Özeti
React Native / Expo SDK 54 ile geliştirilmiş İslami ibadet takip uygulaması.
Play Store paketi: `com.islamicibadet.app`
GitHub: https://github.com/burakkizilgecit/prayerTimes

## Teknik Yapı

```
app/
  (tabs)/          → Tab ekranları (index, prayer-times, qibla, dhikr, mosques, more, duas)
  quran.tsx        → Sure listesi
  quran-surah.tsx  → Sure okuma + sesli dinleme
  settings.tsx     → Ayarlar
  tutorial.tsx     → İlk açılış tanıtım (8 slayt)
  achievements.tsx → Başarım/rozet sistemi
  ...diğer sayfalar

i18n/              → Çeviri sistemi (TR/EN/AR)
  tr.ts / en.ts / ar.ts  → Çeviri dosyaları (60+ anahtar)
  index.ts         → useTranslation() hook + applyRTL()

data/
  hadiths.ts       → 30 hadis (TR + EN + AR)
  duas.ts          → 16 dua (title, arabic, turkish, english)
  quranData.ts     → Kuran API (alquran.cloud)

services/
  prayerService.ts → Namaz vakti hesaplama + getNextPrayer() → {key, name, time}
  notificationService.ts → 3 bildirim kanalı (ezan/ilahi/salavat)

store/             → Zustand store'ları
  useSettingsStore → settings.language, settings.notificationSound
  usePrayerStore   → Konuma göre namaz vakitleri
  useTutorialStore → İlk açılış tutorial tamamlandı mı
```

## Önemli Kararlar

### Çeviri Sistemi
- `useTranslation()` hook her ekranda kullanılıyor
- Arapça seçilince `I18nManager.forceRTL(true)` → yeniden başlatma gerekir
- `t('key', { param: value })` ile interpolasyon destekleniyor

### Bildirim Sesleri
- 3 ayrı Android kanalı: `prayer_ezan`, `prayer_ilahi`, `prayer_salavat`
- Ses dosyaları: `assets/sounds/ezan.wav / ilahi.wav / salavat.wav`
- Şu an sessiz placeholder → gerçek ses dosyasıyla değiştirilmeli

### Build Sistemi
- EAS Build kullanıyor (`eas.json` mevcut)
- Kritik: `plugins/withBuildConfig.js` → AGP 8 için `BuildConfig = true` fix
- APK: `eas build --platform android --profile preview`
- AAB: `eas build --platform android --profile production`

### Google Maps / Camiler
- API anahtarı `mosques.tsx`'te hardcoded
- Places API, Google Cloud Console'da açık olmalı
- API anahtarında "Android app" kısıtlaması varsa HTTP istekler çalışmaz

### Namaz Vakitleri
- `getNextPrayer()` artık `{ key, name, time }` döndürüyor
- Dil karşılaştırması `key` ile yapılıyor (name değil)
- Varsayılan konum: İstanbul (41.0082, 28.9784)

## Gizlilik Politikası
URL: https://burakkizilgecit.github.io/islamicibadet-privacy
Dosya: `privacy-policy.html` (GitHub Pages'e yüklenecek)

## Sık Kullanılan Komutlar
```bash
# Geliştirme
npx expo start --clear

# APK (test)
eas build --platform android --profile preview --non-interactive

# AAB (Play Store)
eas build --platform android --profile production --non-interactive

# Git push
git add -A && git commit -m "mesaj" && git push origin master

# Ses placeholder oluştur
node scripts/create-silent-sounds.js
```

## Özel Bildirim Sesi (Eklenmiş)
- `NotificationSound` tipi artık `'ezan' | 'ilahi' | 'salavat' | 'custom'`
- `AppSettings.customSoundUri` (content:// URI) + `customSoundName` eklendi
- `services/soundPickerService.ts` → `pickSystemRingtone()` + `pickAudioFile()`
- `services/notificationService.ts` → `setupCustomNotificationChannel(uri)`
- Android kanalı her ses değişiminde delete+recreate (channel sound lock-in)
- Paketler: `expo-document-picker`, `expo-intent-launcher`

## Bilinen Sorunlar / TODO
- Bildirim ses dosyaları hâlâ sessiz placeholder (gerçek ses eklenecek)
- Gizlilik politikası GitHub Pages'e yüklenmeli
- Google Maps API kısıtlaması kontrol edilmeli
