/**
 * Forum fixtures (API §10) for S19–S21, plus an in-memory store the mock
 * `features/community/api.ts` reads and writes so the screens behave like the
 * real backend: search / category / sort / pagination, stats, create, edit,
 * delete, replies, upvote toggles and mark-as-solution.
 *
 * Edge cases covered: a pinned post, solved posts, a very long title, a post
 * with an image and posts without one, every category, posts by the default
 * mock student (so the owner menu and "Mark as solution" can be tried), a
 * nested reply and an accepted solution.
 */
import type {
  CreateForumPostBody,
  CreateForumReplyBody,
  ForumAuthor,
  ForumPostItem,
  ForumPostsPage,
  ForumPostsQuery,
  ForumReplyItem,
  ForumStats,
  UpdateForumPostBody,
  UpvoteResult,
  UUID,
} from '@/api/types';

/** The signed-in user the mock acts as. */
export interface ForumViewer {
  id: UUID;
  name: string;
  avatarUrl: string | null;
  role: string;
}

type PostRow = Omit<ForumPostItem, 'author' | 'hasUpvoted' | 'repliesCount' | 'lastReplyAt'>;
type ReplyRow = Omit<ForumReplyItem, 'hasUpvoted'>;

const ME = '11111111-1111-1111-1111-111111111111';
const IVY = '22222222-2222-2222-2222-222222222222';
const LEO = '33333333-3333-3333-3333-333333333333';
const AMINA = '44444444-4444-4444-4444-444444444444';
const TOM = '55555555-5555-5555-5555-555555555555';

const people: Record<UUID, ForumAuthor & { name: string; role: string }> = {
  [ME]: { id: ME, name: 'Sara Student', avatarUrl: null, role: 'student' },
  [IVY]: { id: IVY, name: 'Ivy Instructor', avatarUrl: null, role: 'admin' },
  [LEO]: { id: LEO, name: 'Leo Park', avatarUrl: null, role: 'student' },
  [AMINA]: { id: AMINA, name: 'Amina Yusuf', avatarUrl: null, role: 'student' },
  [TOM]: { id: TOM, name: 'Tom Becker', avatarUrl: null, role: 'student' },
};

const JS_COURSE = { id: 'c0000002-0000-0000-0000-000000000002', title: 'JavaScript Foundations', slug: 'javascript-foundations' };
const INTRO_COURSE = { id: 'c0000001-0000-0000-0000-000000000001', title: 'Intro to Aion', slug: 'intro-to-aion' };

/** Minutes before the app started, as an ISO timestamp. */
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

function post(p: Partial<PostRow> & Pick<PostRow, 'id' | 'userId' | 'title' | 'content' | 'category' | 'createdAt'>): PostRow {
  return {
    imageUrl: null,
    imagePublicId: null,
    courseId: null,
    chapterId: null,
    lessonId: null,
    isPinned: false,
    isSolved: false,
    viewsCount: 0,
    upvotesCount: 0,
    updatedAt: p.createdAt,
    course: null,
    lesson: null,
    ...p,
  };
}

function reply(r: Omit<ReplyRow, 'author' | 'updatedAt' | 'isSolution' | 'upvotesCount' | 'parentId'> & Partial<ReplyRow>): ReplyRow {
  const a = people[r.userId];
  return {
    parentId: null,
    isSolution: false,
    upvotesCount: 0,
    updatedAt: r.createdAt,
    author: { id: a.id, name: a.name, avatarUrl: a.avatarUrl, role: a.role },
    ...r,
  };
}

