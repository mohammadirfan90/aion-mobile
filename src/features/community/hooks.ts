/**
 * Community hooks (S19–S21).
 *
 *   - The feed is a `useInfiniteQuery` keyed by its filters; pages follow
 *     `page` until `page * limit >= total` (API §10).
 *   - Upvotes (posts and replies) and mark-as-solution are optimistic: they
 *     patch the detail, replies and every cached feed page, and roll back on
 *     error (SPEC §4).
 *   - The detail query is never invalidated by our own writes, because each
 *     `GET /forum/posts/{id}` counts a view; writes patch it in place.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type {
  CreateForumPostBody,
  ForumCategoryValue,
  ForumPostItem,
  ForumPostsPage,
  ForumPostsQuery,
  ForumReplyItem,
  ForumSort,
  UpdateForumPostBody,
  UUID,
} from '@/api/types';
import { mockAuth } from '@/mocks/auth-store';
import { currentUser } from '@/mocks/fixtures/users';

import {
  createForumPost,
  createForumReply,
  deleteForumPost,
  fetchForumPost,
  fetchForumPosts,
  fetchForumReplies,
  fetchForumStats,
  fetchLinkedCurriculum,
  fetchLinkedLesson,
  FORUM_PAGE_SIZE,
  markReplySolution,
  togglePostUpvote,
  toggleReplyUpvote,
  updateForumPost,
  uploadForumImage,
  type PickedFile,
} from './api';

export interface ForumFilters {
  search: string;
  category: ForumCategoryValue | 'all';
  sort: ForumSort;
}

export interface ForumFeed {
  posts: ForumPostItem[];
  total: number;
}

type FeedData = InfiniteData<ForumPostsPage, number>;

/** Every cached feed (`qk.forum.list(...)`), whatever its filters. */
const feedFilter = { queryKey: qk.forum.lists() };

function patchFeeds(qc: QueryClient, postId: UUID, patch: (p: ForumPostItem) => ForumPostItem) {
  qc.setQueriesData<FeedData>(feedFilter, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p) => (p.id === postId ? patch(p) : p)),
          })),
        }
      : data,
  );
}

function patchPost(qc: QueryClient, postId: UUID, patch: (p: ForumPostItem) => ForumPostItem) {
  qc.setQueryData<ForumPostItem>(qk.forum.detail(postId), (p) => (p ? patch(p) : p));
  patchFeeds(qc, postId, patch);
}

function refreshFeedsAndStats(qc: QueryClient) {
  void qc.invalidateQueries(feedFilter);
  void qc.invalidateQueries({ queryKey: qk.forum.stats() });
}

// ── Current user ─────────────────────────────────────────────────────────────

/** The signed-in user (mock store until P2 wires `/users/me`). */
export function useCurrentUser() {
  const profile = mockAuth.useStore((s) => s.profile) ?? currentUser;
  return { id: profile.id, name: profile.fullName, avatarUrl: profile.avatar, role: profile.role };
}

// ── Reads ────────────────────────────────────────────────────────────────────

export function useForumStats() {
  return useQuery({ queryKey: qk.forum.stats(), queryFn: fetchForumStats, staleTime: 60_000 });
}

export function useForumFeed(filters: ForumFilters) {
  const params: ForumPostsQuery = {
    search: filters.search.trim() || undefined,
    category: filters.category,
    sort: filters.sort,
  };
  return useInfiniteQuery({
    queryKey: qk.forum.list(params),
    queryFn: ({ pageParam }) => fetchForumPosts({ ...params, page: pageParam, limit: FORUM_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, _all, lastPage) =>
      lastPage * FORUM_PAGE_SIZE >= last.total ? undefined : lastPage + 1,
    select: (data): ForumFeed => {
      // A post can shift pages while scrolling (new posts arrive); keep the first copy.
      const seen = new Set<string>();
      const posts: ForumPostItem[] = [];
      for (const page of data.pages) {
        for (const p of page.posts) {
          if (!seen.has(p.id)) {
            seen.add(p.id);
            posts.push(p);
          }
        }
      }
      return { posts, total: data.pages[data.pages.length - 1]?.total ?? 0 };
    },
  });
}

export function useForumPost(postId: UUID | null | undefined) {
  return useQuery({
    queryKey: qk.forum.detail(postId ?? 'pending'),
    queryFn: () => fetchForumPost(postId as UUID),
    enabled: !!postId,
    // Each fetch counts a view, so don't refetch it eagerly.
    staleTime: 5 * 60_000,
  });
}

export function useForumReplies(postId: UUID | null | undefined) {
  return useQuery({
    queryKey: qk.forum.replies(postId ?? 'pending'),
    queryFn: () => fetchForumReplies(postId as UUID),
    enabled: !!postId,
  });
}

/** Course and lesson titles for S21's "linked to" chip. Shares keys with S10/S12. */
export function useLinkedContext(courseId: UUID | null, lessonId: UUID | null) {
  const lesson = useQuery({
    queryKey: qk.lessons.detail(lessonId ?? 'pending'),
    queryFn: () => fetchLinkedLesson(lessonId as UUID),
    enabled: !!lessonId,
    staleTime: 60_000,
  });
  const curriculum = useQuery({
    queryKey: qk.courses.curriculum(courseId ?? 'pending'),
    queryFn: () => fetchLinkedCurriculum(courseId as UUID),
    enabled: !!courseId,
    staleTime: 60_000,
  });
  return {
    courseTitle: curriculum.data?.course.title ?? null,
    lessonTitle: lesson.data?.title ?? null,
  };
}

// ── Post writes ──────────────────────────────────────────────────────────────

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateForumPostBody) => createForumPost(body),
    onSuccess: () => refreshFeedsAndStats(qc),
  });
}

