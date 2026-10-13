/**
 * Friendly error messages for `ApiError.code` values returned by the backend.
 * Centralised so the UI can show a clear, user-facing string without knowing
 * the wire format. See docs/API.md §1 for the full list of error codes.
 */

export type FriendlyErrorCode =
  | 'RATE_LIMITED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'USERNAME_TAKEN'
  | 'SIGNUP_FAILED'
  | 'RECAPTCHA_REQUIRED'
  | 'RECAPTCHA_FAILED'
  | 'PROFILE_CREATION_FAILED'
  | 'UPDATE_FAILED'
  | 'NOT_ENROLLED'
  | 'DEMO_MODE_READ_ONLY'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'NETWORK'
  | 'UNKNOWN';

const messages: Record<FriendlyErrorCode, string> = {
  RATE_LIMITED: 'Too many attempts, please try again in a few minutes.',
  UNAUTHENTICATED: 'Please sign in to continue.',
  FORBIDDEN: 'You don’t have access to this.',
  INSUFFICIENT_PERMISSIONS: 'You don’t have permission to do that.',
  NOT_FOUND: 'We couldn’t find what you were looking for.',
  VALIDATION_ERROR: 'Some fields need your attention.',
  USERNAME_TAKEN: 'That username is already taken.',
  SIGNUP_FAILED: 'We couldn’t create your account. Please try again.',
  RECAPTCHA_REQUIRED: 'Please complete the captcha to continue.',
  RECAPTCHA_FAILED: 'Captcha verification failed. Please try again.',
  PROFILE_CREATION_FAILED: 'We couldn’t finish setting up your profile.',
  UPDATE_FAILED: 'We couldn’t save your changes. Please try again.',
  NOT_ENROLLED: 'Enroll in this course to continue.',
  DEMO_MODE_READ_ONLY: 'This is a read-only demo. Sign up to make changes.',
  CONFLICT: 'This conflicts with something that already exists.',
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again.',
  NETWORK: 'No connection. Check your internet and try again.',
  UNKNOWN: 'Something went wrong. Please try again.',
};

export function friendlyError(code: string | null | undefined): string {
  if (!code) return messages.UNKNOWN;
  const known = (Object.keys(messages) as FriendlyErrorCode[]).includes(
    code as FriendlyErrorCode,
  );
  return known ? messages[code as FriendlyErrorCode] : messages.UNKNOWN;
}

export function isFieldError(
  code: string | null | undefined,
): code is 'VALIDATION_ERROR' {
  return code === 'VALIDATION_ERROR';
}
