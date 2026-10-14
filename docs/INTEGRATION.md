# Phase 2 integration plan

How to switch the app from mock data to the deployed API without surprises. Written on 2026-10-14 after
auditing the backend source against this repo's [API.md](API.md), `src/api/types.ts` and every feature `api.ts`.
[API.md](API.md) has been corrected to match the backend. This file says **what to change in the app, in what
order, and what to ask of the backend**. Rows refer to [TRACKER.md](TRACKER.md).

**Verdict:** the backend is ready (live, healthy, every endpoint the app needs exists, `api/openapi.json` is
current). Nothing blocks Phase 2. The work is on our side: one shared transport, a thin normalization layer for a
few shapes that differ from our types, and about a dozen bugs the audit found in code that hasn't run against the
real API yet.

---

## 1. How the backend behaves (the parts that shape the plan)

- **Auth:** every protected route wants `Authorization: Bearer <supabase access_token>`. The server checks it
  with Supabase on each request. Missing, expired or invalid → `401 UNAUTHENTICATED`. Course, lesson and forum
  *reads* use optional auth: a bad token is silently treated as anonymous (no 401), so a lost token shows up as
  "outline only" curricula and `hasUpvoted: false`, not as an error.
- **Envelope:** always `{ success, data }` / `{ success: false, error: { code, message } }`, **including 429**
  (`RATE_LIMITED`). Signup / login lockouts add `lockedForSeconds` (+ `Retry-After`) or `attemptsRemaining`.
- **Rate limits** are in memory, per IP: login 10 / 15 min, signup 5/h, password reset 3/h, password change 5/h,
  uploads 40/h, AI chat 60/h, AI generation 20/h (summary, **cache hits included**), and one shared
  **60/h "content" bucket** for forum posts, replies, upvotes, solutions, tickets and ticket messages. Lesson
  comments have their own 60/h.
- **Cold starts:** the API runs on Render's free tier. The first request after idle took over 30 s.
- **CORS** doesn't affect native requests. `GET /health` (root, not under `/api/v1`) is the cheap liveness check.

## 2. Architecture decisions for Phase 2

