/**
 * The one transport for the real API (D-15, INTEGRATION.md §2).
 *
 * `request<T>()` is used by every feature `api.ts`. It:
 *   - sends `Authorization: Bearer <access token>` from the auth layer;
 *   - on a 401, refreshes the session once (shared by all calls in flight) and
 *     retries the call once. It signs out only when the refresh token itself is
 *     rejected, never on a network failure, so a Supabase outage can't turn
 *     into a sign-out storm;
 *   - unwraps the `{ success, data | error }` envelope and throws `ApiError`,
 *     keeping `lockedForSeconds` / `attemptsRemaining` from 429 lockouts;
 *   - maps network failures to `NETWORK` and gives the first request of a cold
 *     start a long timeout, reporting "waking" to `server-status.ts`.
 *
 * Uploads (XHR) and the tutor stream (`expo/fetch`) can't use `request()`; they
 * take the token from `getAuthToken()` / `refreshAuthToken()` below.
 *
 * Mock mode: feature `api.ts` files return fixtures and never call this module.
 */
import createClient, { type Middleware } from 'openapi-fetch';

import { env } from '@/lib/env';
import { markServerAwake, markServerSlow } from './server-status';
import type { paths } from './schema';
import type { ApiAuthLockout, ApiErrorEnvelope, ApiErrorPayload, ApiEnvelope } from './types';

const baseUrl = env.useMocks ? '' : env.apiUrl.replace(/\/$/, '');

/** Base URL of the API (no trailing slash, no `/api/v1`). Empty in mock mode. */
export const apiBaseUrl = baseUrl;

// ── Auth wiring (set by lib/auth-store.ts) ───────────────────────────────────

interface AuthHooks {
  getAccessToken: () => string | null;
  /** Resolves the new access token, `null` if the refresh token was rejected; throws on network failure. */
  refreshSession: () => Promise<string | null>;
  /** Called once the session can't be recovered. */
  onSessionExpired: () => void | Promise<void>;
}

let hooks: AuthHooks = {
  getAccessToken: () => null,
  refreshSession: async () => null,
  onSessionExpired: () => {},
};

export function configureAuth(next: AuthHooks) {
  hooks = next;
}

export function getAuthToken(): string | null {
  return hooks.getAccessToken();
}

let refreshing: Promise<string | null> | null = null;

/** Refreshes the session once for every caller waiting on it. */
export function refreshAuthToken(): Promise<string | null> {
  refreshing ??= hooks.refreshSession().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Called by the upload / stream paths after a 401 they can't recover from. */
export function reportSessionExpired(): void | Promise<void> {
  return hooks.onSessionExpired();
}

// ── Typed client (only where openapi.json is actually typed) ─────────────────

export const api = createClient<paths>({ baseUrl });

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = hooks.getAccessToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
};
api.use(authMiddleware);

// ── request() ────────────────────────────────────────────────────────────────

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Send no bearer token even when signed in (public endpoints called while signed out). */
  anonymous?: boolean;
}

const COLD_START_TIMEOUT_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 20_000;
const SLOW_AFTER_MS = 5_000;
let serverAwake = false;

/** A JSON request to `/api/v1{path}`. Throws `ApiError` on any failure. */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = `${baseUrl}/api/v1${path}${queryString(opts.query)}`;
  const sentToken = opts.anonymous ? null : hooks.getAccessToken();
  let res = await send(url, opts, sentToken);

  if (res.status === 401 && sentToken) {
    let fresh: string | null = null;
    try {
      fresh = await refreshAuthToken();
    } catch {
      // Network failure while refreshing: keep the session, surface the 401.
      return unwrap<T>(res);
    }
    if (!fresh) {
      await hooks.onSessionExpired();
      return unwrap<T>(res);
    }
    res = await send(url, opts, fresh);
  }
  return unwrap<T>(res);
}

