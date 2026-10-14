import type { Enrollment, MyLearningRow } from '@/api/types';
import { isFreeCourse } from '@/lib/course';
import { courses } from './courses';
import { getCurriculum } from './curriculum';

/** Mock auth user id — matches the one in `users.ts`. */
const MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';

/** `GET /enrollments/my` rows: IDs only, like the real API (API §5). */
export const enrollments: Enrollment[] = [
  {
    id: 'e-001',
    userId: MOCK_USER_ID,
    courseId: 'c0000001-0000-0000-0000-000000000001',
    enrolledAt: '2026-08-20T10:00:00Z',
    completedAt: '2026-09-30T10:00:00Z',
  },
  {
    id: 'e-002',
    userId: MOCK_USER_ID,
    courseId: 'c0000002-0000-0000-0000-000000000002',
    enrolledAt: '2026-09-15T10:00:00Z',
    completedAt: null,
  },
  {
    id: 'e-003',
    userId: MOCK_USER_ID,
    courseId: 'c0000004-0000-0000-0000-000000000004',
    enrolledAt: '2026-10-01T10:00:00Z',
    completedAt: null,
  },
];

/**
 * Course percent per enrolled course (mock mode). Seeds the progress store
 * (`progress.ts`: the first N lessons are completed) and is rewritten by it
 * whenever a lesson is marked complete, so Home and My Learning stay in step.
 */
export const mockProgressPercent = new Map<string, number>([
  ['c0000001-0000-0000-0000-000000000001', 100],
  ['c0000002-0000-0000-0000-000000000002', 45],
  ['c0000004-0000-0000-0000-000000000004', 0],
]);

/**
 * Per-course rows for S07 / S09 / S25. Mirrors the `courses[]` shape
 * returned by `GET /users/me/learning-summary` (API §12). The lesson counts
 * are derived from the curriculum + `mockProgressPercent` so they stay honest
 * when the seed values change.
 *
 * - `totalLessons` is every lesson in every chapter (locked chapters too —
 *   the API counts the whole course).
 * - `completedLessons` is rounded from the percent against `totalLessons`
 *   (the per-lesson progress table is not part of the summary response).
 * - `isCompleted` is `percent === 100`; the screen uses it to swap the row
 *   for the "Completed" variant with a Certificate button.
 *
 * Order: by `enrolledAt` desc (the real rows are unordered; screens sort).
 */
export function getMyLearning(): MyLearningRow[] {
  return enrollments
    .map<MyLearningRow>((e) => {
      const course = courses.find((c) => c.id === e.courseId)!;
      const curriculum = getCurriculum(e.courseId);
      const allLessons = curriculum?.chapters.flatMap((c) => c.lessons) ?? [];
      const totalLessons = allLessons.length;
      const percent = mockProgressPercent.get(e.courseId) ?? 0;
      const completedLessons =
        percent >= 100 ? totalLessons : Math.round((percent / 100) * totalLessons);
      return {
        id: course.id,
        title: course.title,
        thumbnail: course.thumbnail,
        totalLessons,
        completedLessons,
        percent,
        isCompleted: percent >= 100,
        enrolledAt: e.enrolledAt,
      };
    })
    .sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
}

/**
 * In-memory enroll mutation (mock mode, P1-S10).
 *
 * Rules mirror the real API (API §5), in its order:
 *   - A paid course throws `PAYMENT_REQUIRED` (checkout is web-only, D-04).
 *   - A `closed` course throws `COURSE_CLOSED`.
 *   - For invite courses the code is checked against `MOCK_INVITE_CODES`
 *     (the real API never sends the code to students). A wrong or missing
 *     code throws `INVITATION_REQUIRED` so the screen can show a field error.
 *   - Already enrolled returns the existing row (the UI treats it as success).
 *
 * Mutates the exported `enrollments` array in place so the next
 * `useMyEnrollments()` call returns the new row without a refetch hack.
 */
const MOCK_INVITE_CODES: Record<string, string> = {
  'c0000003-0000-0000-0000-000000000003': 'TEAM-2026',
};

function mockError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

export function enrollMock(courseId: string, inviteCode?: string): Enrollment {
  const course = courses.find((c) => c.id === courseId);
  if (!course) throw mockError('COURSE_NOT_FOUND', 'Course not found');
  if (!isFreeCourse(course)) throw mockError('PAYMENT_REQUIRED', 'This course must be purchased');
  const mode = course.accessConfig?.accessMode ?? 'open';
  if (mode === 'closed') throw mockError('COURSE_CLOSED', 'Enrollment is closed for this course');
  if (mode === 'invite' && inviteCode?.trim() !== MOCK_INVITE_CODES[courseId]) {
    throw mockError('INVITATION_REQUIRED', 'A valid invite code is required');
  }
  const existing = enrollments.find((e) => e.courseId === courseId);
  if (existing) return existing;

  const row: Enrollment = {
    id: `e-${Date.now()}`,
    userId: MOCK_USER_ID,
    courseId,
    enrolledAt: new Date().toISOString(),
    completedAt: null,
  };
  enrollments.push(row);
  mockProgressPercent.set(courseId, 0);
  return row;
}
