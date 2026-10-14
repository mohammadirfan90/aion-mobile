import { describe, expect, it } from '@jest/globals';

import type { Chapter, Course, Lesson, LearningSummaryData, LessonProgressRow, MyLearningRow } from '@/api/types';
import { buildHomeSummary, pickContinueRow } from './api';

const row = (id: string, completedLessons: number, totalLessons: number, enrolledAt: string): MyLearningRow => ({
  id,
  title: id,
  thumbnail: null,
  totalLessons,
  completedLessons,
  percent: Math.round((completedLessons / totalLessons) * 100),
  isCompleted: completedLessons === totalLessons,
  enrolledAt,
});

const lesson = (id: string, metadata: Lesson['metadata'] = null) => ({ id, title: id, metadata }) as Lesson;
const chapter = (id: string, locked: boolean, lessons: Lesson[]) => ({ id, locked, lessons }) as Chapter;
const done = (lessonId: string) => ({ lessonId, isCompleted: true }) as LessonProgressRow;

describe('pickContinueRow (API §12)', () => {
  it('picks the started, unfinished course with the latest enrolledAt', () => {
    const rows = [
      row('old', 1, 4, '2026-01-01T00:00:00Z'),
      row('new', 2, 4, '2026-05-01T00:00:00Z'),
      row('untouched', 0, 4, '2026-09-01T00:00:00Z'),
      row('finished', 4, 4, '2026-10-01T00:00:00Z'),
    ];
    expect(pickContinueRow(rows)?.id).toBe('new');
  });

  it('returns null when nothing is in progress', () => {
    expect(pickContinueRow([row('finished', 2, 2, '2026-01-01T00:00:00Z')])).toBeNull();
  });
});

describe('buildHomeSummary', () => {
  const summary: LearningSummaryData = {
    totalEnrolled: 2,
    totalCompleted: 0,
    inProgress: 1,
    totalLessonsFinished: 1,
    courses: [row('a', 1, 3, '2026-01-01T00:00:00Z'), row('archived', 0, 2, '2026-02-01T00:00:00Z')],
  };
  const catalog = [{ id: 'a', title: 'Course A' } as Course];

  it('joins rows to catalog courses, newest first, and finds the next open lesson', () => {
    const chapters = [
      chapter('ch1', false, [lesson('l1'), lesson('l2', { isLocked: true }), lesson('l3')]),
      chapter('ch2', true, [lesson('l4')]),
    ];
    const home = buildHomeSummary(summary, catalog, {
      courseId: 'a',
      curriculum: { course: catalog[0], chapters },
      progress: [done('l1')],
    });
    expect(home.enrolledCourses.map((c) => c.course.id)).toEqual(['archived', 'a']);
    expect(home.enrolledCourses[0].course.title).toBe('archived'); // not in the catalog
    expect(home.continueLearning?.course.title).toBe('Course A');
    expect(home.continueLearning?.nextLesson?.id).toBe('l3');
    expect([home.enrollmentsCount, home.lessonsCompletedCount, home.coursesCompletedCount]).toEqual([2, 1, 0]);
  });

  it('has no continue card without an in-progress course', () => {
    expect(buildHomeSummary(summary, catalog, null).continueLearning).toBeNull();
  });
});
