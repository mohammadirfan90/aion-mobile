import { z } from 'zod';

export const SUBJECT_MIN = 3; // API §11
export const SUBJECT_MAX = 250;
export const DESCRIPTION_MIN = 5;

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

/** S24 new-ticket form. */
export const newTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(SUBJECT_MIN, `Subject needs at least ${SUBJECT_MIN} characters`)
    .max(SUBJECT_MAX, `Subject can be up to ${SUBJECT_MAX} characters`),
  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN, `Describe the problem in at least ${DESCRIPTION_MIN} characters`),
  priority: z.enum(TICKET_PRIORITIES),
  courseId: z.string().nullable(),
});

export type NewTicketForm = z.infer<typeof newTicketSchema>;
