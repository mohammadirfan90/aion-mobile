/**
 * Mock `GET` / `PATCH /users/me` (API §12) for S25–S27.
 *
 * The in-memory `Me` is derived from the signed-in mock auth profile (falling
 * back to the fixture student) the first time it's read, then edited in place
 * by `updateMockMe`. Signing in as someone else rebuilds it.
 *
 * Edits are mirrored back onto the mock auth profile (name, username, avatar,
 * bio, role) so screens that still read the auth store (Home, My Learning
 * headers) show the new name and avatar too.
 */
import type { Me, UpdateMeBody, UserProfile } from '@/api/types';
import { useMockAuth } from '@/mocks/auth-store';

import { currentUser, users } from './users';

/** Usernames the mock treats as taken, on top of the other fixture users. */
const RESERVED_USERNAMES = ['taken', 'admin'];

const DEFAULTS: Record<string, Pick<Me, 'headline' | 'learningGoals'>> = {
  [currentUser.id]: {
    headline: 'Frontend learner',
    learningGoals: 'Ship a full-stack project with React and TypeScript.',
  },
};

let mockMe: Me | null = null;

function codedError(code: string, message: string): Error {
  const err = new Error(message);
  (err as { code?: string }).code = code;
  return err;
}

function activeProfile(): UserProfile {
  return useMockAuth.getState().getProfile() ?? currentUser;
}

function fromProfile(p: UserProfile): Me {
  const defaults = DEFAULTS[p.id];
  return {
    id: p.id,
    email: p.email,
    username: p.username || null,
    name: p.fullName || `${p.firstName} ${p.lastName}`.trim() || null,
    role: p.role === 'admin' ? 'admin' : 'student',
    avatarUrl: p.avatar,
    headline: defaults?.headline ?? null,
    bio: p.bio,
    aiConsent: true,
    learningGoals: defaults?.learningGoals ?? null,
    createdAt: p.createdAt,
    updatedAt: p.createdAt,
  };
}

/** Keep the auth store's profile in sync so other headers show the edit. */
function syncAuthProfile(me: Me) {
  const state = useMockAuth.getState();
  const profile = state.profile;
  if (!profile || profile.id !== me.id) return;
  const name = me.name ?? profile.fullName;
  const [firstName, ...rest] = name.split(/\s+/);
  useMockAuth.setState({
    profile: {
      ...profile,
      fullName: name,
      firstName: firstName || profile.firstName,
      lastName: rest.join(' ') || profile.lastName,
      username: me.username ?? profile.username,
      avatar: me.avatarUrl,
      bio: me.bio,
      role: me.role,
    },
  });
}

export function getMockMe(): Me {
  const profile = activeProfile();
  if (!mockMe || mockMe.id !== profile.id) mockMe = fromProfile(profile);
  return { ...mockMe };
}

function isUsernameTaken(username: string, selfId: string): boolean {
  const u = username.toLowerCase();
  if (RESERVED_USERNAMES.includes(u)) return true;
  return users.some((x) => x.id !== selfId && x.username.toLowerCase() === u);
}

/** `PATCH /users/me`. Throws `USERNAME_TAKEN` / `VALIDATION_ERROR` like the API. */
export function updateMockMe(body: UpdateMeBody): Me {
  const me = getMockMe();
  if (body.username !== undefined) {
    const username = body.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      throw codedError('VALIDATION_ERROR', 'Invalid username');
    }
    if (username !== me.username && isUsernameTaken(username, me.id)) {
      throw codedError('USERNAME_TAKEN', 'That username is already taken.');
    }
  }
  if (body.name !== undefined && !body.name.trim()) {
    throw codedError('VALIDATION_ERROR', 'Name is required');
  }

  const next: Me = {
    ...me,
    ...(body.name !== undefined ? { name: body.name.trim() } : null),
    ...(body.username !== undefined ? { username: body.username.trim().toLowerCase() } : null),
    ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : null),
    ...(body.headline !== undefined ? { headline: body.headline } : null),
    ...(body.bio !== undefined ? { bio: body.bio } : null),
    ...(body.aiConsent !== undefined ? { aiConsent: body.aiConsent } : null),
    ...(body.learningGoals !== undefined ? { learningGoals: body.learningGoals } : null),
    updatedAt: new Date().toISOString(),
  };
  mockMe = next;
  syncAuthProfile(next);
  return { ...next };
}

/** Dev-only fixture role switch on S27 (SPEC §5). */
export function setMockRole(role: Me['role']): Me {
  const me = getMockMe();
  mockMe = { ...me, role, updatedAt: new Date().toISOString() };
  syncAuthProfile(mockMe);
  return { ...mockMe };
}

/** `POST /auth/password` (API §2). The API doesn't check the current password. */
export function changeMockPassword(password: string): null {
  if (password.length < 8) {
    throw codedError('VALIDATION_ERROR', 'Password must be at least 8 characters');
  }
  return null;
}
