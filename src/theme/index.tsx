/**
 * Theme entry-point. Re-exports tokens and provides:
 *   - `Theme` value — palette + spacing + radius + typography, picked for
 *     the active mode (light/dark/system + user override).
 *   - `useTheme()` — React hook for components.
 *   - `useThemeMode()` — read-only accessor for the resolved mode.
 *   - `ThemeProvider` — owns the system color scheme + override + font
 *     bootstrap.
 *
 * Fonts: SPEC §1 calls for Geist via `@expo-google-fonts/geist`. We load it
 * with `expo-font`'s `useFonts` and fall back to the system font if it
 * never resolves (the splash overlay stays visible until the fonts return).
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  useFonts,
} from '@expo-google-fonts/geist';
import * as SplashScreen from 'expo-splash-screen';
import { create } from 'zustand';

import {
  palettes,
  Radius,
  Spacing,
  Typography,
  type RadiusKey,
  type SpacingKey,
  type ThemeMode,
  type ThemePalette,
  type TypographyVariant,
} from './tokens';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Safe to ignore: preventAutoHideAsync throws if called twice in StrictMode.
});

export type ThemeOverride = 'system' | 'light' | 'dark';

interface SettingsState {
  themeOverride: ThemeOverride;
  setThemeOverride: (m: ThemeOverride) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  themeOverride: 'system',
  setThemeOverride: (themeOverride) => set({ themeOverride }),
}));

function resolveMode(override: ThemeOverride, scheme: 'light' | 'dark' | 'unspecified' | null | undefined): ThemeMode {
  if (override === 'light' || override === 'dark') return override;
  return scheme === 'dark' ? 'dark' : 'light';
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemePalette;
  spacing: typeof Spacing;
  radius: typeof Radius;
  typography: typeof Typography;
  fonts: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
  };
}

function buildTheme(mode: ThemeMode): Theme {
  const palette = palettes[mode];
  return {
    mode,
    colors: palette,
    spacing: Spacing,
    radius: Radius,
    typography: Typography,
    // Geist is the SPEC default; system font is the explicit fallback per SPEC §1.
    fonts: {
      regular: 'Geist_400Regular',
      medium: 'Geist_500Medium',
      semibold: 'Geist_600SemiBold',
      bold: 'Geist_700Bold',
    },
  };
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const override = useSettings((s) => s.themeOverride);
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  const mode = resolveMode(override, systemScheme);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider />');
  }
  return ctx;
}

export function useThemeMode(): ThemeMode {
  return useTheme().mode;
}

// Convenience re-exports so consumers can `import { Spacing } from '@/theme'`.
export { Spacing, Radius, Typography, palettes } from './tokens';
export type { SpacingKey, RadiusKey, TypographyVariant, ThemePalette, ThemeMode };

export const Fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
} as const;
