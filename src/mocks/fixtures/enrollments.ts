import type { Enrollment, LearningSummary } from '@/api/types';
import { courses } from './courses';
import { getCurriculum } from './curriculum';

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
