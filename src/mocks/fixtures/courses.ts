import type { Course, CourseListParams } from '@/api/types';

const now = '2026-09-12T10:00:00Z';

export const courses: Course[] = [
  {
    id: 'c0000001-0000-0000-0000-000000000001',
    title: 'Intro to Aion',
    slug: 'intro-to-aion',
    description: 'Get started with the platform.',
    about: 'A friendly welcome course for new students.',
    thumbnail: null,
    learnings: ['Navigate the app', 'Find courses', 'Earn your first certificate'],
    tags: ['beginner', 'orientation'],
    level: 'beginner',
    pricingConfig: { type: 'free', currency: 'USD', price: 0 },
    accessConfig: { mode: 'free' },
    instructorId: '22222222-2222-2222-2222-222222222222',
    status: 'published',
    certificateConfig: { enabled: true, criteria: { minProgressPercent: 100 } },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'c0000002-0000-0000-0000-000000000002',
    title: 'JavaScript Foundations',
    slug: 'javascript-foundations',
    description: 'Variables, types, control flow, functions.',
    about: null,
    thumbnail: null,
    learnings: null,
    tags: ['javascript', 'fundamentals'],
    level: 'beginner',
    pricingConfig: { type: 'one_time', currency: 'USD', price: 4900, compareAtPrice: 7900, hasDiscount: true },
    accessConfig: { mode: 'paid' },
    instructorId: '22222222-2222-2222-2222-222222222222',
    status: 'published',
    certificateConfig: { enabled: true, criteria: { requireAllLessons: true } },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'c0000003-0000-0000-0000-000000000003',
    title: 'A Very Long Title About Distributed Systems, Observability, and the SRE Mindset for Modern Backend Teams',
    slug: 'distributed-systems',
    description: 'Designing systems that stay up.',
    about: 'A deep dive.',
    thumbnail: null,
    learnings: ['Design for failure', 'Observability basics'],
    tags: ['architecture'],
    level: 'advanced',
    pricingConfig: { type: 'subscription', currency: 'USD', price: 1900, billingPeriod: 'monthly' },
    accessConfig: { mode: 'invite_only', inviteCode: 'TEAM-2026' },
    instructorId: '22222222-2222-2222-2222-222222222222',
    status: 'published',
    certificateConfig: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'c0000004-0000-0000-0000-000000000004',
    title: 'Design Basics',
    slug: 'design-basics',
    description: 'Type, color, layout, motion.',
    about: null,
    thumbnail: null,
    learnings: null,
    tags: ['design'],
    level: 'intermediate',
    pricingConfig: { type: 'free', currency: 'USD', price: 0 },
    accessConfig: { mode: 'free' },
    instructorId: '22222222-2222-2222-2222-222222222222',
    status: 'published',
    certificateConfig: { enabled: true, criteria: { minProgressPercent: 100 } },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'c0000005-0000-0000-0000-000000000005',
    title: 'Mobile UX Patterns',
    slug: 'mobile-ux-patterns',
    description: 'Gestures, navigation, and platform conventions.',
    about: null,
    thumbnail: null,
    learnings: null,
    tags: ['mobile', 'ux'],
    level: 'intermediate',
    pricingConfig: { type: 'one_time', currency: 'USD', price: 2900 },
    accessConfig: { mode: 'paid' },
    instructorId: '22222222-2222-2222-2222-222222222222',
    status: 'published',
    certificateConfig: { enabled: true },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'c0000006-0000-0000-0000-000000000006',
    title: 'TypeScript for JavaScripters',
    slug: 'typescript-for-js',
    description: 'Gradual typing, generics, narrowing.',
    about: null,
    thumbnail: null,
    learnings: null,
    tags: ['typescript'],
    level: 'intermediate',
    pricingConfig: { type: 'free', currency: 'USD', price: 0 },
    accessConfig: { mode: 'free' },
    instructorId: '22222222-2222-2222-2222-222222222222',
    status: 'published',
    certificateConfig: { enabled: true },
    createdAt: now,
    updatedAt: now,
  },
];

export function listCourses(params: CourseListParams = {}): Course[] {
  let out = courses;
  if (params.search) {
    const q = params.search.toLowerCase();
    out = out.filter(
      (c) => c.title.toLowerCase().includes(q) || (c.description?.toLowerCase().includes(q) ?? false),
    );
  }
  if (params.level) out = out.filter((c) => c.level === params.level);
  if (params.tag) out = out.filter((c) => c.tags?.includes(params.tag!));
  if (params.excludeIds?.length) out = out.filter((c) => !params.excludeIds!.includes(c.id));
  return out;
}
