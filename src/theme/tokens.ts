import { ViewStyle } from 'react-native';

export const palette = {
  dark: '#151a22',
  ink: '#16202f',
  textSoft: '#5d6b82',
  textMuted: '#8994a6',
  canvas: '#f2f5fa',
  surface: '#ffffff',
  surfaceAlt: '#eef3fb',
  brand: '#0d7a6f',
  brandDark: '#0a5d54',
  brandSoft: '#dff8f2',
  accent: '#f5b400',
  accentSoft: '#fff6d9',
  sky: '#4a83ff',
  skySoft: '#e8f0ff',
  success: '#1f9d62',
  successSoft: '#e6f7ee',
  danger: '#d84b4b',
  dangerSoft: '#ffe6e6',
  border: '#d8dfeb',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const shadows: Record<string, ViewStyle> = {
  card: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 4,
  },
};
