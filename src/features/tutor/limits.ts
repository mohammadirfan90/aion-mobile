/**
 * Server caps for `POST /ai/tutor-stream` and `POST /ai/history/message`
 * (API §13, INTEGRATION.md #16). Over-long fields give a 400, so the app
 * truncates before sending.
 */
import type { TutorStreamBody } from '@/api/types';

export const TUTOR_LIMITS = {
  message: 5_000,
  title: 500,
  lessonContent: 20_000,
  note: 2_000,
  notes: 50,
  historyItem: 5_000,
  historyItems: 20,
  savedMessage: 20_000,
} as const;

const cut = (s: string | undefined, max: number) => (s === undefined ? undefined : s.slice(0, max));

export function limitTutorBody(body: TutorStreamBody): TutorStreamBody {
  const c = body.context;
  return {
    ...body,
    message: body.message.slice(0, TUTOR_LIMITS.message),
    context: c && {
      ...c,
      courseTitle: cut(c.courseTitle, TUTOR_LIMITS.title),
      lessonTitle: cut(c.lessonTitle, TUTOR_LIMITS.title),
      lessonContent: c.lessonContent == null ? c.lessonContent : c.lessonContent.slice(0, TUTOR_LIMITS.lessonContent),
      userNotes: c.userNotes?.slice(0, TUTOR_LIMITS.notes).map((n) => n.slice(0, TUTOR_LIMITS.note)),
      chatHistory: c.chatHistory
        ?.slice(-TUTOR_LIMITS.historyItems)
        .map((m) => ({ role: m.role, content: m.content.slice(0, TUTOR_LIMITS.historyItem) })),
    },
  };
}
