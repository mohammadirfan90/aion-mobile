# Tracker

The single source of truth for **what's done, what's in progress and what's next**. Irfan, Maria and any AI agent
must keep it current, so that anyone can pick up the work from where it stopped.

## Current state

<!-- Update this block at the end of every work session. Keep it short. -->

- **Phase:** 2, Integration (ready to start)
- **Mocks:** on (`EXPO_PUBLIC_USE_MOCKS=true`)
- **Last update:** 2026-10-14, Irfan: P0-12 done; Phase 0 and Phase 1 gates pass; every route renders on Android (light and dark). Fonts embedded (no clipped text), real logo everywhere, headers clear the status bar, jest-expo set up (48 tests), Expo SDK 57 patches applied (expo-doctor clean). Deployed API and Supabase both reachable. Next up: Irfan P2-01 → P2-03; Maria P2-05 once P2-02 lands. Readiness notes are in docs/log/irfan.md (2026-10-14).
- **Open blockers:** none.

## How to use this file

**Status values:** `todo` · `doing` · `blocked` · `review` (pull request open) · `done`

**The status and verify script** (`scripts/verify.mjs`, plain Node, no install needed):

| Command | When |
|---|---|
| `node scripts/verify.mjs status` (add `--owner Maria` or `--owner Irfan` to filter) | Start of every session: progress per phase, what's in flight or blocked, your next unblocked tasks, backend dependencies. |
| `node scripts/verify.mjs check` | Before marking any task `done`: hygiene, code rules, `npm run check`, tests. |
| `node scripts/verify.mjs phase <n>` | When the last task of a phase is done. **It must pass** before "Current state" moves to the next phase. Fix what it reports, or add rows for it. |

Add `--skip-commands` for a quick run without lint, typecheck or tests, and `--doctor` to also run
`npx expo-doctor`. After P0-05 the same commands are available as `npm run status` and `npm run verify -- …`.

**Starting a session (people and agents):**
1. Run `node scripts/verify.mjs status`. Then read `AGENTS.md`, then [CONTEXT.md](CONTEXT.md), [SPEC.md](SPEC.md) and this file. Read the
   [SCREENS.md](SCREENS.md) and [API.md](API.md) sections for your task.
2. Work out who you are working for: **Irfan** or **Maria**. Agents: check `git config user.name`, and if it's
   unclear, ask.
3. Read the last entries in your log (`docs/log/irfan.md` or `docs/log/maria.md`).
4. Pick the **lowest-numbered `todo` task in the earliest unfinished phase** whose dependencies are `done` and
   whose owner is you, or `Any`. Finish any task already marked `doing` for you first.
5. Set that row to `doing`. Don't take a row marked `doing` by someone else.

**Ending a session, or finishing a task:**
1. Run `node scripts/verify.mjs check` (the SPEC §9 gates). If it fails, the task is not `done`. When you finish
   the last task of a phase, also run `node scripts/verify.mjs phase <n>`.
2. Update the row's status: `done`, `review`, or `blocked` with the reason in Notes.
3. Add an entry at the **top** of your log file (format below).
4. Update **Current state** above.
5. Commit with a one-line message: `<task-id>: <summary>`.

**Rules:**
- Only edit your own rows and your own log. That keeps git merges clean.
- If you discover new work, add a row at the end of the right phase with the next free ID and an owner.
- If the plan itself has to change, update SPEC.md or SCREENS.md, add a decision to CONTEXT.md, and say so in
  your log.

**Log entry format** (`docs/log/<name>.md`, newest first):

```
## 2026-10-14 — P0-01, P0-02
- Did: removed template files; renamed app to Aion (scheme `aion`).
- Changed files: app.json, package.json, src/app/explore.tsx (deleted), …
- Decisions/notes: none
- Next: P0-03
- Blockers: none
```

---

## Phase 0: Cleanup & scaffold (Owner: Any, blocks everything)

