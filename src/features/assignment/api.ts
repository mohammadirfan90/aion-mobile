/**
 * Assignment feature — data layer for S16 (API §4, §7, §16).
 *
 *   - `GET /lessons/{id}` — the brief (`content`) and `assignmentSettings`.
 *     Shares its cache key with S12.
 *   - `GET` / `POST /lessons/{lessonId}/assignment` — the student's
 *     submission; POST creates or updates it until it's graded.
 *   - `POST /media/upload` (`kind=document`, `folder=assignments`) — the
 *     attachment, through the shared `lib/upload.ts` helper.
 */
import { request } from '@/api/client';
import type {
  AssignmentSubmitPayload,
  Lesson,
  LessonAssignmentSubmission,
  UploadedMedia,
  UUID,
} from '@/api/types';
import { env } from '@/lib/env';
import { uploadMedia, type PickedFile } from '@/lib/upload';
import { mockDelay } from '@/mocks/delay';
import { getMockSubmission, submitMockAssignment } from '@/mocks/fixtures/assignment';
import { getLesson } from '@/mocks/fixtures/curriculum';

export type { PickedFile };

function codedError(code: string, message: string): Error {
  const err = new Error(message);
  (err as { code?: string }).code = code;
  return err;
}

export async function fetchAssignmentLesson(lessonId: UUID): Promise<Lesson> {
  if (env.useMocks) {
    const lesson = getLesson(lessonId);
    if (!lesson) throw codedError('LESSON_NOT_FOUND', 'Lesson not found');
    return mockDelay({ ...lesson });
  }
  return request<Lesson>(`/lessons/${lessonId}`);
}

export async function fetchSubmission(lessonId: UUID): Promise<LessonAssignmentSubmission | null> {
  if (env.useMocks) return mockDelay(getMockSubmission(lessonId));
  return request<LessonAssignmentSubmission | null>(`/lessons/${lessonId}/assignment`);
}

export async function postSubmission(
  lessonId: UUID,
  courseId: UUID,
  body: AssignmentSubmitPayload,
): Promise<LessonAssignmentSubmission> {
  if (env.useMocks) return mockDelay(submitMockAssignment(lessonId, courseId, body), 500);
  return request<LessonAssignmentSubmission>(`/lessons/${lessonId}/assignment`, {
    method: 'POST',
    body,
  });
}

/** Uploads one file (`folder=assignments`, `kind=document`), reporting progress from 0 to 1. */
export function uploadAttachment(
  file: PickedFile,
  onProgress: (fraction: number) => void,
): Promise<UploadedMedia> {
  return uploadMedia(file, { folder: 'assignments', kind: 'document', onProgress });
}
