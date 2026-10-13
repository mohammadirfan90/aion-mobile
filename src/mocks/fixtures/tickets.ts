/**
 * Support ticket fixtures (API §11) for S22–S24, with in-memory helpers that
 * mirror the server: newest activity first, students see only their own
 * tickets, the description becomes the first message, a reply updates
 * `lastReplyAt` / `lastReplySenderRole`, and students may only set
 * `resolved` or `closed`.
 */
import type {
  CreateSupportTicketBody,
  SupportTicket,
  SupportTicketMessage,
  SupportTicketsPage,
  SupportTicketsQuery,
  SupportTicketStatus,
  SupportTicketThread,
  SupportTicketWithRelations,
  UUID,
} from '@/api/types';

import { courses } from './courses';
import { getLesson } from './curriculum';
import { currentUser } from './users';

const STUDENT_ID = '11111111-1111-1111-1111-111111111111';
const INSTRUCTOR_ID = '22222222-2222-2222-2222-222222222222';
const JS_COURSE = 'c0000002-0000-0000-0000-000000000002';
const INTRO_COURSE = 'c0000001-0000-0000-0000-000000000001';

const student = {
  id: STUDENT_ID,
  name: currentUser.fullName || 'Sara Student',
  avatarUrl: null,
  role: 'student',
};
const instructor = { id: INSTRUCTOR_ID, name: 'Ivy Instructor', avatarUrl: null, role: 'instructor' };

type Seed = Pick<
  SupportTicket,
  'id' | 'ticketNumber' | 'subject' | 'status' | 'priority' | 'courseId' | 'lessonId' | 'createdAt'
> & { messages: { from: 'student' | 'instructor'; text: string; at: string }[] };

const seeds: Seed[] = [
  {
    id: 't0000005-0000-0000-0000-000000000005',
    ticketNumber: 1048,
    subject: 'The video in "Hello, JavaScript" keeps buffering on mobile data',
    status: 'in_progress',
    priority: 'high',
    courseId: JS_COURSE,
    lessonId: 'l-js-01-01',
    createdAt: '2026-10-13T09:14:00Z',
    messages: [
      {
        from: 'student',
        text: 'Hi, the video in "Hello, JavaScript" keeps buffering whenever I stream on mobile data. It loads fine on Wi-Fi.',
        at: '2026-10-13T09:14:00Z',
      },
      {
        from: 'instructor',
        text: 'Thanks for reaching out! We pushed a fix for the cellular stream. Could you restart playback and tell us if it still happens?',
        at: '2026-10-13T09:45:00Z',
      },
      {
        from: 'student',
        text: 'Restarted it and it plays now. I’ll keep an eye on the next lessons too.',
        at: '2026-10-13T10:02:00Z',
      },
      {
        from: 'instructor',
        text: 'Great to hear. We’ll keep this open for a day in case it comes back.',
        at: '2026-10-14T08:30:00Z',
      },
    ],
  },
  {
    id: 't0000004-0000-0000-0000-000000000004',
    ticketNumber: 1042,
    subject: 'I can’t submit the FizzBuzz exercise',
    status: 'open',
    priority: 'urgent',
    courseId: JS_COURSE,
    lessonId: 'l-js-02-05',
    createdAt: '2026-10-12T15:20:00Z',
    messages: [
      {
        from: 'student',
        text: 'When I press Submit on the FizzBuzz exercise nothing happens. The deadline is tomorrow.',
        at: '2026-10-12T15:20:00Z',
      },
    ],
  },
  {
    id: 't0000003-0000-0000-0000-000000000003',
    ticketNumber: 984,
    subject: 'The welcome quiz marked a right answer as wrong',
    status: 'resolved',
    priority: 'normal',
    courseId: INTRO_COURSE,
    lessonId: 'l-intro-02-01',
    createdAt: '2026-10-05T11:00:00Z',
    messages: [
      {
        from: 'student',
        text: 'Question 2 of the welcome quiz says my answer is wrong, but it matches the lesson.',
        at: '2026-10-05T11:00:00Z',
      },
      {
        from: 'instructor',
        text: 'You’re right, the answer key had a typo. It’s fixed and your attempt has been regraded.',
        at: '2026-10-06T09:10:00Z',
      },
      { from: 'student', text: 'Thank you!', at: '2026-10-06T09:30:00Z' },
    ],
  },
  {
    id: 't0000002-0000-0000-0000-000000000002',
    ticketNumber: 935,
    subject: 'How do I change the email on my account?',
    status: 'open',
    priority: 'low',
    courseId: null,
    lessonId: null,
    createdAt: '2026-10-02T18:45:00Z',
    messages: [
      {
        from: 'student',
        text: 'I’d like to use my university email instead of my personal one. Where can I change it?',
        at: '2026-10-02T18:45:00Z',
      },
      {
        from: 'instructor',
        text: 'Hi! Email changes aren’t in the app yet. Reply with the new address and we’ll update it for you.',
        at: '2026-10-03T10:00:00Z',
      },
    ],
  },
  {
    id: 't0000001-0000-0000-0000-000000000001',
    ticketNumber: 812,
    subject: 'Certificate shows the wrong name',
    status: 'closed',
    priority: 'normal',
    courseId: INTRO_COURSE,
    lessonId: null,
    createdAt: '2026-09-24T08:00:00Z',
    messages: [
      {
        from: 'student',
        text: 'My Intro to Aion certificate shows my username instead of my full name.',
        at: '2026-09-24T08:00:00Z',
      },
      {
        from: 'instructor',
        text: 'Certificates use the name on your profile. Update it in Edit profile and the certificate will follow.',
        at: '2026-09-24T12:30:00Z',
      },
      { from: 'student', text: 'Done, it shows the right name now.', at: '2026-09-28T09:00:00Z' },
    ],
  },
];

