/**
 * Home feature hooks (S07).
 *
 *   - `useLearningSummary()` — stats, the continue-learning card and the
 *     enrolled courses (`HomeSummary`, built in `./api.ts`).
 *   - `useMyCourses()` — the `enrolledCourses` slice of the same query.
 *   - `useExploreMore()` — catalog courses the user is not enrolled in.
 *
 * The catalog is one cached query shared by the summary and the carousel.
 */
import { useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { Course, HomeCourse, HomeSummary } from '@/api/types';
import { fetchCatalog, fetchHomeSummary } from './api';

const catalogKey = [...qk.courses.list({}), 'home'] as const;
const STALE = 30_000;

function catalogQuery(qc: QueryClient): Promise<Course[]> {
  return qc.fetchQuery({ queryKey: catalogKey, queryFn: fetchCatalog, staleTime: STALE });
}

function useHomeQuery<T>(select?: (d: HomeSummary) => T) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.me.learningSummary(),
    // A failed catalog only costs the cards their details (`courseFromRow`).
    queryFn: async () => fetchHomeSummary(await catalogQuery(qc).catch(() => [])),
    staleTime: STALE,
    select,
  });
}

export function useLearningSummary(): UseQueryResult<HomeSummary> {
  return useHomeQuery();
}

const enrolledSlice = (d: HomeSummary) => d.enrolledCourses;

export function useMyCourses(): UseQueryResult<HomeCourse[]> {
  return useHomeQuery(enrolledSlice);
}

export function useExploreMore(excludeCourseIds: string[]): UseQueryResult<Course[]> {
  return useQuery({
    queryKey: catalogKey,
    queryFn: fetchCatalog,
    staleTime: STALE,
    select: (all) => {
      const excluded = new Set(excludeCourseIds);
      return all.filter((c) => !excluded.has(c.id));
    },
  });
}
