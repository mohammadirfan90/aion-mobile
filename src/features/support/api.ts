/**
 * Support feature — data layer for S22–S24 (API §11).
 *
 *   - `GET /support/tickets?status=&priority=&search=&page=&limit=` — the
 *     student's tickets, newest activity first.
 *   - `GET /support/tickets/{id}` — the ticket and its messages, oldest first.
 *   - `POST /support/tickets` — returns a bare ticket; the description becomes
 *     the first message.
 *   - `POST /support/tickets/{id}/messages` — a reply.
 *   - `PATCH /support/tickets/{id}/status` — students may set only `resolved`
 *     or `closed`.
 *   - The course picker reads the student's courses from
 *     `GET /users/me/learning-summary`, and a linked lesson's title from
 *     `GET /lessons/{id}` (shared cache keys with S09 and S12).
 */
import { request } from '@/api/client';
import type {
  CreateSupportTicketBody,
  LearningSummaryData,
  Lesson,
  MyLearningRow,
  SupportTicket,
  SupportTicketMessage,
  SupportTicketsPage,
  SupportTicketsQuery,
  SupportTicketStatus,
  SupportTicketThread,
  UUID,
} from '@/api/types';
import { env } from '@/lib/env';
import { mockDelay } from '@/mocks/delay';
import { getLesson } from '@/mocks/fixtures/curriculum';
import { getMyLearning } from '@/mocks/fixtures/enrollments';
import {
  addMockTicketMessage,
  createMockTicket,
  getMockTicketThread,
  listMockTickets,
  setMockTicketStatus,
} from '@/mocks/fixtures/tickets';

function codedError(code: string, message: string): Error {
  const err = new Error(message);
  (err as { code?: string }).code = code;
  return err;
}

export async function fetchTickets(query: SupportTicketsQuery): Promise<SupportTicketsPage> {
  if (env.useMocks) return mockDelay(listMockTickets(query), 350);
  return request<SupportTicketsPage>('/support/tickets', {
    query: {
      status: query.status,
      priority: query.priority,
      search: query.search || undefined,
      page: query.page,
      limit: query.limit,
    },
  });
}

export async function fetchTicketThread(id: UUID): Promise<SupportTicketThread> {
  if (env.useMocks) {
    const thread = getMockTicketThread(id);
    if (!thread) throw codedError('TICKET_NOT_FOUND', 'Ticket not found');
    return mockDelay(thread, 300);
  }
  return request<SupportTicketThread>(`/support/tickets/${id}`);
}

export async function createTicket(body: CreateSupportTicketBody): Promise<SupportTicket> {
  if (env.useMocks) return mockDelay(createMockTicket(body), 500);
  return request<SupportTicket>('/support/tickets', { method: 'POST', body });
}

export async function sendTicketMessage(id: UUID, message: string): Promise<SupportTicketMessage> {
  if (env.useMocks) {
    if (/test error/i.test(message)) throw codedError('INTERNAL_ERROR', 'Failed to send');
    const msg = addMockTicketMessage(id, message);
    if (!msg) throw codedError('TICKET_NOT_FOUND', 'Ticket not found');
    return mockDelay(msg, 400);
  }
  return request<SupportTicketMessage>(`/support/tickets/${id}/messages`, {
    method: 'POST',
    body: { message },
  });
}

export async function updateTicketStatus(
  id: UUID,
  status: Extract<SupportTicketStatus, 'resolved' | 'closed'>,
): Promise<SupportTicket> {
  if (env.useMocks) {
    const result = setMockTicketStatus(id, status);
    if (result === 'FORBIDDEN') throw codedError('FORBIDDEN', 'Not allowed');
    if (!result) throw codedError('TICKET_NOT_FOUND', 'Ticket not found');
    return mockDelay(result, 350);
  }
  return request<SupportTicket>(`/support/tickets/${id}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

/** The student's courses for S24's picker (`learning-summary.courses`). */
export async function fetchMyCourses(): Promise<MyLearningRow[]> {
  if (env.useMocks) return mockDelay(getMyLearning());
  const summary = await request<LearningSummaryData>('/users/me/learning-summary');
  return summary.courses;
}

export async function fetchLesson(lessonId: UUID): Promise<Lesson> {
  if (env.useMocks) {
    const lesson = getLesson(lessonId);
    if (!lesson) throw codedError('LESSON_NOT_FOUND', 'Lesson not found');
    return mockDelay({ ...lesson });
  }
  return request<Lesson>(`/lessons/${lessonId}`);
}
