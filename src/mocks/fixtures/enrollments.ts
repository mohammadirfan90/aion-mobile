import type { Enrollment, LearningSummary, MyLearningRow } from '@/api/types';
import { courses } from './courses';
import { getCurriculum } from './curriculum';

/** Mock auth user id — matches the one in `users.ts`. */
const MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';

/**
 * "Continue learning" rule (SCREENS §S07, API §12): the in-progress enrollment
 * with the most recent `lastActiveAt`, and its next lesson is the first lesson
 * in the curriculum (chapter order, then position) that is not completed.
 */
function findNextLesson(courseId: string, currentLessonId: string | null) {
  const curriculum = getCurriculum(courseId);
  if (!curriculum) return null;
  for (const chapter of curriculum.chapters) {
    if (chapter.locked) continue;
    for (const lesson of chapter.lessons) {
      if (lesson.completed) continue;
      // If we know which lesson was last active, skip it so we land on the
      // *next* one. If `lastLessonId` is null (never opened), the first
      // uncompleted lesson is the answer.
      if (currentLessonId && lesson.id === currentLessonId) continue;
      return lesson;
    }
  }
  return null;
}

export const enrollments: Enrollment[] = [
  {
    id: 'e-001',
    userId: '11111111-1111-1111-1111-111111111111',
    courseId: 'c0000001-0000-0000-0000-000000000001',
    enrolledAt: '2026-08-20T10:00:00Z',
    source: 'free',
    progressPercent: 100,
    lastLessonId: 'l-intro-03-01',
    lastActiveAt: '2026-09-30T10:00:00Z',
  },
  {
    id: 'e-002',
    userId: '11111111-1111-1111-1111-111111111111',
    courseId: 'c0000002-0000-0000-0000-000000000002',
    enrolledAt: '2026-09-15T10:00:00Z',
    source: 'invite_code',
    progressPercent: 45,
    lastLessonId: 'l-js-01-02',
    lastActiveAt: '2026-10-10T10:00:00Z',
  },
  {
    id: 'e-003',
    userId: '11111111-1111-1111-1111-111111111111',
    courseId: 'c0000004-0000-0000-0000-000000000004',
    enrolledAt: '2026-10-01T10:00:00Z',
    source: 'free',
    progressPercent: 0,
    lastLessonId: null,
    lastActiveAt: null,
  },
];

export function getLearningSummary(): LearningSummary {
  const enrolled = enrollments.map((e) => ({
    enrollment: e,
    course: courses.find((c) => c.id === e.courseId)!,
  }));

  const continueLearning = enrolled
    .filter((e) => e.enrollment.progressPercent > 0 && e.enrollment.progressPercent < 100)
    .sort(
      (a, b) =>
        new Date(b.enrollment.lastActiveAt ?? 0).getTime() -
        new Date(a.enrollment.lastActiveAt ?? 0).getTime(),
    )[0];

  // SPEC §9 honest "lessons finished" — sum the per-enrollment completed count.
  // For the mock we don't have lesson-level progress per enrollment, so we
  // approximate from the per-course percent against the curriculum.
  const lessonsCompletedCount = enrolled.reduce((total, { enrollment, course }) => {
    const curriculum = getCurriculum(course.id);
    if (!curriculum) return total;
    const all = curriculum.chapters.flatMap((c) => c.lessons);
    if (all.length === 0) return total;
    const done =
      enrollment.progressPercent >= 100
        ? all.length
        : Math.round((enrollment.progressPercent / 100) * all.length);
    return total + done;
  }, 0);

  return {
    enrollmentsCount: enrollments.length,
    lessonsCompletedCount,
    coursesCompletedCount: enrollments.filter((e) => e.progressPercent === 100).length,
    continueLearning: continueLearning
      ? {
          enrollment: continueLearning.enrollment,
          course: continueLearning.course,
          nextLesson: findNextLesson(
            continueLearning.course.id,
            continueLearning.enrollment.lastLessonId,
          ),
        }
      : null,
    enrolledCourses: enrolled,
  };
}

/**
 * Per-course rows for S09 (My Learning). Mirrors the `courses[]` shape
 * returned by `GET /users/me/learning-summary` (API §12). The lesson counts
 * are derived from the curriculum + `progressPercent` so they stay honest
 * when the seed values change.
 *
 * - `totalLessons` is every lesson in every chapter (locked chapters too —
 *   the API counts the whole course).
 * - `completedLessons` is rounded from the percent against `totalLessons`
 *   (the per-lesson progress table is not part of the summary response).
 * - `isCompleted` is `percent === 100`; the screen uses it to swap the row
 *   for the "Completed" variant with a Certificate button.
 *
 * Order: by `lastActiveAt` desc, falling back to `enrolledAt` desc.
 */
export function getMyLearning(): MyLearningRow[] {
  return enrollments
    .map<MyLearningRow>((e) => {
      const course = courses.find((c) => c.id === e.courseId)!;
      const curriculum = getCurriculum(e.courseId);
      const allLessons = curriculum?.chapters.flatMap((c) => c.lessons) ?? [];
      const totalLessons = allLessons.length;
      const completedLessons =
        e.progressPercent >= 100
          ? totalLessons
          : Math.round((e.progressPercent / 100) * totalLessons);
      return {
        id: course.id,
        title: course.title,
        thumbnail: course.thumbnail,
        totalLessons,
        completedLessons,
        percent: e.progressPercent,
        isCompleted: e.progressPercent >= 100,
        enrolledAt: e.enrolledAt,
      };
    })
    .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
}

/**
 * In-memory enroll mutation (mock mode, P1-S10).
 *
 * Rules mirror the real API (API §5):
 *   - `ALREADY_ENROLLED` is returned as the existing row (200/201 — UI treats
 *     both as success).
 *   - For invite-only courses the invite code is checked against
 *     `accessConfig.inviteCode`. A wrong or missing code throws
 *     `INVITATION_REQUIRED` so the screen can show a field error.
 *   - A `closed` course throws `COURSE_CLOSED`.
 *
 * Mutates the exported `enrollments` array in place so the next
 * `useMyEnrollments()` call returns the new row without a refetch hack.
 */
export function enrollMock(courseId: string, inviteCode?: string): Enrollment {
  const existing = enrollments.find((e) => e.courseId === courseId);
  if (existing) return existing;

  const course = courses.find((c) => c.id === courseId);
  if (!course) {
    const err = new Error('Course not found');
    (err as { code?: string }).code = 'COURSE_NOT_FOUND';
    throw err;
  }
  const access = course.accessConfig;
  if (access?.mode === 'closed') {
    const err = new Error('Enrollment is closed for this course');
    (err as { code?: string }).code = 'COURSE_CLOSED';
    throw err;
  }
  if (access?.mode === 'invite_only') {
    if (!inviteCode || inviteCode !== access.inviteCode) {
      const err = new Error('A valid invite code is required');
      (err as { code?: string }).code = 'INVITATION_REQUIRED';
      throw err;
    }
  }

  const row: Enrollment = {
    id: `e-${Date.now()}`,
    userId: MOCK_USER_ID,
    courseId,
    enrolledAt: new Date().toISOString(),
    source: access?.mode === 'invite_only' ? 'invite_code' : 'free',
    progressPercent: 0,
    lastLessonId: null,
    lastActiveAt: null,
  };
  enrollments.push(row);
  return row;
}
