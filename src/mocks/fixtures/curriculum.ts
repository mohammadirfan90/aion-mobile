import type { Chapter, Curriculum, DynamicBlock, Lesson } from '@/api/types';

// Two courses' curricula, with one locked chapter and every lesson type at
// least once in an unlocked chapter (SPEC §P0-10 details, S12 acceptance).
// Lesson shapes follow API §4: `content`, `videoUrl` and the `*Settings`
// block that matches the type.

const INTRO = 'c0000001-0000-0000-0000-000000000001';
const JS = 'c0000002-0000-0000-0000-000000000002';

const SAMPLE_MP4 =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

const introChapters: Chapter[] = [
  {
    id: 'ch-intro-01',
    courseId: INTRO,
    title: 'Welcome',
    position: 1,
    locked: false,
    lessons: [
      {
        id: 'l-intro-01-01',
        chapterId: 'ch-intro-01',
        courseId: INTRO,
        title: 'What is Aion?',
        type: 'video',
        position: 1,
        videoUrl: SAMPLE_MP4,
        content:
          'A short tour of the app: where your courses live, how lessons work, and where to find the AI tutor.',
        metadata: {
          videoSettings: { sourceType: 'link', startTime: '00:00', controls: true },
          // First lesson of the first chapter is open for everyone — it doubles
          // as the S10 Preview badge and lets S12 be exercised before
          // enrollment.
          isPreview: true,
        },
        completed: true,
        durationSeconds: 596,
      },
      {
        id: 'l-intro-01-02',
        chapterId: 'ch-intro-01',
        courseId: INTRO,
        title: 'Reading: How courses work',
        type: 'markdown',
        position: 2,
        content: [
          '## Courses, chapters and lessons',
          '',
          'Every course is split into **chapters**, and every chapter into **lessons**.',
          'A lesson can be a video, a reading, a quiz, an assignment or a live session.',
          '',
          '### Finishing a lesson',
          '',
          '1. Open the lesson from the curriculum.',
          '2. Work through the content.',
          '3. Tap **Mark complete** at the bottom.',
          '',
          '> Quizzes complete themselves when you pass them.',
          '',
          'Use `Notes` to keep your own notes next to each lesson.',
        ].join('\n'),
        metadata: { markdownSettings: { sourceType: 'direct' } },
        completed: true,
        durationSeconds: 240,
      },
      {
        id: 'l-intro-01-03',
        chapterId: 'ch-intro-01',
        courseId: INTRO,
        title: 'Inside an interactive lesson',
        type: 'dynamic_page',
        position: 3,
        content: 'An interactive page that shows every block type.',
        metadata: {
          lastConfiguredAt: '2026-09-12T10:00:00Z',
          blocks: [
            {
              id: 'b1',
              type: 'hero',
              data: {
                badge: 'Interactive',
                heading: 'How interactive lessons work',
                subtitle: 'Read, try the examples, then check yourself.',
                readingTime: '6 min read',
                learningGoals: [
                  'Recognise the block types',
                  'Answer an inline question',
                  'Find the glossary',
                ],
              },
            },
            {
              id: 'b2',
              type: 'typography',
              data: {
                content:
                  'Interactive lessons are built from **blocks**. Each block has one job: explain, show code, warn, or check what you know.',
              },
            },
            {
              id: 'b3',
              type: 'callout',
              data: {
                style: 'tip',
                title: 'Tip',
                message: 'You can leave and come back; your place in the course is saved.',
              },
            },
            {
              id: 'b4',
              type: 'code',
              data: {
                language: 'javascript',
                title: 'hello.js',
                code: "const name = 'Aion';\nconsole.info(`Hello, ${name}!`);",
                output: 'Hello, Aion!',
              },
            },
            {
              id: 'b5',
              type: 'tabs',
              data: {
                tabs: [
                  { title: 'Read', content: 'Start with the text blocks.' },
                  { title: 'Try', content: 'Run the code examples yourself.' },
                  { title: 'Check', content: 'Answer the inline question below.' },
                ],
              },
            },
            {
              id: 'b6',
              type: 'stepper',
              data: {
                steps: [
                  { title: 'Open', description: 'Pick a lesson from the curriculum.' },
                  { title: 'Learn', description: 'Work through each block.' },
                  { title: 'Finish', description: 'Mark it complete.' },
                ],
              },
            },
            {
              id: 'b7',
              type: 'quiz',
              data: {
                question: 'What happens when you answer an inline question correctly?',
                options: [
                  'Nothing',
                  'The lesson is marked complete',
                  'You lose a quiz attempt',
                ],
                correctIndex: 1,
                explanation: 'A correct inline answer marks the lesson complete, like on the web.',
              },
            },
            {
              id: 'b8',
              type: 'accordion',
              data: {
                items: [
                  { title: 'Can I skip a block?', content: 'Yes. Blocks are not graded.' },
                  { title: 'Is this on the web too?', content: 'Yes, it looks the same there.' },
                ],
              },
            },
            {
              id: 'b9',
              type: 'glossary',
              data: {
                terms: [
                  { term: 'Block', definition: 'One piece of an interactive lesson.' },
                  { term: 'Callout', definition: 'A highlighted note, tip or warning.' },
                ],
              },
            },
            {
              id: 'b10',
              type: 'checklist',
              data: { items: ['Read the intro', 'Run the example', 'Answer the question'] },
            },
            {
              id: 'b11',
              type: 'resource',
              data: {
                title: 'Lesson cheat sheet',
                description: 'A one-page summary (PDF).',
                fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                buttonLabel: 'Open',
              },
            },
            // An unknown block type: S12 must skip it, not crash.
            { id: 'b12', type: 'timeline', data: {} } as unknown as DynamicBlock,
          ],
        },
        completed: true,
        durationSeconds: 360,
      },
    ],
  },
  {
    id: 'ch-intro-02',
    courseId: INTRO,
    title: 'Your first quiz',
    position: 2,
    locked: false,
    lessons: [
      {
        id: 'l-intro-02-01',
        chapterId: 'ch-intro-02',
        courseId: INTRO,
        title: 'Welcome quiz',
        type: 'quiz',
        position: 1,
        content: null,
        metadata: { description: 'Three quick questions about how Aion works.' },
        completed: true,
      },
    ],
  },
  {
    id: 'ch-intro-03',
    courseId: INTRO,
    title: 'Try an assignment',
    position: 3,
    locked: false,
    lessons: [
      {
        id: 'l-intro-03-01',
        chapterId: 'ch-intro-03',
        courseId: INTRO,
        title: 'Your first assignment',
        type: 'assignment',
        position: 1,
        content: [
          'Write a short reflection (about 200 words) on your first week of learning.',
          '',
          '**Include:**',
          '',
          '- one thing that surprised you',
          '- one thing you want to learn next',
          '- how you plan to keep going',
        ].join('\n'),
        metadata: {
          assignmentSettings: {
            dueDate: '2026-11-01T23:59:00',
            gradingType: 'percentage',
            passingScore: 60,
            allowRetries: true,
            maxAttempts: 0,
          },
        },
        completed: true,
      },
    ],
  },
];

