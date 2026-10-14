import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError, configureAuth, request, unwrap } from './client';

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('unwrap (API §1 envelope)', () => {
  it('returns data from a success envelope', async () => {
    await expect(unwrap(json(200, { success: true, data: { id: 1 } }))).resolves.toEqual({ id: 1 });
  });

  it('throws the error code and message from an error envelope', async () => {
    const err = await unwrap(json(403, { success: false, error: { code: 'NOT_ENROLLED', message: 'Enroll first' } })).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: 'NOT_ENROLLED', message: 'Enroll first', status: 403 });
  });

  it('keeps lockout details from a JSON 429', async () => {
    const err = await unwrap(
      json(429, { success: false, error: { code: 'RATE_LIMITED', message: 'Slow down' }, lockedForSeconds: 120 }),
    ).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: 'RATE_LIMITED', lockedForSeconds: 120 });
  });

  it('treats a plain-text 429 as RATE_LIMITED', async () => {
    const res = new Response('Too many requests, please try again later.', {
      status: 429,
      headers: { 'content-type': 'text/plain' },
    });
    await expect(unwrap(res)).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429 });
  });

  it('falls back to Retry-After for the lock duration', async () => {
    const err = await unwrap(
      json(429, { success: false, error: { code: 'RATE_LIMITED', message: 'x' } }, { 'retry-after': '30' }),
    ).catch((e: unknown) => e);
    expect(err).toMatchObject({ lockedForSeconds: 30 });
  });

  it('maps a non-JSON error status to a code', async () => {
    const res = new Response('Bad Gateway', { status: 502, headers: { 'content-type': 'text/html' } });
    await expect(unwrap(res)).rejects.toMatchObject({ code: 'INTERNAL_ERROR', status: 502 });
  });
});

describe('request (bearer token and 401 refresh)', () => {
  const fetchMock = jest.fn<typeof fetch>();
  let token: string | null = 'old-token';
  const refreshSession = jest.fn<() => Promise<string | null>>();
  const onSessionExpired = jest.fn<() => void>();

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockReset();
    refreshSession.mockReset();
    onSessionExpired.mockReset();
    token = 'old-token';
    configureAuth({ getAccessToken: () => token, refreshSession, onSessionExpired });
  });

  afterEach(() => {
    configureAuth({ getAccessToken: () => null, refreshSession: async () => null, onSessionExpired: () => {} });
  });

  const authHeader = (call: number) =>
    (fetchMock.mock.calls[call]?.[1]?.headers as Record<string, string> | undefined)?.Authorization;

  it('sends the bearer token', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { success: true, data: 'ok' }));
    await request('/users/me');
    expect(authHeader(0)).toBe('Bearer old-token');
  });

  it('refreshes once on 401 and retries with the new token', async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, { success: false, error: { code: 'UNAUTHENTICATED', message: 'expired' } }))
      .mockResolvedValueOnce(json(200, { success: true, data: { ok: true } }));
    refreshSession.mockImplementationOnce(async () => {
      token = 'new-token';
      return 'new-token';
    });

    await expect(request('/users/me')).resolves.toEqual({ ok: true });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(authHeader(1)).toBe('Bearer new-token');
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('signs out when the refresh token is rejected', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { success: false, error: { code: 'UNAUTHENTICATED', message: 'expired' } }));
    refreshSession.mockResolvedValueOnce(null);

    await expect(request('/users/me')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the refresh fails on the network', async () => {
    fetchMock.mockResolvedValueOnce(json(401, { success: false, error: { code: 'UNAUTHENTICATED', message: 'expired' } }));
    refreshSession.mockRejectedValueOnce(new Error('offline'));

    await expect(request('/users/me')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('does not try to refresh an anonymous request', async () => {
    token = null;
    fetchMock.mockResolvedValueOnce(json(401, { success: false, error: { code: 'UNAUTHENTICATED', message: 'no token' } }));
    await expect(request('/users/me')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('maps a network failure to NETWORK', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(request('/courses')).rejects.toMatchObject({ code: 'NETWORK', status: 0 });
  });

  it('adds query parameters and skips empty ones', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { success: true, data: [] }));
    await request('/forum/posts', { query: { page: 2, search: '', category: undefined, sort: 'latest' } });
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/api\/v1\/forum\/posts\?page=2&sort=latest$/);
  });
});
