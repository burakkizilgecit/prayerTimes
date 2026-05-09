import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';

interface Props {
  nextPrayer: string;
  nextTime: string;
  countdown: string;
  city: string;
}

const GOLD  = '#C8A853';
const BG    = '#0B0F1A';
const CARD  = '#111827';
const WHITE = '#FFFFFF';
const MUTED = '#8A8FA8';

export function PrayerTimesWidget({ nextPrayer, nextTime, countdown, city }: Props) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: BG,
        borderRadius: 16,
        padding: 14,
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* Header */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ImageWidget
            image={require('../assets/images/icon.png')}
            imageWidth={20}
            imageHeight={20}
            style={{ borderRadius: 4 }}
          />
          <TextWidget
            text=" İBADET SAATİ"
            style={{ color: GOLD, fontSize: 11, fontWeight: 'bold' }}
          />
        </FlexWidget>
        <TextWidget
          text={city}
          style={{ color: MUTED, fontSize: 10 }}
        />
      </FlexWidget>

      {/* Divider */}
      <FlexWidget
        style={{ height: 1, backgroundColor: '#1E2640', marginVertical: 4 }}
      />

      {/* Prayer info */}
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text="SIRADAKİ NAMAZ"
            style={{ color: MUTED, fontSize: 9, letterSpacing: 1 }}
          />
          <TextWidget
            text={nextPrayer}
            style={{ color: WHITE, fontSize: 20, fontWeight: 'bold', marginTop: 2 }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            flexDirection: 'column',
            alignItems: 'flex-end',
            backgroundColor: CARD,
            borderRadius: 10,
            padding: 8,
          }}
        >
          <TextWidget
            text={nextTime}
            style={{ color: GOLD, fontSize: 22, fontWeight: 'bold' }}
          />
          <TextWidget
            text={countdown}
            style={{ color: MUTED, fontSize: 10, marginTop: 2 }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
