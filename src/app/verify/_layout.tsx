/**
 * Public certificate verification (S29, D-06). Sits outside the auth guards in
 * the root layout so it works while signed out.
 */
import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function VerifyLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
