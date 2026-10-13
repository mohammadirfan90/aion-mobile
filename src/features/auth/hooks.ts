import { useEffect, useState } from 'react';

import { mockAuth } from '@/mocks/auth-store';
import { users } from '@/mocks/fixtures/users';

export type AuthBannerError = {
  type: 'credentials' | 'rate_limited' | 'unverified' | 'network';
  message: string;
  email?: string;
};

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [bannerError, setBannerError] = useState<AuthBannerError | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setBannerError(null);

    try {
      // Demo hooks for the edge case states specified in SCREENS.md S02
      if (email.toLowerCase().startsWith('ratelimit')) {
        setBannerError({
          type: 'rate_limited',
          message: 'Too many attempts, try again in a few minutes',
        });
        setIsLoading(false);
        return false;
      }

      if (email.toLowerCase().startsWith('unverified')) {
        setBannerError({
          type: 'unverified',
          message: 'Your email address has not been verified yet.',
          email,
        });
        setIsLoading(false);
        return false;
      }

      const result = await mockAuth.signIn(email, password);
      setIsLoading(false);
      return !!result.session;
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Unable to sign in';
      setBannerError({
        type: 'network',
        message: msg,
      });
      return false;
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

/**
 * Live username check debounced by 400 ms (per SCREENS.md S03).
 */
export function useCheckUsername(username: string): UsernameCheckStatus {
  const clean = username.trim().toLowerCase();
  const [debouncedValue, setDebouncedValue] = useState(clean);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(clean);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [clean]);

  if (!clean || clean.length < 3) return 'idle';
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) return 'invalid';
  if (debouncedValue !== clean) return 'checking';

  const isTaken = users.some((u) => u.username.toLowerCase() === clean);
  return isTaken ? 'taken' : 'available';
}

export interface SignupData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export function useSignup() {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<{ field?: 'username' | 'email' | 'root'; message: string } | null>(null);

  const signUp = async (data: SignupData): Promise<boolean> => {
    setIsLoading(true);
    setServerError(null);

    try {
      const cleanUsername = data.username.trim().toLowerCase();
      const isTaken = users.some((u) => u.username.toLowerCase() === cleanUsername);

      if (isTaken) {
        setServerError({
          field: 'username',
          message: 'Username is already taken',
        });
        setIsLoading(false);
        return false;
      }

      await mockAuth.signUp({
        email: data.email.trim(),
        password: data.password,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        username: cleanUsername,
      });

      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Unable to sign up';
      setServerError({
        field: 'root',
        message: msg,
      });
      return false;
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

