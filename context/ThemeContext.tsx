import React, { createContext, useContext, useMemo } from 'react';
import { DARK_COLORS, LIGHT_COLORS } from '../constants/theme';
import { useSettingsStore } from '../store/useSettingsStore';

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme    = useSettingsStore(s => s.settings.theme    ?? 'dark');
  const fontSize = useSettingsStore(s => s.settings.fontSize ?? 'normal');
  const isDark   = theme === 'dark';
  const colors   = isDark ? DARK_COLORS : LIGHT_COLORS;
  const fontScale = fontSize === 'xlarge' ? 1.45 : fontSize === 'large' ? 1.2 : 1.0;
  const fs = useMemo(() => (base: number) => Math.round(base * fontScale), [fontScale]);
  const value = useMemo(() => ({ colors, isDark, fontScale, fs }), [colors, isDark, fontScale, fs]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
