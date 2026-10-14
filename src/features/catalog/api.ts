/**
 * Catalog feature — data layer.
 *
 * Per D-07, screens never call `fetch`; they go through the hooks in
 * `./hooks.ts`. This file is the feature's `api.ts`: fixtures in mock mode,
 * `request()` (bearer token, 401 refresh) otherwise.
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
import { request } from '@/api/client';
import type { Course, CourseListParams, Enrollment } from '@/api/types';

export async function fetchCourses(_params: CourseListParams = {}): Promise<Course[]> {
  if (env.useMocks) {
    return mockDelay(listCourses(_params));
  }
  // Real API: GET /courses?limit=100 (API §3). Search/level/price filters are
  // applied on the device because the API has no such parameters.
  return request<Course[]>('/courses', { query: { limit: 100 }, anonymous: true });
}

export async function fetchMyEnrollments(): Promise<Enrollment[]> {
  if (env.useMocks) {
    return mockDelay(enrollments);
  }
  // Real API: GET /enrollments/my (API §5).
  return request<Enrollment[]>('/enrollments/my');
}
