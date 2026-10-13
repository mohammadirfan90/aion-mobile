import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Comment } from '@/api/types';
import { mockAuth } from '@/mocks/auth-store';
import { currentUser as fallbackUser } from '@/mocks/fixtures/users';

import {
  deleteComment as apiDeleteComment,
  fetchLessonComments,
  postLessonComment,
  upvoteComment as apiUpvoteComment,
} from './api';

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
