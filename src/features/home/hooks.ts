/**
 * Home feature hooks.
 *
 * Three queries back the S07 Home screen:
 *   - `useLearningSummary()` — stats (enrolled / lessons / completed counts),
 *     the continue-learning card, and the list of enrolled courses.
 *   - `useExploreMore()` — courses the user is not yet enrolled in.
 *
 * `useMyCourses` is a thin alias for the `enrolledCourses` slice of the
 * learning summary; it lives in the same file so screens have a single
 * import for the home data.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { Course, LearningSummary } from '@/api/types';
import { fetchExploreMore, fetchLearningSummary, fetchMyCourses } from './api';

export function useLearningSummary(): UseQueryResult<LearningSummary> {
  return useQuery({
    queryKey: qk.me.learningSummary(),
    queryFn: fetchLearningSummary,
    staleTime: 30_000,
  });
}

export function useMyCourses() {
  return useQuery({
    queryKey: [...qk.me.learningSummary(), 'myCourses'] as const,
    queryFn: fetchMyCourses,
    staleTime: 30_000,
  });
}

export function useExploreMore(excludeCourseIds: string[]): UseQueryResult<Course[]> {
  return useQuery({
    queryKey: [...qk.courses.list({ excludeIds: excludeCourseIds }), 'exploreMore'] as const,
    queryFn: () => fetchExploreMore({ excludeCourseIds }),
    staleTime: 30_000,
    // Don't refetch when the exclude set flips if the previous result is
    // still fresh — small UX nicety, mostly cosmetic.
  });
}
