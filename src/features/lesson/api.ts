/**
 * Lesson feature data layer: S12 (lesson), S13 (notes), S14 (AI summary) and
 * S18 (comments). Mock mode returns fixtures with in-memory mutations; real
 * mode calls the endpoints in API §4, §6–§9 and §13.
 */
import { request } from '@/api/client';
import { getCurriculumFromApi } from '@/api/curriculum';
import type {
  AiSummary,
  Comment,
  CreateCommentBody,
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
import {
  addMockComment,
  deleteMockComment,
  getMockCommentsByLesson,
  toggleMockCommentUpvote,
} from '@/mocks/fixtures/comments';
import { getCurriculum, getLesson } from '@/mocks/fixtures/curriculum';
import { enrollments } from '@/mocks/fixtures/enrollments';
import { addMockNote, deleteMockNote, getMockNotes } from '@/mocks/fixtures/notes';
import {
  getCourseProgressRows,
  recordHeartbeat,
  setLessonCompleted,
} from '@/mocks/fixtures/progress';
import { getMockQuiz } from '@/mocks/fixtures/quiz';
import { currentUser } from '@/mocks/fixtures/users';

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
  const lesson = await request<Omit<Lesson, 'completed'>>(`/lessons/${lessonId}`);
  // Completion comes from the progress rows, not the lesson.
  return { ...lesson, metadata: lesson.metadata ?? null, completed: false };
}

/** `GET /courses/{id}/curriculum`, for the chapter name and Previous / Next. */
export async function fetchCurriculum(courseId: UUID): Promise<Curriculum> {
  if (env.useMocks) {
    const c = getCurriculum(courseId);
    if (!c) throw mockError('COURSE_NOT_FOUND', 'Course not found');
    return mockDelay(c);
  }
  return getCurriculumFromApi(courseId);
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

/** `GET /notes/lesson/{id}?courseId=` — `courseId` is required (400 without it). */
export async function fetchNotes(lessonId: UUID, courseId: UUID): Promise<LessonNote[]> {
  if (env.useMocks) return mockDelay(getMockNotes(lessonId));
  return request<LessonNote[]>(`/notes/lesson/${lessonId}`, { query: { courseId } });
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
  // A `temp-` id is a valid, uncached summary; `unavailable-` is the empty
  // state; other failures are 500 AI_SUMMARY_ERROR (API §13).
  return request<AiSummary>(`/ai/summary/${lessonId}`, { query: { courseId, lessonTitle } });
}

// ── Comments (S18, API §9) ───────────────────────────────────────────────────

export async function fetchLessonComments(lessonId: string): Promise<Comment[]> {
  if (env.useMocks) {
    const data = getMockCommentsByLesson(lessonId);
    return mockDelay([...data], 180);
  }
  // Flat, oldest first, public (API §9). There is no comment upvote endpoint
  // (B-05c), so `upvotes` is just the stored count and `upvoted` is false.
  const rows = await request<Comment[]>(`/lessons/${lessonId}/comments`);
  return rows.map((c) => ({ ...c, upvotes: c.upvotesCount ?? 0, upvoted: false }));
}

export async function postLessonComment(
  lessonId: string,
  body: CreateCommentBody,
  authorInfo?: { id: string; name: string; avatarUrl: string | null; role: string }
): Promise<Comment> {
  if (env.useMocks) {
    const author = authorInfo ?? {
      id: currentUser.id,
      name: currentUser.fullName,
      avatarUrl: currentUser.avatar,
      role: currentUser.role,
    };
    const newComment: Comment = {
      id: `cm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      lessonId,
      courseId: body.courseId,
      chapterId: body.chapterId ?? null,
      userId: author.id,
      parentId: body.parentId ?? null,
      content: body.content,
      timestampSeconds: body.timestampSeconds ?? null,
      upvotes: 0,
      upvotesCount: 0,
      upvoted: false,
      createdAt: new Date().toISOString(),
      author: {
        id: author.id,
        name: author.name,
        avatarUrl: author.avatarUrl,
        role: author.role,
      },
    };
    addMockComment(newComment);
    return mockDelay(newComment, 200);
  }

  // Returns the row without `author`; the hook fills it in from the current user.
  const created = await request<Comment>(`/lessons/${lessonId}/comments`, {
    method: 'POST',
    body: {
      courseId: body.courseId,
      chapterId: body.chapterId ?? undefined,
      content: body.content,
      parentId: body.parentId ?? undefined,
      timestampSeconds: body.timestampSeconds ?? undefined,
    },
  });
  return {
    ...created,
    upvotes: 0,
    upvoted: false,
    author: authorInfo ?? created.author,
  };
}

export async function deleteComment(commentId: string): Promise<boolean> {
  if (env.useMocks) {
    deleteMockComment(commentId);
    return mockDelay(true, 150);
  }

  const res = await request<{ deleted: boolean }>(`/comments/${commentId}`, { method: 'DELETE' });
  return res.deleted;
}

export async function upvoteComment(
  commentId: string
): Promise<{ upvoted: boolean; upvotes: number }> {
  if (env.useMocks) {
    const result = toggleMockCommentUpvote(commentId);
    return mockDelay(result ?? { upvoted: true, upvotes: 1 }, 100);
  }

  // No endpoint (B-05c): the control is hidden in real mode.
  throw mockError('NOT_FOUND', 'Comment upvotes are not available');
}
