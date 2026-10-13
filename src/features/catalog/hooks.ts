/**
 * Catalog feature hooks.
 *
 * - `useCourses()` — paginated-free course list, fetched with `limit=100`
 *   so the catalog lives entirely in the client. Filter parameters are
 *   included in the query key so the screen's local filters are isolated
 *   from the underlying fetch (and from the cache, when something else
 *   invalidates courses).
 * - `useMyEnrollments()` — the student's enrollment rows. The screen uses
 *   the `courseId` set to render the "Enrolled" badge.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { Course, CourseListParams, Enrollment } from '@/api/types';
import { fetchCourses, fetchMyEnrollments } from './api';

export function useCourses(params: CourseListParams = {}): UseQueryResult<Course[]> {
  return useQuery({
    queryKey: qk.courses.list(params),
    queryFn: () => fetchCourses(params),
    staleTime: 30_000,
  });
}

export function useMyEnrollments(): UseQueryResult<Enrollment[]> {
  return useQuery({
    queryKey: qk.enrollments.list(),
    queryFn: fetchMyEnrollments,
    staleTime: 30_000,
  });
}
