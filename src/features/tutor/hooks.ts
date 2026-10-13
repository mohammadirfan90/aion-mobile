/**
 * AI tutor hooks (S17).
 *
 * `useTutorChat` runs one exchange (API §13):
 *   1. show the user message at once, then `POST /ai/history/message` it;
 *   2. stream the reply into a live assistant bubble (`streaming`);
 *   3. at EOF save the full reply and append it to the cached history.
 * Stop aborts the stream and keeps (and saves) whatever arrived. A failure
 * leaves a failed bubble; `retry()` re-asks the same question.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { AiHistory, AiMessage, TutorStreamBody, UUID } from '@/api/types';

import {
  clearHistory,
  fetchContextCurriculum,
  fetchContextLesson,
  fetchContextNotes,
  fetchHistory,
  saveHistoryMessage,
  streamTutorReply,
} from './api';

const HISTORY_FOR_CONTEXT = 6; // the server uses the last 6
const MAX_LESSON_CONTENT = 20_000;
const MAX_NOTES = 50;

export function useTutorHistory() {
  return useQuery({ queryKey: qk.ai.history(), queryFn: fetchHistory });
}

export function useClearHistory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clearHistory,
    onSuccess: () => {
      qc.setQueryData<AiHistory>(qk.ai.history(), { conversation: null, messages: [] });
    },
  });
}

/** The lesson, its notes and the course title, when opened from a lesson. */
export function useTutorContext(courseId: UUID | null, lessonId: UUID | null) {
  const lesson = useQuery({
    queryKey: qk.lessons.detail(lessonId ?? 'pending'),
    queryFn: () => fetchContextLesson(lessonId as UUID),
    enabled: !!lessonId,
    staleTime: 60_000,
  });
  const notes = useQuery({
    queryKey: qk.notes.lesson(lessonId ?? 'pending'),
    queryFn: () => fetchContextNotes(lessonId as UUID),
    enabled: !!lessonId,
  });
  const curriculum = useQuery({
    queryKey: qk.courses.curriculum(courseId ?? 'pending'),
    queryFn: () => fetchContextCurriculum(courseId as UUID),
    enabled: !!courseId,
    staleTime: 30_000,
  });
  return {
    lessonTitle: lesson.data?.title ?? null,
    lessonContent: lesson.data?.content ?? null,
    notes: notes.data ?? [],
    courseTitle: curriculum.data?.course.title ?? null,
  };
}

export type TutorStatus = 'idle' | 'sending' | 'streaming' | 'error';

export interface TutorFailure {
  prompt: string;
  code: string | null;
}

export function useTutorChat(options: {
  courseId: UUID | null;
  lessonId: UUID | null;
  context: ReturnType<typeof useTutorContext>;
}) {
  const qc = useQueryClient();
  const historyQ = useTutorHistory();
  const [status, setStatus] = useState<TutorStatus>('idle');
  const [streaming, setStreaming] = useState('');
  const [failure, setFailure] = useState<TutorFailure | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const append = useCallback(
    (msg: AiMessage) => {
      qc.setQueryData<AiHistory>(qk.ai.history(), (prev) => ({
        conversation: prev?.conversation ?? null,
        messages: [...(prev?.messages ?? []), msg],
      }));
    },
    [qc],
  );

  const buildBody = useCallback(
    (message: string): TutorStreamBody => {
      const { courseId, lessonId, context } = options;
      const history = (qc.getQueryData<AiHistory>(qk.ai.history())?.messages ?? [])
        .filter((m): m is AiMessage & { role: 'user' | 'assistant' } => m.role !== 'system')
        .slice(-HISTORY_FOR_CONTEXT - 1, -1) // the new user message is already last
        .map((m) => ({ role: m.role, content: m.content }));
      return {
        courseId,
        lessonId,
        message: message.slice(0, 5000),
        context: lessonId
          ? {
              courseTitle: context.courseTitle ?? undefined,
              lessonTitle: context.lessonTitle ?? undefined,
              lessonContent: context.lessonContent?.slice(0, MAX_LESSON_CONTENT) ?? null,
              userNotes: context.notes.slice(0, MAX_NOTES).map((n) => n.content),
              chatHistory: history,
            }
          : { chatHistory: history },
      };
    },
    [options, qc],
  );

  const ask = useCallback(
    async (prompt: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setFailure(null);
      setStreaming('');
      setStatus('streaming');
      let received = '';
      try {
        const full = await streamTutorReply(
          buildBody(prompt),
          (delta) => {
            received += delta;
            setStreaming(received);
          },
          controller.signal,
        );
        received = full || received;
      } catch (e) {
        const aborted = (e as Error).name === 'AbortError';
        if (!aborted) {
          setStreaming('');
          setStatus('error');
          setFailure({ prompt, code: (e as { code?: string }).code ?? null });
          return;
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
      setStreaming('');
      setStatus('idle');
      if (received.trim()) {
        try {
          append(await saveHistoryMessage({ role: 'assistant', content: received }));
        } catch {
          // Keep the reply on screen even if saving it failed.
          append({
            id: `local-${Date.now()}`,
            conversationId: '',
            role: 'assistant',
            content: received,
            createdAt: new Date().toISOString(),
          });
        }
      }
    },
    [append, buildBody],
  );

  const send = useCallback(
    async (text: string) => {
      const prompt = text.trim();
      if (!prompt || status === 'sending' || status === 'streaming') return;
      setStatus('sending');
      setFailure(null);
      const temp: AiMessage = {
        id: `temp-${Date.now()}`,
        conversationId: '',
        role: 'user',
        content: prompt,
        createdAt: new Date().toISOString(),
      };
      append(temp);
      try {
        const saved = await saveHistoryMessage({ role: 'user', content: prompt });
        qc.setQueryData<AiHistory>(qk.ai.history(), (prev) =>
          prev ? { ...prev, messages: prev.messages.map((m) => (m.id === temp.id ? saved : m)) } : prev,
        );
      } catch (e) {
        setStatus('error');
        setFailure({ prompt, code: (e as { code?: string }).code ?? null });
        return;
      }
      await ask(prompt);
    },
    [append, ask, qc, status],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const retry = useCallback(() => {
    if (failure) void ask(failure.prompt);
  }, [ask, failure]);

  return {
    historyQ,
    messages: historyQ.data?.messages ?? [],
    status,
    streaming,
    failure,
    send,
    stop,
    retry,
  };
}
