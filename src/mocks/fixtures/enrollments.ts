import type { Enrollment, LearningSummary } from '@/api/types';
import { courses } from './courses';

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

  const lessonsCompletedCount = enrollments
    .filter((e) => e.progressPercent === 100)
    .map(() => 1)
    .concat(
      enrollments
        .filter((e) => e.progressPercent < 100)
        .map((e) => Math.round(e.progressPercent / 10)),
    )
    .reduce((a, b) => a + b, 0);

  return {
    enrollmentsCount: enrollments.length,
    lessonsCompletedCount,
    coursesCompletedCount: enrollments.filter((e) => e.progressPercent === 100).length,
    continueLearning: continueLearning
      ? {
          enrollment: continueLearning.enrollment,
          course: continueLearning.course,
          nextLesson: null, // populated by real hooks in P1
        }
      : null,
    enrolledCourses: enrolled,
  };
}
