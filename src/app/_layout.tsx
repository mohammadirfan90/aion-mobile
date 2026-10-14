/**
 * Root layout. The Stack is split into two `Stack.Protected` guards:
 *   - `guard={!isSignedIn}` shows the `(auth)` group (welcome, login, signup, …).
 *   - `guard={isSignedIn}`  shows the `(app)` group (tabs, course, lesson, …).
 *
 * The `verify` group sits outside both guards so the QR-style certificate
 * verification flow can be reached without an account (CONTEXT D-06, SPEC §2).
 *
 * Providers: the theme (tokens + fonts + splash), react-query's client, the
 * toast host and the "waking the server" banner (SPEC §4, §6, §7).
 *
 * SPEC §5: nothing renders until the saved session is restored
 * (`lib/auth-store.ts`). Signing out clears every cached query.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ServerWakeBanner } from '@/components/ServerWakeBanner';
import { ToastHost } from '@/components/ui/Toast';
import { initAuth, onSignedOut, useAuthSession } from '@/lib/auth-store';
import { ThemeProvider, useTheme } from '@/theme';

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
      }),
  );

  useEffect(() => {
    void initAuth();
    return onSignedOut(() => queryClient.clear());
  }, [queryClient]);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RootStack />
        <ServerWakeBanner />
        <ToastHost />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const theme = useTheme();
  const { isSignedIn, isLoading } = useAuthSession();

  // While we don't know yet, render nothing (the splash is still up).
  if (isLoading) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
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