const tickets: SupportTicket[] = [];
const messages: SupportTicketMessage[] = [];

function makeMessage(
  ticketId: UUID,
  from: 'student' | 'instructor',
  text: string,
  at: string,
  id: string,
): SupportTicketMessage {
  const sender = from === 'student' ? student : instructor;
  return {
    id,
    ticketId,
    senderId: sender.id,
    senderRole: from,
    message: text,
    createdAt: at,
    sender: { ...sender },
  };
}

for (const seed of seeds) {
  const last = seed.messages[seed.messages.length - 1];
  tickets.push({
    id: seed.id,
    ticketNumber: seed.ticketNumber,
    studentId: STUDENT_ID,
    courseId: seed.courseId,
    chapterId: null,
    lessonId: seed.lessonId,
    subject: seed.subject,
    status: seed.status,
    priority: seed.priority,
    timestampSeconds: null,
    // The opening message is the description, not a reply.
    lastReplyAt: seed.messages.length > 1 ? last.at : null,
    lastReplySenderRole: seed.messages.length > 1 ? last.from : null,
    createdAt: seed.createdAt,
    updatedAt: last.at,
  });
  seed.messages.forEach((m, i) =>
    messages.push(makeMessage(seed.id, m.from, m.text, m.at, `${seed.id.slice(0, 8)}-m${i + 1}`)),
  );
}

let seq = 0;
const nextId = (prefix: string) => `${prefix}${Date.now().toString(16)}-${(++seq).toString(16)}`;

function withRelations(t: SupportTicket): SupportTicketWithRelations {
  const course = t.courseId ? courses.find((c) => c.id === t.courseId) : undefined;
  const lesson = t.lessonId ? getLesson(t.lessonId) : null;
  return {
    ...t,
    course: course ? { id: course.id, title: course.title, slug: course.slug } : null,
    lesson: lesson ? { id: lesson.id, title: lesson.title, type: lesson.type } : null,
  };
}

const activity = (t: SupportTicket) =>
  Math.max(new Date(t.updatedAt).getTime(), new Date(t.lastReplyAt ?? 0).getTime());

/** `GET /support/tickets`: the student's own tickets, newest activity first. */
export function listMockTickets(query: SupportTicketsQuery = {}): SupportTicketsPage {
  const search = query.search?.trim().toLowerCase().replace(/^#/, '') ?? '';
  const filtered = tickets
    .filter((t) => t.studentId === currentUser.id)
    .filter((t) => !query.status || query.status === 'all' || t.status === query.status)
    .filter((t) => !query.priority || query.priority === 'all' || t.priority === query.priority)
    .filter(
      (t) =>
        !search ||
        t.subject.toLowerCase().includes(search) ||
        String(t.ticketNumber).includes(search),
    )
    .sort((a, b) => activity(b) - activity(a));
  const limit = Math.max(1, query.limit ?? 20);
  const page = Math.max(1, query.page ?? 1);
  return {
    tickets: filtered.slice((page - 1) * limit, page * limit).map(withRelations),
    total: filtered.length,
  };
}

/** `GET /support/tickets/{id}`: null when missing or not the student's. */
export function getMockTicketThread(id: UUID): SupportTicketThread | null {
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket || ticket.studentId !== currentUser.id) return null;
  return {
    ticket: withRelations(ticket),
    messages: messages
      .filter((m) => m.ticketId === id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((m) => ({ ...m, sender: { ...m.sender } })),
  };
}

/** `POST /support/tickets`: returns the bare ticket; the description is the first message. */
export function createMockTicket(body: CreateSupportTicketBody): SupportTicket {
  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    id: nextId('t-'),
    ticketNumber: Math.max(0, ...tickets.map((t) => t.ticketNumber)) + 1,
    studentId: currentUser.id,
    courseId: body.courseId ?? null,
    chapterId: body.chapterId ?? null,
    lessonId: body.lessonId ?? null,
    subject: body.subject.trim(),
    status: 'open',
    priority: body.priority ?? 'normal',
    timestampSeconds: body.timestampSeconds ?? null,
    lastReplyAt: null,
    lastReplySenderRole: null,
    createdAt: now,
    updatedAt: now,
  };
  tickets.push(ticket);
  messages.push(makeMessage(ticket.id, 'student', body.description.trim(), now, nextId('m-')));
  return { ...ticket };
}

/** `POST /support/tickets/{id}/messages`: null when the ticket is missing. */
export function addMockTicketMessage(id: UUID, text: string): SupportTicketMessage | null {
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket || ticket.studentId !== currentUser.id) return null;
  const now = new Date().toISOString();
  const msg = makeMessage(id, 'student', text.trim(), now, nextId('m-'));
  messages.push(msg);
  ticket.lastReplyAt = now;
  ticket.lastReplySenderRole = 'student';
  ticket.updatedAt = now;
  return { ...msg, sender: { ...msg.sender } };
}

/**
 * `PATCH /support/tickets/{id}/status`. Students may only set `resolved` or
 * `closed`; returns `'FORBIDDEN'` otherwise and null when the ticket is missing.
 */
export function setMockTicketStatus(
  id: UUID,
  status: SupportTicketStatus,
): SupportTicket | 'FORBIDDEN' | null {
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket || ticket.studentId !== currentUser.id) return null;
  if (status !== 'resolved' && status !== 'closed') return 'FORBIDDEN';
  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  return { ...ticket };
}
