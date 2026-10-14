/**
 * The app's auth state, for both modes (SPEC §5, P2-03).
 *
 *   status   'loading' until the saved session is restored, then 'signedIn' or 'signedOut'
 *   session  the Supabase session (its access token goes on every API call)
 *   profile  the signed-in user as the screens use it, from `GET /users/me`
 *   me       the raw `GET /users/me` row (role, aiConsent, …)
 *
 * Real mode: login, refresh and logout use supabase-js (D-03); signup uses the
 * API (`POST /auth/signup` with `X-Aion-Client: mobile`); the email-code
 * endpoints hand back a session that `adoptSession()` stores (D-16).
 * Mock mode: the in-memory mock store stays the source of truth and this store
 * mirrors it, so Phase 1 flows behave exactly as before.
 *
 * Screens read `useAuthSession()` / `useAuthStore()`; nothing outside this file
 * should import the mock store for auth state.
 */
import type { AuthError, Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { ApiError, configureAuth, pingHealth, request } from '@/api/client';
import type { Me, SupabaseSession, UserProfile } from '@/api/types';
import { setHasSeenWelcome } from '@/lib/auth-storage';
import { env } from '@/lib/env';
import { getSupabase } from '@/lib/supabase';
import { mockAuth, useMockAuth } from '@/mocks/auth-store';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthState {
  status: AuthStatus;
  session: SupabaseSession | null;
  profile: UserProfile | null;
  me: Me | null;
}

export const useAuthStore = create<AuthState>(() => ({
  status: 'loading',
  session: null,
  profile: null,
  me: null,
}));

// ── Reading ──────────────────────────────────────────────────────────────────

export function useAuthSession(): { isSignedIn: boolean; isLoading: boolean } {
  const status = useAuthStore((s) => s.status);
  return { isSignedIn: status === 'signedIn', isLoading: status === 'loading' };
}

/**
 * The student turned AI off (`Me.aiConsent === false`). The API has no "AI off"
 * error, so S14 and S17 check it themselves (INTEGRATION.md #14). Unknown
 * (profile still loading, or mock mode) counts as on.
 */
export function useAiOff(): boolean {
  return useAuthStore((s) => s.me?.aiConsent === false);
}

export function getAccessToken(): string | null {
  return useAuthStore.getState().session?.access_token ?? null;
}

export function getCurrentProfile(): UserProfile | null {
  return useAuthStore.getState().profile;
}

export function getCurrentMe(): Me | null {
  return useAuthStore.getState().me;
}

const signedOutListeners = new Set<() => void>();

/** Runs after every sign-out (the root layout clears the query cache here). */
export function onSignedOut(listener: () => void): () => void {
  signedOutListeners.add(listener);
  return () => signedOutListeners.delete(listener);
}

// ── Start-up ─────────────────────────────────────────────────────────────────

let started = false;

/** Restores the saved session. Call once at launch; safe to call again. */
export async function initAuth(): Promise<void> {
  if (started) return;
  started = true;
  configureAuth({ getAccessToken, refreshSession, onSessionExpired: () => signOut() });

  if (env.useMocks) {
    const sync = (s: ReturnType<typeof useMockAuth.getState>) =>
      useAuthStore.setState({
        status: s.session ? 'signedIn' : 'signedOut',
        session: s.session,
        profile: s.profile,
      });
    sync(useMockAuth.getState());
    useMockAuth.subscribe(sync);
    return;
  }

  void pingHealth(); // start waking a cold server while the session restores
  const supabase = getSupabase();

  supabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
      if (event === 'SIGNED_OUT') clearSession();
      return;
    }
    const hadProfile = !!useAuthStore.getState().profile;
    useAuthStore.setState({ status: 'signedIn', session: toSession(session) });
    // supabase-js warns against awaiting its own calls inside this callback.
    if (!hadProfile) setTimeout(() => void loadProfile(), 0);
  });

  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    useAuthStore.setState({ status: 'signedOut', session: null });
    return;
  }
  // Open the app straight away (works offline); the profile follows.
  useAuthStore.setState({ status: 'signedIn', session: toSession(data.session) });
  void loadProfile();
}

/** Reloads `GET /users/me` into the store. */
export async function loadProfile(): Promise<Me | null> {
  if (env.useMocks) return null;
  try {
    const me = await request<Me>('/users/me');
    useAuthStore.setState({ me, profile: toProfile(me) });
    return me;
  } catch {
    // 401s are handled by request() (refresh, then sign-out); anything else
    // (offline, cold start) leaves the cached profile and the next call retries.
    return null;
  }
}

