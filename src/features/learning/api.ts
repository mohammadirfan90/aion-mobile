/**
 * Learning feature — data layer.
 *
 * Per D-07, screens never call `fetch`; they go through `useMyLearning()`
 * in `./hooks.ts`. This file is the feature's `api.ts`: fixtures in mock mode,
 * `request()` otherwise.
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
import { request } from '@/api/client';
import type { MyLearningRow } from '@/api/types';

export async function fetchMyLearning(): Promise<MyLearningRow[]> {
  if (env.useMocks) {
    return mockDelay(getMyLearning());
  }
  // GET /users/me/learning-summary → courses[] (API §12). Rows are unordered.
  const summary = await request<{ courses: MyLearningRow[] }>('/users/me/learning-summary');
  return [...summary.courses].sort((a, b) => Date.parse(b.enrolledAt) - Date.parse(a.enrolledAt));
}
