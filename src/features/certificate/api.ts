/**
 * Certificate feature — data layer for S28 and S29 (API §5, §14).
 *
 *   - `GET /courses/{id}/student-certificate` (auth) — the student's
 *     certificate. `INCOMPLETE` means the course isn't finished yet.
 *   - `GET /enrollments/progress/{courseId}` (auth) — the not-earned state's
 *     progress. Shares `qk.progress.summary` with S11.
 *   - `GET /courses/verify/{certificateId}` (public) — S29. Any failure is a
 *     404, which the screen shows as "not found".
 */
import { request } from '@/api/client';
import type { StudentCertificate, UUID, VerifiedCertificate } from '@/api/types';
import { env } from '@/lib/env';
import { mockDelay } from '@/mocks/delay';
import { getMockStudentCertificate, verifyMockCertificate } from '@/mocks/fixtures/certificate';
import { getCurriculum } from '@/mocks/fixtures/curriculum';
import { getCourseProgressRows } from '@/mocks/fixtures/progress';

/** `GET /enrollments/progress/{courseId}` (API §5). */
export interface CourseProgressSummary {
  total: number;
  completed: number;
  percent: number; // 0–100
  isCompleted: boolean;
}

/** Runs a mock call after the usual latency, so failures also look real. */
async function mockCall<T>(fn: () => T, ms?: number): Promise<T> {
  await mockDelay(null, ms);
  return fn();
}

export async function fetchStudentCertificate(courseId: UUID): Promise<StudentCertificate> {
  if (env.useMocks) return mockCall(() => getMockStudentCertificate(courseId), 350);
  return request<StudentCertificate>(`/courses/${courseId}/student-certificate`);
}

export async function fetchCourseProgressSummary(courseId: UUID): Promise<CourseProgressSummary> {
  if (env.useMocks) {
    const curriculum = getCurriculum(courseId);
    const total = curriculum?.chapters.reduce((s, c) => s + c.lessons.length, 0) ?? 0;
    const completed = getCourseProgressRows(courseId).filter((r) => r.isCompleted).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return mockDelay({ total, completed, percent, isCompleted: total > 0 && completed >= total });
  }
  return request<CourseProgressSummary>(`/enrollments/progress/${courseId}`);
}

export async function fetchVerifiedCertificate(code: string): Promise<VerifiedCertificate> {
  if (env.useMocks) return mockCall(() => verifyMockCertificate(code), 400);
  return request<VerifiedCertificate>(`/courses/verify/${encodeURIComponent(code)}`);
}

/** The error `code` from a coded mock error or an `ApiError`, if any. */
export function errorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

/** HTTP status from an `ApiError`, if any. */
export function errorStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === 'number' ? status : null;
  }
  return null;
}

/**
 * Normalizes what the user typed or pasted into a certificate ID: trims it,
 * pulls the `CERT-…` part out of a URL or sentence, and uppercases it.
 * Returns '' when nothing usable is left.
 */
export function normalizeCertificateCode(input: string): string {
  let text = input.trim();
  try {
    text = decodeURIComponent(text);
  } catch {
    // Not URI-encoded (or malformed); use it as typed.
  }
  const match = text.match(/CERT-[A-Z0-9]+(?:-[A-Z0-9]+)*/i);
  if (match) return match[0].toUpperCase();
  return text.replace(/\s+/g, '').toUpperCase();
}
