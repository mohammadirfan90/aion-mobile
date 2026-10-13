/**
 * Community feature — data layer for S19–S21 (API §10, §16).
 *
 *   - `GET /forum/stats`, `GET /forum/posts` (search, category, sort, page).
 *   - `GET /forum/posts/{id}` (counts a view) and `GET .../replies` (flat).
 *   - Writes: create / edit / delete a post, reply, toggle upvotes on posts
 *     and replies, mark a reply as the solution (post owner only).
 *   - The post image goes through the shared `lib/upload.ts` helper
 *     (`folder=forum`).
 *   - The course / lesson a new post links to, for S21's context chip.
 *
 * Mock mode reads and writes the in-memory store in `mocks/fixtures/forum.ts`,
 * acting as the signed-in mock user.
 */
import { request } from '@/api/client';
import type {
  CreateForumPostBody,
  CreateForumReplyBody,
  Curriculum,
  ForumPostItem,
  ForumPostsPage,
  ForumPostsQuery,
  ForumReplyItem,
  ForumStats,
  Lesson,
  UpdateForumPostBody,
  UploadedMedia,
  UpvoteResult,
  UUID,
} from '@/api/types';
import { env } from '@/lib/env';
import { uploadMedia, type PickedFile } from '@/lib/upload';
import { mockAuth } from '@/mocks/auth-store';
import { mockDelay } from '@/mocks/delay';
import { getCurriculum, getLesson } from '@/mocks/fixtures/curriculum';
import {
  addMockForumReply,
  createMockForumPost,
  deleteMockForumPost,
  getMockForumPost,
  getMockForumReplies,
  getMockForumStats,
  listMockForumPosts,
  markMockSolution,
  toggleMockPostUpvote,
  toggleMockReplyUpvote,
  updateMockForumPost,
  type ForumViewer,
} from '@/mocks/fixtures/forum';
import { currentUser } from '@/mocks/fixtures/users';

export type { PickedFile };

/** `POST` / `PUT /forum/posts` return the raw row, without `author` and the computed fields. */
export type ForumPostRow = Pick<ForumPostItem, 'id' | 'userId' | 'title' | 'content' | 'category'> &
  Partial<ForumPostItem>;

function codedError(code: string, message: string): Error {
  const err = new Error(message);
  (err as { code?: string }).code = code;
  return err;
}

/** The mock store acts as whoever is signed in (the fixture student by default). */
function mockViewer(): ForumViewer {
  const p = mockAuth.getProfile() ?? currentUser;
  return { id: p.id, name: p.fullName, avatarUrl: p.avatar, role: p.role };
}

/** Runs a mock store call, turning thrown errors into rejected promises after the usual delay. */
function mock<T>(fn: () => T, ms?: number): Promise<T> {
  try {
    return mockDelay(fn(), ms);
  } catch (e) {
    return new Promise((_, reject) => setTimeout(() => reject(e), ms ?? 250));
  }
}

export const FORUM_PAGE_SIZE = 10;

export async function fetchForumStats(): Promise<ForumStats> {
  if (env.useMocks) return mock(getMockForumStats);
  return request<ForumStats>('/forum/stats');
}

export async function fetchForumPosts(query: ForumPostsQuery): Promise<ForumPostsPage> {
  if (env.useMocks) return mock(() => listMockForumPosts(query, mockViewer().id), 350);
  return request<ForumPostsPage>('/forum/posts', {
    query: {
      search: query.search || undefined,
      category: query.category,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
      courseId: query.courseId,
      chapterId: query.chapterId,
      lessonId: query.lessonId,
    },
  });
}

export async function fetchForumPost(id: UUID): Promise<ForumPostItem> {
  if (env.useMocks) return mock(() => getMockForumPost(id, mockViewer().id));
  return request<ForumPostItem>(`/forum/posts/${id}`);
}

export async function fetchForumReplies(postId: UUID): Promise<ForumReplyItem[]> {
  if (env.useMocks) return mock(() => getMockForumReplies(postId, mockViewer().id));
  return request<ForumReplyItem[]>(`/forum/posts/${postId}/replies`);
}

export async function createForumPost(body: CreateForumPostBody): Promise<ForumPostRow> {
  if (env.useMocks) return mock(() => createMockForumPost(body, mockViewer()), 500);
  return request<ForumPostRow>('/forum/posts', { method: 'POST', body });
}

export async function updateForumPost(id: UUID, body: UpdateForumPostBody): Promise<ForumPostRow> {
  if (env.useMocks) return mock(() => updateMockForumPost(id, body, mockViewer().id), 400);
  return request<ForumPostRow>(`/forum/posts/${id}`, { method: 'PUT', body });
}

export async function deleteForumPost(id: UUID): Promise<{ deleted: true }> {
  if (env.useMocks) return mock(() => deleteMockForumPost(id, mockViewer().id), 400);
  return request<{ deleted: true }>(`/forum/posts/${id}`, { method: 'DELETE' });
}

/** The real POST returns the reply row without `author`; the hook fills it in from the current user. */
export async function createForumReply(
  postId: UUID,
  body: CreateForumReplyBody,
): Promise<Omit<ForumReplyItem, 'author' | 'hasUpvoted'> & Partial<ForumReplyItem>> {
  if (env.useMocks) return mock(() => addMockForumReply(postId, body, mockViewer()), 350);
  return request(`/forum/posts/${postId}/replies`, { method: 'POST', body });
}

export async function togglePostUpvote(postId: UUID): Promise<UpvoteResult> {
  if (env.useMocks) return mock(() => toggleMockPostUpvote(postId, mockViewer().id));
  return request<UpvoteResult>(`/forum/posts/${postId}/upvote`, { method: 'POST' });
}

export async function toggleReplyUpvote(replyId: UUID): Promise<UpvoteResult> {
  if (env.useMocks) return mock(() => toggleMockReplyUpvote(replyId, mockViewer().id));
  return request<UpvoteResult>(`/forum/replies/${replyId}/upvote`, { method: 'POST' });
}

export async function markReplySolution(replyId: UUID, postId: UUID): Promise<{ success: true }> {
  if (env.useMocks) return mock(() => markMockSolution(replyId, postId, mockViewer().id));
  return request<{ success: true }>(`/forum/replies/${replyId}/solution`, {
    method: 'POST',
    body: { postId },
  });
}

/** Uploads the post image (`folder=forum`), reporting progress from 0 to 1. */
export function uploadForumImage(
  file: PickedFile,
  onProgress: (fraction: number) => void,
): Promise<UploadedMedia> {
  return uploadMedia(file, { folder: 'forum', onProgress });
}

// ── Linked course / lesson (S21 context chip) ────────────────────────────────

export async function fetchLinkedLesson(lessonId: UUID): Promise<Lesson> {
  if (env.useMocks) {
    const lesson = getLesson(lessonId);
    if (!lesson) return Promise.reject(codedError('LESSON_NOT_FOUND', 'Lesson not found'));
    return mockDelay({ ...lesson });
  }
  return request<Lesson>(`/lessons/${lessonId}`);
}

export async function fetchLinkedCurriculum(courseId: UUID): Promise<Curriculum> {
  if (env.useMocks) {
    const c = getCurriculum(courseId);
    if (!c) return Promise.reject(codedError('COURSE_NOT_FOUND', 'Course not found'));
    return mockDelay(c);
  }
  return request<Curriculum>(`/courses/${courseId}/curriculum`);
}
