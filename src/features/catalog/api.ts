/**
 * Catalog feature — data layer.
 *
 * Per D-07, screens never call `fetch`; they go through the hooks in
 * `./hooks.ts`. This file is the feature's `api.ts`: it returns fixtures in
 * mock mode and will call the real openapi-fetch client in Phase 2 with no
 * change to the screen.
 *
 * S08 (Explore) uses two endpoints:
 *   - GET /courses?limit=100 (API §3) — the catalog. The API has NO search,
 *     level, or price filters, so the screen does all of that on the device.
 *   - GET /enrollments/my (API §5) — the student's enrolled course IDs, used
 *     to show the "Enrolled" badge on each card.
 */
import { listCourses } from '@/mocks/fixtures/courses';
import { enrollments } from '@/mocks/fixtures/enrollments';
import { mockDelay } from '@/mocks/delay';
import { env } from '@/lib/env';
import { unwrap } from '@/api/client';
import type { Course, CourseListParams, Enrollment } from '@/api/types';

export async function fetchCourses(_params: CourseListParams = {}): Promise<Course[]> {
  if (env.useMocks) {
    return mockDelay(listCourses(_params));
  }
  // Real API: GET /courses?limit=100 (API §3). Search/level/price filters are
  // applied on the device because the API has no such parameters.
  const url = new URL(`${env.apiUrl}/api/v1/courses`);
  url.searchParams.set('limit', '100');
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  return unwrap<Course[]>(res);
}

export async function fetchMyEnrollments(): Promise<Enrollment[]> {
  if (env.useMocks) {
    return mockDelay(enrollments);
  }
  // Real API: GET /enrollments/my (API §5).
  const res = await fetch(`${env.apiUrl}/api/v1/enrollments/my`, {
    headers: { Accept: 'application/json' },
  });
  return unwrap<Enrollment[]>(res);
}
