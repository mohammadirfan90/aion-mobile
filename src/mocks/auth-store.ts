/**
 * Mock auth store. When `EXPO_PUBLIC_USE_MOCKS=true`, the real Supabase-backed
 * auth (P2-01..P2-03) is bypassed and this zustand store answers every
 * sign-in / sign-up / verify / reset call against local fixtures.
 *
 * Behaviour (per SPEC §5 and P0-10):
 *   - Any email + password signs the user in.
 *   - Signup creates a fresh in-memory user (does not persist across reloads).
 *   - Email-verify and password-reset always succeed after a short delay.
 *   - The active session is exposed as `{ user, session }` and consumed by
 *     `api/client.ts` via the auth-middleware wiring done in P2-02 (mock
 *     mode reads it from here).
 *
 * The store intentionally does **not** persist to AsyncStorage: a reload
 * should land on the unauthenticated welcome screen (matches the real flow).
 */
import { create } from 'zustand';

import { mockDelay } from './delay';
import { currentUser as fallbackUser, users } from './fixtures/users';
import type { SupabaseSession, SupabaseUser, UserProfile } from '@/api/types';

let nextUserSeq = users.length + 1;

function makeUserId(): string {
  // RFC-4122-ish shape so the IDs look real in dev tools.
  const r = () =>
    Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, '0');
  return `${r()}${r()}-${r()}-${r()}-${r()}-${r()}${r()}${r()}`;
}

function makeSession(user: SupabaseUser): SupabaseSession {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: `mock-access-${user.id}`,
    refresh_token: `mock-refresh-${user.id}`,
    expires_at: now + 60 * 60,
    expires_in: 60 * 60,
    token_type: 'bearer',
    user,
  };
}

function profileToSupabaseUser(p: UserProfile): SupabaseUser {
  return {
    id: p.id,
    email: p.email,
    created_at: p.createdAt,
    user_metadata: {
      first_name: p.firstName,
      last_name: p.lastName,
      full_name: p.fullName,
      username: p.username,
    },
  };
}

function splitName(email: string, firstName?: string, lastName?: string) {
  if (firstName && lastName) return { firstName, lastName };
  const local = email.split('@')[0] ?? 'student';
  const parts = local.split(/[._-]+/).filter(Boolean);
  return {
    firstName: parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1) : 'New',
    lastName: parts[1] ? parts[1][0].toUpperCase() + parts[1].slice(1) : 'Student',
  };
}

interface MockAuthState {
  user: SupabaseUser | null;
  session: SupabaseSession | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: SupabaseUser | null; session: SupabaseSession | null }>;
  signUp: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username: string;
  }) => Promise<{ user: SupabaseUser | null; session: SupabaseSession | null }>;
  signOut: () => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (code: string, newPassword: string) => Promise<void>;
  /** Used by the API middleware to look up the bearer in mock mode. */
  getAccessToken: () => string | null;
  /** Used by feature hooks to render the current user without re-fetching. */
  getProfile: () => UserProfile | null;
}

export const useMockAuth = create<MockAuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: false,

  async signIn(email, _password) {
    set({ isLoading: true });
    // Pretend to look the user up. Any password is accepted.
    const known = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const profile: UserProfile = known ?? {
      ...fallbackUser,
      id: makeUserId(),
      email,
      username: email.split('@')[0] ?? 'student',
      firstName: splitName(email).firstName,
      lastName: splitName(email).lastName,
      fullName: email,
    };
    const supaUser = profileToSupabaseUser(profile);
    const session = makeSession(supaUser);
    await mockDelay(null, 350);
    set({ user: supaUser, session, profile, isLoading: false });
    return { user: supaUser, session };
  },

  async signUp({ email, password, firstName, lastName, username }) {
    set({ isLoading: true });
    const id = makeUserId();
    const profile: UserProfile = {
      id,
      email,
      username: username || email.split('@')[0] || `user${nextUserSeq++}`,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim() || email,
      avatar: null,
      bio: null,
      role: 'student',
      createdAt: new Date().toISOString(),
    };
    const supaUser = profileToSupabaseUser(profile);
    const session = makeSession(supaUser);
    // Touch `password` so eslint doesn't complain about the unused param; the
    // mock does not actually validate it.
    void password;
    await mockDelay(null, 500);
    set({ user: supaUser, session, profile, isLoading: false });
    return { user: supaUser, session };
  },

  async signOut() {
    await mockDelay(null, 120);
    set({ user: null, session: null, profile: null });
  },

  async verifyEmail(_code) {
    // In the real app, the code is checked against Supabase. In mock mode we
    // accept any 6-digit string after a short delay.
    await mockDelay(null, 400);
    const { user } = get();
    if (user) {
      set({ user: { ...user } });
    }
  },

  async requestPasswordReset(_email) {
    await mockDelay(null, 350);
  },

  async resetPassword(_code, _newPassword) {
    await mockDelay(null, 400);
  },

  getAccessToken() {
    return get().session?.access_token ?? null;
  },

  getProfile() {
    return get().profile;
  },
}));

/**
 * Helpers used by feature hooks (P1+) when `env.useMocks` is true. Keeping
 * them as named exports avoids each hook having to import the zustand store
 * directly.
 */
export const mockAuth = {
  signIn: (email: string, password: string) => useMockAuth.getState().signIn(email, password),
  signUp: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    username: string;
  }) => useMockAuth.getState().signUp(input),
  signOut: () => useMockAuth.getState().signOut(),
  verifyEmail: (code: string) => useMockAuth.getState().verifyEmail(code),
  requestPasswordReset: (email: string) =>
    useMockAuth.getState().requestPasswordReset(email),
  resetPassword: (code: string, newPassword: string) =>
    useMockAuth.getState().resetPassword(code, newPassword),
  getAccessToken: () => useMockAuth.getState().getAccessToken(),
  getProfile: () => useMockAuth.getState().getProfile(),
  useStore: useMockAuth,
};
