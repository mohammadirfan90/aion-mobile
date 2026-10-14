import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import type { Me } from '@/api/types';

import { toProfile } from './auth-store';

const me: Me = {
  id: 'u-1',
  email: 'ayesha@example.com',
  username: 'ayesha',
  name: 'Ayesha Rahman Khan',
  role: 'student',
  avatarUrl: 'https://cdn.example.com/a.png',
  headline: null,
  bio: 'Learner',
  aiConsent: true,
  learningGoals: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

describe('toProfile (GET /users/me → screen profile)', () => {
  it('splits the name into first and last', () => {
    expect(toProfile(me)).toMatchObject({ firstName: 'Ayesha', lastName: 'Rahman Khan', fullName: 'Ayesha Rahman Khan' });
  });

  it('maps avatar, bio and role', () => {
    expect(toProfile(me)).toMatchObject({ avatar: me.avatarUrl, bio: 'Learner', role: 'student', username: 'ayesha' });
  });

  it('falls back to the username, then the email, when there is no name', () => {
    expect(toProfile({ ...me, name: null }).fullName).toBe('ayesha');
    expect(toProfile({ ...me, name: '  ', username: null })).toMatchObject({ fullName: 'ayesha', username: 'ayesha' });
  });
});
