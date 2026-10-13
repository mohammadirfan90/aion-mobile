/**
 * Courses feature hooks (S10 course detail, S11 curriculum).
 *
 * - `useCourseCurriculum(courseId)` — the single source of truth for the
 *   course + chapters + lessons. The endpoint also returns the course
 *   itself, so we don't need a separate `GET /courses/{id}`.
 * - `useCourseEnrollment(courseId)` — the student's enrollment row for this
 *   course, or `null` if not enrolled. Drives the bottom action bar.
 * - `useEnroll()` — `POST /enrollments`. On success it invalidates
 *   `enrollments` and `learning` so the Home / My Learning screens reflect
 *   the new enrollment immediately.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { Curriculum, EnrollBody, Enrollment, UUID } from '@/api/types';
import {
  fetchCourseLessonProgress,
  fetchCourseProgress,
  fetchCurriculum,
  fetchMyEnrollmentsForCourse,
  postEnroll,
  type CourseProgress,
  type LessonProgress,
} from './api';

export function useCourseCurriculum(courseId: UUID | null | undefined): UseQueryResult<Curriculum> {
  return useQuery({
    queryKey: courseId ? qk.courses.curriculum(courseId) : ['courses', 'curriculum', 'pending'],
    queryFn: () => fetchCurriculum(courseId as UUID),
    enabled: !!courseId,
    staleTime: 30_000,
  });
}

export function useCourseEnrollment(
  courseId: UUID | null | undefined,
): UseQueryResult<Enrollment | null> {
  return useQuery({
    queryKey: courseId
      ? [...qk.enrollments.detail(courseId)]
      : ['enrollments', 'detail', 'pending'],
    queryFn: () => fetchMyEnrollmentsForCourse(courseId as UUID),
    enabled: !!courseId,
    staleTime: 30_000,
  });
}

export function useCourseProgress(
  courseId: UUID | null | undefined,
): UseQueryResult<CourseProgress> {
  return useQuery({
    queryKey: qk.progress.summary(courseId ?? 'pending'),
    queryFn: () => fetchCourseProgress(courseId as UUID),
    enabled: !!courseId,
    staleTime: 15_000,
  });
}

export function useCourseLessonProgress(
  courseId: UUID | null | undefined,
): UseQueryResult<LessonProgress[]> {
  return useQuery({
    queryKey: qk.progress.course(courseId ?? 'pending'),
    queryFn: () => fetchCourseLessonProgress(courseId as UUID),
    enabled: !!courseId,
    staleTime: 15_000,
  });
}

export function useEnroll(): UseMutationResult<Enrollment, Error, EnrollBody> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postEnroll,
    onSuccess: (_data, vars) => {
      // After enrolling, the per-course detail, the global enrollments list,
      // and the home / learning summaries all change.
      void qc.invalidateQueries({ queryKey: qk.enrollments.detail(vars.courseId) });
      void qc.invalidateQueries({ queryKey: qk.enrollments.all });
      void qc.invalidateQueries({ queryKey: qk.learning.all });
      void qc.invalidateQueries({ queryKey: qk.me.learningSummary() });
    },
  });
}
