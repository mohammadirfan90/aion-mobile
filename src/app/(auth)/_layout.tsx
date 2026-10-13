/**
 * Layout for the unauthenticated route group (SPEC §2). No tabs, no
 * chrome — the welcome/login/signup flow is a vertical Stack so each screen
 * slides up over the previous one.
 */
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack initialRouteName="welcome" screenOptions={{ headerShown: false }} />;
}