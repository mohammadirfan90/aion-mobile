/**
 * Home feature — data layer.
 *
 * Per D-07, screens never call `fetch`; they go through `useLearningSummary`,
 * `useMyCourses` and `useExploreMore` in `./hooks.ts`. This file is the
 * feature's `api.ts`: it returns fixtures in mock mode and will call the
 * real openapi-fetch client in Phase 2 with no change to the screen.
 *
 * The home screen needs three slices:
 *   1. learning summary (stats + continue learning + enrolled courses)
 *   2. my courses (a subset of the enrolled courses, for the horizontal list)
 *   3. explore more (courses the user is NOT enrolled in yet, for the
 *      "discover" carousel on the home screen)
 */
import { getLearningSummary } from '@/mocks/fixtures/enrollments';
import { courses, listCourses } from '@/mocks/fixtures/courses';
import { mockDelay } from '@/mocks/delay';
import { env } from '@/lib/env';
import { unwrap } from '@/api/client';
import type { Course, LearningSummary } from '@/api/types';

export interface ExploreMoreParams {
  excludeCourseIds: string[];
}

export async function fetchLearningSummary(): Promise<LearningSummary> {
  if (env.useMocks) {
    return mockDelay(getLearningSummary());
  }
  // Real API: GET /users/me/learning-summary (API §12).
  const res = await fetch(`${env.apiUrl}/api/v1/users/me/learning-summary`, {
    headers: { Accept: 'application/json' },
  });
  return unwrap<LearningSummary>(res);
}

export async function fetchMyCourses(): Promise<LearningSummary['enrolledCourses']> {
  if (env.useMocks) {
    return mockDelay(getLearningSummary().enrolledCourses);
  }
  const summary = await fetchLearningSummary();
  return summary.enrolledCourses;
}

export async function fetchExploreMore(params: ExploreMoreParams): Promise<Course[]> {
  if (env.useMocks) {
    return mockDelay(listCourses({ excludeIds: params.excludeCourseIds }));
  }
  // Real API: GET /courses?limit=100 (API §3) and filter out enrolled on the
  // device — the API has no "exclude" query.
  const url = new URL(`${env.apiUrl}/api/v1/courses`);
  url.searchParams.set('limit', '100');
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  const all = await unwrap<Course[]>(res);
  const excluded = new Set(params.excludeCourseIds);
  return all.filter((c) => !excluded.has(c.id));
}

export function _allCoursesForReference(): Course[] {
  return courses;
}
