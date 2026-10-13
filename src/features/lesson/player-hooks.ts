/**
 * Lesson player hooks (S12 lesson, S13 notes, S14 AI summary). Screens get
 * data only through these (D-07). Sits next to the comments `hooks.ts` (S18);
 * see `player-api.ts`.
 *
 * Cache keys are shared with the courses feature (`qk.courses.curriculum`,
 * `qk.progress.course`), so marking a lesson complete here updates the S11
 * checks immediately.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { CreateNoteBody, LessonNote, LessonProgressRow, UUID } from '@/api/types';

import {
  createNote,
  deleteNote,
  fetchAssignmentIntro,
  fetchCurriculum,
  fetchIsEnrolled,
  fetchLesson,
  fetchMarkdownUrl,
  fetchNotes,
  fetchProgressRows,
  fetchQuizIntro,
  fetchSummary,
  patchProgress,
  postHeartbeat,
} from './player-api';

const enabledId = (id: UUID | null | undefined): id is UUID => typeof id === 'string' && !!id;

export function useLesson(lessonId: UUID | null | undefined) {
  return useQuery({
    queryKey: qk.lessons.detail(lessonId ?? 'pending'),
    queryFn: () => fetchLesson(lessonId as UUID),
    enabled: enabledId(lessonId),
    staleTime: 60_000,
    retry: (count, err) => {
      const code = (err as { code?: string }).code;
      return code !== 'NOT_ENROLLED' && code !== 'LESSON_NOT_FOUND' && count < 2;
    },
  });
}

export function useLessonCurriculum(courseId: UUID | null | undefined) {
  return useQuery({
    queryKey: qk.courses.curriculum(courseId ?? 'pending'),
    queryFn: () => fetchCurriculum(courseId as UUID),
    enabled: enabledId(courseId),
    staleTime: 30_000,
  });
}

export function useIsEnrolled(courseId: UUID | null | undefined) {
  return useQuery({
    queryKey: [...qk.enrollments.list(), 'has', courseId ?? 'pending'],
    queryFn: () => fetchIsEnrolled(courseId as UUID),
    enabled: enabledId(courseId),
    staleTime: 30_000,
  });
}

export function useLessonProgress(courseId: UUID | null | undefined) {
  return useQuery({
    queryKey: qk.progress.course(courseId ?? 'pending'),
    queryFn: () => fetchProgressRows(courseId as UUID),
    enabled: enabledId(courseId),
    staleTime: 15_000,
  });
}

export function useMarkdownUrl(url: string | null | undefined) {
  return useQuery({
    queryKey: ['lessons', 'markdownUrl', url ?? ''],
    queryFn: () => fetchMarkdownUrl(url as string),
    enabled: !!url,
    staleTime: 5 * 60_000,
  });
}

/** Writes one lesson's completion into the cached progress rows. */
function patchRows(
  rows: LessonProgressRow[] | undefined,
  lessonId: UUID,
  completed: boolean,
): LessonProgressRow[] {
  const now = new Date().toISOString();
  const list = rows ?? [];
  const existing = list.find((r) => r.lessonId === lessonId);
  if (existing) {
    return list.map((r) =>
      r.lessonId === lessonId
        ? { ...r, isCompleted: completed, completedAt: completed ? (r.completedAt ?? now) : null }
        : r,
    );
  }
  return [
    ...list,
    {
      id: `optimistic-${lessonId}`,
      userId: '',
      lessonId,
      lastPositionSeconds: 0,
      maxWatchedSeconds: 0,
      isCompleted: completed,
      completedAt: completed ? now : null,
      updatedAt: now,
    },
  ];
}

/** Everything that shows course progress besides the per-lesson rows. */
function invalidateCourseProgress(qc: ReturnType<typeof useQueryClient>, courseId: UUID) {
  void qc.invalidateQueries({ queryKey: qk.progress.summary(courseId) });
  void qc.invalidateQueries({ queryKey: qk.me.all });
  void qc.invalidateQueries({ queryKey: qk.learning.all });
  void qc.invalidateQueries({ queryKey: qk.enrollments.all });
}

/** `PATCH /progress`, optimistic (SPEC §4). */
export function useMarkComplete(courseId: UUID | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { lessonId: UUID; completed: boolean }) =>
      patchProgress({ lessonId: vars.lessonId, courseId: courseId as UUID, completed: vars.completed }),
    onMutate: async (vars) => {
      if (!courseId) return { previous: undefined };
      const key = qk.progress.course(courseId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<LessonProgressRow[]>(key);
      qc.setQueryData<LessonProgressRow[]>(key, (rows) =>
        patchRows(rows, vars.lessonId, vars.completed),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (courseId && ctx?.previous) qc.setQueryData(qk.progress.course(courseId), ctx.previous);
    },
    onSettled: () => {
      if (!courseId) return;
      void qc.invalidateQueries({ queryKey: qk.progress.course(courseId) });
      invalidateCourseProgress(qc, courseId);
    },
  });
}

