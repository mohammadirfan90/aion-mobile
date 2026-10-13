import type { Quiz } from '@/api/types';

export const quizzes: Quiz[] = [
  {
    id: 'q-intro-01',
    lessonId: 'l-intro-02-01',
    title: 'Welcome quiz',
    passingScore: 70,
    questions: [
      {
        id: 'q-intro-01-q1',
        type: 'single',
        prompt: 'What does LMS stand for?',
        options: [
          { id: 'a', text: 'Learning Management System' },
          { id: 'b', text: 'Local Mail Service' },
          { id: 'c', text: 'Long-term Memory Store' },
        ],
        points: 1,
      },
      {
        id: 'q-intro-01-q2',
        type: 'multiple',
        prompt: 'Which of these can you do in the app? (pick all)',
        options: [
          { id: 'a', text: 'Enroll in a course' },
          { id: 'b', text: 'Earn a certificate' },
          { id: 'c', text: 'Mint an NFT' },
        ],
        points: 2,
      },
      {
        id: 'q-intro-01-q3',
        type: 'truefalse',
        prompt: 'You need to verify your email to enroll in a paid course.',
        options: [
          { id: 'true', text: 'True' },
          { id: 'false', text: 'False' },
        ],
        points: 1,
      },
    ],
  },
];
