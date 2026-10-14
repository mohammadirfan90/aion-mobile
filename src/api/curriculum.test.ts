import { describe, expect, it } from '@jest/globals';

import { toCurriculum, type WireCurriculum } from './curriculum';
import type { Course } from './types';

const course = { id: 'c1', title: 'Course' } as Course;
const lesson = (id: string, position: number) => ({
  id,
  courseId: 'c1',
  chapterId: 'ch1',
  title: id,
  type: 'video',
  position,
  content: null,
  videoUrl: null,
  metadata: {},
  durationSeconds: 60,
});

describe('toCurriculum (INTEGRATION.md #5)', () => {
  const wire: WireCurriculum = {
    course,
    chapters: [
      { id: 'ch2', courseId: 'c1', title: 'Two', position: 20, isLocked: true, activities: [lesson('b', 10)] },
      { id: 'ch1', courseId: 'c1', title: 'One', position: 10, isLocked: false, activities: [lesson('a2', 20), lesson('a1', 10)] },
    ],
    stats: { totalActivities: 3, totalDurationSeconds: 180 },
  };

  it('maps activities → lessons and isLocked → locked, in position order', () => {
    const c = toCurriculum(wire);
    expect(c.chapters.map((ch) => [ch.id, ch.locked])).toEqual([
      ['ch1', false],
      ['ch2', true],
    ]);
    expect(c.chapters[0].lessons.map((l) => l.id)).toEqual(['a1', 'a2']);
    expect(c.chapters[0].lessons[0].completed).toBe(false);
    expect(c.stats).toEqual({ totalActivities: 3, totalDurationSeconds: 180 });
  });

  it('survives a chapter without activities and computes missing stats', () => {
    const c = toCurriculum({ course, chapters: [{ id: 'x', courseId: 'c1', title: 'X', position: 1 }] });
    expect(c.chapters[0].lessons).toEqual([]);
    expect(c.chapters[0].locked).toBe(false);
    expect(c.stats).toEqual({ totalActivities: 0, totalDurationSeconds: 0 });
  });
});
