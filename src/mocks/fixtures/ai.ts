import type { AiHistory, AiMessage, AiSummary } from '@/api/types';

/**
 * AI fixtures (API §13): per-lesson summaries, the tutor chat history, and a
 * fake streamed reply. Lessons without a summary here return an
 * `unavailable-` summary, the same as a failed generation on the server.
 */

const now = '2026-10-08T10:00:00Z';
const CONVERSATION_ID = 'conv-001';

export const summaries: AiSummary[] = [
  {
    id: 'sum-intro-01-01',
    lessonId: 'l-intro-01-01',
    executiveSummary:
      'Aion is a learning platform built around courses, chapters and lessons. You enroll in a course, work through its lessons in order, check yourself with quizzes, and earn a certificate when you finish.',
    keyTakeaways: [
      'Courses are split into chapters, and chapters into lessons.',
      'Free and invite-code courses enroll in the app; paid courses are bought on the web.',
      'Finishing every lesson unlocks the certificate.',
      'The AI tutor can explain any lesson in simpler words.',
    ],
    concepts: [
      { term: 'Course', definition: 'The top-level product you enroll in.', timestampSeconds: 12 },
      { term: 'Chapter', definition: 'An ordered group of lessons.', timestampSeconds: 64 },
      { term: 'Lesson', definition: 'One unit of content: a video, reading or quiz.', timestampSeconds: 121 },
      { term: 'Certificate', definition: 'Proof you completed the course.' },
    ],
    flashcards: [
      { id: 'f1', front: 'What is a chapter?', back: 'An ordered group of lessons inside a course.' },
      {
        id: 'f2',
        front: 'Where do you buy a paid course?',
        back: 'On the web. The app never takes payments.',
        hint: 'Think about app store rules.',
      },
      { id: 'f3', front: 'How do you earn a certificate?', back: 'Complete every lesson in the course.' },
      { id: 'f4', front: 'What does the AI tutor do?', back: 'Answers questions about your lessons.' },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'sum-js-02-01',
    lessonId: 'l-js-02-01',
    executiveSummary:
      'Programs make decisions with `if`/`else` for one or two branches and `switch` for comparing one value against many cases.',
    keyTakeaways: [
      '`if` runs a block when its condition is true.',
      '`else` handles everything else.',
      '`switch` compares one value against many `case`s.',
    ],
    concepts: [
      { term: 'Condition', definition: 'An expression that is true or false.' },
      { term: 'Branch', definition: 'One of the paths a program can take.' },
    ],
    flashcards: [
      { id: 'f1', front: 'When should you use switch?', back: 'When comparing one value against many cases.' },
      { id: 'f2', front: 'What does else do?', back: 'Runs when the if condition is false.' },
    ],
    createdAt: now,
    updatedAt: now,
  },
];

export function getMockSummary(lessonId: string): AiSummary {
  const found = summaries.find((s) => s.lessonId === lessonId);
  if (found) return JSON.parse(JSON.stringify(found)) as AiSummary;
  return {
    id: `unavailable-${lessonId}`,
    lessonId,
    executiveSummary: '',
    keyTakeaways: [],
    concepts: [],
    flashcards: [],
    createdAt: now,
    updatedAt: now,
  };
}

const history: AiMessage[] = [
  {
    id: 'tm-1',
    conversationId: CONVERSATION_ID,
    role: 'user',
    content: 'What can I learn here?',
    createdAt: now,
  },
  {
    id: 'tm-2',
    conversationId: CONVERSATION_ID,
    role: 'assistant',
    content:
      'Aion is a learning platform. You can:\n\n- browse and enroll in **courses**\n- watch lessons and take **quizzes**\n- earn a **certificate** when you finish',
    createdAt: now,
  },
];

export function getMockHistory(): AiHistory {
  return {
    conversation: history.length
      ? { id: CONVERSATION_ID, title: 'Getting started', createdAt: now, updatedAt: now }
      : null,
    messages: history.map((m) => ({ ...m })),
  };
}

export function addMockHistoryMessage(role: 'user' | 'assistant', content: string): AiMessage {
  const msg: AiMessage = {
    id: `tm-${Date.now().toString(36)}-${history.length}`,
    conversationId: CONVERSATION_ID,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
  history.push(msg);
  return { ...msg };
}

export function clearMockHistory(): { cleared: true } {
  history.splice(0, history.length);
  return { cleared: true };
}

/** The fake streamed reply: markdown, split into small chunks. */
export function fakeTutorReply(prompt: string, lessonTitle?: string): string[] {
  const topic = lessonTitle ? `**${lessonTitle}**` : 'this';
  const reply = [
    `Here's a simple way to think about ${topic}:`,
    '',
    `- **The idea:** ${prompt.slice(0, 80).trim()} comes down to a few small steps.`,
    '- **Why it matters:** each step builds on the one before.',
    '- **Try it:** run a tiny example yourself.',
    '',
    '```js',
    "const steps = ['read', 'try', 'check'];",
    'steps.forEach((s) => console.log(s));',
    '```',
    '',
    'Want me to quiz you on it?',
  ].join('\n');
  return reply.match(/[\s\S]{1,12}/g) ?? [reply];
}
