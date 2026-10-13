import { z } from 'zod';

export const ANSWER_MAX = 20_000; // API §7

/** S16 submission form. Needs an answer or an attachment (EMPTY_SUBMISSION). */
export const assignmentSchema = z
  .object({
    contentText: z.string().max(ANSWER_MAX, 'Your answer is too long'),
    hasAttachment: z.boolean(),
  })
  .refine((v) => v.contentText.trim().length > 0 || v.hasAttachment, {
    message: 'Write an answer or attach a file',
    path: ['contentText'],
  });

export type AssignmentForm = z.infer<typeof assignmentSchema>;
