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
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import {
  Geist_400Regular,
  Geist_400Regular_Italic,
  Geist_500Medium,
  Geist_500Medium_Italic,
  Geist_600SemiBold,
  Geist_600SemiBold_Italic,
  Geist_700Bold,
  Geist_700Bold_Italic,
  useFonts,
} from '@expo-google-fonts/geist';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

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

/**
 * AsyncStorage that never rejects: a failed read just means "no saved
 * settings", so hydration always finishes and the splash always hides.
 */
const safeStorage: StateStorage = {
  getItem: (name) => AsyncStorage.getItem(name).catch(() => null),
  setItem: (name, value) => AsyncStorage.setItem(name, value).catch(() => {}),
  removeItem: (name) => AsyncStorage.removeItem(name).catch(() => {}),
};

/**
 * App settings. The theme override is persisted to AsyncStorage (S27: "the
 * theme changes instantly and is remembered"). Hydration is async, so the
 * provider keeps the splash up until it finishes to avoid a light/dark flash.
 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      themeOverride: 'system',
      setThemeOverride: (themeOverride) => set({ themeOverride }),
    }),
    {
      name: 'aion:settings',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ themeOverride: s.themeOverride }),
    },
  ),
);

const subscribeHydration = (cb: () => void) => useSettings.persist.onFinishHydration(cb);
const getHydrated = () => useSettings.persist.hasHydrated();

function useSettingsHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, getHydrated, getHydrated);
}

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
  const settingsHydrated = useSettingsHydrated();
  // Also embedded at build time by the expo-font plugin (app.json), so on
  // Android this resolves at once; the runtime load covers Expo Go / web.
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_400Regular_Italic,
    Geist_500Medium,
    Geist_500Medium_Italic,
    Geist_600SemiBold,
    Geist_600SemiBold_Italic,
    Geist_700Bold,
    Geist_700Bold_Italic,
  });

  const mode = resolveMode(override, systemScheme);
  const theme = useMemo(() => buildTheme(mode), [mode]);

  const ready = (fontsLoaded || !!fontError) && settingsHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Hold the tree until Geist is loaded (the splash covers it). Text laid out
  // with the fallback font keeps its old width on Android and gets clipped
  // when Geist swaps in.
  return <ThemeContext.Provider value={theme}>{ready ? children : null}</ThemeContext.Provider>;
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
