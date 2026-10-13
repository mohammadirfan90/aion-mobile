import type { Note } from '@/api/types';

export const notes: Note[] = [
  {
    id: 'n-001',
    lessonId: 'l-intro-01-01',
    userId: '11111111-1111-1111-1111-111111111111',
    content: 'Remember: the AI tutor is on the home screen.',
    videoTimestampSeconds: 42,
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'n-002',
    lessonId: 'l-intro-01-01',
    userId: '11111111-1111-1111-1111-111111111111',
    content: 'Cert verification: the code is on the certificate page.',
    createdAt: '2026-09-21T10:00:00Z',
    updatedAt: '2026-09-21T10:00:00Z',
  },
];
