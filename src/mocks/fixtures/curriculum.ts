import type { Chapter, Curriculum, Lesson } from '@/api/types';

// Two courses' curricula, with one locked chapter and every lesson type at
// least once (SPEC §P0-10 details).

const introChapters: Chapter[] = [
  {
    id: 'ch-intro-01',
    courseId: 'c0000001-0000-0000-0000-000000000001',
    title: 'Welcome',
    position: 1,
    locked: false,
    lessons: [
      {
        id: 'l-intro-01-01',
        chapterId: 'ch-intro-01',
        courseId: 'c0000001-0000-0000-0000-000000000001',
        title: 'What is Aion?',
        type: 'video',
        position: 1,
        metadata: { videoUrl: 'https://example.com/intro.mp4', videoProvider: 'mp4', durationSeconds: 180 },
        completed: true,
        durationSeconds: 180,
      },
      {
        id: 'l-intro-01-02',
        chapterId: 'ch-intro-01',
        courseId: 'c0000001-0000-0000-0000-000000000001',
        title: 'Reading: How courses work',
        type: 'text',
        position: 2,
        metadata: null,
        completed: true,
      },
    ],
  },
  {
    id: 'ch-intro-02',
    courseId: 'c0000001-0000-0000-0000-000000000001',
    title: 'Your first quiz',
    position: 2,
    locked: false,
    lessons: [
      {
        id: 'l-intro-02-01',
        chapterId: 'ch-intro-02',
        courseId: 'c0000001-0000-0000-0000-000000000001',
        title: 'Welcome quiz',
        type: 'quiz',
        position: 1,
        metadata: null,
        completed: false,
      },
    ],
  },
  {
    id: 'ch-intro-03',
    courseId: 'c0000001-0000-0000-0000-000000000001',
    title: 'Try an assignment',
    position: 3,
    locked: false,
    lessons: [
      {
        id: 'l-intro-03-01',
        chapterId: 'ch-intro-03',
        courseId: 'c0000001-0000-0000-0000-000000000001',
        title: 'Your first assignment',
        type: 'assignment',
        position: 1,
        metadata: null,
        completed: false,
      },
    ],
  },
];

const jsChapters: Chapter[] = [
  {
    id: 'ch-js-01',
    courseId: 'c0000002-0000-0000-0000-000000000002',
    title: 'Getting started',
    position: 1,
    locked: false,
    lessons: [
      {
        id: 'l-js-01-01',
        chapterId: 'ch-js-01',
        courseId: 'c0000002-0000-0000-0000-000000000002',
        title: 'Hello, JavaScript',
        type: 'video',
        position: 1,
        metadata: { videoUrl: 'https://example.com/js-1.mp4', videoProvider: 'mp4', durationSeconds: 360 },
        completed: true,
        durationSeconds: 360,
      },
      {
        id: 'l-js-01-02',
        chapterId: 'ch-js-01',
        courseId: 'c0000002-0000-0000-0000-000000000002',
        title: 'Reference: Variables',
        type: 'document',
        position: 2,
        metadata: { documentUrl: 'https://example.com/variables.pdf' },
        completed: false,
      },
    ],
  },
  {
    id: 'ch-js-02',
    courseId: 'c0000002-0000-0000-0000-000000000002',
    title: 'Control flow',
    position: 2,
    locked: false,
    lessons: [
      {
        id: 'l-js-02-01',
        chapterId: 'ch-js-02',
        courseId: 'c0000002-0000-0000-0000-000000000002',
        title: 'If/else and switch',
        type: 'text',
        position: 1,
        metadata: null,
        completed: false,
      },
      {
        id: 'l-js-02-02',
        chapterId: 'ch-js-02',
        courseId: 'c0000002-0000-0000-0000-000000000002',
        title: 'Loops',
        type: 'embed',
        position: 2,
        metadata: { embedHtml: '<iframe src="https://example.com/embed/loops"></iframe>' },
        completed: false,
      },
    ],
  },
  {
    id: 'ch-js-03',
    courseId: 'c0000002-0000-0000-0000-000000000002',
    title: 'Bonus: resources',
    position: 3,
    locked: true,
    lessons: [
      {
        id: 'l-js-03-01',
        chapterId: 'ch-js-03',
        courseId: 'c0000002-0000-0000-0000-000000000002',
        title: 'Further reading',
        type: 'resource',
        position: 1,
        metadata: { resourceUrl: 'https://example.com/further-reading' },
        completed: false,
      },
    ],
  },
  {
    id: 'ch-js-04',
    courseId: 'c0000002-0000-0000-0000-000000000002',
    title: 'Live session',
    position: 4,
    locked: false,
    lessons: [
      {
        id: 'l-js-04-01',
        chapterId: 'ch-js-04',
        courseId: 'c0000002-0000-0000-0000-000000000002',
        title: 'Live Q&A',
        type: 'live',
        position: 1,
        metadata: null,
        completed: false,
      },
    ],
  },
];

const allChapters: Chapter[] = [...introChapters, ...jsChapters];

export function getCurriculum(courseId: string): Curriculum | null {
  const chapters = allChapters.filter((c) => c.courseId === courseId);
  if (!chapters.length) return null;
  const courseId_ = chapters[0].courseId;
  return {
    course: {
      id: courseId_,
      title: courseId_.startsWith('c0000001') ? 'Intro to Aion' : 'JavaScript Foundations',
      slug: courseId_.startsWith('c0000001') ? 'intro-to-aion' : 'javascript-foundations',
      description: null,
      about: null,
      thumbnail: null,
      learnings: null,
      tags: null,
      level: 'beginner',
      pricingConfig: { type: 'free', currency: 'USD', price: 0 },
      accessConfig: { mode: 'free' },
      instructorId: '22222222-2222-2222-2222-222222222222',
      status: 'published',
      certificateConfig: { enabled: true },
      createdAt: '2026-09-12T10:00:00Z',
      updatedAt: '2026-09-12T10:00:00Z',
    },
    chapters,
  };
}

export function getLesson(lessonId: string): Lesson | null {
  for (const ch of allChapters) {
    const l = ch.lessons.find((x) => x.id === lessonId);
    if (l) return l;
  }
  return null;
}
