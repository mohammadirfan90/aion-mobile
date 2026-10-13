import type { Summary, TutorChat, TutorMessage } from '@/api/types';

const now = '2026-10-08T10:00:00Z';

const intro: TutorMessage[] = [
  {
    id: 'tm-1',
    role: 'user',
    content: 'What can I learn here?',
    createdAt: now,
  },
  {
    id: 'tm-2',
    role: 'assistant',
    content: 'Aion is a learning platform. You can browse courses, watch lessons, take quizzes, and earn certificates.',
    createdAt: now,
  },
];

export const tutorChats: TutorChat[] = [
  {
    id: 'tc-001',
    title: 'Getting started',
    messages: intro,
    createdAt: now,
    updatedAt: now,
  },
];

export const summaries: Summary[] = [
  {
    lessonId: 'l-intro-01-01',
    content:
      '• Aion is a learning platform with courses, lessons, quizzes and certificates.\n• You can enroll in free, paid, or invite-only courses.\n• Earn a certificate by completing every lesson (or reaching the required progress).',
    generatedAt: now,
  },
];

/** The fake streaming reply used by mock AI tutor responses. */
export function* streamFakeReply(prompt: string): Generator<string> {
  const reply = `Here's what I know about "${prompt.slice(0, 80)}":\n• It's a question I can help with.\n• Let me know if you want me to go deeper.`;
  for (const word of reply.split(/(\s+)/)) {
    yield word;
  }
}
