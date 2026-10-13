import type { Certificate, CertificateVerification } from '@/api/types';

const now = '2026-09-30T10:00:00Z';

export const certificates: Certificate[] = [
  {
    id: 'cert-001',
    code: 'AION-INTRO-2026-ABCD',
    userId: '11111111-1111-1111-1111-111111111111',
    userName: 'Sara Student',
    courseId: 'c0000001-0000-0000-0000-000000000001',
    courseTitle: 'Intro to Aion',
    issuedAt: now,
    certificateUrl: 'https://example.com/certificates/cert-001.pdf',
  },
];

export function verifyCertificate(code: string): CertificateVerification {
  const cert = certificates.find((c) => c.code === code);
  if (!cert) return { valid: false, reason: 'NOT_FOUND' };
  return { valid: true, certificate: cert };
}
