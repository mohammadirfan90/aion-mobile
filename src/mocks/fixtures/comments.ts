import type { Comment } from '@/api/types';

// Initial realistic comments for lesson 'l-intro-01-01', matching docs/design/S18-comments-sheet.png
const initialComments: Comment[] = [
  {
    id: 'cm-001',
    lessonId: 'l-intro-01-01',
    courseId: 'c0000001-0000-0000-0000-000000000001',
    chapterId: 'ch-intro-01',
    userId: 'u-inst-01',
    parentId: null,
    content:
      'Remember that React Server Components do not ship JavaScript to the client bundle. Pay special attention to the serializable props boundary when testing your exercises.',
    upvotes: 14,
    upvotesCount: 14,
    upvoted: false,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    author: {
      id: 'u-inst-01',
      name: 'Prof. Michael Keller',
      avatarUrl: null,
      role: 'instructor',
    },
  },
  {
    id: 'cm-002',
    lessonId: 'l-intro-01-01',
    courseId: 'c0000001-0000-0000-0000-000000000001',
    chapterId: 'ch-intro-01',
    userId: 'u-stud-02',
    parentId: null,
    content:
      'Is there a performance trade-off if we pass too many large JSON payloads through the server component boundary?',
    upvotes: 4,
    upvotesCount: 4,
    upvoted: false,
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    author: {
      id: 'u-stud-02',
      name: 'Sara Kim',
      avatarUrl: null,
      role: 'student',
    },
  },
  {
    id: 'cm-003',
    lessonId: 'l-intro-01-01',
    courseId: 'c0000001-0000-0000-0000-000000000001',
    chapterId: 'ch-intro-01',
    userId: '11111111-1111-1111-1111-111111111111', // matches currentUser
    parentId: 'cm-002',
    content:
      'Yes, serialization overhead can bottleneck TTFB if payloads exceed standard thresholds. Keep props lean!',
    upvotes: 0,
    upvotesCount: 0,
    upvoted: false,
    createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    author: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Alex Chen',
      avatarUrl: null,
      role: 'student',
    },
  },
];

let mockCommentsStore: Comment[] = [...initialComments];

export const comments: Comment[] = mockCommentsStore;

export function getMockCommentsByLesson(lessonId: string): Comment[] {
  const list = mockCommentsStore.filter((c) => c.lessonId === lessonId);
  if (list.length === 0 && lessonId === 'l-intro-01-01') {
    return initialComments;
  }
  return list;
}

export function addMockComment(newComment: Comment): Comment {
  mockCommentsStore = [...mockCommentsStore, newComment];
  return newComment;
}

export function deleteMockComment(commentId: string): boolean {
  mockCommentsStore = mockCommentsStore.filter(
    (c) => c.id !== commentId && c.parentId !== commentId
  );
  return true;
}

export function toggleMockCommentUpvote(
  commentId: string
): { upvoted: boolean; upvotes: number } | null {
  const index = mockCommentsStore.findIndex((c) => c.id === commentId);
  if (index === -1) return null;
  const current = mockCommentsStore[index];
  const upvoted = !current.upvoted;
  const upvotes = upvoted ? current.upvotes + 1 : Math.max(0, current.upvotes - 1);
  const updated: Comment = {
    ...current,
    upvoted,
    upvotes,
    upvotesCount: upvotes,
  };
  mockCommentsStore[index] = updated;
  return { upvoted, upvotes };
}