async function send(url: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const timeoutMs = serverAwake ? DEFAULT_TIMEOUT_MS : COLD_START_TIMEOUT_MS;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const slow = serverAwake ? null : setTimeout(markServerSlow, SLOW_AFTER_MS);

  try {
    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
    serverAwake = true;
    markServerAwake();
    return res;
  } catch (e) {
    if (opts.signal?.aborted) throw e; // the caller cancelled: let react-query see the abort
    const timedOut = controller.signal.aborted;
    throw new ApiErrorImpl(
      'NETWORK',
      timedOut ? 'The server took too long to respond.' : 'Network request failed',
      0,
    );
  } finally {
    clearTimeout(timeout);
    if (slow) clearTimeout(slow);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

function queryString(query: RequestOptions['query']): string {
  const qs = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return qs ? `?${qs}` : '';
}

/** GET `/health` (outside `/api/v1`) to start a cold server early. Never throws. */
export async function pingHealth(): Promise<boolean> {
  if (env.useMocks) return true;
  try {
    const res = await send(`${baseUrl}/health`, {}, null);
    return res.ok;
  } catch {
    return false;
  }
}

// ── Envelope ─────────────────────────────────────────────────────────────────

/**
 * Unwraps a `{ success, data | error }` response. Throws `ApiError` on any
 * non-2xx, `{ success: false }` or unreadable response. A 429 is
 * `RATE_LIMITED` even when the body isn't JSON (older servers sent plain text).
 */
export async function unwrap<T>(response: Response): Promise<T> {
  const status = response.status;
  const contentType = response.headers.get('content-type') ?? '';

  let payload: unknown = null;
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      throw new ApiErrorImpl(status === 429 ? 'RATE_LIMITED' : 'UNKNOWN', 'Invalid JSON in response', status);
    }
  } else {
    const text = await response.text().catch(() => '');
    if (status === 429) throw new ApiErrorImpl('RATE_LIMITED', text || 'Too many requests', status);
    if (status >= 400) throw new ApiErrorImpl(statusCode(status), text || 'Request failed', status);
    return text as unknown as T;
  }

  if (status >= 200 && status < 300 && isOkEnvelope<T>(payload)) return payload.data;

  if (isErrEnvelope(payload)) {
    const lockout = payload as ApiErrorEnvelope & ApiAuthLockout;
    const retryAfter = Number(response.headers.get('retry-after'));
    throw new ApiErrorImpl(payload.error.code || 'UNKNOWN', payload.error.message || 'Request failed', status, {
      attemptsRemaining: lockout.attemptsRemaining,
      lockedForSeconds:
        lockout.lockedForSeconds ?? (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined),
    });
  }

  if (status === 429) throw new ApiErrorImpl('RATE_LIMITED', 'Too many requests', status);
  throw new ApiErrorImpl(statusCode(status), 'Malformed response', status);
}

function statusCode(status: number): string {
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'UNKNOWN';
}

function isOkEnvelope<T>(v: unknown): v is ApiEnvelope<T> {
  return typeof v === 'object' && v !== null && (v as { success?: unknown }).success === true && 'data' in v;
}

function isErrEnvelope(v: unknown): v is ApiErrorEnvelope & ApiAuthLockout {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as { success?: unknown; error?: ApiErrorPayload };
  return (
    o.success === false &&
    typeof o.error === 'object' &&
    o.error !== null &&
    typeof o.error.code === 'string' &&
    typeof o.error.message === 'string'
  );
}

export class ApiErrorImpl extends Error {
  readonly code: string;
  readonly status: number;
  readonly attemptsRemaining?: number;
  readonly lockedForSeconds?: number;

  constructor(code: string, message: string, status: number, lockout?: ApiAuthLockout) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    if (lockout?.attemptsRemaining !== undefined) this.attemptsRemaining = lockout.attemptsRemaining;
    if (lockout?.lockedForSeconds !== undefined) this.lockedForSeconds = lockout.lockedForSeconds;
  }
}

/** True for an `ApiError` (from any request path). */
export function isApiError(e: unknown): e is ApiErrorImpl {
  return e instanceof ApiErrorImpl;
}

// re-export so feature code can `import { ApiError } from '@/api/client'`
export { ApiErrorImpl as ApiError };
