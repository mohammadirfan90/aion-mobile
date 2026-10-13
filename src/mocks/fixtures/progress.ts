import type { HeartbeatResult, LessonProgressRow } from '@/api/types';

import { getCurriculum } from './curriculum';
import { enrollments } from './enrollments';

/**
 * In-memory lesson progress (mock mode). Mirrors `GET /progress/course/{id}`,
 * `PATCH /progress` and `POST /progress/heartbeat` (API §4).
 *
 * Each course is seeded the first time it's read: the first N lessons (in
 * curriculum order) are completed, where N comes from the enrollment's
 * `progressPercent`. After that, mutations update the rows and write the new
 * percent back to the enrollment so Home and My Learning stay consistent.
 */

const MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';
const AUTO_COMPLETE_RATIO = 0.9; // the server auto-completes at 90% watched

const rows = new Map<string, LessonProgressRow>(); // key: lessonId
const seeded = new Set<string>(); // courseIds

function courseLessons(courseId: string) {
  return getCurriculum(courseId)?.chapters.flatMap((c) => c.lessons) ?? [];
}

function seed(courseId: string) {
  if (seeded.has(courseId)) return;
  seeded.add(courseId);
  const enrollment = enrollments.find((e) => e.courseId === courseId);
  if (!enrollment) return;
  const lessons = courseLessons(courseId);
  const completed =
    enrollment.progressPercent >= 100
      ? lessons.length
      : Math.round((enrollment.progressPercent / 100) * lessons.length);
  lessons.slice(0, completed).forEach((l) => {
    rows.set(l.id, makeRow(l.id, { isCompleted: true, completedAt: enrollment.enrolledAt }));
  });
}

function makeRow(lessonId: string, patch: Partial<LessonProgressRow> = {}): LessonProgressRow {
  const now = new Date().toISOString();
  return {
    id: `p-${lessonId}`,
    userId: MOCK_USER_ID,
    lessonId,
    lastPositionSeconds: 0,
    maxWatchedSeconds: 0,
    isCompleted: false,
    completedAt: null,
    updatedAt: now,
    ...patch,
  };
}

function syncEnrollment(courseId: string) {
  const enrollment = enrollments.find((e) => e.courseId === courseId);
  if (!enrollment) return;
  const lessons = courseLessons(courseId);
  if (!lessons.length) return;
  const done = lessons.filter((l) => rows.get(l.id)?.isCompleted).length;
  enrollment.progressPercent = Math.round((done / lessons.length) * 100);
}

export function getCourseProgressRows(courseId: string): LessonProgressRow[] {
  seed(courseId);
  return courseLessons(courseId)
    .map((l) => rows.get(l.id))
    .filter((r): r is LessonProgressRow => !!r)
    .map((r) => ({ ...r }));
}

export function setLessonCompleted(lessonId: string, courseId: string, completed: boolean) {
  seed(courseId);
  const prev = rows.get(lessonId) ?? makeRow(lessonId);
  rows.set(lessonId, {
    ...prev,
    isCompleted: completed,
    completedAt: completed ? (prev.completedAt ?? new Date().toISOString()) : null,
    updatedAt: new Date().toISOString(),
  });
  const enrollment = enrollments.find((e) => e.courseId === courseId);
  if (enrollment) {
    enrollment.lastLessonId = lessonId;
    enrollment.lastActiveAt = new Date().toISOString();
  }
  syncEnrollment(courseId);
  return { completed };
}

export function recordHeartbeat(
  lessonId: string,
  courseId: string,
  positionSeconds: number,
  durationSeconds?: number,
): HeartbeatResult {
  seed(courseId);
  const prev = rows.get(lessonId) ?? makeRow(lessonId);
  const maxWatched = Math.max(prev.maxWatchedSeconds, positionSeconds);
  const reachedEnd =
    !!durationSeconds && durationSeconds > 0 && maxWatched / durationSeconds >= AUTO_COMPLETE_RATIO;
  const isCompleted = prev.isCompleted || reachedEnd;
  rows.set(lessonId, {
    ...prev,
    lastPositionSeconds: positionSeconds,
    maxWatchedSeconds: maxWatched,
    isCompleted,
    completedAt: isCompleted ? (prev.completedAt ?? new Date().toISOString()) : null,
    updatedAt: new Date().toISOString(),
  });
  if (isCompleted !== prev.isCompleted) syncEnrollment(courseId);
  return { isCompleted, lastPositionSeconds: positionSeconds };
}