export function useUpdatePost(postId: UUID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateForumPostBody) => updateForumPost(postId, body),
    onSuccess: (row, body) => {
      patchPost(qc, postId, (p) => ({
        ...p,
        ...body,
        category: row.category ?? body.category ?? p.category,
        updatedAt: row.updatedAt ?? new Date().toISOString(),
      }));
      void qc.invalidateQueries(feedFilter);
    },
  });
}

export function useDeletePost(postId: UUID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteForumPost(postId),
    onSuccess: () => refreshFeedsAndStats(qc),
  });
}

export function useUploadForumImage() {
  return useMutation({
    mutationFn: (vars: { file: PickedFile; onProgress: (fraction: number) => void }) =>
      uploadForumImage(vars.file, vars.onProgress),
  });
}

/** Optimistic toggle; the server's count wins once it answers. */
export function usePostUpvote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: UUID) => togglePostUpvote(postId),
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: qk.forum.detail(postId) });
      await qc.cancelQueries(feedFilter);
      const detail = qc.getQueryData<ForumPostItem>(qk.forum.detail(postId));
      const feeds = qc.getQueriesData<FeedData>(feedFilter);
      patchPost(qc, postId, (p) => ({
        ...p,
        hasUpvoted: !p.hasUpvoted,
        upvotesCount: Math.max(0, p.upvotesCount + (p.hasUpvoted ? -1 : 1)),
      }));
      return { detail, feeds };
    },
    onError: (_e, postId, ctx) => {
      if (!ctx) return;
      qc.setQueryData(qk.forum.detail(postId), ctx.detail);
      for (const [key, data] of ctx.feeds) qc.setQueryData(key, data);
    },
    onSuccess: (res, postId) => {
      patchPost(qc, postId, (p) => ({ ...p, hasUpvoted: res.upvoted, upvotesCount: res.count }));
    },
  });
}

// ── Replies ──────────────────────────────────────────────────────────────────

export function useCreateReply(postId: UUID) {
  const qc = useQueryClient();
  const me = useCurrentUser();
  return useMutation({
    mutationFn: (body: { content: string; parentId?: UUID | null }) => createForumReply(postId, body),
    onSuccess: (row) => {
      const reply: ForumReplyItem = {
        ...row,
        author: row.author ?? { id: me.id, name: me.name, avatarUrl: me.avatarUrl, role: me.role },
        hasUpvoted: row.hasUpvoted ?? false,
      };
      qc.setQueryData<ForumReplyItem[]>(qk.forum.replies(postId), (list) =>
        list ? [...list.filter((r) => r.id !== reply.id), reply] : [reply],
      );
      patchPost(qc, postId, (p) => ({
        ...p,
        repliesCount: p.repliesCount + 1,
        lastReplyAt: reply.createdAt,
      }));
      refreshFeedsAndStats(qc);
    },
  });
}

export function useReplyUpvote(postId: UUID) {
  const qc = useQueryClient();
  const key = qk.forum.replies(postId);
  const patch = (replyId: UUID, fn: (r: ForumReplyItem) => ForumReplyItem) =>
    qc.setQueryData<ForumReplyItem[]>(key, (list) => list?.map((r) => (r.id === replyId ? fn(r) : r)));
  return useMutation({
    mutationFn: (replyId: UUID) => toggleReplyUpvote(replyId),
    onMutate: async (replyId) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ForumReplyItem[]>(key);
      patch(replyId, (r) => ({
        ...r,
        hasUpvoted: !r.hasUpvoted,
        upvotesCount: Math.max(0, r.upvotesCount + (r.hasUpvoted ? -1 : 1)),
      }));
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
    },
    onSuccess: (res, replyId) => {
      patch(replyId, (r) => ({ ...r, hasUpvoted: res.upvoted, upvotesCount: res.count }));
    },
  });
}

/** Optimistic: the reply becomes the only solution and the post is marked solved. */
export function useMarkSolution(postId: UUID) {
  const qc = useQueryClient();
  const key = qk.forum.replies(postId);
  return useMutation({
    mutationFn: (replyId: UUID) => markReplySolution(replyId, postId),
    onMutate: async (replyId) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ForumReplyItem[]>(key);
      const detail = qc.getQueryData<ForumPostItem>(qk.forum.detail(postId));
      qc.setQueryData<ForumReplyItem[]>(key, (list) =>
        list?.map((r) => ({ ...r, isSolution: r.id === replyId })),
      );
      patchPost(qc, postId, (p) => ({ ...p, isSolved: true }));
      return { previous, detail };
    },
    onError: (_e, _id, ctx) => {
      if (!ctx) return;
      qc.setQueryData(key, ctx.previous);
      qc.setQueryData(qk.forum.detail(postId), ctx.detail);
      void qc.invalidateQueries(feedFilter);
    },
    onSuccess: () => refreshFeedsAndStats(qc),
  });
}