| ID | Task | Owner | Status | Depends | Notes |
|---|---|---|---|---|---|
| P0-01 | Remove template leftovers (list in [§ Phase 0 details](#phase-0-details)). Keep `src/components/auth-screen.tsx` as a visual reference until P1-X1. | Irfan | done | | |
| P0-02 | App config: `app.json` name `Aion`, slug `aion-mobile`, scheme `aion`, `ios.bundleIdentifier` and `android.package` set to `com.aion.mobile` (change it if the ID is taken), neutral splash colour; `package.json` name `aion-mobile`; remove the `reset-project` script. | Irfan | done | P0-01 | |
| P0-03 | Rewrite the README so it only claims what exists: purpose, status, setup, env, scripts, team, links to docs. LICENSE copyright line → "Aion Mobile contributors". | Irfan | done | P0-02 | |
| P0-04 | Env: `.env.example` (SPEC §3), `src/lib/env.ts` validated with zod, add `.env` to `.gitignore`. | Irfan | done | P0-02 | |
| P0-05 | Tooling: ESLint via `npx expo lint`, Prettier config, and the npm scripts `typecheck`, `check` (lint + typecheck), `api:types`, `status` (`node scripts/verify.mjs status`) and `verify` (`node scripts/verify.mjs`). `npx expo-doctor` must be clean. | Irfan | done | P0-02 | |
| P0-06 | Install core packages (SPEC §1): react-query, zustand, react-hook-form, zod, @hookform/resolvers, lucide-react-native, Geist font, openapi-fetch, openapi-typescript (dev), @supabase/supabase-js, AsyncStorage. Use `npx expo install` throughout. | Irfan | done | P0-05 | |
| P0-07 | API layer: generate `src/api/schema.d.ts`; write `src/api/types.ts` from API.md; write `src/api/client.ts` (unwrap, ApiError, auth-header middleware stub) and `query-keys.ts`; write `lib/errors.ts`. | Irfan | done | P0-06 | |
| P0-08 | Theme: `src/theme` tokens (SPEC §6), `useTheme()`, font loading, and a light/dark/system override held in a zustand settings store. | Irfan | done | P0-06 | |
| P0-09 | UI kit: every component in SPEC §7, in `src/components/ui`. | Irfan | done | P0-08 | |
| P0-10 | Mock layer: fixtures for every area (see [§ Phase 0 details](#phase-0-details)), `mockDelay`, in-memory mutations, and a mock auth store (any credentials sign in). | Irfan | done | P0-07 | |
| P0-11 | Navigation skeleton: every route from SPEC §2 exists as a placeholder screen whose text contains the exact marker `TODO Sxx` (e.g. `TODO S07`; the verify script counts these to track screen progress, so Phase 1 removes each marker when the screen is built); `Stack.Protected` gating; tabs with lucide icons; sheets use `formSheet`; new post and new ticket open as modals. | Irfan | done | P0-09, P0-10 | |
| P0-12 | Smoke check: in mock mode on Android the app boots, you can "log in", reach every placeholder, and log out. Light and dark both work. | Any | done | P0-11 | Done 2026-10-14 on the Pixel_8 emulator (mock mode, new dev build with embedded fonts): cold start, log in, all 34 routes render with no JS errors (signed-out auth + verify, every tab, course, every lesson type, sheets, quiz, assignment, tutor, forum, support, profile, settings), log out returns to S02 and the guard blocks app routes, light and dark. Fixed on the way: missing root providers, clipped text (fonts now embedded), headers under the status bar. |

## Phase 1: Screens (UI against mock data)

Build each screen exactly as specified in [SCREENS.md](SCREENS.md), and make it **look like its design image in
`docs/design/`** ([DESIGN.md](DESIGN.md) maps screen to image). Data comes **only** from feature hooks (mock mode).
Done means:
- the SPEC §9 gates pass;
- every acceptance item for that screen is ticked;
- the screen matches its design. Any deliberate difference is written in your log with the reason, for example
  "SCREENS.md doesn't include X".

| ID | Screen | Owner | Status | Depends | Notes |
|---|---|---|---|---|---|
| P1-X0 | Align the UI kit with the designs. Compare `src/components/ui/*` and the tab bar with `docs/design/` (pill inputs and buttons, list rows, cards, badges, segmented control, sheets, tab bar) and adjust the components, not the screens. Uses tokens only; no new colours. | Irfan | done | P0-12 | Pill inputs (52pt, focus ring in foreground, eye/eye-off toggle, no Show/Hide text), SearchBar (left `Search` icon, 48pt), Chip (soft muted fill when unselected), Header back button (`ChevronLeft` in a circular muted pill). Tab bar already matched. No new tokens. |
| P1-S01 | Welcome | Maria | done | P1-X0 | 3 swipeable slides, synchronized dots, seenWelcome flag in AsyncStorage, navigates to S02 and S03. Matches S01-welcome.png. |
| P1-S02 | Login | Maria | done | P1-X0 | Email/password pill inputs, secure toggle, zod validation, error banners (rate limit, unverified with Enter code link), forgot password & signup links. Matches S02-login.png. |
| P1-S03 | Signup | Maria | done | P1-X0 | First/last name row, live debounced username check, email/password/confirm inputs, 3-segment strength meter, navigates to S04. Matches S03-signup.png. |
| P1-S04 | Verify email (code) | Maria | done | P1-S03 | 6-box OtpInput, 60s resend cooldown, invalid code error handling, toast on success. Matches S04-verify-email.png. |
| P1-S05 | Forgot password | Maria | done | P1-S02 | Email input, RATE_LIMITED handling, success confirmation card, navigates to S06 with ?email=. Matches S05-forgot-password.png. |
| P1-S06 | Reset password | Maria | done | P1-S05 | 6-box OtpInput, new/confirm password with strength bars, mismatch handling, toast on success, signs in user. Matches S06-reset-password.png. |
| P1-X1 | Delete legacy `src/components/auth-screen.tsx` | Maria | done | P1-S02…S06 | Deleted legacy reference component. All auth screens now use dedicated feature screens under `src/features/auth/`. |
| P1-S07 | Home | Irfan | done | P1-X0 | Stats (3), continue-learning card, my-courses + explore-more carousels, brand bar (Aion + Ask Aion pill + avatar), greeting. Loading/empty/error states; pull-to-refresh. Long titles truncate to 2 lines. |
| P1-S08 | Explore (catalog) | Irfan | done | P1-X0 | SearchBar (300ms debounce) + level + price chip filters; vertical list of cards with thumbnail, level + Enrolled badges, title, description, price, chevron; empty "No courses match" + Clear filters; pull-to-refresh. |
| P1-S09 | My Learning | Irfan | done | P1-X0 | Brand bar (avatar → Profile, Aion wordmark, search + filter), "N active courses in this term" subtitle, `SegmentedControl` In progress / Completed, course rows with thumbnail + tag strip + title + "x/y lessons · Enrolled/Completed {date}" + progress bar with % (or "100% Completed" + `Certificate` button → S28), tap → S11, empty state → Explore, pull-to-refresh. |
| P1-S10 | Course detail | Irfan | done | P1-X0 | Hero (back / share) + level chip + title + chapters/lessons/duration stats + description + tags + "What you'll learn" card + curriculum accordion (type icons, duration, Preview badge for `metadata.isPreview`, lock for locked chapters/lessons) + sticky bottom action bar (Continue / Enroll for free / Enter invite code / Get on web → opens `EXPO_PUBLIC_WEB_URL/courses/{slug}` / disabled Enrollment closed). Invite dialog with code validation. Pull-to-refresh rechecks enrollment. Data via `GET /courses/{id}/curriculum`, `GET /enrollments/my`, `POST /enrollments` (ALREADY_ENROLLED treated as success). |
| P1-S11 | Curriculum | Irfan | done | P1-S10 | Top bar (back + title + overflow menu). Progress card with `ProgressRing` (%), "X of Y lessons complete" + next-lesson subtitle + Resume (→ S12 for the first uncompleted, non-locked lesson). Chapter list with status pill (Completed / In progress / Locked). Lesson rows: type icon + title + "duration · type" + completion check. The resume-target lesson gets a bigger filled icon and an "UP NEXT" badge. Overflow menu: Notes, Certificate (when eligible → S28), Get help (→ S24 with `courseId`). Pull-to-refresh. |
| P1-S12 | Lesson | Irfan | done | P1-S11 | Every API §4 type via `lib/lesson.ts`: native video (expo-video, resume + 6 s heartbeat + complete at end) or YouTube/Vimeo embed, markdown (inline or `markdownUrl`), dynamic_page block renderer (14 block types, unknown skipped, inline quiz completes the lesson), document / embed / resource / live session cards, quiz + assignment intro cards, unknown → "Open on the web". Action row (Notes, Summary, Comments → S18, Ask AI → S17). Optimistic Mark complete shared with S11; Previous/Next cross chapters and skip locked lessons; NOT_ENROLLED state → S10. No "Resources & Downloads" list (DESIGN.md). |
| P1-S13 | Notes sheet | Irfan | done | P1-S12 | Oldest-first list with `mm:ss` chips (tap seeks the video and closes), long-press or ⋯ to delete with confirmation, composer stamps the live playback time; optimistic add/delete. No `#` tag button (DESIGN.md). |
| P1-S14 | AI summary sheet | Irfan | done | P1-S12 | Summary / Concepts / Flashcards. Concepts with `timestampSeconds` seek the video. Paged flashcards with a 250 ms Reanimated flip (instant with Reduce Motion) and hints. `unavailable-` empty state; "AI features are turned off" for AI_DISABLED / FORBIDDEN. |
| P1-S15 | Quiz | Irfan | done | P1-S12 | Intro (count, pass %, attempts used/max, last score) → one question per page (radio / checkbox cards, shuffle per attempt, answers kept across pages) → result ring + per-question review (your answer, correct answer, explanation). Unanswered confirmation, "Discard answers?" on leave (`usePreventRemove`), Retry only while attempts remain; a pass completes the lesson. |
| P1-S16 | Assignment | Irfan | done | P1-S12 | Collapsible brief, due date, status card (Not submitted / Submitted on / Graded with feedback), answer (≤ 20,000, zod + RHF), one attachment via document or photo picker with upload progress, error + retry and remove. Submit → Update submission; read-only once graded. Mock upload; P2-05 swaps in the shared helper. |
| P1-S17 | AI Tutor chat | Irfan | done | P1-X0 | "Ask Aion" + lesson context chip + Clear history. Saves the user message, streams the reply (mock chunks; real `expo/fetch` parser until P2-10's `lib/sse.ts`), saves the reply at EOF. Stop aborts and keeps the partial reply; failures show an inline bubble with Retry (or Edit profile when AI is off). Suggestion chips. No thumbs, copy or mic (DESIGN.md / no module). |
| P1-S18 | Lesson comments sheet | Maria | done | P1-X0 | Threaded comments with 1-level reply indent, optimistic posting & delete, upvote toggling, reply-to chip banner, standalone fallback to fixture lesson ID. Matches S18-comments-sheet.png. |
| P1-S19 | Community (forum feed) | Maria | done | P1-X0 | Stats strip, debounced search + category chips + sort sheet (one query key, so they combine), infinite scroll (`page` × `limit` vs `total`), pinned first, Solved/Pinned badges, optimistic card upvotes, pull-to-refresh, floating New post. |
| P1-S20 | Forum post detail | Maria | done | P1-S19 | Post (markdown content, image with fallback, optimistic upvote), replies threaded one level, solution pinned first with a badge, owner-only Mark as solution (optimistic) and Edit/Delete menu (inline edit, delete → back to S19 + refresh), reply composer with "Replying to". The detail isn't refetched after writes (each GET counts a view). |
| P1-S21 | New post | Maria | done | P1-S19 | zod + RHF (title 3–250, content ≥ 5), category sheet (default General), image picked and uploaded through `lib/upload.ts` (`folder=forum`) with progress/retry/remove, course/lesson link chip from params, discard prompt, success → S20. |
| P1-S22 | Support tickets | Maria | done | P1-X0 | Status chips (API filter), debounced search, cards with #number, status badge, priority pill, course, "Staff replied" / "Waiting on staff" line, empty state with Create a ticket, pinned New ticket button. |
| P1-S23 | Ticket thread | Maria | done | P1-S22 | Summary card (status, priority, course · lesson), chat thread with day separators, optimistic send, scroll to newest, keyboard-safe composer, "This ticket is closed" when closed, Mark as resolved menu while open / in progress. |
| P1-S24 | New ticket | Maria | done | P1-S22 | zod + RHF (subject 3–250, description ≥ 5), priority (default Normal), inline course picker prefilled from `courseId` (keeps `lessonId`), discard prompt, success → S23. |
| P1-S25 | Profile | Maria | done | P1-X0 | Avatar (initials fallback), name, @username, headline, Edit profile; stats card from the learning summary; My certificates (expands to completed courses → S28), Support tickets, Settings, About, Log out (confirm, signs out, clears the query cache). |
| P1-S26 | Edit profile | Maria | done | P1-S25 | Avatar from camera or library with upload progress (`folder=avatars`), name, username (USERNAME_TAKEN on the field), headline, bio, learning goals, AI features switch; Save disabled until something changes; only changed fields sent; discard prompt. |
| P1-S27 | Settings | Maria | done | P1-S25 | Appearance System/Light/Dark (instant, persisted with AsyncStorage), Change password dialog (min 8 + confirm → `POST /auth/password`), Biometric lock placeholder (P3-04), Terms / Privacy / licenses / version, dev-only mock indicator and student/admin role switch. |
| P1-S28 | Certificate | Maria | done | P1-X0 | Certificate card (title, course, student, issue date, issuer, ID) with a QR of the ID (`react-native-qrcode-svg`, D-14), View full certificate (HTML in a WebView modal), Verify online, Verify in the app, Share disabled until P3-05; not-earned state with progress + Continue course. |
| P1-S29 | Verify certificate | Maria | done | P1-X0 | Code entry (trims, uppercases, pulls `CERT-…` out of a pasted URL) → result: valid card (student, course, issued, issuer, completed, score, ID) or "No certificate found for this code". Scan QR disabled until P3-01. Works signed out. |

## Phase 2: Integration (real API)

| ID | Task | Owner | Status | Depends | Notes |
|---|---|---|---|---|---|
| P2-01 | `lib/supabase.ts`: client with AsyncStorage persistence, foreground-only auto refresh (AppState). | Irfan | todo | Phase 0 | |
| P2-02 | `api/client.ts` real mode: Bearer header from the session, refresh-and-retry once on 401, then sign out; error mapping. | Irfan | todo | P2-01 | |
| P2-03 | Auth store real mode: restore session at start, load `/users/me`, sign out clears the query cache. | Irfan | todo | P2-02 | |
| P2-04 | Wire login (supabase-js) and signup (`POST /auth/signup` with `X-Aion-Client: mobile`). After signup, S04 shows the link-based state: "Open the link in your email, then log in". In real mode, hide the "Forgot password?" link on S02 until P2-16 is done. | Maria | todo | P2-03, B-01 | |
| P2-16 | Wire code-based email verification (S04, `verifyOtp` type `email`) and password reset (S05 → S06: `resetPasswordForEmail` → `verifyOtp` type `recovery` → `updateUser`); show the "Forgot password?" link again. | Maria | todo | P2-04, B-02 | Open until the Supabase email templates include the 6-digit code (B-02). |
| P2-05 | Media upload helper: pick an image or document → `FormData` → `POST /media/upload`, with progress and an error state. | Maria | todo | P2-02 | Used by S16, S21, S26. Convert HEIC to JPEG and resize first (API §16). |
| P2-06 | Wire S07–S11 (home, catalog, my learning, course detail, curriculum). | Irfan | todo | P2-03 | Normalize in each `api.ts`: the real curriculum uses `activities` + `isLocked` (app: `lessons` + `locked`); `accessConfig` is `{ accessMode: 'open' \| 'invite' \| 'closed', pricingType, price }` (app: `mode`); Home still reads the older `LearningSummary` shape, while API §12 returns `LearningSummaryData` (S25 already uses it). Prices are whole units. |
| P2-07 | Enrollment: free and invite-code enroll; paid courses → "Get on web" (D-04); refresh enrollments when the app returns to the foreground. | Irfan | todo | P2-06 | |
| P2-08 | Wire S12–S14: lesson content, mark complete, heartbeat and resume position (API.md §4), notes, AI summary. | Irfan | todo | P2-06 | |
| P2-09 | Wire S15–S16: quiz submit and results; assignment submit with file. | Irfan | todo | P2-08, P2-05 | |
| P2-10 | Wire S17: AI tutor streaming via `expo/fetch` plus `lib/sse.ts` (with unit tests), saving history. | Irfan | todo | P2-03 | The stream doesn't save anything; the app saves both messages (API §13). |
| P2-11 | Wire S18–S21: comments, forum feed, post, replies, upvote, solution, new post with image. | Maria | todo | P2-03, P2-05 | |
| P2-12 | Wire S22–S24: support tickets. | Maria | todo | P2-03 | |
| P2-13 | Wire S25–S27: profile, edit profile with avatar upload, change password, logout. | Maria | todo | P2-03, P2-05 | |
| P2-14 | Wire S28–S29: certificate and verification. | Maria | todo | P2-03 | |
| P2-15 | Switch mocks off by default; do a full pass against the real API; record any missing endpoints as B-05x. | Irfan + Maria | todo | P2-04…P2-14 | |

## Phase 3: Native features & polish

| ID | Task | Owner | Status | Depends | Notes |
|---|---|---|---|---|---|
| P3-01 | QR scanner in S29 (`expo-camera` barcode scanning). | Maria | todo | P2-14 | |
| P3-02 | Offline cache: persist the react-query cache; show an "offline" banner. | Irfan | todo | P2-15 | |
| P3-03 | Video: landscape fullscreen, picture-in-picture where supported, resume position. | Irfan | todo | P2-08 | |
| P3-04 | Biometric app lock (setting in S27; `expo-local-authentication`). | Maria | todo | P2-13 | |
| P3-05 | Share certificate (link or image via `expo-sharing`). | Maria | todo | P2-14 | |
| P3-06 | Deep links: `aion://course/<id>`, `aion://verify/<code>`. | Irfan | todo | P2-15 | |
| P3-07 | Haptics and small animations (completing a lesson, upvoting, correct quiz answer). | Any | todo | P2-15 | |
| P3-08 | Accessibility pass: labels, large font scaling, contrast. Each person does their own screens. | Irfan + Maria | todo | P2-15 | |
| P3-09 | Performance pass: long lists, image sizes, unnecessary re-renders. | Any | todo | P2-15 | |
| P3-S1 | *Stretch:* instructor mode (admin stats, support inbox actions, grading queue). | Unassigned | todo | P2-15 | Endpoints exist; see API.md. |
| P3-S2 | *Stretch:* push notifications. | Unassigned | todo | B-06 | |

## Phase 4: Release & submission

| ID | Task | Owner | Status | Depends | Notes |
|---|---|---|---|---|---|
| P4-01 | `eas.json` (development, preview APK, production); real Aion app icon and splash. | Irfan | todo | Phase 2 | |
| P4-02 | Production env values; build the preview APK. | Irfan | todo | P4-01, B-04 | |
| P4-03 | Final README: features, screenshots, architecture, setup, demo accounts. | Maria | todo | P4-02 | |
| P4-04 | Demo video (2–4 min walkthrough). | Maria | todo | P4-02 | |
| P4-05 | Final QA run on a real device against the SCREENS.md acceptance lists. | Irfan + Maria | todo | P4-02 | |
| P4-06 | GitHub release `v1.0.0` with the APK attached. | Irfan | todo | P4-05 | |

## Later (open, not in the current plan)

These stay open on purpose. **Don't build them unless a row is moved into a phase above.** Some need backend
work that doesn't exist yet; others are out of scope for v1.

| ID | Item | Why it's open | Needs |
|---|---|---|---|
| L-01 | Google / Apple sign-in | The backend has Google sign-in on the web only; Apple isn't configured at all. On iOS, Google sign-in also requires offering Apple. | Supabase native OAuth setup and a deep-link callback |
| L-02 | In-app purchase of paid courses | D-04: no in-app payments in v1; paid courses are bought on the web. | App Store / Play billing, plus server-side receipt checks |
| L-03 | Push notifications | No device-token storage or notification triggers on the backend. | B-06 (same as stretch P3-S2) |
| L-04 | Instructor mode (stats, support inbox, grading) | Stretch; the endpoints exist but their responses aren't documented. | Document API §17 first (same as P3-S1) |
| L-05 | Offline video download | The video URLs are YouTube, Vimeo or direct links; downloading YouTube breaks its terms. | Self-hosted video files |
| L-06 | Per-lesson resource attachments under a lesson | Nothing in the backend writes `metadata.resources`; only `resource` and `document` lessons exist. | Backend and editor support |
| L-07 | Tags on notes, feedback on AI replies | No API fields or endpoints. | Backend work |
| L-08 | Payment history / receipts screen | `GET /payments/my` exists but no screen is planned. | A screen spec |
| L-09 | Full native renderer for every `dynamic_page` block type | v1 renders the common blocks and falls back to a WebView. | Time |
| L-10 | Realtime updates (live ticket and forum replies) | The backend has no realtime channel; the app uses refetch-on-focus and pull-to-refresh. | Backend realtime |
| L-11 | Multiple languages | English only in v1. | i18n setup |
| L-12 | Server-side catalog search and filters | `GET /courses` has none; S08 filters on the device. | Backend query parameters |

## Backend dependencies (done by Irfan in the private backend repo)

Mobile work that depends on these builds against mocks until they are `done`.

| ID | Need | Status | Blocks | Notes |
|---|---|---|---|---|
| B-01 | The signup endpoint must be usable from the mobile app (the app can't run the web's reCAPTCHA). | done | P2-04 (signup) | 2026-10-13. The app sends `X-Aion-Client: mobile`. Production must set the server flag `ALLOW_MOBILE_SIGNUP_WITHOUT_CAPTCHA=true` (Irfan, at deploy). |
| B-02 | Email templates for "confirm signup" and "reset password" include the 6-digit code alongside the link. | todo | P2-04 (verify, reset) | Supports D-05. Supabase dashboard change only; the steps are written in the backend repo. |
| B-03 | Refresh `api/openapi.json` here after backend API changes, then run `npm run api:types`. | ongoing | — | |
| B-04 | Deployed API and web app; demo student and demo instructor accounts for graders. | doing | P4-02 | 2026-10-13: API live at `https://aion-7ysp.onrender.com` (health OK, enrollment gating verified). Still to do: web app URL (`EXPO_PUBLIC_WEB_URL`) and demo accounts. |
| B-05 | Endpoint gaps found during integration: add rows as B-05a, B-05b, … | — | — | |
| B-06 | *Stretch:* device push-token registration plus notifications on ticket and forum replies. | todo | P3-S2 | |
| B-07 | *Optional:* allow the Expo web dev origin in API CORS (only needed to test in a browser). | todo | — | Not needed for Android/iOS. |
| B-08 | Lesson content requires enrollment; curriculum and lesson lists return outlines to non-enrolled viewers; 429 responses use the JSON envelope. | done | — | 2026-10-13. Documented in API §1, §3, §4. `api/openapi.json` refreshed. |

---

## Phase 0 details

**P0-01: delete these template files:**
`src/app/explore.tsx`, `src/components/animated-icon.tsx`, `animated-icon.web.tsx`, `animated-icon.module.css`,
`app-tabs.tsx`, `app-tabs.web.tsx`, `external-link.tsx`, `hint-row.tsx`, `web-badge.tsx`, `ui/collapsible.tsx`,
`themed-text.tsx`, `themed-view.tsx`, `src/hooks/*`, `src/constants/theme.ts`, `src/global.css` (once nothing
imports it), `assets/images/react-logo*.png`, `expo-badge*.png`, `expo-logo.png`, `tutorial-web.png`,
`logo-glow.png`, `assets/images/tabIcons/`, `scripts/reset-project.js`. Keep the app icon and splash images until
P4-01 replaces them. Make `src/app/_layout.tsx` and `src/app/index.tsx` minimal so the app still runs.

**P0-10: fixtures to create** (made-up data, typed, in `src/mocks/fixtures/`):
- `users`: one student (with avatar) and one admin.
- `courses`: 6 courses: free, paid, invite-only, one with no thumbnail, one with a very long title, mixed levels.
- `curriculum`: for 2 courses, 3–4 chapters each, one locked chapter, and **every lesson type** at least once.
- `enrollments` and `progress`: the student enrolled in 3 courses at 0%, 45% and 100%.
- `notes`, `comments` (including replies), `quiz` (single-choice, multiple-choice and true/false questions),
  `assignment` (one not submitted, one graded).
- `forum`: 12 posts across categories, one solved, one pinned, replies with an accepted solution.
- `tickets`: 4 tickets, one per status, each with messages.
- `ai`: chat history plus a lesson summary; a fake streaming reply that emits text chunks.
- `certificate`: the 100% course has a certificate; one valid and one invalid verification code.
