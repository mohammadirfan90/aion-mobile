import { useState } from 'react';

import { mockAuth } from '@/mocks/auth-store';

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
