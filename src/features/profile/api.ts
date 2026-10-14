/**
 * Profile feature — data layer for S25 (Profile), S26 (Edit profile) and
 * S27 (Settings).
 *
 *   - `GET /users/me`, `PATCH /users/me` (API §12).
 *   - `GET /users/me/learning-summary` (API §12) for the stats card and the
 *     certificate list (completed courses).
 *   - `POST /auth/password` (API §2) for Settings → Change password.
 *   - `POST /media/upload` (`folder=avatars`) through `lib/upload.ts` (API §16).
 *   - Sign-out: `lib/auth-store.ts` (supabase-js in real mode, the mock store in mock mode).
 */
import { request } from '@/api/client';
import type { LearningSummaryData, Me, UpdateMeBody, UploadedMedia } from '@/api/types';
import { env } from '@/lib/env';
import { uploadMedia, type PickedFile } from '@/lib/upload';
import { signOut as authSignOut } from '@/lib/auth-store';
import { mockDelay } from '@/mocks/delay';
import { getMyLearning } from '@/mocks/fixtures/enrollments';
import { changeMockPassword, getMockMe, setMockRole, updateMockMe } from '@/mocks/fixtures/me';

export type { PickedFile };

/** Runs a mock mutation after a short delay, rejecting with its coded error. */
function mockCall<T>(fn: () => T, ms = 400): Promise<T> {
  return mockDelay(null, ms).then(fn);
}

export async function fetchMe(): Promise<Me> {
  if (env.useMocks) return mockDelay(getMockMe());
  return request<Me>('/users/me');
}

export async function patchMe(body: UpdateMeBody): Promise<Me> {
  if (env.useMocks) return mockCall(() => updateMockMe(body), 500);
  return request<Me>('/users/me', { method: 'PATCH', body });
}

export async function fetchLearningSummary(): Promise<LearningSummaryData> {
  if (env.useMocks) {
    const courses = getMyLearning();
    return mockDelay({
      totalEnrolled: courses.length,
      totalCompleted: courses.filter((c) => c.isCompleted).length,
      inProgress: courses.filter((c) => !c.isCompleted && c.percent > 0).length,
      totalLessonsFinished: courses.reduce((sum, c) => sum + c.completedLessons, 0),
      courses,
    });
  }
  return request<LearningSummaryData>('/users/me/learning-summary');
}

export async function postChangePassword(password: string): Promise<null> {
  if (env.useMocks) return mockCall(() => changeMockPassword(password), 600);
  return request<null>('/auth/password', { method: 'POST', body: { password } });
}

export function uploadAvatar(
  file: PickedFile,
  onProgress: (fraction: number) => void,
): Promise<UploadedMedia> {
  const upload = uploadMedia(file, { folder: 'avatars', onProgress });
  // The mock upload returns a placeholder URL that doesn't serve an image; keep
  // the local file so the saved avatar still shows during the session.
  if (env.useMocks) return upload.then((media) => ({ ...media, url: file.uri }));
  return upload;
}

/** Dev-only fixture role switch (SPEC §5). Mock mode only. */
export async function switchFixtureRole(role: Me['role']): Promise<Me> {
  return mockCall(() => setMockRole(role), 200);
}

export async function signOut(): Promise<void> {
  // Ends the session and clears cached data; the root `Stack.Protected` guard
  // then shows the (auth) group.
  await authSignOut();
}
