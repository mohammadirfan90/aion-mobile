import { api } from '@/api/client';
import type { Comment, CreateCommentBody } from '@/api/types';
import { env } from '@/lib/env';
import { mockDelay } from '@/mocks/delay';
import {
  addMockComment,
  deleteMockComment,
  getMockCommentsByLesson,
  toggleMockCommentUpvote,
} from '@/mocks/fixtures/comments';
import { currentUser } from '@/mocks/fixtures/users';

export async function fetchLessonComments(lessonId: string): Promise<Comment[]> {
  if (env.useMocks) {
    const data = getMockCommentsByLesson(lessonId);
    return mockDelay([...data], 180);
  }

  const res = await api.GET('/api/v1/lessons/{lessonId}/comments', {
    params: { path: { lessonId } },
  });
  if (!res.data) throw new Error(res.error ? String(res.error) : 'Failed to fetch comments');
  return (res.data as { data: Comment[] }).data ?? [];
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

  const res = await api.POST('/api/v1/lessons/{lessonId}/comments', {
    params: { path: { lessonId } },
    body: {
      courseId: body.courseId,
      chapterId: body.chapterId,
      content: body.content,
      parentId: body.parentId,
      timestampSeconds: body.timestampSeconds,
    },
  });
  if (!res.data) throw new Error(res.error ? String(res.error) : 'Failed to post comment');
  const created = res.data as unknown as Comment;
  return {
    ...created,
    author: authorInfo
      ? {
          id: authorInfo.id,
          name: authorInfo.name,
          avatarUrl: authorInfo.avatarUrl,
          role: authorInfo.role,
        }
      : undefined,
  };
}

export async function deleteComment(commentId: string): Promise<boolean> {
  if (env.useMocks) {
    deleteMockComment(commentId);
    return mockDelay(true, 150);
  }

  const res = await api.DELETE('/api/v1/comments/{id}', {
    params: { path: { id: commentId } },
  });
  return !!res.data?.data?.deleted;
}

export async function upvoteComment(
  commentId: string
): Promise<{ upvoted: boolean; upvotes: number }> {
  if (env.useMocks) {
    const result = toggleMockCommentUpvote(commentId);
    return mockDelay(result ?? { upvoted: true, upvotes: 1 }, 100);
  }

  return { upvoted: true, upvotes: 1 };
}
