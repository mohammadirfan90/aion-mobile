/**
 * Courses feature — data layer for S10 (course detail) and S11 (curriculum).
 *
 * Per D-07, screens never call `fetch`; they go through the hooks in
 * `./hooks.ts`. This file is the feature's `api.ts`: it returns fixtures in
 * mock mode and will call the real openapi-fetch client in Phase 2 with no
 * change to the screen.
 *
 * Endpoints used (API §3, §5):
 *   - `GET /courses/{id}/curriculum` — returns `{ course, chapters, stats }`.
 *     The course is included, so S10 only needs this one call to render.
 *   - `GET /enrollments/my` — ID list, used to decide the bottom-bar action.
 *   - `POST /enrollments` — free or invite-code enroll.
 */
import { getCurriculum } from '@/mocks/fixtures/curriculum';
import { enrollMock, enrollments } from '@/mocks/fixtures/enrollments';
import { mockDelay } from '@/mocks/delay';
import { env } from '@/lib/env';
import { unwrap } from '@/api/client';
import type { Curriculum, EnrollBody, Enrollment, UUID } from '@/api/types';

export async function fetchCurriculum(courseId: UUID): Promise<Curriculum> {
  if (env.useMocks) {
    const c = getCurriculum(courseId);
    if (!c) {
      const err = new Error('Course not found');
      (err as { code?: string }).code = 'COURSE_NOT_FOUND';
      throw err;
    }
    return mockDelay(c);
  }
  // Real API: GET /courses/{id}/curriculum (API §3).
  const res = await fetch(`${env.apiUrl}/api/v1/courses/${courseId}/curriculum`, {
    headers: { Accept: 'application/json' },
  });
  return unwrap<Curriculum>(res);
}

export async function fetchMyEnrollmentsForCourse(courseId: UUID): Promise<Enrollment | null> {
  if (env.useMocks) {
    return mockDelay(enrollments.find((e) => e.courseId === courseId) ?? null);
  }
  // Real API: GET /enrollments/my (API §5). The endpoint returns the full
  // list; we filter on the device because it's a small array and avoids a
  // dedicated "by course" call.
  const res = await fetch(`${env.apiUrl}/api/v1/enrollments/my`, {
    headers: { Accept: 'application/json' },
  });
  const list = await unwrap<Enrollment[]>(res);
  return list.find((e) => e.courseId === courseId) ?? null;
}

export async function postEnroll(body: EnrollBody): Promise<Enrollment> {
  if (env.useMocks) {
    return mockDelay(enrollMock(body.courseId, body.inviteCode), 250);
  }
  // Real API: POST /enrollments (API §5).
  const res = await fetch(`${env.apiUrl}/api/v1/enrollments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  return unwrap<Enrollment>(res);
}
