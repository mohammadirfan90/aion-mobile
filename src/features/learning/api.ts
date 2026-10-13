/**
 * Learning feature — data layer.
 *
 * Per D-07, screens never call `fetch`; they go through `useMyLearning()`
 * in `./hooks.ts`. This file is the feature's `api.ts`: it returns fixtures
 * in mock mode and will call the real openapi-fetch client in Phase 2 with
 * no change to the screen.
 *
 * The S09 My Learning screen shows the same data as the home screen's
 * "My courses" carousel, but laid out as a list and split into in-progress
 * vs. completed. The API exposes this as `GET /users/me/learning-summary`
 * (API §12), and `courses[]` already includes `isCompleted`, lesson
 * counts and `enrolledAt`, so one call is enough.
 */
import { getMyLearning } from '@/mocks/fixtures/enrollments';
import { mockDelay } from '@/mocks/delay';
import { env } from '@/lib/env';
import { unwrap } from '@/api/client';
import type { MyLearningRow } from '@/api/types';

export async function fetchMyLearning(): Promise<MyLearningRow[]> {
  if (env.useMocks) {
    return mockDelay(getMyLearning());
  }
  // Real API: GET /users/me/learning-summary → courses[] (API §12).
  const res = await fetch(`${env.apiUrl}/api/v1/users/me/learning-summary`, {
    headers: { Accept: 'application/json' },
  });
  const summary = await unwrap<{ courses: MyLearningRow[] }>(res);
  return summary.courses;
}
