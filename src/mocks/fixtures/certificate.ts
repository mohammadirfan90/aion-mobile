import type { StudentCertificate, VerifiedCertificate } from '@/api/types';

import { courses } from './courses';
import { getCurriculum } from './curriculum';
import { enrollments } from './enrollments';
import { getCourseProgressRows } from './progress';
import { currentUser } from './users';

/**
 * Mock certificates (API §14). A certificate exists for a course once every
 * lesson is completed in the shared in-memory progress store, so finishing
 * the last lesson in S12 "earns" it, just like the real server.
 *
 * IDs are stable per course so the QR on S28 keeps resolving on S29.
 */

const ISSUER = 'Aion Academy';
const CERTIFICATE_TITLE = 'Certificate of Completion';

/** Hand-picked IDs for the seeded courses; anything else gets a hashed one. */
const KNOWN_IDS: Record<string, string> = {
  'c0000001-0000-0000-0000-000000000001': 'CERT-AION-INTRO-2026A1B2',
  'c0000002-0000-0000-0000-000000000002': 'CERT-AION-JSF-2026C3D4',
};

/** Seeded mock scores (`score` is optional in the verify response). */
const SCORES: Record<string, string> = {
  'c0000001-0000-0000-0000-000000000001': '92%',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function codedError(code: string, message: string): Error {
  const err = new Error(message);
  (err as { code?: string }).code = code;
  return err;
}

/** "October 13, 2026" — the server sends the date already formatted. */
function formatIssueDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function hash8(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(8, '0').slice(-8);
}

function certificateIdFor(courseId: string): string {
  return KNOWN_IDS[courseId] ?? `CERT-AION-${hash8(courseId)}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sample server content: the full certificate as a self-contained HTML
 * document (inline CSS, no external assets). Colours are neutral greys on
 * white, like a printed certificate.
 */
function certificateHtml(c: Omit<StudentCertificate, 'html'>): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(c.certificateTitle)} · ${escapeHtml(c.courseTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 16px; background: #f4f4f4; color: #171717;
         font-family: Georgia, 'Times New Roman', serif; }
  .sheet { max-width: 720px; margin: 0 auto; background: #ffffff; padding: 12px;
           border: 1px solid #d4d4d4; }
  .frame { border: 2px solid #171717; padding: 40px 24px; text-align: center; }
  .kicker { font-family: Helvetica, Arial, sans-serif; letter-spacing: 0.3em; font-size: 12px;
            text-transform: uppercase; color: #525252; margin: 0 0 24px; }
  h1 { font-size: 30px; margin: 0 0 32px; line-height: 1.2; }
  .awarded { font-family: Helvetica, Arial, sans-serif; font-size: 14px; color: #525252; margin: 0; }
  .name { font-size: 34px; font-style: italic; margin: 8px 0 32px; }
  hr { width: 80px; border: 0; border-top: 1px solid #a3a3a3; margin: 0 auto 32px; }
  .meta { display: flex; justify-content: space-between; gap: 16px; text-align: left;
          font-family: Helvetica, Arial, sans-serif; font-size: 14px; }
  .meta .right { text-align: right; }
  .label { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #737373; }
  .id { margin-top: 32px; font-family: Menlo, Consolas, monospace; font-size: 12px; color: #525252; }
</style>
</head>
<body>
  <div class="sheet"><div class="frame">
    <p class="kicker">${escapeHtml(c.certificateTitle)}</p>
    <h1>${escapeHtml(c.courseTitle)}</h1>
    <p class="awarded">This certifies that</p>
    <p class="name">${escapeHtml(c.studentName)}</p>
    <hr />
    <div class="meta">
      <div><div class="label">Issued</div><div>${escapeHtml(c.issueDate)}</div></div>
      <div class="right"><div class="label">Issuer</div><div>${escapeHtml(c.issuerName)}</div></div>
    </div>
    <div class="id">${escapeHtml(c.certificateId)}</div>
  </div></div>
</body>
</html>`;
}

/** Latest lesson completion for the course, or null while unfinished. */
function completion(courseId: string): { completedAt: string } | null {
  const curriculum = getCurriculum(courseId);
  const total = curriculum?.chapters.reduce((s, c) => s + c.lessons.length, 0) ?? 0;
  if (!total) return null;
  const done = getCourseProgressRows(courseId).filter((r) => r.isCompleted);
  if (done.length < total) return null;
  const completedAt = done
    .map((r) => r.completedAt ?? r.updatedAt)
    .sort()
    .at(-1);
  return { completedAt: completedAt ?? new Date().toISOString() };
}

function buildCertificate(courseId: string, completedAt: string): StudentCertificate {
  const course = courses.find((c) => c.id === courseId);
  const certificateId = certificateIdFor(courseId);
  const base = {
    certificateId,
    issueDate: formatIssueDate(completedAt),
    studentName: currentUser.fullName,
    courseTitle: course?.title ?? getCurriculum(courseId)?.course.title ?? 'Course',
    certificateTitle: CERTIFICATE_TITLE,
    issuerName: ISSUER,
    enabled: course?.certificateConfig?.enabled ?? true,
    verifyUrl: `/verify/${certificateId}`,
  };
  return { ...base, html: certificateHtml(base) };
}

/**
 * `GET /courses/{id}/student-certificate`. Throws a coded error
 * (`NOT_FOUND`, `FORBIDDEN`, `INCOMPLETE`) like the API.
 */
export function getMockStudentCertificate(courseId: string): StudentCertificate {
  if (!getCurriculum(courseId)) throw codedError('NOT_FOUND', 'Course not found');
  if (!enrollments.some((e) => e.courseId === courseId)) {
    throw codedError('FORBIDDEN', 'You are not enrolled in this course');
  }
  const done = completion(courseId);
  if (!done) throw codedError('INCOMPLETE', 'Finish the course to earn its certificate');
  return buildCertificate(courseId, done.completedAt);
}

/**
 * `GET /courses/verify/{certificateId}` (public). Matches case-insensitively;
 * any failure is `CERTIFICATE_NOT_FOUND` (a 404 on the real API).
 */
export function verifyMockCertificate(code: string): VerifiedCertificate {
  const wanted = code.trim().toUpperCase();
  for (const enrollment of enrollments) {
    const courseId = enrollment.courseId;
    if (certificateIdFor(courseId) !== wanted) continue;
    const done = completion(courseId);
    if (!done) break;
    const course = courses.find((c) => c.id === courseId);
    const cert = buildCertificate(courseId, done.completedAt);
    const score = SCORES[courseId];
    return {
      ...cert,
      valid: true,
      courseSlug: course?.slug ?? '',
      courseId,
      learnings: course?.learnings ?? [],
      tags: course?.tags ?? [],
      completedAt: done.completedAt,
      ...(score ? { score } : {}),
    };
  }
  throw codedError('CERTIFICATE_NOT_FOUND', 'No certificate found for this code');
}
