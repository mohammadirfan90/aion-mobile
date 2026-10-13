/**
 * Learning feature hooks.
 *
 * - `useMyLearning()` — the per-course rows the My Learning screen renders
 *   (in-progress vs. completed comes from each row's `isCompleted`).
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { MyLearningRow } from '@/api/types';
import { fetchMyLearning } from './api';

export function useMyLearning(): UseQueryResult<MyLearningRow[]> {
  return useQuery({
    queryKey: qk.learning.list(),
    queryFn: fetchMyLearning,
    staleTime: 30_000,
  });
}
