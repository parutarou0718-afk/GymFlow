// ========================================
// GymFlow - Dark Theme System
// Modern dark theme inspired by Vercel/Linear
// ========================================

import { StyleSheet } from 'react-native';

export const colors = {
  // Backgrounds
  bg: '#0a0a0a',
  bgSecondary: '#141414',
  bgTertiary: '#1a1a1a',
  bgCard: '#1c1c1e',
  bgElevated: '#222224',
  bgInput: '#1a1a1c',

  // Foreground
  text: '#f5f5f5',
  textSecondary: '#a1a1aa',
  textTertiary: '#71717a',
  textMuted: '#52525b',
  textInverse: '#0a0a0a',

  // Brand
  primary: '#22c55e',        // Green - fitness/active
  primaryDark: '#16a34a',
  primaryLight: '#4ade80',
  primaryBg: 'rgba(34, 197, 94, 0.1)',

  accent: '#3b82f6',         // Blue - info/links
  accentBg: 'rgba(59, 130, 246, 0.1)',

  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.1)',

  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.1)',

  // Borders
  border: '#27272a',
  borderLight: '#3f3f46',

  // Misc
  overlay: 'rgba(0, 0, 0, 0.6)',
  transparent: 'transparent',

  // Tab bar
  tabBar: '#0d0d0d',
  tabBarBorder: '#1a1a1a',
  tabActive: '#22c55e',
  tabInactive: '#52525b',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const typography = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textTertiary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  number: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -1,
  },
  metric: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
});

// Common shadows
export const shadows = StyleSheet.create({
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
