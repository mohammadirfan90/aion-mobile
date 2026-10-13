/**
 * Forum route group (SPEC §2). The post list and the post detail are
 * full-screen cards. "New post" is presented as a modal so the user can
 * dismiss it without leaving the feed.
 */
import { Stack } from 'expo-router';

export default function ForumLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" options={{ presentation: 'card' }} />
      <Stack.Screen
        name="new"
        options={{ presentation: 'modal', title: 'New post' }}
      />
    </Stack>
  );
}