/**
 * Lesson feature hooks (S12 lesson, S13 notes, S14 AI summary, S18 comments).
 * Screens get data only through these (D-07).
 *
 * Cache keys are shared with the courses feature (`qk.courses.curriculum`,
 * `qk.progress.course`), so marking a lesson complete here updates the S11
 * checks immediately.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { Comment, CreateNoteBody, LessonNote, LessonProgressRow, UUID } from '@/api/types';
import { mockAuth } from '@/mocks/auth-store';
import { currentUser as fallbackUser } from '@/mocks/fixtures/users';

import {
  createNote,
  deleteComment as apiDeleteComment,
  deleteNote,
  fetchAssignmentIntro,
  fetchCurriculum,
  fetchIsEnrolled,
  fetchLesson,
  fetchLessonComments,
  fetchMarkdownUrl,
  fetchNotes,
  fetchProgressRows,
  fetchQuizIntro,
  fetchSummary,
  patchProgress,
  postHeartbeat,
  postLessonComment,
  upvoteComment as apiUpvoteComment,
} from './api';

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

// ── Comments (S18) ───────────────────────────────────────────────────────────

export interface ThreadedComment extends Comment {
  replies: Comment[];
}

export function useLessonComments(
  lessonId: string,
  courseId: string = 'c0000001-0000-0000-0000-000000000001',
  chapterId?: string
) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = mockAuth.getProfile() ?? fallbackUser;
  const currentUserId = profile?.id ?? fallbackUser.id;

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchLessonComments(lessonId);
      setComments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    let active = true;
    fetchLessonComments(lessonId)
      .then((data) => {
        if (active) {
          setComments(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load comments');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [lessonId]);

  // Build the threaded structure from flat list (API §9)
  const threads = useMemo<ThreadedComment[]>(() => {
    const parentMap = new Map<string, Comment[]>();
    const topLevel: ThreadedComment[] = [];

    // Group replies by parentId
    for (const c of comments) {
      if (c.parentId) {
        const existing = parentMap.get(c.parentId) ?? [];
        existing.push(c);
        parentMap.set(c.parentId, existing);
      }
    }

    // Attach replies to top-level comments
    for (const c of comments) {
      if (!c.parentId) {
        topLevel.push({
          ...c,
          replies: parentMap.get(c.id) ?? [],
        });
      }
    }

    return topLevel;
  }, [comments]);

  const totalCount = comments.length;

  // Optimistic post comment
  const postComment = useCallback(
    async (content: string, parentId?: string | null): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed) return false;

      setIsPosting(true);
      const tempId = `temp-${Date.now().toString(36)}`;
      const optimisticAuthor = {
        id: currentUserId,
        name: profile?.fullName ?? 'Alex Chen',
        avatarUrl: profile?.avatar ?? null,
        role: profile?.role ?? 'student',
      };

      const optimisticComment: Comment = {
        id: tempId,
        lessonId,
        courseId,
        chapterId: chapterId ?? null,
        userId: currentUserId,
        parentId: parentId ?? null,
        content: trimmed,
        timestampSeconds: null,
        upvotes: 0,
        upvotesCount: 0,
        upvoted: false,
        createdAt: new Date().toISOString(),
        author: optimisticAuthor,
      };

      // Optimistic insert
      setComments((prev) => [...prev, optimisticComment]);

      try {
        const saved = await postLessonComment(
          lessonId,
          {
            courseId,
            chapterId: chapterId ?? null,
            content: trimmed,
            parentId: parentId ?? null,
          },
          optimisticAuthor
        );

        // Replace temporary comment with saved comment
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? { ...saved, author: optimisticAuthor } : c))
        );
        setIsPosting(false);
        return true;
      } catch (err: unknown) {
        // Roll back optimistic comment on failure
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setError(err instanceof Error ? err.message : 'Failed to post comment');
        setIsPosting(false);
        return false;
      }
    },
    [chapterId, courseId, currentUserId, lessonId, profile]
  );

  // Optimistic delete comment
  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      const previous = [...comments];
      // Optimistic delete: remove comment and any children
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));

      try {
        await apiDeleteComment(commentId);
        return true;
      } catch (err: unknown) {
        // Roll back on failure
        setComments(previous);
        setError(err instanceof Error ? err.message : 'Failed to delete comment');
        return false;
      }
    },
    [comments]
  );

  // Optimistic upvote toggle
  const toggleUpvote = useCallback(async (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const upvoted = !c.upvoted;
        const upvotes = upvoted ? c.upvotes + 1 : Math.max(0, c.upvotes - 1);
        return {
          ...c,
          upvoted,
          upvotes,
          upvotesCount: upvotes,
        };
      })
    );

    try {
      await apiUpvoteComment(commentId);
    } catch {
      // Revert if upvote API fails
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          const upvoted = !c.upvoted;
          const upvotes = upvoted ? c.upvotes + 1 : Math.max(0, c.upvotes - 1);
          return {
            ...c,
            upvoted,
            upvotes,
            upvotesCount: upvotes,
          };
        })
      );
    }
  }, []);

  return {
    comments,
    threads,
    totalCount,
    isLoading,
    isPosting,
    error,
    currentUserId,
    refetch,
    postComment,
    deleteComment,
    toggleUpvote,
  };
}
