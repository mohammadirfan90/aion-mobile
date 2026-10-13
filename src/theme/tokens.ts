/**
 * Design tokens for Aion. The values match the neutral palette shared with
 * the Aion web app (CONTEXT D-12, SPEC §6). **No screen or component should
 * ever reference a hex value directly** — read from this file via `useTheme()`.
 *
 * Every token has a light and a dark entry. The active palette is picked at
 * runtime by `useTheme()` from the system color scheme + the user's override
 * (stored in the zustand settings store).
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemePalette {
  background: string;
  foreground: string;
  card: string;
  muted: string;
  mutedForeground: string;
  border: string;
  primary: string;
  primaryForeground: string;
  destructive: string;
  onDestructive: string;
  success: string;
  onSuccess: string;
  warning: string;
  onWarning: string;
  ring: string;
  /** Semi-transparent backdrop for modals and sheets. */
  scrim: string;
}

const light: ThemePalette = {
  background: '#FFFFFF',
  foreground: '#0A0A0A',
  card: '#FFFFFF',
  muted: '#F5F5F5',
  mutedForeground: '#737373',
  border: '#E5E5E5',
  primary: '#171717',
  primaryForeground: '#FAFAFA',
  destructive: '#E7000B',
  onDestructive: '#FFFFFF',
  success: '#16A34A',
  onSuccess: '#FFFFFF',
  warning: '#D97706',
  onWarning: '#FFFFFF',
  ring: '#A1A1A1',
  scrim: 'rgba(0,0,0,0.5)',
};

const dark: ThemePalette = {
  background: '#0A0A0A',
  foreground: '#FAFAFA',
  card: '#171717',
  muted: '#262626',
  mutedForeground: '#A1A1AA',
  border: 'rgba(255,255,255,0.10)',
  primary: '#E5E5E5',
  primaryForeground: '#171717',
  destructive: '#FF6467',
  onDestructive: '#0A0A0A',
  success: '#4ADE80',
  onSuccess: '#0A0A0A',
  warning: '#FBBF24',
  onWarning: '#0A0A0A',
  ring: '#737373',
  scrim: 'rgba(0,0,0,0.7)',
};

export const palettes: Record<ThemeMode, ThemePalette> = { light, dark };

/** Spacing scale: 4-point (SPEC §6). */
export const Spacing = {
  px: 1,
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  eight: 32,
  ten: 40,
  twelve: 48,
} as const;

export type SpacingKey = keyof typeof Spacing;

/** Corner radii. */
export const Radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  full: 999,
} as const;

export type RadiusKey = keyof typeof Radius;

/** Typography scale. Sizes are line-heights in points per SPEC §6. */
export const Typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  tiny: { fontSize: 11, lineHeight: 14, fontWeight: '500' as const },
} as const;

export type TypographyVariant = keyof typeof Typography;