1. **One transport: `request<T>()` in `src/api/client.ts`** (to record as D-15). Every feature `api.ts` uses it.
   The typed `openapi-fetch` client stays only where the spec is actually typed; most payloads we use are
   `unknown` in `openapi.json`, so the hand types in `types.ts` (from API.md) are the contract. `request()` gets:
   the bearer token from the session; **one** refresh-and-retry on 401 (capped, so a Supabase outage, which also
   comes back as 401, can't loop into a sign-out storm); and the JSON 429 body, keeping the message and
   `lockedForSeconds`. The current `openapi-fetch` retry middleware rebuilds a `Request` whose body was already
   read and will throw on POST/PATCH; fix or delete it.
2. **The same token goes to the two calls that bypass `request()`:** the upload XHR (`lib/upload.ts`) and the
   tutor stream (`expo/fetch` in `features/tutor/api.ts`). Export one `getAccessToken()` and one
   `refreshSession()` from the auth layer and use them in all three places.
3. **Normalize at the edge, once.** Each feature `api.ts` converts the wire shape to the app type before
   returning it (SPEC §4 already says so). Where our type is simply wrong, fix the type instead (`Enrollment`,
   `LearningSummary`, `CertificateConfig`, `VerifiedCertificate`). Where screens depend on our names, map them
   (`Chapter.activities` → `lessons`, `isLocked` → `locked`).
4. **Mocks follow the wire.** Fixtures must return what the real API returns (after normalization), or mock mode
   keeps hiding bugs like the ones below. Update fixtures in the same change as each adapter.
5. **Cold start UX:** the first request gets a longer timeout (≈ 60 s) and the app shows "Waking the server…" if it
   takes more than ~5 s. Ping `GET /health` at launch to start the wake-up early.

## 3. Bugs and mismatches found (fix inside the listed row)

| # | Where | Problem | Fix | Row |
|---|---|---|---|---|
| 1 | `api/client.ts` | `request()` has no 401 refresh-retry; `configureAuth` is never called; 429 JSON body is discarded | Decision 1 | P2-02 |
| 2 | `lib/upload.ts` | No `Authorization` header → every upload is 401 | Decision 2 | P2-05 |
| 3 | `features/tutor/api.ts` | Stream has no `Authorization` header → every real call is 401 | Decision 2 | P2-10 |
| 4 | `catalog`, `courses`, `home`, `learning` `api.ts` | Raw `fetch`, no token: `/enrollments/my`, `/progress/*`, `/users/me/*` → 401; curriculum is always an outline | Move to `request()` | P2-06 |
| 5 | `types.ts` `Chapter`, `lib/lesson.ts`, S10/S11 | Real curriculum chapters use `activities` and `isLocked`, and the payload has `stats`; `chapter.lessons` is undefined → crash | Adapter in `courses/api.ts` + `lesson/api.ts` (`fetchCurriculum`) | P2-06 |
| 6 | `types.ts` `AccessConfig`, S10, `lib/course.ts` callers | Real field is `accessMode: 'open' \| 'invite' \| 'closed'` (not `mode`), and `inviteCode` is never sent to students | Fix the type; S10 checks `invite` / `closed` before the free path | P2-07 |
| 7 | `types.ts` `Enrollment`, Home | `/enrollments/my` rows are only `{ id, userId, courseId, enrolledAt, completedAt }` (no progress, no last lesson, unordered) | Fix the type | P2-06 |
| 8 | `types.ts` `LearningSummary`, Home | Real summary is `LearningSummaryData` (`totalEnrolled`, `courses[]`, …); Home's `enrolledCourses.map` throws | Rebuild Home on `LearningSummaryData`; compute "continue learning" on the device (curriculum + progress, as API §12 says) | P2-06 |
| 9 | `types.ts` `CertificateConfig`, `VerifiedCertificate` | Real certificate config is `{ enabled, title, passingScore, issuerName, templateType, … }`; verify result has no `enabled` (adds `isOwner`) | Fix the types; S28 handles `enabled: false` | P2-14 |
| 10 | `lib/lesson.ts` | `documentSettings.fileUrl ?? metadata.fileUrl`: the editor saves empty strings, so the fallback is never used | Use `\|\|` for URL fallbacks | P2-08 |
| 11 | `lesson/api.ts` `fetchNotes`, `tutor/api.ts` `fetchContextNotes` | `GET /notes/lesson/{id}` **requires `?courseId=`** → 400 without it | Pass `courseId` | P2-08 / P2-10 |
| 12 | `lesson/api.ts` `postLessonComment` | Returns the envelope instead of the comment (`res.data` vs `res.data.data`); errors become "[object Object]" | Move comments to `request()` | P2-11 |
| 13 | Comments (S18) | **There is no upvote endpoint for lesson comments**; rows have `upvotesCount` (always 0), no `upvoted` / `replies` | Hide the upvote control (or B-05c) and fix the `Comment` type | P2-11 |
| 14 | S14, S17 | The backend has **no "AI off" error**: with `aiConsent: false` the tutor still answers (just without profile data) and summaries ignore it | Check `Me.aiConsent` on the device and show the "AI features are turned off" state ourselves | P2-08 / P2-10 |
| 15 | `tutor/api.ts` parser | The trailing literal `\n\n` is outside the JSON (after `data: {...}`), so the strip never runs and a closing code fence is lost; a mid-stream error drops the partial text | Strip before `JSON.parse`; close dangling fences; keep partial text on error (in `lib/sse.ts` with tests) | P2-10 |
| 16 | `tutor/hooks.ts` | Server caps each `chatHistory` item at 5,000 chars, notes at 2,000, titles at 500 → a long saved reply gives 400 | Truncate before sending | P2-10 |
| 17 | `lesson/api.ts` `fetchSummary` | Failures can be `500 AI_SUMMARY_ERROR` or a `temp-` id (valid), not only `unavailable-` | Handle both; 429 copy | P2-08 |
| 18 | `profile/schemas.ts` | Our limits are tighter than the server's (headline 150, bio 1000, goals 1000) → a bio written on the web can't be saved | Match the server limits | P2-13 |
| 19 | Signup | An already-registered email can come back as `500 PROFILE_CREATION_FAILED` (Supabase returns a fake user) | Treat it as "this email may already have an account" | P2-04 |
| 20 | Signup username check | `check_username_available` may not be callable with the anon key (depends on which SQL ran last on the DB) | Try it; on a permission error skip the live check and rely on `409 USERNAME_TAKEN` | P2-04 |
| 21 | Enrollment errors | `COURSE_CLOSED`, `PAYMENT_REQUIRED` are 400; checked before `ALREADY_ENROLLED`, so an enrolled user on a now-closed course gets `COURSE_CLOSED` | Check enrollment first in S10; map codes | P2-07 |
| 22 | Quiz | `MAX_ATTEMPTS_EXCEEDED` is **403**, not 409; don't treat every 403 as "not enrolled" | Map by code, not status | P2-09 |
| 23 | Support (S23) | A student reply does not reopen a resolved ticket; students may only set `resolved` / `closed` | Copy only; no "reopen" promise | P2-12 |
| 24 | Forum (S20) | Admins and instructors may also mark a solution; every write counts a view | Show the action to them too; ignore view inflation | P2-11 |
| 25 | `lib/env.ts` | Mock fallback API URL uses port 3000 (that's the web app; the API is 3001) | Fix the default | P2-01 |

Heartbeats: the server completes a video at 90 % of the **lesson's** duration (author minutes × 60) and only
uses the client's `durationSeconds` when the lesson has none, so always send it. Locks are display-only on the
server; keep enforcing them in the app.

## 4. Order of work

```
P2-01 supabase client ─► P2-02 transport (#1) ─► P2-03 auth store real mode
                                                    │
        ┌─────────────────────┬─────────────────────┼──────────────────────┬─────────────────┐
   P2-04 login/signup     P2-05 upload (#2)    P2-06 S07–S11 (#4–#8)    P2-12 support    P2-13 profile
   (#19 #20)              (Maria)              ─► P2-07 enroll (#6 #21)   (Maria)          (#18, Maria)
                              │                ─► P2-08 lesson (#10 #11 #14 #17)
                              │                     ─► P2-09 quiz / assignment (#22)
                              └──────────────────────► P2-11 comments / forum (#12 #13 #24, Maria)
   P2-10 tutor (#3 #14 #15 #16) after P2-03        P2-14 certificates (#9, Maria)
   P2-16 email codes: waits for B-02                P2-15 mocks off + full pass: last
```

1. **Irfan, first (unblocks everyone):** P2-01, P2-02 (with decisions 1–2 and 5), P2-03. Add a contract smoke script
   (`scripts/contract-smoke.mjs`): sign in with the demo student (B-04), call `/users/me`, `/users/me/learning-summary`, one curriculum, one
   lesson; fail loudly on a shape mismatch.
2. **In parallel after P2-03:** Irfan P2-06 → P2-07 → P2-08 → P2-09, then P2-10. Maria P2-04, P2-05, then
   P2-11 → P2-14 (P2-12 and P2-13 need nothing else).
3. **Each row:** switch the `api.ts` real branch to `request()`, add the adapter, update the fixture to the wire
   shape, run in real mode against the demo account, then in mock mode, and tick the row.
4. **Last:** P2-15. Flip `.env.example` to mocks off, do the full pass, and file anything new as B-05x.

## 5. Asks for the backend (new B-05 rows)

| ID | Ask | Why | Priority |
|---|---|---|---|
| B-05a | Set `TRUSTED_PROXY=true` on Render | Without it every client is rate-limited as the proxy's IP: one shared bucket for all users | High |
| B-05b | Exclude **draft** lessons from completion counts (learning summary, `/enrollments/progress`, certificate checks) | A course with a draft lesson can never reach 100 % or issue a certificate | High |
| B-05c | Lesson-comment upvote endpoint, or confirm there's none | S18 shows upvotes; the design has them | Medium (decision) |
| B-05d | Keep the API warm (paid instance or a keep-alive ping) | > 30 s cold start makes the first screen fail | Medium |
| B-05e | Confirm `check_username_available` is granted to `anon` on the live DB | Live username check on S03 | Medium |
| B-05f | Upvoting a missing forum reply returns 500 (should be 404); views count on every write | Correct errors / stats | Low |
| B-05g | Strip the literal `\n\n` after the closing code fence in the tutor stream | Clients drop that chunk | Low |
| B-05h | Optional: a real "AI off" error (or let the client skip AI when `aiConsent` is false) | Clean consent handling | Low |

## 6. Done means

- `node scripts/verify.mjs phase 2` passes (it checks `lib/supabase.ts`, `lib/sse.ts` + tests, the signup header,
  mocks-off default and a real branch in every `api.ts`).
- Every screen works signed in as the demo student on the deployed API, on Android, light and dark, and the
  mock-mode run still passes (fixtures follow the wire shapes).
