import AsyncStorage from '@react-native-async-storage/async-storage';

export const SEEN_WELCOME_KEY = 'aion:seen_welcome';

/**
 * Returns true if the user has previously completed or dismissed the welcome flow.
 */
export async function getHasSeenWelcome(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(SEEN_WELCOME_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Persists the seenWelcome flag in AsyncStorage.
 */
export async function setHasSeenWelcome(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_WELCOME_KEY, 'true');
  } catch {
    // Non-blocking in offline / mock environments
  }
}

/**
 * Clears the flag (useful for testing and reset flows).
 */
export async function clearHasSeenWelcome(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEEN_WELCOME_KEY);
  } catch {
    // Non-blocking
  }
}
