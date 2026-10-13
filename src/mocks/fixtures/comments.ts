import type { Comment } from '@/api/types';

export const comments: Comment[] = [
  {
    id: 'cm-001',
    lessonId: 'l-intro-01-01',
    userId: '11111111-1111-1111-1111-111111111111',
    parentId: null,
    content: 'Loved this intro!',
    upvotes: 4,
    upvoted: false,
    createdAt: '2026-09-22T10:00:00Z',
  },
  {
    id: 'cm-002',
    lessonId: 'l-intro-01-01',
    userId: '22222222-2222-2222-2222-222222222222',
    parentId: 'cm-001',
    content: 'Glad you enjoyed it!',
    upvotes: 1,
    upvoted: false,
    createdAt: '2026-09-22T11:00:00Z',
  },
];
