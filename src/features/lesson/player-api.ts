/**
 * Lesson player data layer: S12 (lesson), S13 (notes), S14 (AI summary).
 *
 * This is the feature's `api.ts` for the player. It sits next to the
 * comments `api.ts` (S18) in its own file so the two can be built in
 * parallel; fold them together once both have landed.
 *
 * Mock mode returns fixtures with in-memory mutations; real mode calls the
 * endpoints in API §4, §6, §7, §8 and §13.
 */
import { request } from '@/api/client';
import type {
  AiSummary,
  CreateNoteBody,
  Curriculum,
  HeartbeatBody,
  HeartbeatResult,
  Lesson,
  LessonAssignmentSubmission,
  LessonNote,
  LessonProgressRow,
  LessonQuiz,
  ProgressPatchBody,
  UUID,
} from '@/api/types';
import { env } from '@/lib/env';
import { mockDelay } from '@/mocks/delay';
import { getMockSummary } from '@/mocks/fixtures/ai';
import { getMockSubmission } from '@/mocks/fixtures/assignment';
import { getCurriculum, getLesson } from '@/mocks/fixtures/curriculum';
import { enrollments } from '@/mocks/fixtures/enrollments';
import { addMockNote, deleteMockNote, getMockNotes } from '@/mocks/fixtures/notes';
import {
  getCourseProgressRows,
  recordHeartbeat,
  setLessonCompleted,
} from '@/mocks/fixtures/progress';
import { getMockQuiz } from '@/mocks/fixtures/quiz';

function mockError(code: string, message: string): Error {
  const err = new Error(message);
  (err as { code?: string }).code = code;
  return err;
}

// ── Lesson + curriculum (API §3, §4) ─────────────────────────────────────────

/** `GET /lessons/{id}`. Needs enrollment unless the lesson is a preview. */
export async function fetchLesson(lessonId: UUID): Promise<Lesson> {
  if (env.useMocks) {
    const lesson = getLesson(lessonId);
    if (!lesson) throw mockError('LESSON_NOT_FOUND', 'Lesson not found');
    const enrolled = enrollments.some((e) => e.courseId === lesson.courseId);
    if (!enrolled && lesson.metadata?.isPreview !== true) {
      throw mockError('NOT_ENROLLED', 'Enroll in this course to open the lesson');
    }
    return mockDelay({ ...lesson });
  }
  return request<Lesson>(`/lessons/${lessonId}`);
}

/** `GET /courses/{id}/curriculum`, for the chapter name and Previous / Next. */
export async function fetchCurriculum(courseId: UUID): Promise<Curriculum> {
  if (env.useMocks) {
    const c = getCurriculum(courseId);
    if (!c) throw mockError('COURSE_NOT_FOUND', 'Course not found');
    return mockDelay(c);
  }
  return request<Curriculum>(`/courses/${courseId}/curriculum`);
}

/** Fetches a `markdownSettings.sourceType === 'link'` lesson body. */
export async function fetchMarkdownUrl(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Accept: 'text/markdown, text/plain, */*' } });
  if (!res.ok) throw mockError('NOT_FOUND', 'Could not load this reading');
  return res.text();
}

/** `GET /enrollments/my`, reduced to "is the student enrolled in this course?". */
export async function fetchIsEnrolled(courseId: UUID): Promise<boolean> {
  if (env.useMocks) return mockDelay(enrollments.some((e) => e.courseId === courseId), 100);
  const list = await request<{ courseId: UUID }[]>('/enrollments/my');
  return list.some((e) => e.courseId === courseId);
}

// ── Progress (API §4) ────────────────────────────────────────────────────────

export async function fetchProgressRows(courseId: UUID): Promise<LessonProgressRow[]> {
  if (env.useMocks) return mockDelay(getCourseProgressRows(courseId), 150);
  return request<LessonProgressRow[]>(`/progress/course/${courseId}`);
}

export async function patchProgress(body: ProgressPatchBody): Promise<{ completed: boolean }> {
  if (env.useMocks) {
    return mockDelay(
      setLessonCompleted(body.lessonId, body.courseId, body.completed ?? true),
      200,
    );
  }
  return request<{ completed: boolean }>('/progress', { method: 'PATCH', body });
}

export async function postHeartbeat(body: HeartbeatBody): Promise<HeartbeatResult> {
  if (env.useMocks) {
    return mockDelay(
      recordHeartbeat(body.lessonId, body.courseId, body.positionSeconds, body.durationSeconds),
      50,
    );
  }
  return request<HeartbeatResult>('/progress/heartbeat', { method: 'POST', body });
}

// ── Quiz / assignment intro cards (API §6, §7) ───────────────────────────────
// Read-only copies of the quiz and assignment features' queries. They share
// the same query keys, so whichever screen loads first fills the cache.

export async function fetchQuizIntro(lessonId: UUID, courseId: UUID): Promise<LessonQuiz> {
  if (env.useMocks) return mockDelay(getMockQuiz(lessonId));
  return request<LessonQuiz>(`/quizzes/lesson/${lessonId}`, { query: { courseId } });
}

export async function fetchAssignmentIntro(
  lessonId: UUID,
): Promise<LessonAssignmentSubmission | null> {
  if (env.useMocks) return mockDelay(getMockSubmission(lessonId));
  return request<LessonAssignmentSubmission | null>(`/lessons/${lessonId}/assignment`);
}

// ── Notes (API §8) ───────────────────────────────────────────────────────────

export async function fetchNotes(lessonId: UUID): Promise<LessonNote[]> {
  if (env.useMocks) return mockDelay(getMockNotes(lessonId));
  return request<LessonNote[]>(`/notes/lesson/${lessonId}`);
}

export async function createNote(body: CreateNoteBody): Promise<LessonNote> {
  if (env.useMocks) return mockDelay(addMockNote(body), 300);
  return request<LessonNote>('/notes', { method: 'POST', body });
}

export async function deleteNote(id: UUID): Promise<{ deleted: true }> {
  if (env.useMocks) return mockDelay(deleteMockNote(id), 200);
  return request<{ deleted: true }>(`/notes/${id}`, { method: 'DELETE' });
}

// ── AI summary (API §13) ─────────────────────────────────────────────────────

export async function fetchSummary(
  lessonId: UUID,
  courseId: UUID,
  lessonTitle: string,
): Promise<AiSummary> {
  if (env.useMocks) return mockDelay(getMockSummary(lessonId), 700);
  return request<AiSummary>(`/ai/summary/${lessonId}`, { query: { courseId, lessonTitle } });
}
