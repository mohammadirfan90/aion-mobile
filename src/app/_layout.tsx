/**
 * Root layout. The Stack is split into two `Stack.Protected` guards:
 *   - `guard={!isSignedIn}` shows the `(auth)` group (welcome, login, signup, …).
 *   - `guard={isSignedIn}`  shows the `(app)` group (tabs, course, lesson, …).
 *
 * The `verify` group sits outside both guards so the QR-style certificate
 * verification flow can be reached without an account (CONTEXT D-09, SPEC §2).
 *
 * SPEC §4, §5: the splash screen is held until the (mock or real) session
 * is restored. In mock mode the session is in-memory only, so the splash is
 * dismissed almost immediately on launch.
 */
import { Stack } from 'expo-router';

import { useAuthSession } from '@/mocks/auth-store';

export default function RootLayout() {
  const { isSignedIn, isLoading } = useAuthSession();

  // While we don't know yet, render nothing (the splash is still up).
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Screen name="verify" options={{ presentation: 'modal' }} />
    </Stack>
  );
}