import React, { createContext, useContext, useMemo } from 'react';
import { DARK_COLORS, LIGHT_COLORS } from '../constants/theme';
import { useSettingsStore, type AccentColor } from '../store/useSettingsStore';

export type ThemeColors = typeof DARK_COLORS;

interface ThemeCtx {
  colors: ThemeColors;
  isDark: boolean;
  fontScale: number;
  fs: (base: number) => number;
}

const ThemeContext = createContext<ThemeCtx>({
  colors: DARK_COLORS, isDark: true, fontScale: 1, fs: b => b,
});

// Accent palette: dark and light variants + glow/dim
const ACCENTS: Record<AccentColor, { dark: string; light: string; glow: string; dim: string }> = {
  gold:    { dark: '#D4A84B', light: '#C4922A', glow: 'rgba(212,168,75,0.18)',  dim: '#A07830' },
  emerald: { dark: '#34C759', light: '#2A9A48', glow: 'rgba(52,199,89,0.18)',   dim: '#1E7A36' },
  blue:    { dark: '#0A84FF', light: '#1A6FD4', glow: 'rgba(10,132,255,0.18)',  dim: '#0055CC' },
  rose:    { dark: '#FF6B9D', light: '#D4426E', glow: 'rgba(255,107,157,0.18)', dim: '#C0305A' },
  purple:  { dark: '#BF5AF2', light: '#8E44AD', glow: 'rgba(191,90,242,0.18)',  dim: '#7D3C98' },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme       = useSettingsStore(s => s.settings.theme       ?? 'dark');
  const fontSize    = useSettingsStore(s => s.settings.fontSize    ?? 'normal');
  const accentColor = useSettingsStore(s => s.settings.accentColor ?? 'gold');

  const isDark    = theme === 'dark';
  const base      = isDark ? DARK_COLORS : LIGHT_COLORS;
  const accent    = ACCENTS[accentColor];
  const accentVal = isDark ? accent.dark : accent.light;

  const colors: ThemeColors = useMemo(() => ({
    ...base,
    gold:      accentVal,
    goldLight: accent.dark,   // always use dark variant as "light" for glow elements
    goldDim:   accent.dim,
    goldGlow:  accent.glow,
    tabActive: accentVal,
  }), [base, accentVal, accent]);

  const fontScale = fontSize === 'xlarge' ? 1.45 : fontSize === 'large' ? 1.2 : 1.0;
  const fs = useMemo(() => (base: number) => Math.round(base * fontScale), [fontScale]);
  const value = useMemo(() => ({ colors, isDark, fontScale, fs }), [colors, isDark, fontScale, fs]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
