/**
 * Certificate hooks (S28, S29). The progress summary shares its key with
 * S11, which a lesson completion or quiz pass already invalidates.
 */
import { useQuery } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { UUID } from '@/api/types';

import {
  errorCode,
  errorStatus,
  fetchCourseProgressSummary,
  fetchStudentCertificate,
  fetchVerifiedCertificate,
} from './api';

/** Business errors that a retry won't fix. */
const FINAL_CODES = new Set(['INCOMPLETE', 'FORBIDDEN', 'NOT_FOUND', 'CERTIFICATE_NOT_FOUND']);

function isFinal(error: unknown): boolean {
  const code = errorCode(error);
  const status = errorStatus(error);
  return (code !== null && FINAL_CODES.has(code)) || (status !== null && status >= 400 && status < 500);
}

/** True when S29 should show "not found" instead of a retryable error. */
export function isNotFoundError(error: unknown): boolean {
  return isFinal(error);
}

export function useStudentCertificate(courseId: UUID | null | undefined) {
  return useQuery({
    queryKey: qk.certificate.byCourse(courseId ?? 'pending'),
    queryFn: () => fetchStudentCertificate(courseId as UUID),
    enabled: !!courseId,
    retry: (count, error) => !isFinal(error) && count < 1,
  });
}

export function useCourseProgressSummary(courseId: UUID | null | undefined, enabled = true) {
  return useQuery({
    queryKey: qk.progress.summary(courseId ?? 'pending'),
    queryFn: () => fetchCourseProgressSummary(courseId as UUID),
    enabled: !!courseId && enabled,
  });
}

/** Public: works signed out. `code` must already be normalized. */
export function useVerifyCertificate(code: string) {
  return useQuery({
    queryKey: qk.certificate.verify(code),
    queryFn: () => fetchVerifiedCertificate(code),
    enabled: code.length > 0,
    retry: (count, error) => !isFinal(error) && count < 1,
    staleTime: 60_000,
  });
}
