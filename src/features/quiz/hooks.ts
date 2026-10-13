/**
 * Quiz hooks (S15). `useLessonQuiz` shares its key with S12's quiz intro
 * card, so attempts left stay in step. A submit refreshes the quiz and, since
 * a pass completes the lesson, every progress view.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type { QuizSubmitBody, UUID } from '@/api/types';

import { fetchLessonQuiz, submitQuiz } from './api';

export function useLessonQuiz(lessonId: UUID | null | undefined, courseId: UUID | null | undefined) {
  return useQuery({
    queryKey: qk.quiz.byLesson(lessonId ?? 'pending'),
    queryFn: () => fetchLessonQuiz(lessonId as UUID, courseId as UUID),
    enabled: !!lessonId && !!courseId,
  });
}

export function useSubmitQuiz(lessonId: UUID | null | undefined, courseId: UUID | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userAnswers: QuizSubmitBody['userAnswers']) =>
      submitQuiz(lessonId as UUID, { courseId: courseId as UUID, userAnswers }),
    onSuccess: (result) => {
      if (!lessonId || !courseId) return;
      void qc.invalidateQueries({ queryKey: qk.quiz.byLesson(lessonId) });
      if (result.passed) {
        void qc.invalidateQueries({ queryKey: qk.progress.course(courseId) });
        void qc.invalidateQueries({ queryKey: qk.progress.summary(courseId) });
        void qc.invalidateQueries({ queryKey: qk.me.all });
        void qc.invalidateQueries({ queryKey: qk.learning.all });
        void qc.invalidateQueries({ queryKey: qk.enrollments.all });
      }
    },
  });
}
