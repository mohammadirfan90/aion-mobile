import { z } from 'zod';

/** Field limits. The OpenAPI spec doesn't set any; these follow the S26 design (bio 0 / 240). */
export const NAME_MAX = 100;
export const HEADLINE_MAX = 120;
export const BIO_MAX = 240;
export const GOALS_MAX = 500;

/** S26 Edit profile. Text fields are kept as strings; empty optional ones are sent as `null`. */
export const editProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(NAME_MAX, `Name must be at most ${NAME_MAX} characters`),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers and underscores are allowed'),
  headline: z
    .string()
    .trim()
    .max(HEADLINE_MAX, `Headline must be at most ${HEADLINE_MAX} characters`),
  bio: z.string().trim().max(BIO_MAX, `Bio must be at most ${BIO_MAX} characters`),
  learningGoals: z
    .string()
    .trim()
    .max(GOALS_MAX, `Learning goals must be at most ${GOALS_MAX} characters`),
  aiConsent: z.boolean(),
});

export type EditProfileInput = z.input<typeof editProfileSchema>;
export type EditProfileValues = z.output<typeof editProfileSchema>;

/** S27 Change password (API §2: min 8). */
export const changePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(200, 'Password must be at most 200 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
