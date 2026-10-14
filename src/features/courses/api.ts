/**
 * Courses feature — data layer for S10 (course detail) and S11 (curriculum).
 *
 * Per D-07, screens never call `fetch`; they go through the hooks in
 * `./hooks.ts`. This file is the feature's `api.ts`: fixtures in mock mode,
 * `request()` otherwise.
 *
 * Endpoints used (API §3, §5):
 *   - `GET /courses/{id}/curriculum` — returns `{ course, chapters, stats }`.
 *     The course is included, so S10 only needs this one call to render.
 *     `api/curriculum.ts` maps the wire chapters to `chapter.lessons`.
 *   - `GET /enrollments/my` — ID list, used to decide the bottom-bar action.
 *   - `POST /enrollments` — free or invite-code enroll.
 */
import { getCurriculum } from '@/mocks/fixtures/curriculum';
import { enrollMock, enrollments } from '@/mocks/fixtures/enrollments';
import { getCourseProgressRows } from '@/mocks/fixtures/progress';
import { mockDelay } from '@/mocks/delay';
import { env } from '@/lib/env';
import { isApiError, request } from '@/api/client';
import { getCurriculumFromApi } from '@/api/curriculum';
import type { Curriculum, EnrollBody, Enrollment, UUID } from '@/api/types';

/**
 * Aggregate progress for one enrolled course (API §5).
 * Mirrors `GET /enrollments/progress/{courseId}`:
 *   `{ total, completed, percent, isCompleted }`.
 */
export interface CourseProgress {
  total: number;
  completed: number;
  percent: number; // 0..100
  isCompleted: boolean;
}

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
  return getCurriculumFromApi(courseId);
}

export async function fetchMyEnrollmentsForCourse(courseId: UUID): Promise<Enrollment | null> {
  if (env.useMocks) {
    return mockDelay(enrollments.find((e) => e.courseId === courseId) ?? null);
  }
  // Real API: GET /enrollments/my (API §5). The endpoint returns the full
  // list; we filter on the device because it's a small array and avoids a
  // dedicated "by course" call.
  const list = await request<Enrollment[]>('/enrollments/my');
  return list.find((e) => e.courseId === courseId) ?? null;
}

export async function postEnroll(body: EnrollBody): Promise<Enrollment> {
  if (env.useMocks) {
    return mockDelay(enrollMock(body.courseId, body.inviteCode), 250);
  }
  // Real API: POST /enrollments (API §5).
  try {
    return await request<Enrollment>('/enrollments', { method: 'POST', body });
  } catch (e) {
    // 409 ALREADY_ENROLLED (e.g. bought on the web meanwhile) counts as success.
    if (!isApiError(e) || e.code !== 'ALREADY_ENROLLED') throw e;
    const row = await fetchMyEnrollmentsForCourse(body.courseId);
    if (!row) throw e;
    return row;
  }
}

/**
 * Per-lesson progress row (API §5). The endpoint returns one row per
 * lesson the student has *opened*; "no row" means not started.
 */
export interface LessonProgress {
  lessonId: UUID;
  isCompleted: boolean;
  lastPositionSeconds: number;
  maxWatchedSeconds: number;
}

/**
 * `GET /enrollments/progress/{courseId}` (API §5). The endpoint returns the
 * aggregate. In mock mode it's counted from the shared in-memory progress
 * store (`mocks/fixtures/progress.ts`), which S12's Mark complete writes to.
 */
export async function fetchCourseProgress(courseId: UUID): Promise<CourseProgress> {
  if (env.useMocks) {
    const curriculum = getCurriculum(courseId);
    const total = curriculum?.chapters.reduce((s, c) => s + c.lessons.length, 0) ?? 0;
    const completed = getCourseProgressRows(courseId).filter((r) => r.isCompleted).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return mockDelay({ total, completed, percent, isCompleted: total > 0 && completed >= total });
  }
  return request<CourseProgress>(`/enrollments/progress/${courseId}`);
}

/**
 * `GET /progress/course/{courseId}` (API §5). Returns one row per lesson
 * the student has opened. In mock mode the rows come from the shared
 * in-memory progress store, seeded from `mockProgressPercent`
 * (first N lessons completed) and updated by S12. The first non-completed
 * lesson becomes the resume target.
 */
export async function fetchCourseLessonProgress(courseId: UUID): Promise<LessonProgress[]> {
  if (env.useMocks) return mockDelay(getCourseProgressRows(courseId), 150);
  return request<LessonProgress[]>(`/progress/course/${courseId}`);
}
