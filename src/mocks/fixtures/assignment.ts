import type { AssignmentSubmitPayload, LessonAssignmentSubmission } from '@/api/types';

/**
 * Assignment submissions (API §7). The brief and settings live on the lesson
 * (`content` + `metadata.assignmentSettings`); this file only holds what the
 * student has submitted. POST creates or updates until the work is graded.
 */

const MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';

export const submissions: LessonAssignmentSubmission[] = [
  {
    id: 'sub-001',
    lessonId: 'l-intro-03-01',
    courseId: 'c0000001-0000-0000-0000-000000000001',
    studentId: MOCK_USER_ID,
    contentText:
      'The biggest surprise was how short each lesson is. Next I want to learn JavaScript properly. I plan to do one lesson every evening.',
    attachmentUrl: 'https://example.com/uploads/reflection.pdf',
    attachmentPublicId: 'assignments/reflection',
    attachmentName: 'reflection.pdf',
    status: 'graded',
    scorePercent: 92,
    feedback: 'Clear and honest — nice plan. Try to be specific about which topics come next.',
    gradedAt: '2026-10-06T10:00:00Z',
    submittedAt: '2026-10-05T10:00:00Z',
    updatedAt: '2026-10-06T10:00:00Z',
  },
];

export function getMockSubmission(lessonId: string): LessonAssignmentSubmission | null {
  const s = submissions.find((x) => x.lessonId === lessonId);
  return s ? { ...s } : null;
}

export function submitMockAssignment(
  lessonId: string,
  courseId: string,
  body: AssignmentSubmitPayload,
): LessonAssignmentSubmission {
  const text = (body.contentText ?? '').trim();
  if (!text && !body.attachmentUrl) {
    const err = new Error('Add an answer or attach a file');
    (err as { code?: string }).code = 'EMPTY_SUBMISSION';
    throw err;
  }
  if (text.length > 20000) {
    const err = new Error('Your answer is too long');
    (err as { code?: string }).code = 'SUBMISSION_TOO_LONG';
    throw err;
  }
  const now = new Date().toISOString();
  const existing = submissions.find((x) => x.lessonId === lessonId);
  if (existing?.status === 'graded') {
    const err = new Error('This assignment has already been graded');
    (err as { code?: string }).code = 'ALREADY_GRADED';
    throw err;
  }
  const next: LessonAssignmentSubmission = {
    id: existing?.id ?? `sub-${Date.now().toString(36)}`,
    lessonId,
    courseId,
    studentId: MOCK_USER_ID,
    contentText: text,
    attachmentUrl: body.attachmentUrl ?? null,
    attachmentPublicId: body.attachmentPublicId ?? null,
    attachmentName: body.attachmentName ?? null,
    status: 'submitted',
    scorePercent: null,
    feedback: null,
    gradedAt: null,
    submittedAt: existing?.submittedAt ?? now,
    updatedAt: now,
  };
  if (existing) Object.assign(existing, next);
  else submissions.push(next);
  return { ...next };
}
