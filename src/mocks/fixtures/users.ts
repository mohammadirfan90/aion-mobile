import type { UserProfile } from '@/api/types';

export const users: UserProfile[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'student@aion.example',
    username: 'student',
    firstName: 'Sara',
    lastName: 'Student',
    fullName: 'Sara Student',
    avatar: null,
    bio: 'Learning, one lesson at a time.',
    role: 'student',
    createdAt: '2026-01-04T10:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'instructor@aion.example',
    username: 'instructor',
    firstName: 'Ivy',
    lastName: 'Instructor',
    fullName: 'Ivy Instructor',
    avatar: null,
    bio: 'Course author.',
    role: 'admin',
    createdAt: '2025-09-01T10:00:00Z',
  },
];

export const currentUser: UserProfile = users[0];
