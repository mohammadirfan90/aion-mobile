/**
 * Layout for the authenticated route group (SPEC §2). Most of the app lives
 * here: the tabs (Home/Explore/Learning/Community/Profile), course and
 * lesson stacks, forum, support, profile edit, settings, tutor, certificate.
 *
 * The tabs sit in `(app)/(tabs)` and are declared by the tabs layout below.
 * Sheets (notes, summary, comments) use the `formSheet` presentation so they
 * behave like the iOS half-sheet (SPEC §6: "Use the system half-sheet for
 * lesson sheets"). New post and new ticket are full-screen modals.
 */
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="course/[id]" />
      <Stack.Screen name="lesson/[id]" />
      <Stack.Screen name="tutor" />
      <Stack.Screen name="forum" />
      <Stack.Screen name="support" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}