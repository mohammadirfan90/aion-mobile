# Tracker

The single source of truth for **what's done, what's in progress and what's next**. Irfan, Maria and any AI agent
must keep it current, so that anyone can pick up the work from where it stopped.

## Current state

<!-- Update this block at the end of every work session. Keep it short. -->

- **Phase:** 0, Cleanup & scaffold (in progress)
- **Mocks:** on (`EXPO_PUBLIC_USE_MOCKS=true`)
- **Last update:** 2026-10-13, Irfan: P0-09 done (21 UI kit components). Next up: P0-10 (mock layer + fixtures).
- **Open blockers:** none

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
| P0-10 | Mock layer: fixtures for every area (see [§ Phase 0 details](#phase-0-details)), `mockDelay`, in-memory mutations, and a mock auth store (any credentials sign in). | Any | todo | P0-07 | |
| P0-11 | Navigation skeleton: every route from SPEC §2 exists as a placeholder screen whose text contains the exact marker `TODO Sxx` (e.g. `TODO S07`; the verify script counts these to track screen progress, so Phase 1 removes each marker when the screen is built); `Stack.Protected` gating; tabs with lucide icons; sheets use `formSheet`; new post and new ticket open as modals. | Any | todo | P0-09, P0-10 | |
| P0-12 | Smoke check: in mock mode on Android the app boots, you can "log in", reach every placeholder, and log out. Light and dark both work. | Any | todo | P0-11 | |

## Phase 1: Screens (UI against mock data)

Build each screen exactly as specified in [SCREENS.md](SCREENS.md). Data comes **only** from feature hooks
(mock mode). Done means the SPEC §9 gates pass and every acceptance item for that screen is ticked.

| ID | Screen | Owner | Status | Depends | Notes |
|---|---|---|---|---|---|
| P1-S01 | Welcome | Maria | todo | P0-12 | |
| P1-S02 | Login | Maria | todo | P0-12 | |
| P1-S03 | Signup | Maria | todo | P0-12 | |
| P1-S04 | Verify email (code) | Maria | todo | P1-S03 | |
| P1-S05 | Forgot password | Maria | todo | P1-S02 | |
| P1-S06 | Reset password | Maria | todo | P1-S05 | |
| P1-X1 | Delete legacy `src/components/auth-screen.tsx` | Maria | todo | P1-S02…S06 | |
| P1-S07 | Home | Irfan | todo | P0-12 | |
| P1-S08 | Explore (catalog) | Irfan | todo | P0-12 | |
| P1-S09 | My Learning | Irfan | todo | P0-12 | |
| P1-S10 | Course detail | Irfan | todo | P0-12 | |
| P1-S11 | Curriculum | Irfan | todo | P1-S10 | |
| P1-S12 | Lesson | Irfan | todo | P1-S11 | |
| P1-S13 | Notes sheet | Irfan | todo | P1-S12 | |
| P1-S14 | AI summary sheet | Irfan | todo | P1-S12 | |
| P1-S15 | Quiz | Irfan | todo | P1-S12 | |
| P1-S16 | Assignment | Irfan | todo | P1-S12 | |
| P1-S17 | AI Tutor chat | Irfan | todo | P0-12 | |
| P1-S18 | Lesson comments sheet | Maria | todo | P0-12 | Opened from S12; works standalone with a fixture lesson ID. |
| P1-S19 | Community (forum feed) | Maria | todo | P0-12 | |
| P1-S20 | Forum post detail | Maria | todo | P1-S19 | |
| P1-S21 | New post | Maria | todo | P1-S19 | |
| P1-S22 | Support tickets | Maria | todo | P0-12 | |
| P1-S23 | Ticket thread | Maria | todo | P1-S22 | |
| P1-S24 | New ticket | Maria | todo | P1-S22 | |
| P1-S25 | Profile | Maria | todo | P0-12 | |
| P1-S26 | Edit profile | Maria | todo | P1-S25 | |
| P1-S27 | Settings | Maria | todo | P1-S25 | |
| P1-S28 | Certificate | Maria | todo | P0-12 | |
| P1-S29 | Verify certificate | Maria | todo | P0-12 | Manual code entry now; QR in P3-01. |

## Phase 2: Integration (real API)

| ID | Task | Owner | Status | Depends | Notes |
|---|---|---|---|---|---|
| P2-01 | `lib/supabase.ts`: client with AsyncStorage persistence, foreground-only auto refresh (AppState). | Irfan | todo | Phase 0 | |
| P2-02 | `api/client.ts` real mode: Bearer header from the session, refresh-and-retry once on 401, then sign out; error mapping. | Irfan | todo | P2-01 | |
| P2-03 | Auth store real mode: restore session at start, load `/users/me`, sign out clears the query cache. | Irfan | todo | P2-02 | |
| P2-04 | Wire auth screens S02–S06 (signup via API; login, verify, reset via supabase-js; SPEC §5). | Maria | todo | P2-03, B-01, B-02 | Login can be wired before B-01/B-02. |
| P2-05 | Media upload helper: pick an image or document → `FormData` → `POST /media/upload`, with progress and an error state. | Maria | todo | P2-02 | Used by S16, S21, S26. Convert HEIC to JPEG and resize first (API §16). |
| P2-06 | Wire S07–S11 (home, catalog, my learning, course detail, curriculum). | Irfan | todo | P2-03 | |
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

## Backend dependencies (done by Irfan in the private backend repo)

Mobile work that depends on these builds against mocks until they are `done`.

| ID | Need | Status | Blocks | Notes |
|---|---|---|---|---|
| B-01 | The signup endpoint must be usable from the mobile app (the app can't run the web's reCAPTCHA). | done | P2-04 (signup) | 2026-10-13. The app sends `X-Aion-Client: mobile`. Production must set the server flag `ALLOW_MOBILE_SIGNUP_WITHOUT_CAPTCHA=true` (Irfan, at deploy). |
| B-02 | Email templates for "confirm signup" and "reset password" include the 6-digit code alongside the link. | todo | P2-04 (verify, reset) | Supports D-05. Supabase dashboard change only; the steps are written in the backend repo. |
| B-03 | Refresh `api/openapi.json` here after backend API changes, then run `npm run api:types`. | ongoing | — | |
| B-04 | Deployed API and web app; demo student and demo instructor accounts for graders. | todo | P4-02 | |
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