/**
 * `POST /progress/heartbeat` (API §4). Fire-and-forget; when the server
 * auto-completes the lesson (90% watched) the cached rows are updated.
 */
export function useHeartbeat(courseId: UUID | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { lessonId: UUID; positionSeconds: number; durationSeconds?: number }) =>
      postHeartbeat({
        lessonId: vars.lessonId,
        courseId: courseId as UUID,
        positionSeconds: Math.max(0, Math.floor(vars.positionSeconds)),
        durationSeconds:
          vars.durationSeconds && vars.durationSeconds > 0
            ? Math.floor(vars.durationSeconds)
            : undefined,
      }),
    onSuccess: (res, vars) => {
      if (!courseId) return;
      const key = qk.progress.course(courseId);
      const rows = qc.getQueryData<LessonProgressRow[]>(key);
      const wasDone = rows?.find((r) => r.lessonId === vars.lessonId)?.isCompleted === true;
      qc.setQueryData<LessonProgressRow[]>(key, (prev) =>
        patchRows(prev, vars.lessonId, res.isCompleted || wasDone).map((r) =>
          r.lessonId === vars.lessonId ? { ...r, lastPositionSeconds: res.lastPositionSeconds } : r,
        ),
      );
      if (res.isCompleted && !wasDone) invalidateCourseProgress(qc, courseId);
    },
  });
}

export function useQuizIntro(lessonId: UUID | null | undefined, courseId: UUID | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.quiz.byLesson(lessonId ?? 'pending'),
    queryFn: () => fetchQuizIntro(lessonId as UUID, courseId as UUID),
    enabled: enabled && enabledId(lessonId) && enabledId(courseId),
  });
}

export function useAssignmentIntro(lessonId: UUID | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.assignment.byLesson(lessonId ?? 'pending'),
    queryFn: () => fetchAssignmentIntro(lessonId as UUID),
    enabled: enabled && enabledId(lessonId),
  });
}

// ── Notes (S13) ──────────────────────────────────────────────────────────────

export function useLessonNotes(lessonId: UUID | null | undefined) {
  return useQuery({
    queryKey: qk.notes.lesson(lessonId ?? 'pending'),
    queryFn: () => fetchNotes(lessonId as UUID),
    enabled: enabledId(lessonId),
  });
}

/** `POST /notes`, optimistic: the note shows at once with a temporary id. */
export function useAddNote(lessonId: UUID | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateNoteBody) => createNote(body),
    onMutate: async (body) => {
      if (!lessonId) return { previous: undefined };
      const key = qk.notes.lesson(lessonId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<LessonNote[]>(key);
      const now = new Date().toISOString();
      const temp: LessonNote = {
        id: `temp-${Date.now()}`,
        userId: '',
        lessonId: body.lessonId,
        courseId: body.courseId,
        timestampSeconds: body.timestampSeconds ?? null,
        content: body.content,
        createdAt: now,
        updatedAt: now,
      };
      qc.setQueryData<LessonNote[]>(key, (list) => [...(list ?? []), temp]);
      return { previous };
    },
    onError: (_err, _body, ctx) => {
      if (lessonId) qc.setQueryData(qk.notes.lesson(lessonId), ctx?.previous);
    },
    onSettled: () => {
      if (lessonId) void qc.invalidateQueries({ queryKey: qk.notes.lesson(lessonId) });
    },
  });
}

export function useDeleteNote(lessonId: UUID | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: UUID) => deleteNote(id),
    onMutate: async (id) => {
      if (!lessonId) return { previous: undefined };
      const key = qk.notes.lesson(lessonId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<LessonNote[]>(key);
      qc.setQueryData<LessonNote[]>(key, (list) => (list ?? []).filter((n) => n.id !== id));
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (lessonId) qc.setQueryData(qk.notes.lesson(lessonId), ctx?.previous);
    },
    onSettled: () => {
      if (lessonId) void qc.invalidateQueries({ queryKey: qk.notes.lesson(lessonId) });
    },
  });
}

// ── AI summary (S14) ─────────────────────────────────────────────────────────

export function useLessonSummary(
  lessonId: UUID | null | undefined,
  courseId: UUID | null | undefined,
  lessonTitle: string | null | undefined,
) {
  return useQuery({
    queryKey: qk.ai.summary(lessonId ?? 'pending'),
    queryFn: () => fetchSummary(lessonId as UUID, courseId as UUID, lessonTitle ?? ''),
    enabled: enabledId(lessonId) && enabledId(courseId) && !!lessonTitle,
    staleTime: 10 * 60_000,
    retry: (count, err) => {
      const code = (err as { code?: string }).code;
      return code !== 'RATE_LIMITED' && code !== 'FORBIDDEN' && count < 1;
    },
  });
}
