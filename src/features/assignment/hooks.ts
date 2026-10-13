/**
 * Assignment hooks (S16). The lesson and submission keys are shared with
 * S12's assignment intro card, so its status pill updates after a submit.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { AssignmentSubmitPayload, UUID } from '@/api/types';

import { fetchAssignmentLesson, fetchSubmission, postSubmission, uploadAttachment, type PickedFile } from './api';

export function useAssignmentLesson(lessonId: UUID | null | undefined) {
  return useQuery({
    queryKey: qk.lessons.detail(lessonId ?? 'pending'),
    queryFn: () => fetchAssignmentLesson(lessonId as UUID),
    enabled: !!lessonId,
    staleTime: 60_000,
  });
}

export function useSubmission(lessonId: UUID | null | undefined) {
  return useQuery({
    queryKey: qk.assignment.byLesson(lessonId ?? 'pending'),
    queryFn: () => fetchSubmission(lessonId as UUID),
    enabled: !!lessonId,
  });
}

export function useSubmitAssignment(lessonId: UUID | null | undefined, courseId: UUID | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignmentSubmitPayload) =>
      postSubmission(lessonId as UUID, courseId as UUID, body),
    onSuccess: (submission) => {
      if (lessonId) qc.setQueryData(qk.assignment.byLesson(lessonId), submission);
    },
  });
}

export function useUploadAttachment() {
  return useMutation({
    mutationFn: (vars: { file: PickedFile; onProgress: (fraction: number) => void }) =>
      uploadAttachment(vars.file, vars.onProgress),
  });
}
