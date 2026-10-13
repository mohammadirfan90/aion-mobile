/** App name/version for S25's "About Aion" and S27's About section (expo-constants). */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function appVersion(): { name: string; version: string; build: string | null; label: string } {
  const config = Constants.expoConfig;
  const name = config?.name ?? 'Aion';
  const version = config?.version ?? '1.0.0';
  const build =
    Platform.OS === 'ios'
      ? (config?.ios?.buildNumber ?? null)
      : Platform.OS === 'android' && config?.android?.versionCode
        ? String(config.android.versionCode)
        : null;
  return { name, version, build, label: build ? `${version} (${build})` : version };
}

export function platformName(): string {
  return Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'web';
}
