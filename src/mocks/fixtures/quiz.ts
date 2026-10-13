import type {
  LessonQuiz,
  QuizAttempt,
  QuizInfo,
  QuizSubmitBody,
  QuizSubmitResult,
} from '@/api/types';

/**
 * Quizzes (API §6). The answer key lives next to each quiz but is never part
 * of `getMockQuiz()`'s result: like the real API, correct answers and
 * explanations only come back after a submit.
 */

interface QuizFixture {
  quiz: QuizInfo;
  answers: Record<string, { correct: string[]; explanation?: string }>;
  submissions: QuizAttempt[]; // newest first
}

const fixtures: QuizFixture[] = [
  {
    quiz: {
      id: 'q-intro-01',
      lessonId: 'l-intro-02-01',
      title: 'Welcome quiz',
      description: 'Three quick questions about how Aion works.',
      passingScorePercent: 70,
      maxAttempts: 3,
      shuffleQuestions: false,
      questions: [
        {
          id: 'q-intro-01-q1',
          type: 'single',
          prompt: 'What does LMS stand for?',
          points: 1,
          options: [
            { id: 'a', text: 'Learning Management System' },
            { id: 'b', text: 'Local Mail Service' },
            { id: 'c', text: 'Long-term Memory Store' },
          ],
        },
        {
          id: 'q-intro-01-q2',
          type: 'multiple',
          prompt: 'Which of these can you do in the app?',
          points: 2,
          options: [
            { id: 'a', text: 'Enroll in a free course' },
            { id: 'b', text: 'Earn a certificate' },
            { id: 'c', text: 'Buy a paid course with in-app payments' },
          ],
        },
        {
          id: 'q-intro-01-q3',
          type: 'boolean',
          prompt: 'Passing a quiz marks its lesson complete.',
          points: 1,
          options: [
            { id: 'true', text: 'True' },
            { id: 'false', text: 'False' },
          ],
        },
      ],
    },
    answers: {
      'q-intro-01-q1': {
        correct: ['a'],
        explanation: 'Aion is a Learning Management System: courses, lessons and progress.',
      },
      'q-intro-01-q2': {
        correct: ['a', 'b'],
        explanation: 'Paid courses are bought on the web; the app never takes payments.',
      },
      'q-intro-01-q3': {
        correct: ['true'],
        explanation: 'A pass marks the lesson complete on the server.',
      },
    },
    submissions: [
      {
        id: 'qs-001',
        quizId: 'q-intro-01',
        lessonId: 'l-intro-02-01',
        scorePercent: 75,
        passed: true,
        userAnswers: {
          'q-intro-01-q1': ['a'],
          'q-intro-01-q2': ['a'],
          'q-intro-01-q3': ['true'],
        },
        submittedAt: '2026-09-25T10:00:00Z',
      },
    ],
  },
  {
    quiz: {
      id: 'q-js-01',
      lessonId: 'l-js-02-04',
      title: 'Control flow quiz',
      description: 'Check your understanding of if, switch and loops.',
      passingScorePercent: 60,
      maxAttempts: 0, // unlimited
      shuffleQuestions: true,
      questions: [
        {
          id: 'q-js-01-q1',
          type: 'single',
          prompt: 'Which statement compares one value against many cases?',
          points: 1,
          options: [
            { id: 'a', text: 'if' },
            { id: 'b', text: 'switch' },
            { id: 'c', text: 'for' },
          ],
        },
        {
          id: 'q-js-01-q2',
          type: 'multiple',
          prompt: 'Which of these are loops in JavaScript?',
          points: 2,
          options: [
            { id: 'a', text: 'for' },
            { id: 'b', text: 'while' },
            { id: 'c', text: 'repeat' },
            { id: 'd', text: 'for...of' },
          ],
        },
        {
          id: 'q-js-01-q3',
          type: 'boolean',
          prompt: '`break` stops a loop immediately.',
          points: 1,
          options: [
            { id: 'true', text: 'True' },
            { id: 'false', text: 'False' },
          ],
        },
        {
          id: 'q-js-01-q4',
          type: 'single',
          prompt:
            'What does this print?  for (let i = 0; i < 3; i++) { if (i === 1) continue; console.info(i); }',
          points: 1,
          options: [
            { id: 'a', text: '0 1 2' },
            { id: 'b', text: '0 2' },
            { id: 'c', text: '1 2' },
          ],
        },
      ],
    },
    answers: {
      'q-js-01-q1': { correct: ['b'], explanation: '`switch` checks one value against each `case`.' },
      'q-js-01-q2': {
        correct: ['a', 'b', 'd'],
        explanation: 'JavaScript has no `repeat` loop; `do...while` is the closest.',
      },
      'q-js-01-q3': { correct: ['true'], explanation: '`continue` skips one turn; `break` exits.' },
      'q-js-01-q4': { correct: ['b'], explanation: '`continue` skips the turn where i is 1.' },
    },
    submissions: [],
  },
];

function find(lessonId: string) {
  return fixtures.find((f) => f.quiz.lessonId === lessonId) ?? null;
}

/** `GET /quizzes/lesson/{lessonId}` */
export function getMockQuiz(lessonId: string): LessonQuiz {
  const f = find(lessonId);
  if (!f) return { quiz: null, submissions: [], latestSubmission: null };
  return {
    quiz: JSON.parse(JSON.stringify(f.quiz)) as QuizInfo,
    submissions: f.submissions.map((s) => ({ ...s })),
    latestSubmission: f.submissions[0] ? { ...f.submissions[0] } : null,
  };
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/** `POST /quizzes/lesson/{lessonId}/submit`, graded by points like the server. */
export function submitMockQuiz(lessonId: string, body: QuizSubmitBody): QuizSubmitResult {
  const f = find(lessonId);
  if (!f) {
    const err = new Error('Quiz not found');
    (err as { code?: string }).code = 'QUIZ_NOT_FOUND';
    throw err;
  }
  const { quiz } = f;
  if (quiz.maxAttempts > 0 && f.submissions.length >= quiz.maxAttempts) {
    const err = new Error('No attempts left');
    (err as { code?: string }).code = 'MAX_ATTEMPTS_EXCEEDED';
    throw err;
  }

  let earned = 0;
  let total = 0;
  let correctCount = 0;
  const feedback = quiz.questions.map((q) => {
    const key = f.answers[q.id];
    const chosen = body.userAnswers[q.id] ?? [];
    const isCorrect = sameSet(chosen, key.correct);
    total += q.points;
    if (isCorrect) {
      earned += q.points;
      correctCount += 1;
    }
    return {
      questionId: q.id,
      prompt: q.prompt,
      isCorrect,
      explanation: key.explanation,
      correctOptionIds: [...key.correct],
    };
  });

  const scorePercent = total ? Math.round((earned / total) * 100) : 0;
  const passed = scorePercent >= quiz.passingScorePercent;
  const submission: QuizAttempt = {
    id: `qs-${Date.now().toString(36)}`,
    quizId: quiz.id,
    lessonId,
    scorePercent,
    passed,
    userAnswers: body.userAnswers,
    submittedAt: new Date().toISOString(),
  };
  f.submissions.unshift(submission);

  return {
    submission: { ...submission },
    passed,
    scorePercent,
    totalQuestions: quiz.questions.length,
    correctCount,
    feedback,
  };
}