const jsChapters: Chapter[] = [
  {
    id: 'ch-js-01',
    courseId: JS,
    title: 'Getting started',
    position: 1,
    locked: false,
    lessons: [
      {
        id: 'l-js-01-01',
        chapterId: 'ch-js-01',
        courseId: JS,
        title: 'Hello, JavaScript',
        type: 'video',
        position: 1,
        // A YouTube link renders as a WebView embed (S12).
        videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        content: 'Your first look at JavaScript: what it is and where it runs.',
        metadata: { videoSettings: { sourceType: 'embed', controls: true } },
        completed: true,
        durationSeconds: 635,
      },
      {
        id: 'l-js-01-02',
        chapterId: 'ch-js-01',
        courseId: JS,
        title: 'Reference: Variables',
        type: 'document',
        position: 2,
        content: 'Keep this reference open while you do the exercises.',
        metadata: {
          documentSettings: {
            sourceType: 'link',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            allowDownload: true,
          },
        },
        completed: false,
      },
    ],
  },
  {
    id: 'ch-js-02',
    courseId: JS,
    title: 'Control flow',
    position: 2,
    locked: false,
    lessons: [
      {
        id: 'l-js-02-01',
        chapterId: 'ch-js-02',
        courseId: JS,
        title: 'If/else and switch',
        type: 'markdown',
        position: 1,
        content: [
          '## Making decisions',
          '',
          'Use `if` when there are one or two branches:',
          '',
          '```js',
          'if (score >= 70) {',
          "  console.info('Passed');",
          '} else {',
          "  console.info('Try again');",
          '}',
          '```',
          '',
          'Use `switch` when you compare one value against many cases.',
        ].join('\n'),
        metadata: { markdownSettings: { sourceType: 'direct' } },
        completed: false,
        durationSeconds: 420,
      },
      {
        id: 'l-js-02-02',
        chapterId: 'ch-js-02',
        courseId: JS,
        title: 'Loops',
        type: 'embed',
        position: 2,
        content: 'Read through the loop types, then try them in the console.',
        metadata: {
          embedSettings: { embedUrl: 'https://en.m.wikipedia.org/wiki/For_loop', height: 450 },
        },
        completed: false,
      },
      {
        id: 'l-js-02-03',
        chapterId: 'ch-js-02',
        courseId: JS,
        title: 'Further reading',
        type: 'resource',
        position: 3,
        content: 'The MDN guide covers everything in this chapter in more depth.',
        metadata: {
          resourceSettings: {
            sourceType: 'link',
            fileUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
            buttonLabel: 'Open the MDN guide',
          },
        },
        completed: false,
      },
      {
        id: 'l-js-02-04',
        chapterId: 'ch-js-02',
        courseId: JS,
        title: 'Control flow quiz',
        type: 'quiz',
        position: 4,
        content: null,
        metadata: { description: 'Check your understanding of if, switch and loops.' },
        completed: false,
      },
      {
        id: 'l-js-02-05',
        chapterId: 'ch-js-02',
        courseId: JS,
        title: 'Exercise: FizzBuzz',
        type: 'assignment',
        position: 5,
        content: [
          'Write a program that prints the numbers 1 to 100.',
          '',
          '- For multiples of three print `Fizz`.',
          '- For multiples of five print `Buzz`.',
          '- For multiples of both print `FizzBuzz`.',
          '',
          'Paste your code as your answer, or attach the `.js` file.',
        ].join('\n'),
        metadata: {
          assignmentSettings: {
            dueDate: null,
            gradingType: 'percentage',
            passingScore: 70,
            allowRetries: false,
            maxAttempts: 1,
          },
        },
        completed: false,
      },
    ],
  },
  {
    id: 'ch-js-03',
    courseId: JS,
    title: 'Bonus: advanced topics',
    position: 3,
    locked: true,
    lessons: [
      {
        id: 'l-js-03-01',
        chapterId: 'ch-js-03',
        courseId: JS,
        title: 'Closures',
        type: 'markdown',
        position: 1,
        content: null,
        metadata: { isLocked: true },
        completed: false,
      },
    ],
  },
  {
    id: 'ch-js-04',
    courseId: JS,
    title: 'Live session',
    position: 4,
    locked: false,
    lessons: [
      {
        id: 'l-js-04-01',
        chapterId: 'ch-js-04',
        courseId: JS,
        title: 'Live Q&A',
        type: 'live_session',
        position: 1,
        content: [
          '**Agenda**',
          '',
          '1. Your questions on control flow',
          '2. Live-coding FizzBuzz',
          '3. What comes next',
        ].join('\n'),
        metadata: {
          liveSettings: {
            startsAt: '2026-10-20T15:00:00Z',
            durationMinutes: 60,
            joinUrl: 'https://meet.example.com/aion-js-live',
            recordingUrl: null,
          },
        },
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
      title: courseId_ === INTRO ? 'Intro to Aion' : 'JavaScript Foundations',
      slug: courseId_ === INTRO ? 'intro-to-aion' : 'javascript-foundations',
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
