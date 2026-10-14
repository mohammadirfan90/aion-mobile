/**
 * Auth hooks for S02–S06 (API §2).
 *
 *   - Login: supabase-js through `lib/auth-store.ts` (D-03). Signing in flips
 *     `Stack.Protected` to the app; nothing navigates by hand.
 *   - Signup: `POST /auth/signup` with `X-Aion-Client: mobile`. In email demo
 *     mode (D-17) it returns a session and the user lands on Home; a null
 *     session (confirmation back on) sends them to S04.
 *   - Username check: the `check_username_available` RPC, debounced 400 ms. If
 *     the anon key may not call it (B-05e), the check is skipped and signup's
 *     `409 USERNAME_TAKEN` decides.
 *   - S04–S06 still run on the mock store until P2-16 (codes need B-02).
 *
 * Mock mode keeps the Phase 1 demo hooks (`ratelimit…` / `unverified…` emails).
 */
import { useEffect, useState } from 'react';

import { isApiError } from '@/api/client';
import { signInWithPassword, signUp as signUpWithApi } from '@/lib/auth-store';
import { env } from '@/lib/env';
import { friendlyError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import { mockAuth } from '@/mocks/auth-store';
import { users } from '@/mocks/fixtures/users';

export type AuthBannerError = {
  type: 'credentials' | 'rate_limited' | 'unverified' | 'network';
  message: string;
  email?: string;
};

function errorCode(err: unknown): string | undefined {
  return isApiError(err) ? err.code : (err as { code?: string } | null)?.code;
}

function lockoutMessage(err: unknown): string {
  const seconds = isApiError(err) ? err.lockedForSeconds : undefined;
  if (!seconds) return friendlyError('RATE_LIMITED');
  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

/** S02 banner for a failed sign-in. */
export function loginBanner(err: unknown, email: string): AuthBannerError {
  switch (errorCode(err)) {
    case 'INVALID_CREDENTIALS':
      return { type: 'credentials', message: 'Incorrect email or password.' };
    case 'EMAIL_NOT_CONFIRMED':
      return { type: 'unverified', message: 'Your email address has not been verified yet.', email };
    case 'RATE_LIMITED':
      return { type: 'rate_limited', message: lockoutMessage(err) };
    default:
      return { type: 'network', message: friendlyError(errorCode(err)) };
  }
}

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [bannerError, setBannerError] = useState<AuthBannerError | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setBannerError(null);

    // Demo hooks for the edge case states specified in SCREENS.md S02.
    if (env.useMocks && email.toLowerCase().startsWith('ratelimit')) {
      setBannerError({ type: 'rate_limited', message: 'Too many attempts, try again in a few minutes' });
      setIsLoading(false);
      return false;
    }
    if (env.useMocks && email.toLowerCase().startsWith('unverified')) {
      setBannerError({ type: 'unverified', message: 'Your email address has not been verified yet.', email });
      setIsLoading(false);
      return false;
    }

    try {
      await signInWithPassword(email, password);
      return true;
    } catch (err: unknown) {
      setBannerError(
        env.useMocks
          ? { type: 'network', message: err instanceof Error ? err.message : 'Unable to sign in' }
          : loginBanner(err, email),
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearBanner = () => setBannerError(null);

  return {
    login,
    isLoading,
    bannerError,
    clearBanner,
  };
}

export type UsernameCheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

async function isUsernameAvailable(username: string): Promise<boolean | null> {
  if (env.useMocks) return !users.some((u) => u.username.toLowerCase() === username);
  const { data, error } = await getSupabase().rpc('check_username_available', { p_username: username });
  // A permission error (B-05e) or anything else: unknown, let signup decide.
  if (error || typeof data !== 'boolean') return null;
  return data;
}

/**
 * Live username check debounced by 400 ms (per SCREENS.md S03).
 */
export function useCheckUsername(username: string): UsernameCheckStatus {
  const clean = username.trim().toLowerCase();
  const valid = /^[a-z0-9_]{3,20}$/.test(clean);
  const [result, setResult] = useState<{ name: string; available: boolean | null } | null>(null);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      isUsernameAvailable(clean)
        .catch(() => null)
        .then((available) => {
          if (!cancelled) setResult({ name: clean, available });
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [clean, valid]);

  if (!clean || clean.length < 3) return 'idle';
  if (!valid) return 'invalid';
  if (result?.name !== clean) return 'checking';
  if (result.available === null) return 'idle';
  return result.available ? 'available' : 'taken';
}

export interface SignupData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export type SignupServerError = { field?: 'username' | 'email' | 'root'; message: string };

/** Maps a signup failure to the S03 field it belongs to (API §2). */
export function signupError(err: unknown): SignupServerError {
  const code = errorCode(err);
  switch (code) {
    case 'USERNAME_TAKEN':
      return { field: 'username', message: 'Username is already taken' };
    case 'PROFILE_CREATION_FAILED':
      // Supabase hands back a placeholder user for a registered email (INTEGRATION.md #19).
      return { field: 'email', message: 'This email may already have an account. Try logging in.' };
    case 'RATE_LIMITED':
      return { field: 'root', message: lockoutMessage(err) };
    default:
      return { field: 'root', message: friendlyError(code) };
  }
}

export function useSignup() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<SignupServerError | null>(null);

  /** `null` on failure; otherwise whether S04 still has to confirm the email. */
  const signUp = async (data: SignupData): Promise<{ needsVerification: boolean } | null> => {
    setIsLoading(true);
    setServerError(null);
    const cleanUsername = data.username.trim().toLowerCase();

    try {
      if (env.useMocks && users.some((u) => u.username.toLowerCase() === cleanUsername)) {
        setServerError({ field: 'username', message: 'Username is already taken' });
        return null;
      }
      return await signUpWithApi({
        email: data.email.trim(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        username: cleanUsername,
      });
    } catch (err: unknown) {
      setServerError(
        env.useMocks
          ? { field: 'root', message: err instanceof Error ? err.message : 'Unable to sign up' }
          : signupError(err),
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearServerError = () => setServerError(null);

  return {
    signUp,
    isLoading,
    serverError,
    clearServerError,
  };
}

export function useVerifyEmail() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (code: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await mockAuth.verifyEmail(code);
      setIsLoading(false);
      return true;
    } catch {
      setIsLoading(false);
      setError('Invalid code. Please check your email and try again.');
      return false;
    }
  };

  const resend = async (email: string): Promise<boolean> => {
    setIsResending(true);
    setError(null);
    try {
      await mockAuth.resendVerification(email);
      setIsResending(false);
      return true;
    } catch {
      setIsResending(false);
      setError('Unable to resend code. Please try again.');
      return false;
    }
  };

  const clearError = () => setError(null);

  return {
    verify,
    resend,
    isLoading,
    isResending,
    error,
    clearError,
  };
}

export function useForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestReset = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const clean = email.trim().toLowerCase();
    if (clean.startsWith('ratelimit')) {
      setIsLoading(false);
      setError('Too many attempts, please try again in a few minutes.');
      return false;
    }

    try {
      await mockAuth.requestPasswordReset(clean);
      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      return false;
    }
  };

  const clearError = () => setError(null);

  return {
    requestReset,
    isLoading,
    error,
    clearError,
  };
}

export function useResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = async (code: string, newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await mockAuth.resetPassword(code, newPassword);
      setIsLoading(false);
      return true;
    } catch {
      setIsLoading(false);
      setError('Invalid or expired code. Please try again.');
      return false;
    }
  };

  const resend = async (email: string): Promise<boolean> => {
    setIsResending(true);
    setError(null);
    try {
      await mockAuth.requestPasswordReset(email);
      setIsResending(false);
      return true;
    } catch {
      setIsResending(false);
      setError('Unable to resend code. Please try again.');
      return false;
    }
  };

  const clearError = () => setError(null);

  return {
    resetPassword,
    resend,
    isLoading,
    isResending,
    error,
    clearError,
  };
}

