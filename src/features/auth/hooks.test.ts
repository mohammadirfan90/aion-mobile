import { describe, expect, it } from '@jest/globals';

import { ApiError } from '@/api/client';

import { loginBanner, signupError } from './hooks';

describe('loginBanner (S02)', () => {
  it('maps Supabase sign-in failures to the banner types', () => {
    expect(loginBanner(new ApiError('INVALID_CREDENTIALS', 'x', 400), 'a@b.co').type).toBe('credentials');
    expect(loginBanner(new ApiError('EMAIL_NOT_CONFIRMED', 'x', 400), 'a@b.co')).toMatchObject({
      type: 'unverified',
      email: 'a@b.co',
    });
    expect(loginBanner(new ApiError('NETWORK', 'x', 0), 'a@b.co').type).toBe('network');
  });

  it('shows the lockout time from a 429', () => {
    const err = Object.assign(new ApiError('RATE_LIMITED', 'x', 429), { lockedForSeconds: 120 });
    expect(loginBanner(err, 'a@b.co')).toEqual({
      type: 'rate_limited',
      message: 'Too many attempts. Try again in 2 minutes.',
    });
  });
});

describe('signupError (S03, API §2)', () => {
  it('puts each error on its field', () => {
    expect(signupError(new ApiError('USERNAME_TAKEN', 'x', 409)).field).toBe('username');
    expect(signupError(new ApiError('SIGNUP_FAILED', 'x', 400)).field).toBe('root');
  });

  it('reads PROFILE_CREATION_FAILED as a registered email (INTEGRATION.md #19)', () => {
    expect(signupError(new ApiError('PROFILE_CREATION_FAILED', 'x', 500))).toEqual({
      field: 'email',
      message: 'This email may already have an account. Try logging in.',
    });
  });
});
