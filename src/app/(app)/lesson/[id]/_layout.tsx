/**
 * Lesson route group (SPEC §2). The lesson itself (`index.tsx`, S12) is a
 * full screen. The five sheets that come out of it (notes, AI summary,
 * comments, quiz, assignment) are presented as iOS-style `formSheet`s so
 * they slide up from the bottom and don't fully cover the lesson.
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
    </Stack>
  );
}