let posts: PostRow[] = [
  post({
    id: 'f0000001-0000-0000-0000-000000000001',
    userId: IVY,
    category: 'general',
    isPinned: true,
    title: 'Welcome to the Aion community — start here',
    content:
      'Hi everyone! This is the place to ask questions, share what you build and give us feedback.\n\n' +
      '**A few ground rules**\n\n- Search before you post, someone may have asked already.\n' +
      '- Pick the right category so people can find your post.\n- When a reply solves your question, mark it as the solution.\n\n' +
      'Introduce yourself below 👋',
    viewsCount: 412,
    upvotesCount: 24,
    createdAt: ago(60 * 24 * 30),
  }),
  post({
    id: 'f0000002-0000-0000-0000-000000000002',
    userId: ME,
    category: 'question',
    isSolved: true,
    title: 'Why does `this` become undefined inside my callback?',
    content:
      'In the closures lesson I pass `user.greet` to `setTimeout` and it prints `undefined` instead of the name:\n\n' +
      '```js\nconst user = { name: "Sara", greet() { console.info(this.name); } };\nsetTimeout(user.greet, 100);\n```\n\n' +
      'What am I missing?',
    courseId: JS_COURSE.id,
    course: JS_COURSE,
    viewsCount: 88,
    upvotesCount: 7,
    createdAt: ago(60 * 26),
  }),
  post({
    id: 'f0000003-0000-0000-0000-000000000003',
    userId: LEO,
    category: 'showcase',
    title: 'Built a tiny habit tracker after the JavaScript course',
    content:
      'Finished JavaScript Foundations last week and built this to practise DOM events and localStorage. ' +
      'Feedback on the layout is very welcome!',
    imageUrl: 'https://picsum.photos/seed/aion-forum-habit/800/500',
    imagePublicId: 'forum/habit-tracker',
    courseId: JS_COURSE.id,
    course: JS_COURSE,
    viewsCount: 140,
    upvotesCount: 31,
    createdAt: ago(60 * 3),
  }),
  post({
    id: 'f0000004-0000-0000-0000-000000000004',
    userId: AMINA,
    category: 'question',
    title:
      'Is there a recommended order for the courses if I want to move into backend work, observability and distributed systems later on, or should I just start with whatever looks most interesting right now?',
    content:
      'I have finished the intro course and I am not sure what to take next. The distributed systems course looks great but a bit advanced.',
    viewsCount: 52,
    upvotesCount: 4,
    createdAt: ago(60 * 7),
  }),
  post({
    id: 'f0000005-0000-0000-0000-000000000005',
    userId: TOM,
    category: 'bug',
    title: 'Video lesson restarts from 0:00 after rotating the phone',
    content:
      'On Android 14, when I rotate to landscape the video jumps back to the start. Happens in every video lesson I tried.',
    viewsCount: 33,
    upvotesCount: 9,
    createdAt: ago(45),
  }),
  post({
    id: 'f0000006-0000-0000-0000-000000000006',
    userId: ME,
    category: 'feedback',
    title: 'Flashcards in the AI summary are great — could we export them?',
    content:
      'The flashcards tab helped me revise a lot. It would be nice to export them to Anki or at least copy them all at once.',
    viewsCount: 21,
    upvotesCount: 12,
    createdAt: ago(60 * 50),
  }),
  post({
    id: 'f0000007-0000-0000-0000-000000000007',
    userId: LEO,
    category: 'question',
    isSolved: true,
    title: 'How do I reset my progress in a course?',
    content: 'I started the wrong course by accident. Can I start over without losing my notes?',
    courseId: INTRO_COURSE.id,
    course: INTRO_COURSE,
    viewsCount: 64,
    upvotesCount: 3,
    createdAt: ago(60 * 24 * 4),
  }),
  post({
    id: 'f0000008-0000-0000-0000-000000000008',
    userId: AMINA,
    category: 'general',
    title: 'Study group for the October cohort?',
    content: 'Anyone keen to meet online once a week to go through the lessons together? Thinking Thursdays, 7 PM.',
    viewsCount: 18,
    upvotesCount: 5,
    createdAt: ago(60 * 24 * 2),
  }),
  ...[
    ['question', 'What is the difference between `let` and `const` for objects?', TOM],
    ['general', 'Favourite podcasts for learning to code?', LEO],
    ['feedback', 'Dark mode looks great on the lesson screen', AMINA],
    ['showcase', 'My first quiz with 100% 🎉', TOM],
    ['question', 'Can I download lessons to watch offline?', AMINA],
    ['bug', 'Typo in lesson 2 of Design Basics', LEO],
  ].map(([category, title, userId], i) =>
    post({
      id: `f00000${String(i + 9).padStart(2, '0')}-0000-0000-0000-0000000000${String(i + 9).padStart(2, '0')}`,
      userId: userId as UUID,
      category: category as PostRow['category'],
      title: title as string,
      content: `${title as string}\n\nWould love to hear what others think.`,
      viewsCount: 5 + i * 3,
      upvotesCount: i % 3,
      createdAt: ago(60 * 24 * (6 + i)),
    }),
  ),
];

