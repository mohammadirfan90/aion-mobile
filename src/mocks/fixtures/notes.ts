import type { CreateNoteBody, LessonNote } from '@/api/types';

const MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';
const INTRO = 'c0000001-0000-0000-0000-000000000001';

export const notes: LessonNote[] = [
  {
    id: 'n-001',
    userId: MOCK_USER_ID,
    lessonId: 'l-intro-01-01',
    courseId: INTRO,
    timestampSeconds: 42,
    content: 'Remember: the AI tutor is on the home screen.',
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'n-002',
    userId: MOCK_USER_ID,
    lessonId: 'l-intro-01-01',
    courseId: INTRO,
    timestampSeconds: 185,
    content: 'Certificates unlock once every lesson is complete.',
    createdAt: '2026-09-20T10:05:00Z',
    updatedAt: '2026-09-20T10:05:00Z',
  },
  {
    id: 'n-003',
    userId: MOCK_USER_ID,
    lessonId: 'l-intro-01-01',
    courseId: INTRO,
    timestampSeconds: null,
    content: 'Cert verification: the code is on the certificate page.',
    createdAt: '2026-09-21T10:00:00Z',
    updatedAt: '2026-09-21T10:00:00Z',
  },
];

/** `GET /notes/lesson/{lessonId}`: oldest first, like the web list. */
export function getMockNotes(lessonId: string): LessonNote[] {
  return notes
    .filter((n) => n.lessonId === lessonId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((n) => ({ ...n }));
}

export function addMockNote(body: CreateNoteBody): LessonNote {
  const now = new Date().toISOString();
  const note: LessonNote = {
    id: `n-${Date.now().toString(36)}`,
    userId: MOCK_USER_ID,
    lessonId: body.lessonId,
    courseId: body.courseId,
    timestampSeconds: body.timestampSeconds ?? null,
    content: body.content,
    createdAt: now,
    updatedAt: now,
  };
  notes.push(note);
  return { ...note };
}

export function deleteMockNote(id: string): { deleted: true } {
  const i = notes.findIndex((n) => n.id === id);
  if (i >= 0) notes.splice(i, 1);
  return { deleted: true };
}
