/**
 * Single source of truth for react-query keys. Centralised so cache
 * invalidation can find every key a mutation should affect.
 *
 * Convention: every key is a tuple starting with a stable string, followed
 * by the inputs that affect the data. Keep them flat enough to be
 * `queryClient.invalidateQueries({ queryKey: qk.courses.all })` friendly.
 */

import type {
  Chapter,
  Comment,
  CommentAuthor,
  Course,
  CourseListParams,
  Enrollment,
  ForumPostsQuery,
  Lesson,
  LearningSummary,
  UserProfile,
  UUID,
} from './types';

const all = (s: string) => [s] as const;

export const qk = {
  me: {
    all: all('me'),
    detail: () => ['me', 'detail'] as const,
    learningSummary: () => ['me', 'learningSummary'] as const,
    /** S25's `LearningSummaryData` (API §12); Home still reads the older shape above until P2-06. */
    profileSummary: () => ['me', 'learningSummary', 'profile'] as const,
  },

  courses: {
    all: all('courses'),
    list: (params: CourseListParams = {}) => ['courses', 'list', params] as const,
    detail: (id: UUID) => ['courses', 'detail', id] as const,
    curriculum: (id: UUID) => ['courses', 'curriculum', id] as const,
  },

  enrollments: {
    all: all('enrollments'),
    list: () => ['enrollments', 'list'] as const,
    detail: (id: UUID) => ['enrollments', 'detail', id] as const,
  },

  learning: {
    all: all('learning'),
    list: () => ['learning', 'list'] as const,
  },

  lessons: {
    all: all('lessons'),
    detail: (id: UUID) => ['lessons', 'detail', id] as const,
    notes: (id: UUID) => ['lessons', 'notes', id] as const,
    comments: (id: UUID) => ['lessons', 'comments', id] as const,
  },

  quiz: {
    byLesson: (lessonId: UUID) => ['quiz', 'lesson', lessonId] as const,
  },

  assignment: {
    byLesson: (lessonId: UUID) => ['assignment', 'lesson', lessonId] as const,
  },

  tutor: {
    chats: () => ['tutor', 'chats'] as const,
    chat: (id: UUID) => ['tutor', 'chat', id] as const,
  },

  summary: {
    byLesson: (lessonId: UUID) => ['summary', 'lesson', lessonId] as const,
  },

  forum: {
    all: all('forum'),
    /** Prefix of every feed page cache (invalidate after writes). */
    lists: () => ['forum', 'list'] as const,
    list: (params: ForumPostsQuery = {}) => ['forum', 'list', params] as const,
    detail: (id: UUID) => ['forum', 'detail', id] as const,
    replies: (id: UUID) => ['forum', 'replies', id] as const,
    stats: () => ['forum', 'stats'] as const,
  },

  tickets: {
    all: all('tickets'),
    list: () => ['tickets', 'list'] as const,
    detail: (id: UUID) => ['tickets', 'detail', id] as const,
  },

  certificate: {
    byCourse: (courseId: UUID) => ['certificate', 'course', courseId] as const,
    verify: (code: string) => ['certificate', 'verify', code] as const,
  },

  // S11–S17: lesson progress, notes and AI history. Mark-complete and the quiz
  // invalidate `progress.course`, which S11's checks and S12's button read.
  progress: {
    all: all('progress'),
    course: (courseId: UUID) => ['progress', 'course', courseId] as const,
    summary: (courseId: UUID) => ['progress', 'summary', courseId] as const,
  },

  notes: {
    all: all('notes'),
    lesson: (lessonId: UUID) => ['notes', 'lesson', lessonId] as const,
  },

  ai: {
    history: () => ['ai', 'history'] as const,
    summary: (lessonId: UUID) => ['ai', 'summary', lessonId] as const,
  },
} as const;

/** A few re-exports for the keys object as a whole (used in tests). */
export type QueryKeys = typeof qk;

// Re-export the entity types so consumers can `import { Course, … } from '@/api/query-keys'`
// when they only need the type. The canonical location is `./types`.
export type {
  Chapter,
  Comment,
  CommentAuthor,
  Course,
  CourseListParams,
  Enrollment,
  Lesson,
  LearningSummary,
  UserProfile,
  UUID,
};
