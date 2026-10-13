import type { Ticket } from '@/api/types';

const now = '2026-10-08T10:00:00Z';

const sample = (id: string, subject: string, status: Ticket['status'], updated: string): Ticket => ({
  id,
  subject,
  status,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: updated,
  messages: [
    {
      id: `${id}-m1`,
      ticketId: id,
      authorId: '11111111-1111-1111-1111-111111111111',
      authorRole: 'student',
      body: 'I need help with this.',
      attachments: [],
      createdAt: '2026-10-01T10:00:00Z',
    },
    {
      id: `${id}-m2`,
      ticketId: id,
      authorId: '22222222-2222-2222-2222-222222222222',
      authorRole: 'admin',
      body: 'Looking into it now.',
      attachments: [],
      createdAt: updated,
    },
  ],
});

export const tickets: Ticket[] = [
  sample('t-001', 'Cannot open the JavaScript course', 'open', now),
  sample('t-002', 'Wrong certificate name on my profile', 'pending', now),
  sample('t-003', 'How do I download resources?', 'resolved', now),
  sample('t-004', 'Feature request: dark mode for the web app', 'closed', now),
];
