/**
 * Assignment feature — data layer for S16 (API §4, §7, §16).
 *
 *   - `GET /lessons/{id}` — the brief (`content`) and `assignmentSettings`.
 *     Shares its cache key with S12.
 *   - `GET` / `POST /lessons/{lessonId}/assignment` — the student's
 *     submission; POST creates or updates it until it's graded.
 *   - `POST /media/upload` (`kind=document`, `folder=assignments`) — the
 *     attachment, with upload progress. Maria's shared upload helper (P2-05)
 *     replaces `uploadAttachment` in Phase 2.
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
import { mockDelay } from '@/mocks/delay';
import { getMockSubmission, submitMockAssignment } from '@/mocks/fixtures/assignment';
import { getLesson } from '@/mocks/fixtures/curriculum';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // API §16, kind=document

export interface PickedFile {
  uri: string;
  name: string;
  size: number | null;
  mimeType: string;
}

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

/** Uploads one file, reporting progress from 0 to 1. */
export function uploadAttachment(
  file: PickedFile,
  onProgress: (fraction: number) => void,
): Promise<UploadedMedia> {
  if (file.size !== null && file.size > MAX_ATTACHMENT_BYTES) {
    return Promise.reject(codedError('FILE_TOO_LARGE', 'Files can be up to 10 MB.'));
  }
  if (/heic|heif|svg/i.test(file.mimeType) || /\.(heic|heif|svg)$/i.test(file.name)) {
    return Promise.reject(codedError('UNSUPPORTED_MEDIA_TYPE', 'HEIC and SVG files aren’t supported.'));
  }

  if (env.useMocks) {
    return new Promise((resolve) => {
      let p = 0;
      const timer = setInterval(() => {
        p = Math.min(1, p + 0.2);
        onProgress(p);
        if (p >= 1) {
          clearInterval(timer);
          resolve({
            url: `https://example.com/uploads/assignments/${encodeURIComponent(file.name)}`,
            publicId: `assignments/${Date.now().toString(36)}`,
            bytes: file.size ?? undefined,
          });
        }
      }, 250);
    });
  }

  // Real mode: multipart upload with XHR, which reports upload progress.
  return new Promise((resolve, reject) => {
    const form = new FormData();
    // React Native's FormData takes a { uri, name, type } file part.
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    form.append('kind', 'document');
    form.append('folder', 'assignments');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${env.apiUrl.replace(/\/$/, '')}/api/v1/media/upload`);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onerror = () => reject(codedError('NETWORK', 'Upload failed'));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as
          | { success: true; data: UploadedMedia }
          | { success: false; error: { code: string; message: string } };
        if (body.success) resolve(body.data);
        else reject(codedError(body.error.code, body.error.message));
      } catch {
        reject(codedError(xhr.status === 429 ? 'RATE_LIMITED' : 'UPLOAD_FAILED', 'Upload failed'));
      }
    };
    xhr.send(form);
  });
}
