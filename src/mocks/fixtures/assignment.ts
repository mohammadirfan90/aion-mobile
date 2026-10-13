import type { Assignment } from '@/api/types';

export const assignments: Assignment[] = [
  {
    id: 'as-intro-01',
    lessonId: 'l-intro-03-01',
    instructions: 'Write a 200-word reflection on your first week of learning.',
    dueAt: '2026-11-01T23:59:59Z',
    maxScore: 10,
    submission: null,
  },
  {
    id: 'as-js-01',
    lessonId: 'l-js-01-02',
    instructions: 'Submit your variables.js file.',
    dueAt: null,
    maxScore: 10,
    submission: {
      id: 'sub-001',
      fileUrl: 'https://example.com/uploads/variables.js',
      text: null,
      submittedAt: '2026-10-05T10:00:00Z',
      gradedAt: '2026-10-06T10:00:00Z',
      score: 9,
      feedback: 'Nice work — consider destructuring for the first three.',
    },
  },
];
