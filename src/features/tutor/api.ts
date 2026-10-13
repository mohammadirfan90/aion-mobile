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
 * Real streaming is a first version; P2-10 moves the parsing into
 * `lib/sse.ts` with unit tests.
 */
import { fetch as expoFetch } from 'expo/fetch';

import { request } from '@/api/client';
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
import { mockDelay } from '@/mocks/delay';
import {
  addMockHistoryMessage,
  clearMockHistory,
  fakeTutorReply,
  getMockHistory,
} from '@/mocks/fixtures/ai';
import { getCurriculum, getLesson } from '@/mocks/fixtures/curriculum';
import { getMockNotes } from '@/mocks/fixtures/notes';

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
  if (env.useMocks) return mockDelay(addMockHistoryMessage(body.role, body.content), 120);
  return request<AiMessage>('/ai/history/message', { method: 'POST', body });
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
  return request<Lesson>(`/lessons/${lessonId}`);
}

export async function fetchContextNotes(lessonId: UUID): Promise<LessonNote[]> {
  if (env.useMocks) return mockDelay(getMockNotes(lessonId));
  return request<LessonNote[]>(`/notes/lesson/${lessonId}`);
}

export async function fetchContextCurriculum(courseId: UUID): Promise<Curriculum> {
  if (env.useMocks) {
    const c = getCurriculum(courseId);
    if (!c) throw codedError('COURSE_NOT_FOUND', 'Course not found');
    return mockDelay(c);
  }
  return request<Curriculum>(`/courses/${courseId}/curriculum`);
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

/** Pulls the text delta out of one `data: {...}` line (API §13 rule 3). */
function deltaFromLine(line: string): string {
  if (!line.startsWith('data: ')) return '';
  const payload = line.slice(6).trim();
  if (!payload || payload === '[DONE]') return '';
  try {
    const json = JSON.parse(payload) as {
      choices?: { delta?: { content?: string } }[];
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return json.choices?.[0]?.delta?.content ?? json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } catch {
    return '';
  }
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

  const res = await expoFetch(`${env.apiUrl.replace(/\/$/, '')}/api/v1/ai/tutor-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    if (res.status === 429) throw codedError('RATE_LIMITED', 'Too many requests');
    let code = 'UNKNOWN';
    try {
      code = ((await res.json()) as { error?: { code?: string } }).error?.code ?? code;
    } catch {
      // Not JSON.
    }
    throw codedError(code, 'The tutor couldn’t answer');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const delta = deltaFromLine(line.trimEnd());
      if (delta) {
        full += delta;
        onDelta(delta);
      }
    }
  }
  const last = deltaFromLine(buffer.trimEnd());
  if (last) {
    full += last;
    onDelta(last);
  }
  // The server sometimes appends a literal "\n\n" after a closing code fence.
  return full.replace(/\\n\\n$/, '');
}
