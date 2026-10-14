import { describe, expect, it } from '@jest/globals';

import { normalizeCertificateCode, verifyLink } from './api';

describe('verifyLink (API §14)', () => {
  it('prefixes the relative verifyUrl with the web URL', () => {
    expect(verifyLink('/verify/CERT-AION-1', 'https://aion.example/')).toBe('https://aion.example/verify/CERT-AION-1');
    expect(verifyLink('verify/CERT-AION-1', 'https://aion.example')).toBe('https://aion.example/verify/CERT-AION-1');
  });

  it('keeps an absolute URL', () => {
    expect(verifyLink('https://other.example/v/1', 'https://aion.example')).toBe('https://other.example/v/1');
  });
});

describe('normalizeCertificateCode (S29)', () => {
  it('pulls the CERT code out of a pasted URL', () => {
    expect(normalizeCertificateCode(' https://aion.example/verify/cert-aion-ab12-34cd ')).toBe('CERT-AION-AB12-34CD');
  });
});
