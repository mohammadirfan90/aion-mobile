/**
 * Support hooks (S22–S24).
 *
 * - `useSupportTickets` pages through `GET /support/tickets` for one status
 *   filter and search (key `[...qk.tickets.list(), query]`).
 * - `useSendTicketMessage` is optimistic: the reply shows at the bottom of the
 *   thread at once and is swapped for the server row when it lands, or
 *   removed again on failure.
 * - Every write refreshes the ticket lists, whose order and "last update"
 *   depend on the latest activity.
 */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/api/query-keys';
import type {
  CreateSupportTicketBody,
  SupportTicketMessage,
  SupportTicketStatus,
  SupportTicketThread,
  UUID,
} from '@/api/types';

import {
  createTicket,
  fetchLesson,
  fetchMyCourses,
  fetchTickets,
  fetchTicketThread,
  sendTicketMessage,
  updateTicketStatus,
} from './api';

const PAGE_SIZE = 20;

export type TicketFilter = SupportTicketStatus | 'all';

export function useSupportTickets(status: TicketFilter, search: string) {
  const query = { status, search: search.trim() };
  return useInfiniteQuery({
    queryKey: [...qk.tickets.list(), query],
    queryFn: ({ pageParam }) => fetchTickets({ ...query, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.reduce((n, p) => n + p.tickets.length, 0) < last.total ? pages.length + 1 : undefined,
  });
}

export function useTicketThread(id: UUID | null) {
  return useQuery({
    queryKey: qk.tickets.detail(id ?? 'pending'),
    queryFn: () => fetchTicketThread(id as UUID),
    enabled: !!id,
  });
}

export function useSendTicketMessage(id: UUID) {
  const qc = useQueryClient();
  const key = qk.tickets.detail(id);
  return useMutation({
    mutationFn: (message: string) => sendTicketMessage(id, message),
    onMutate: async (message) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<SupportTicketThread>(key);
      const me = prev?.ticket.studentId ?? '';
      const temp: SupportTicketMessage = {
        id: `temp-${Date.now()}`,
        ticketId: id,
        senderId: me,
        senderRole: 'student',
        message,
        createdAt: new Date().toISOString(),
        sender: {
          id: me,
          name: 'You',
          avatarUrl: null,
          role: 'student',
        },
      };
      qc.setQueryData<SupportTicketThread>(key, (old) =>
        old ? { ...old, messages: [...old.messages, temp] } : old,
      );
      return { tempId: temp.id };
    },
    onSuccess: (saved, _message, ctx) => {
      qc.setQueryData<SupportTicketThread>(key, (old) =>
        old
          ? {
              ticket: {
                ...old.ticket,
                lastReplyAt: saved.createdAt,
                lastReplySenderRole: saved.senderRole,
                updatedAt: saved.createdAt,
              },
              messages: old.messages.map((m) => (m.id === ctx?.tempId ? saved : m)),
            }
          : old,
      );
      void qc.invalidateQueries({ queryKey: qk.tickets.list() });
    },
    onError: (_err, _message, ctx) => {
      qc.setQueryData<SupportTicketThread>(key, (old) =>
        old ? { ...old, messages: old.messages.filter((m) => m.id !== ctx?.tempId) } : old,
      );
    },
  });
}

export function useUpdateTicketStatus(id: UUID) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: Extract<SupportTicketStatus, 'resolved' | 'closed'>) =>
      updateTicketStatus(id, status),
    onSuccess: (ticket) => {
      qc.setQueryData<SupportTicketThread>(qk.tickets.detail(id), (old) =>
        old ? { ...old, ticket: { ...old.ticket, ...ticket } } : old,
      );
      void qc.invalidateQueries({ queryKey: qk.tickets.list() });
    },
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSupportTicketBody) => createTicket(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.tickets.list() });
    },
  });
}

/** The student's courses, for S24's course picker. */
export function useMyCourses() {
  return useQuery({
    queryKey: [...qk.me.learningSummary(), 'courses'],
    queryFn: fetchMyCourses,
    staleTime: 60_000,
  });
}

/** A linked lesson's title (S24, when opened from a lesson). */
export function useTicketLesson(lessonId: UUID | null) {
  return useQuery({
    queryKey: qk.lessons.detail(lessonId ?? 'pending'),
    queryFn: () => fetchLesson(lessonId as UUID),
    enabled: !!lessonId,
    staleTime: 60_000,
  });
}