/** Stores a freshly saved `/users/me` (e.g. after editing the profile). */
export function setCurrentMe(me: Me) {
  useAuthStore.setState({ me, profile: toProfile(me) });
}

// ── Session changes ──────────────────────────────────────────────────────────

/** Email + password sign-in. Throws `ApiError` with an auth code on failure. */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  if (env.useMocks) {
    await mockAuth.signIn(email, password);
    return;
  }
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error || !data.session) throw toApiError(error);
  await acceptSession(data.session);
}

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
}

/**
 * Creates the account through the API (D-03). Returns `needsVerification: true`
 * when Supabase still wants the email confirmed; otherwise the user is signed in
 * (email demo mode, D-17).
 */
export async function signUp(input: SignUpInput): Promise<{ needsVerification: boolean }> {
  if (env.useMocks) {
    await mockAuth.signUp(input);
    return { needsVerification: false };
  }
  const data = await request<{ user: unknown; session: SupabaseSession | null }>('/auth/signup', {
    method: 'POST',
    body: input,
    headers: { 'X-Aion-Client': 'mobile' },
    anonymous: true,
  });
  if (!data.session) return { needsVerification: true };
  await adoptSession(data.session);
  return { needsVerification: false };
}

/** Stores a session returned by the API (signup, verify-email, reset-password/confirm). */
export async function adoptSession(session: Pick<SupabaseSession, 'access_token' | 'refresh_token'>): Promise<void> {
  if (env.useMocks) return;
  const { data, error } = await getSupabase().auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error || !data.session) throw toApiError(error);
  await acceptSession(data.session);
}

export async function signOut(): Promise<void> {
  if (env.useMocks) {
    await mockAuth.signOut();
    for (const listener of signedOutListeners) listener();
    return;
  }
  try {
    await getSupabase().auth.signOut();
  } catch {
    // Offline: the local session is dropped below either way.
  }
  clearSession();
}

// ── Internals ────────────────────────────────────────────────────────────────

async function acceptSession(session: Session) {
  void setHasSeenWelcome();
  useAuthStore.setState({ status: 'signedIn', session: toSession(session) });
  await loadProfile();
}

function clearSession() {
  const wasSignedIn = useAuthStore.getState().status !== 'signedOut';
  useAuthStore.setState({ status: 'signedOut', session: null, profile: null, me: null });
  if (wasSignedIn) for (const listener of signedOutListeners) listener();
}

/** New access token, `null` if the refresh token was rejected; throws when offline. */
async function refreshSession(): Promise<string | null> {
  if (env.useMocks) return getAccessToken();
  const { data, error } = await getSupabase().auth.refreshSession();
  if (error) {
    if (isNetworkAuthError(error)) throw error;
    return null;
  }
  if (!data.session) return null;
  useAuthStore.setState({ session: toSession(data.session) });
  return data.session.access_token;
}

function isNetworkAuthError(error: AuthError): boolean {
  return error.name === 'AuthRetryableFetchError' || !error.status;
}

function toSession(s: Session): SupabaseSession {
  return s as unknown as SupabaseSession;
}

/** Maps a Supabase auth error to the app's error codes (lib/errors.ts). */
function toApiError(error: AuthError | null): ApiError {
  if (!error) return new ApiError('UNKNOWN', 'Sign-in failed', 0);
  if (isNetworkAuthError(error)) return new ApiError('NETWORK', error.message, 0);
  const code = (error as AuthError & { code?: string }).code;
  if (error.status === 429 || code === 'over_request_rate_limit') {
    return new ApiError('RATE_LIMITED', error.message, 429);
  }
  if (code === 'email_not_confirmed' || /not confirmed/i.test(error.message)) {
    return new ApiError('EMAIL_NOT_CONFIRMED', error.message, error.status ?? 400);
  }
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
    return new ApiError('INVALID_CREDENTIALS', 'Incorrect email or password.', error.status ?? 400);
  }
  return new ApiError('UNKNOWN', error.message, error.status ?? 0);
}

/** `GET /users/me` → the profile shape the screens use. */
export function toProfile(me: Me): UserProfile {
  const fullName = me.name?.trim() || me.username || me.email.split('@')[0] || 'Learner';
  const [firstName = fullName, ...rest] = fullName.split(/\s+/);
  return {
    id: me.id,
    email: me.email,
    username: me.username ?? me.email.split('@')[0] ?? '',
    firstName,
    lastName: rest.join(' '),
    fullName,
    avatar: me.avatarUrl,
    bio: me.bio,
    role: me.role,
    createdAt: me.createdAt,
  };
}
