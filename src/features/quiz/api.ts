/**
 * Quiz feature — data layer for S15 (API §6).
 *
 *   - `GET /quizzes/lesson/{lessonId}?courseId=` — the quiz, past submissions
 *     (newest first) and the latest one. No correct answers before submit.
 *   - `POST /quizzes/lesson/{lessonId}/submit` — grades the attempt and
 *     returns per-question feedback. A pass marks the lesson complete on the
 *     server (the mock writes to the shared progress store to match).
 */
import { request } from '@/api/client';
import type { LessonQuiz, QuizSubmitBody, QuizSubmitResult, UUID } from '@/api/types';
import { env } from '@/lib/env';
import { mockDelay } from '@/mocks/delay';
import { setLessonCompleted } from '@/mocks/fixtures/progress';
import { getMockQuiz, submitMockQuiz } from '@/mocks/fixtures/quiz';

export async function fetchLessonQuiz(lessonId: UUID, courseId: UUID): Promise<LessonQuiz> {
  if (env.useMocks) return mockDelay(getMockQuiz(lessonId));
  return request<LessonQuiz>(`/quizzes/lesson/${lessonId}`, { query: { courseId } });
}

export async function submitQuiz(lessonId: UUID, body: QuizSubmitBody): Promise<QuizSubmitResult> {
  if (env.useMocks) {
    const result = submitMockQuiz(lessonId, body);
    if (result.passed) setLessonCompleted(lessonId, body.courseId, true);
    return mockDelay(result, 600);
  }
  return request<QuizSubmitResult>(`/quizzes/lesson/${lessonId}/submit`, {
    method: 'POST',
    body,
  });
}
