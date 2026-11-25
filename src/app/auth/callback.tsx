/**
 * Landing route for `aion://auth/callback` (D-18). On Android the Google sign-in
 * redirect can also open the app here; `signInWithGoogle()` has already handled
 * the code, so this just sends the user to the right stack.
 */
import { Redirect } from 'expo-router';

import { useAuthSession } from '@/lib/auth-store';

export default function AuthCallback() {
  const { isSignedIn, isLoading } = useAuthSession();
  if (isLoading) return null;
  return <Redirect href={isSignedIn ? '/' : '/(auth)/login'} />;
}
