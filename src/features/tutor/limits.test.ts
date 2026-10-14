import { describe, expect, it } from '@jest/globals';

import { limitTutorBody, TUTOR_LIMITS } from './limits';

describe('limitTutorBody (INTEGRATION.md #16)', () => {
  it('truncates every capped field', () => {
    const long = (n: number) => 'x'.repeat(n + 10);
    const body = limitTutorBody({
      message: long(TUTOR_LIMITS.message),
      context: {
        courseTitle: long(TUTOR_LIMITS.title),
        lessonTitle: long(TUTOR_LIMITS.title),
        lessonContent: long(TUTOR_LIMITS.lessonContent),
        userNotes: Array.from({ length: 60 }, () => long(TUTOR_LIMITS.note)),
        chatHistory: Array.from({ length: 25 }, (_, i) => ({
          role: i % 2 ? ('assistant' as const) : ('user' as const),
          content: long(TUTOR_LIMITS.historyItem),
        })),
      },
    });
    expect(body.message).toHaveLength(TUTOR_LIMITS.message);
    expect(body.context?.lessonTitle).toHaveLength(TUTOR_LIMITS.title);
    expect(body.context?.lessonContent).toHaveLength(TUTOR_LIMITS.lessonContent);
    expect(body.context?.userNotes).toHaveLength(TUTOR_LIMITS.notes);
    expect(body.context?.userNotes?.[0]).toHaveLength(TUTOR_LIMITS.note);
    expect(body.context?.chatHistory).toHaveLength(TUTOR_LIMITS.historyItems);
    expect(body.context?.chatHistory?.[0].content).toHaveLength(TUTOR_LIMITS.historyItem);
  });

  it('keeps a body without context as is', () => {
    expect(limitTutorBody({ message: 'hi', courseId: null })).toEqual({
      message: 'hi',
      courseId: null,
      context: undefined,
    });
  });
});
