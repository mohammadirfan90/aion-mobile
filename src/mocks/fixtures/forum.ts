import type { ForumPost, ForumReply } from '@/api/types';

const now = '2026-10-08T10:00:00Z';

const author = (id: string, name: string, avatar: string | null = null) => ({
  authorId: id,
  authorName: name,
  authorAvatar: avatar,
});

export const posts: ForumPost[] = [
  {
    id: 'p-001',
    ...author('11111111-1111-1111-1111-111111111111', 'Sara Student'),
    category: 'question',
    title: 'How do I reset my progress in a course?',
    body: 'I started the wrong course by accident. Can I start over?',
    imageUrl: null,
    upvotes: 3,
    upvoted: false,
    replyCount: 2,
    pinned: false,
    solvedReplyId: 'r-001-a',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'p-002',
    ...author('22222222-2222-2222-2222-222222222222', 'Ivy Instructor'),
    category: 'general',
    title: '📌 Welcome to the community',
    body: 'Introduce yourself in the replies!',
    imageUrl: null,
    upvotes: 12,
    upvoted: false,
    replyCount: 4,
    pinned: true,
    solvedReplyId: null,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  },
  ...Array.from({ length: 10 }).map((_, i) => ({
    id: `p-${String(i + 3).padStart(3, '0')}`,
    ...author('11111111-1111-1111-1111-111111111111', 'Sara Student'),
    category: (['question', 'general', 'showcase', 'feedback'] as const)[i % 4],
    title: `Sample post ${i + 3}`,
    body: `Body of sample post ${i + 3}.`,
    imageUrl: null,
    upvotes: i,
    upvoted: false,
    replyCount: 0,
    pinned: false,
    solvedReplyId: null,
    createdAt: now,
    updatedAt: now,
  })),
];

export const replies: ForumReply[] = [
  {
    id: 'r-001-a',
    postId: 'p-001',
    ...author('22222222-2222-2222-2222-222222222222', 'Ivy Instructor'),
    body: 'You can unenroll and re-enroll — your certificate resets but your notes are kept.',
    upvotes: 5,
    upvoted: false,
    isSolution: true,
    createdAt: now,
  },
  {
    id: 'r-001-b',
    postId: 'p-001',
    ...author('11111111-1111-1111-1111-111111111111', 'Sara Student'),
    body: 'Thanks!',
    upvotes: 1,
    upvoted: false,
    isSolution: false,
    createdAt: now,
  },
];
