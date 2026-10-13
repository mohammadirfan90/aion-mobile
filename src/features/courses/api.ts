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
 * aggregate. In mock mode the values are derived from the enrollment row's
 * `progressPercent` so they stay consistent with the home / my-learning
 * screens.
 */
export async function fetchCourseProgress(courseId: UUID): Promise<CourseProgress> {
  if (env.useMocks) {
    const enrollment = enrollments.find((e) => e.courseId === courseId);
    if (!enrollment) {
      return mockDelay({ total: 0, completed: 0, percent: 0, isCompleted: false });
    }
    const curriculum = getCurriculum(courseId);
    const total = curriculum?.chapters.reduce((s, c) => s + c.lessons.length, 0) ?? 0;
    const completed =
      enrollment.progressPercent >= 100
        ? total
        : Math.round((enrollment.progressPercent / 100) * total);
    return mockDelay({
      total,
      completed,
      percent: enrollment.progressPercent,
      isCompleted: enrollment.progressPercent >= 100,
    });
  }
  const res = await fetch(`${env.apiUrl}/api/v1/enrollments/progress/${courseId}`, {
    headers: { Accept: 'application/json' },
  });
  return unwrap<CourseProgress>(res);
}

/**
 * `GET /progress/course/{courseId}` (API §5). Returns one row per lesson
 * the student has opened. In mock mode we derive the per-lesson completion
 * set from the enrollment's `progressPercent` so the curriculum shows the
 * first N lessons as completed and the rest as pending. The first non-
 * completed lesson becomes the resume target.
 */
export async function fetchCourseLessonProgress(courseId: UUID): Promise<LessonProgress[]> {
  if (env.useMocks) {
    const curriculum = getCurriculum(courseId);
    const enrollment = enrollments.find((e) => e.courseId === courseId);
    if (!curriculum || !enrollment) return mockDelay([]);
    const all = curriculum.chapters.flatMap((c) => c.lessons);
    const completedCount =
      enrollment.progressPercent >= 100
        ? all.length
        : Math.round((enrollment.progressPercent / 100) * all.length);
    return mockDelay(
      all.map<LessonProgress>((l, i) => ({
        lessonId: l.id,
        isCompleted: i < completedCount,
        lastPositionSeconds: 0,
        maxWatchedSeconds: 0,
      })),
    );
  }
  const res = await fetch(`${env.apiUrl}/api/v1/progress/course/${courseId}`, {
    headers: { Accept: 'application/json' },
  });
  return unwrap<LessonProgress[]>(res);
}