let replies: ReplyRow[] = [
  reply({
    id: 'fr000001-0000-0000-0000-000000000001',
    postId: 'f0000001-0000-0000-0000-000000000001',
    userId: LEO,
    content: 'Hi all! Leo here, learning JavaScript in the evenings.',
    upvotesCount: 3,
    createdAt: ago(60 * 24 * 29),
  }),
  reply({
    id: 'fr000002-0000-0000-0000-000000000002',
    postId: 'f0000001-0000-0000-0000-000000000001',
    userId: AMINA,
    content: 'Hello from Nairobi 👋',
    upvotesCount: 2,
    createdAt: ago(60 * 24 * 28),
  }),
  reply({
    id: 'fr000003-0000-0000-0000-000000000003',
    postId: 'f0000002-0000-0000-0000-000000000002',
    userId: TOM,
    content: 'Maybe try an arrow function?',
    upvotesCount: 0,
    createdAt: ago(60 * 25),
  }),
  reply({
    id: 'fr000004-0000-0000-0000-000000000004',
    postId: 'f0000002-0000-0000-0000-000000000002',
    userId: IVY,
    isSolution: true,
    content:
      'When you pass `user.greet` on its own, the method loses its receiver, so `this` is `undefined` in strict mode. Bind it:\n\n' +
      '```js\nsetTimeout(user.greet.bind(user), 100);\n// or\nsetTimeout(() => user.greet(), 100);\n```',
    upvotesCount: 6,
    createdAt: ago(60 * 24),
  }),
  reply({
    id: 'fr000005-0000-0000-0000-000000000005',
    postId: 'f0000002-0000-0000-0000-000000000002',
    userId: ME,
    parentId: 'fr000004-0000-0000-0000-000000000004',
    content: 'That fixed it, thank you! The arrow function version reads nicer.',
    upvotesCount: 1,
    createdAt: ago(60 * 23),
  }),
  reply({
    id: 'fr000006-0000-0000-0000-000000000006',
    postId: 'f0000003-0000-0000-0000-000000000003',
    userId: AMINA,
    content: 'Love the colours! How did you store the streaks?',
    upvotesCount: 2,
    createdAt: ago(60 * 2),
  }),
  reply({
    id: 'fr000007-0000-0000-0000-000000000007',
    postId: 'f0000003-0000-0000-0000-000000000003',
    userId: LEO,
    parentId: 'fr000006-0000-0000-0000-000000000006',
    content: 'Just an array of dates in localStorage, then I count consecutive days.',
    createdAt: ago(90),
  }),
  reply({
    id: 'fr000008-0000-0000-0000-000000000008',
    postId: 'f0000006-0000-0000-0000-000000000006',
    userId: TOM,
    content: '+1, an Anki export would be amazing.',
    upvotesCount: 4,
    createdAt: ago(60 * 40),
  }),
  reply({
    id: 'fr000009-0000-0000-0000-000000000009',
    postId: 'f0000006-0000-0000-0000-000000000006',
    userId: AMINA,
    content: 'Copying them all as plain text would already help.',
    createdAt: ago(60 * 30),
  }),
  reply({
    id: 'fr000010-0000-0000-0000-000000000010',
    postId: 'f0000007-0000-0000-0000-000000000007',
    userId: IVY,
    isSolution: true,
    content: 'You can unenroll and re-enroll. Your progress resets but your notes are kept.',
    upvotesCount: 5,
    createdAt: ago(60 * 24 * 3),
  }),
  reply({
    id: 'fr000011-0000-0000-0000-000000000011',
    postId: 'f0000005-0000-0000-0000-000000000005',
    userId: ME,
    content: 'Same here on a Pixel 7.',
    createdAt: ago(20),
  }),
];

/** `${userId}:${postOrReplyId}` for every upvote. */
const upvotes = new Set<string>([
  `${ME}:f0000001-0000-0000-0000-000000000001`,
  `${ME}:f0000003-0000-0000-0000-000000000003`,
  `${ME}:fr000004-0000-0000-0000-000000000004`,
]);

