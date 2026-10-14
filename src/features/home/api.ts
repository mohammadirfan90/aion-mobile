/**
 * Home feature — data layer for S07.
 *
 * Per D-07, screens never call `fetch`; they go through `useHomeSummary` and
 * `useExploreMore` in `./hooks.ts`.
 *
 * Home is built on the device (API §12, INTEGRATION.md #8):
 *   1. `GET /users/me/learning-summary` — stats and one row per enrolled course
 *   2. `GET /courses?limit=100` — the catalog, for each row's full course card
 *      and for the "explore more" carousel (courses not enrolled in)
 *   3. "Continue learning": the in-progress course with the latest `enrolledAt`,
 *      then its curriculum and progress rows to find the first unfinished lesson.
 * Mock mode feeds the same builder from the fixtures.
 */
import { getCurriculumFromApi } from '@/api/curriculum';
import { request } from '@/api/client';
import type {
  Course,
  Curriculum,
  HomeCourse,
  HomeSummary,
  LearningSummaryData,
  LessonProgressRow,
  MyLearningRow,
  UUID,
} from '@/api/types';
import { env } from '@/lib/env';
import { findNextLesson } from '@/lib/lesson';
import { courses as mockCourses } from '@/mocks/fixtures/courses';
import { getCurriculum } from '@/mocks/fixtures/curriculum';
import { getMyLearning } from '@/mocks/fixtures/enrollments';
import { getCourseProgressRows } from '@/mocks/fixtures/progress';
import { mockDelay } from '@/mocks/delay';

export async function fetchCatalog(): Promise<Course[]> {
  if (env.useMocks) return mockDelay(mockCourses);
  return request<Course[]>('/courses', { query: { limit: 100 }, anonymous: true });
}

export async function fetchLearningSummaryData(): Promise<LearningSummaryData> {
  if (env.useMocks) {
    const rows = getMyLearning();
    return mockDelay({
      totalEnrolled: rows.length,
      totalCompleted: rows.filter((r) => r.isCompleted).length,
      inProgress: rows.filter((r) => !r.isCompleted && r.completedLessons > 0).length,
      totalLessonsFinished: rows.reduce((s, r) => s + r.completedLessons, 0),
      courses: rows,
    });
  }
  return request<LearningSummaryData>('/users/me/learning-summary');
}

async function fetchCurriculumAndProgress(
  courseId: UUID,
): Promise<{ curriculum: Curriculum; progress: LessonProgressRow[] }> {
  if (env.useMocks) {
    const curriculum = getCurriculum(courseId);
    return mockDelay({
      curriculum: curriculum ?? { course: mockCourses[0], chapters: [] },
      progress: getCourseProgressRows(courseId),
    });
  }
  const [curriculum, progress] = await Promise.all([
    getCurriculumFromApi(courseId),
    request<LessonProgressRow[]>(`/progress/course/${courseId}`),
  ]);
  return { curriculum, progress };
}

/** In progress = started and not finished. Latest `enrolledAt` wins (API §12). */
export function pickContinueRow(rows: MyLearningRow[]): MyLearningRow | null {
  return (
    rows
      .filter((r) => !r.isCompleted && r.completedLessons > 0)
      .sort((a, b) => Date.parse(b.enrolledAt) - Date.parse(a.enrolledAt))[0] ?? null
  );
}

/** A course card for a summary row whose course isn't in the public catalog (e.g. archived). */
function courseFromRow(row: MyLearningRow): Course {
  return {
    id: row.id,
    title: row.title,
    slug: row.id,
    description: null,
    about: null,
    thumbnail: row.thumbnail,
    learnings: null,
    tags: null,
    level: null,
    pricingConfig: null,
    accessConfig: null,
    instructorId: '',
    status: 'published',
    certificateConfig: null,
    createdAt: row.enrolledAt,
    updatedAt: row.enrolledAt,
  };
}

export function buildHomeSummary(
  summary: LearningSummaryData,
  catalog: Course[],
  next: { courseId: UUID; curriculum: Curriculum; progress: LessonProgressRow[] } | null,
): HomeSummary {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const enrolledCourses: HomeCourse[] = [...summary.courses]
    .sort((a, b) => Date.parse(b.enrolledAt) - Date.parse(a.enrolledAt))
    .map((progress) => ({ course: byId.get(progress.id) ?? courseFromRow(progress), progress }));

  const current = next ? enrolledCourses.find((c) => c.course.id === next.courseId) : undefined;
  const completed = new Set((next?.progress ?? []).filter((r) => r.isCompleted).map((r) => r.lessonId));

  return {
    enrollmentsCount: summary.totalEnrolled,
    lessonsCompletedCount: summary.totalLessonsFinished,
    coursesCompletedCount: summary.totalCompleted,
    continueLearning:
      current && next ? { ...current, nextLesson: findNextLesson(next.curriculum.chapters, completed) } : null,
    enrolledCourses,
  };
}

export async function fetchHomeSummary(catalog: Course[]): Promise<HomeSummary> {
  const summary = await fetchLearningSummaryData();
  const row = pickContinueRow(summary.courses);
  let next: Parameters<typeof buildHomeSummary>[2] = null;
  if (row) {
    try {
      next = { courseId: row.id, ...(await fetchCurriculumAndProgress(row.id)) };
    } catch {
      // The card still links to the course's curriculum without a next lesson.
      next = { courseId: row.id, curriculum: { course: courseFromRow(row), chapters: [] }, progress: [] };
    }
  }
  return buildHomeSummary(summary, catalog, next);
}
