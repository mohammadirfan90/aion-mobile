/**
 * AI tutor feature — data layer for S17 (API §13).
 *
 *   - `GET /ai/history?limit=50`, `POST /ai/history/message`, `DELETE /ai/history`.
 *   - `POST /ai/tutor-stream` — a text/event-stream reply. The stream saves
 *     nothing: the hook saves the user message before streaming and the full
 *     reply after it ends.
 *   - The lesson, its notes and the course title feed the tutor's `context`
 *     when the chat is opened from a lesson (shared cache keys with S12/S13).
 *
 * The stream goes through `expo/fetch` with the same bearer token and single
 * 401 refresh as `request()`; `lib/sse.ts` parses it. Every body is clamped to
 * the server's caps first (`./limits.ts`).
 */
import { fetch as expoFetch } from 'expo/fetch';

import {
  apiBaseUrl,
  getAuthToken,
  refreshAuthToken,
  reportSessionExpired,
  request,
  unwrap,
} from '@/api/client';
import { getCurriculumFromApi } from '@/api/curriculum';
import type {
  AiHistory,
  AiHistoryMessageBody,
  AiMessage,
  Curriculum,
  Lesson,
  LessonNote,
  TutorStreamBody,
  UUID,
} from '@/api/types';
import { env } from '@/lib/env';
import { createSseReader } from '@/lib/sse';
import { mockDelay } from '@/mocks/delay';
import {
  addMockHistoryMessage,
  clearMockHistory,
  fakeTutorReply,
  getMockHistory,
} from '@/mocks/fixtures/ai';
import { getCurriculum, getLesson } from '@/mocks/fixtures/curriculum';
import { getMockNotes } from '@/mocks/fixtures/notes';

import { limitTutorBody, TUTOR_LIMITS } from './limits';

function codedError(code: string, message: string): Error {
  const err = new Error(message);
  (err as { code?: string }).code = code;
  return err;
}

export async function fetchHistory(): Promise<AiHistory> {
  if (env.useMocks) return mockDelay(getMockHistory(), 300);
  return request<AiHistory>('/ai/history', { query: { limit: 50 } });
}

export async function saveHistoryMessage(body: AiHistoryMessageBody): Promise<AiMessage> {
  const content = body.content.slice(0, TUTOR_LIMITS.savedMessage);
  if (env.useMocks) return mockDelay(addMockHistoryMessage(body.role, content), 120);
  return request<AiMessage>('/ai/history/message', { method: 'POST', body: { ...body, content } });
}

export async function clearHistory(): Promise<{ cleared: true }> {
  if (env.useMocks) return mockDelay(clearMockHistory(), 200);
  return request<{ cleared: true }>('/ai/history', { method: 'DELETE' });
}

// ── Lesson context ───────────────────────────────────────────────────────────

export async function fetchContextLesson(lessonId: UUID): Promise<Lesson> {
  if (env.useMocks) {
    const lesson = getLesson(lessonId);
    if (!lesson) throw codedError('LESSON_NOT_FOUND', 'Lesson not found');
    return mockDelay({ ...lesson });
  }
  // Same shape as S12's `fetchLesson` (they share the cache key).
  const lesson = await request<Omit<Lesson, 'completed'>>(`/lessons/${lessonId}`);
  return { ...lesson, metadata: lesson.metadata ?? null, completed: false };
}

/** `courseId` is required by `GET /notes/lesson/{id}` (INTEGRATION.md #11). */
export async function fetchContextNotes(lessonId: UUID, courseId: UUID): Promise<LessonNote[]> {
  if (env.useMocks) return mockDelay(getMockNotes(lessonId));
  return request<LessonNote[]>(`/notes/lesson/${lessonId}`, { query: { courseId } });
}

export async function fetchContextCurriculum(courseId: UUID): Promise<Curriculum> {
  if (env.useMocks) {
    const c = getCurriculum(courseId);
    if (!c) throw codedError('COURSE_NOT_FOUND', 'Course not found');
    return mockDelay(c);
  }
  return getCurriculumFromApi(courseId);
}

// ── Streaming ────────────────────────────────────────────────────────────────

function abortError(): Error {
  const err = new Error('Aborted');
  err.name = 'AbortError';
  return err;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(abortError());
    });
  });
}

/**
 * Streams a tutor reply, calling `onDelta` with each new piece of text, and
 * resolves with the whole reply at EOF. Rejects with an `AbortError` when
 * `signal` fires.
 */
export async function streamTutorReply(
  body: TutorStreamBody,
  onDelta: (text: string) => void,
  signal: AbortSignal,
): Promise<string> {
  if (env.useMocks) {
    await wait(500, signal);
    if (/test error/i.test(body.message)) {
      throw codedError('RATE_LIMITED', 'Too many requests');
    }
    let full = '';
    for (const chunk of fakeTutorReply(body.message, body.context?.lessonTitle)) {
      await wait(35, signal);
      full += chunk;
      onDelta(chunk);
    }
    return full;
  }

  const json = JSON.stringify(limitTutorBody(body));
  const open = (token: string | null) =>
    expoFetch(`${apiBaseUrl}/api/v1/ai/tutor-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: json,
      signal,
    });

  const token = getAuthToken();
  let res = await open(token);
  if (res.status === 401 && token) {
    // Same rule as request(): one refresh, sign out only if it's rejected.
    const fresh = await refreshAuthToken().catch(() => undefined);
    if (fresh === null) reportSessionExpired();
    else if (fresh) res = await open(fresh);
  }
  if (!res.ok || !res.body) {
    // JSON envelope (400 validation, 401, 429 with lockout details).
    await unwrap(res as unknown as Response);
    throw codedError('UNKNOWN', 'The tutor couldn’t answer');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const sse = createSseReader(onDelta);
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      sse.push(decoder.decode(value, { stream: true }));
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError' || signal.aborted) throw abortError();
    // An upstream error mid-stream breaks the read: keep what arrived (API §13 rule 6).
    const partial = sse.text();
    if (partial.trim()) return partial;
    throw e;
  }
  sse.push(decoder.decode());
  return sse.end();
}