function codedError(code: string, message: string): Error {
  const err = new Error(message);
  (err as { code?: string }).code = code;
  return err;
}

function lastReplyAt(postId: UUID): string | null {
  let latest: string | null = null;
  for (const r of replies) {
    if (r.postId === postId && (!latest || r.createdAt > latest)) latest = r.createdAt;
  }
  return latest;
}

function toItem(row: PostRow, viewerId: UUID | null): ForumPostItem {
  const a = people[row.userId];
  return {
    ...row,
    repliesCount: replies.filter((r) => r.postId === row.id).length,
    lastReplyAt: lastReplyAt(row.id),
    author: a ? { ...a } : null,
    hasUpvoted: !!viewerId && upvotes.has(`${viewerId}:${row.id}`),
  };
}

function findPost(id: UUID): PostRow {
  const row = posts.find((p) => p.id === id);
  if (!row) throw codedError('FORUM_POST_NOT_FOUND', 'Post not found');
  return row;
}

function remember(viewer: ForumViewer) {
  people[viewer.id] = {
    id: viewer.id,
    name: viewer.name,
    avatarUrl: viewer.avatarUrl,
    role: viewer.role,
  };
}

// ── Reads ────────────────────────────────────────────────────────────────────

export function getMockForumStats(): ForumStats {
  return {
    totalPosts: posts.length,
    totalReplies: replies.length,
    totalSolved: posts.filter((p) => p.isSolved).length,
  };
}

export function listMockForumPosts(query: ForumPostsQuery, viewerId: UUID | null): ForumPostsPage {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const needle = query.search?.trim().toLowerCase() ?? '';
  const category = query.category && query.category !== 'all' ? query.category : null;

  let items = posts
    .filter((p) => !category || p.category === category)
    .filter((p) => !query.courseId || p.courseId === query.courseId)
    .filter((p) => !query.chapterId || p.chapterId === query.chapterId)
    .filter((p) => !query.lessonId || p.lessonId === query.lessonId)
    .filter(
      (p) => !needle || p.title.toLowerCase().includes(needle) || p.content.toLowerCase().includes(needle),
    )
    .map((p) => toItem(p, viewerId));

  const sort = query.sort ?? 'latest';
  const by: Record<typeof sort, (a: ForumPostItem, b: ForumPostItem) => number> = {
    latest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
    activity: (a, b) => (b.lastReplyAt ?? b.createdAt).localeCompare(a.lastReplyAt ?? a.createdAt),
    replies: (a, b) => b.repliesCount - a.repliesCount || b.createdAt.localeCompare(a.createdAt),
    upvotes: (a, b) => b.upvotesCount - a.upvotesCount || b.createdAt.localeCompare(a.createdAt),
  };
  items = items.sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || by[sort](a, b));

  return { posts: items.slice((page - 1) * limit, page * limit), total: items.length };
}

/** Counts as a view, like the real endpoint. */
export function getMockForumPost(id: UUID, viewerId: UUID | null): ForumPostItem {
  const row = findPost(id);
  row.viewsCount += 1;
  return toItem(row, viewerId);
}

/** Flat: the solution first, then oldest first (API §10). */
export function getMockForumReplies(postId: UUID, viewerId: UUID | null): ForumReplyItem[] {
  findPost(postId);
  return replies
    .filter((r) => r.postId === postId)
    .sort((a, b) => Number(b.isSolution) - Number(a.isSolution) || a.createdAt.localeCompare(b.createdAt))
    .map((r) => ({ ...r, author: { ...r.author }, hasUpvoted: !!viewerId && upvotes.has(`${viewerId}:${r.id}`) }));
}

// ── Writes ───────────────────────────────────────────────────────────────────

export function createMockForumPost(body: CreateForumPostBody, viewer: ForumViewer): ForumPostItem {
  const title = body.title.trim();
  const content = body.content.trim();
  if (title.length < 3 || title.length > 250 || content.length < 5) {
    throw codedError('VALIDATION_ERROR', 'Invalid post');
  }
  remember(viewer);
  const now = new Date().toISOString();
  const row = post({
    id: `f${Date.now().toString(16).slice(-7)}-${Math.random().toString(16).slice(2, 6)}-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`,
    userId: viewer.id,
    title,
    content,
    category: body.category ?? 'general',
    imageUrl: body.imageUrl ?? null,
    imagePublicId: body.imagePublicId ?? null,
    courseId: body.courseId ?? null,
    chapterId: body.chapterId ?? null,
    lessonId: body.lessonId ?? null,
    createdAt: now,
  });
  posts = [row, ...posts];
  return toItem(row, viewer.id);
}

