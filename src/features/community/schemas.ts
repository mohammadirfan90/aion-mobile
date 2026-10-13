import { z } from 'zod';

import type { ForumCategoryValue } from '@/api/types';

// API §10 limits.
export const TITLE_MIN = 3;
export const TITLE_MAX = 250;
export const CONTENT_MIN = 5;
export const REPLY_MIN = 2;
export const REPLY_MAX = 5000;

export const FORUM_CATEGORIES = ['question', 'general', 'feedback', 'bug', 'showcase'] as const satisfies readonly ForumCategoryValue[];

const title = z
  .string()
  .trim()
  .min(TITLE_MIN, `Use at least ${TITLE_MIN} characters`)
  .max(TITLE_MAX, `Keep it under ${TITLE_MAX} characters`);

const content = z.string().trim().min(CONTENT_MIN, `Write at least ${CONTENT_MIN} characters`);

/** S21 new post form. */
export const newPostSchema = z.object({
  title,
  category: z.enum(FORUM_CATEGORIES),
  content,
});

export type NewPostForm = z.infer<typeof newPostSchema>;

/** S20 inline edit of the post's title and content. */
export const editPostSchema = z.object({ title, content });

export type EditPostForm = z.infer<typeof editPostSchema>;

/** S20 reply composer. */
export const replySchema = z.object({
  content: z
    .string()
    .trim()
    .min(REPLY_MIN, `Write at least ${REPLY_MIN} characters`)
    .max(REPLY_MAX, `Keep it under ${REPLY_MAX.toLocaleString()} characters`),
});
