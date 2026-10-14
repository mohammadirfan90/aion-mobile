/**
 * Lesson route group (SPEC §2). The lesson itself (`index.tsx`, S12) is a
 * full screen. Notes, AI summary and comments are `formSheet`s that slide
 * up over the lesson (D-10). Quiz (S15) and assignment (S16) are full
 * screens in their designs, so they're pushed as cards.
 */
import { Stack } from 'expo-router';

export default function LessonLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'formSheet',
        sheetAllowedDetents: [0.5, 1],
        sheetGrabberVisible: true,
      }}
    >
      <Stack.Screen name="index" options={{ presentation: 'card' }} />
      {/* Notes, summary and comments give themselves a fixed height (with a composer /
          footer at the bottom); at a fractional detent Android lays sheet
          content out at full height and cuts the bottom off. */}
      <Stack.Screen name="notes" options={{ sheetAllowedDetents: 'fitToContents' }} />
      <Stack.Screen name="summary" options={{ sheetAllowedDetents: 'fitToContents' }} />
      <Stack.Screen name="comments" options={{ sheetAllowedDetents: 'fitToContents' }} />
      <Stack.Screen name="quiz" options={{ presentation: 'card', gestureEnabled: false }} />
      <Stack.Screen name="assignment" options={{ presentation: 'card' }} />
    </Stack>
  );
}