export function updateMockForumPost(id: UUID, body: UpdateForumPostBody, viewerId: UUID): ForumPostItem {
  const row = findPost(id);
  if (row.userId !== viewerId) throw codedError('FORBIDDEN', 'Not your post');
  const next: PostRow = {
    ...row,
    ...(body.title !== undefined ? { title: body.title.trim() } : null),
    ...(body.content !== undefined ? { content: body.content.trim() } : null),
    ...(body.category !== undefined ? { category: body.category } : null),
    ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : null),
    ...(body.imagePublicId !== undefined ? { imagePublicId: body.imagePublicId } : null),
    ...(body.isSolved !== undefined ? { isSolved: body.isSolved } : null),
    updatedAt: new Date().toISOString(),
  };
  posts = posts.map((p) => (p.id === id ? next : p));
  return toItem(next, viewerId);
}

export function deleteMockForumPost(id: UUID, viewerId: UUID): { deleted: true } {
  const row = findPost(id);
  if (row.userId !== viewerId) throw codedError('FORBIDDEN', 'Not your post');
  posts = posts.filter((p) => p.id !== id);
  replies = replies.filter((r) => r.postId !== id);
  return { deleted: true };
}

export function addMockForumReply(postId: UUID, body: CreateForumReplyBody, viewer: ForumViewer): ForumReplyItem {
  findPost(postId);
  const content = body.content.trim();
  if (content.length < 2 || content.length > 5000) throw codedError('VALIDATION_ERROR', 'Invalid reply');
  // Threads are one level deep: a reply to a nested reply joins its parent's thread.
  const parent = body.parentId ? replies.find((r) => r.id === body.parentId) : undefined;
  const parentId = parent ? (parent.parentId ?? parent.id) : null;
  remember(viewer);
  const now = new Date().toISOString();
  const row: ReplyRow = {
    id: `fr${Date.now().toString(16).slice(-6)}-${Math.random().toString(16).slice(2, 6)}-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`,
    postId,
    userId: viewer.id,
    parentId,
    content,
    isSolution: false,
    upvotesCount: 0,
    createdAt: now,
    updatedAt: now,
    author: { id: viewer.id, name: viewer.name, avatarUrl: viewer.avatarUrl, role: viewer.role },
  };
  replies = [...replies, row];
  return { ...row, hasUpvoted: false };
}

function toggle(key: string, current: number): UpvoteResult {
  if (upvotes.has(key)) {
    upvotes.delete(key);
    return { upvoted: false, count: Math.max(0, current - 1) };
  }
  upvotes.add(key);
  return { upvoted: true, count: current + 1 };
}

export function toggleMockPostUpvote(postId: UUID, viewerId: UUID): UpvoteResult {
  const row = findPost(postId);
  const result = toggle(`${viewerId}:${postId}`, row.upvotesCount);
  row.upvotesCount = result.count;
  return result;
}

export function toggleMockReplyUpvote(replyId: UUID, viewerId: UUID): UpvoteResult {
  const row = replies.find((r) => r.id === replyId);
  if (!row) throw codedError('NOT_FOUND', 'Reply not found');
  const result = toggle(`${viewerId}:${replyId}`, row.upvotesCount);
  row.upvotesCount = result.count;
  return result;
}

/** Only the post owner may mark a solution; it also marks the post solved. */
export function markMockSolution(replyId: UUID, postId: UUID, viewerId: UUID): { success: true } {
  const row = findPost(postId);
  if (row.userId !== viewerId) throw codedError('FORBIDDEN', 'Only the author can mark a solution');
  if (!replies.some((r) => r.id === replyId && r.postId === postId)) {
    throw codedError('NOT_FOUND', 'Reply not found');
  }
  replies = replies.map((r) => (r.postId === postId ? { ...r, isSolution: r.id === replyId } : r));
  row.isSolved = true;
  return { success: true };
}
