/**
 * Support route group (SPEC §2). The ticket list, the ticket thread, and
 * "New ticket" each get their own screen. "New ticket" is a modal so the
 * user can cancel without losing their place.
 */
import { Stack } from 'expo-router';

export default function SupportLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ presentation: 'card' }} />
      <Stack.Screen name="[id]" options={{ presentation: 'card' }} />
      <Stack.Screen
        name="new"
        options={{ presentation: 'modal', title: 'New ticket' }}
      />
    </Stack>
  );
}