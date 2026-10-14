/**
 * `GET /courses/{id}/curriculum` (API §3) and the adapter to the app's
 * `Curriculum` shape (INTEGRATION.md #5).
 *
 * The wire chapters carry their lessons as `activities` and the lock flag as
 * `isLocked`; lessons have no `completed` flag (completion comes from
 * `GET /progress/course/{id}`). Every feature that needs the curriculum calls
 * `getCurriculumFromApi()` so the screens only ever see `chapter.lessons`.
 */
import { request } from './client';
import type { Chapter, Course, Curriculum, Lesson, UUID } from './types';

type WireLesson = Omit<Lesson, 'completed'> & { completed?: boolean };

interface WireChapter {
  id: UUID;
  courseId: UUID;
  title: string;
  position: number;
  isLocked?: boolean;
  activities?: WireLesson[];
}

export interface WireCurriculum {
  course: Course;
  chapters: WireChapter[];
  stats?: { totalActivities: number; totalDurationSeconds: number };
}

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

export function toCurriculum(wire: WireCurriculum): Curriculum {
  const chapters: Chapter[] = [...(wire.chapters ?? [])].sort(byPosition).map((c) => ({
    id: c.id,
    courseId: c.courseId,
    title: c.title,
    position: c.position,
    locked: c.isLocked === true,
    lessons: [...(c.activities ?? [])].sort(byPosition).map((l) => ({
      ...l,
      metadata: l.metadata ?? null,
      completed: l.completed === true,
    })),
  }));
  const lessons = chapters.flatMap((c) => c.lessons);
  return {
    course: wire.course,
    chapters,
    stats: wire.stats ?? {
      totalActivities: lessons.length,
      totalDurationSeconds: lessons.reduce((s, l) => s + (l.durationSeconds ?? 0), 0),
    },
  };
}

export async function getCurriculumFromApi(courseId: UUID): Promise<Curriculum> {
  return toCurriculum(await request<WireCurriculum>(`/courses/${courseId}/curriculum`));
}
