# Maria — work log

Newest entries on top. Format is in [../TRACKER.md](../TRACKER.md#how-to-use-this-file).

## 2026-10-14 — P1-S18
- Did: implemented Phase 1 UI for S18 (Lesson comments sheet) matching `docs/design/S18-comments-sheet.png` and SCREENS.md / API.md §9:
  - **Threaded Comment List**: Top-level comments and 1-level indented replies with vertical connecting line border.
  - **Comment Cards**: Avatar with initials/image, author name, "Instructor" badge (dark pill) for instructor/admin roles, "You" badge (neutral soft pill) for own comments, relative time ("2h", "3h", "1h", "just now"), body text with theme typography.
  - **Interactive Actions**: "Reply" link sets composer replying target and focuses input; ThumbsUp upvote button with optimistic counter toggle; Trash icon for own comments with confirmation prompt before deleting.
  - **Composer**: Bottom pill input with multiline support, Send button (circular primary pill with up-arrow), replying chip banner with dismiss button ("↩ Replying to **{author}** ✕"), keyboard avoidance for iOS and Android.
  - **Data Layer**: Created `src/features/lesson/api.ts` and `src/features/lesson/hooks.ts` (`useLessonComments`) providing optimistic posting, optimistic deleting, optimistic upvote toggles, and automatic threaded grouping by `parentId`.
  - **Mock Fixtures**: Enhanced `src/mocks/fixtures/comments.ts` with design-matching comments (Prof. Michael Keller, Sara Kim, Alex Chen) and in-memory mutable store.
  - **Route & Standalone Support**: Replaced placeholder in `src/app/(app)/lesson/[id]/comments.tsx` with `LessonCommentsSheet`; falls back to fixture lesson ID (`l-intro-01-01`) when opened standalone without params.
- Changed files: `src/features/lesson/screens/LessonCommentsSheet.tsx` (new), `src/features/lesson/hooks.ts` (new), `src/features/lesson/api.ts` (new), `src/app/(app)/lesson/[id]/comments.tsx`, `src/mocks/fixtures/comments.ts`, `src/api/types.ts`, `src/api/query-keys.ts`, `docs/TRACKER.md`, `docs/log/maria.md`.
- Decisions/notes: Implemented optimistic post and delete so user feedback is instantaneous. Threading groups flat comments by `parentId` as specified in API.md §9.
- Quality gates: `npm run check` green (0 errors, 0 warnings), `node scripts/verify.mjs check` 6/7 (single pre-existing false positive on secret pattern).
- Next: P1-S19 (Community forum feed).
- Blockers: none.

## 2026-10-14 — P1-X1
- Did: deleted legacy `src/components/auth-screen.tsx` now that all Auth screens (S01–S06) are implemented with dedicated feature screens in `src/features/auth/` and verified.
- Changed files: `src/components/auth-screen.tsx` (deleted), `docs/TRACKER.md`, `docs/log/maria.md`.
- Decisions/notes: `auth-screen.tsx` was retained temporarily as a visual reference through P1-S06. No active application code imports it.
- Quality gates: `npm run check` green (0 errors, 0 warnings), `node scripts/verify.mjs check` 6/7 (single pre-existing false positive on secret pattern).
- Next: P1-S18 (Lesson comments sheet).
- Blockers: none.

## 2026-10-13 — P1-S04, P1-S05, P1-S06
- Did: implemented Phase 1 mock UI for S04 (Verify email), S05 (Forgot password), and S06 (Reset password) per SCREENS.md and matching visual designs in `docs/design/`:
  - **S04 (Verify email)**: mail badge, "Check your email", 6-box `OtpInput` with autoFocus/auto-submit, resend with 60-second cooldown timer, error state on invalid code, toast notification on success.
  - **S05 (Forgot password)**: key icon badge, email `TextField`, "Send code" pill button, green confirmation card ("If an account exists for this email, a code is on its way"), handles `RATE_LIMITED` error, navigates to S06 with `?email=`.
  - **S06 (Reset password)**: 6-box `OtpInput`, new password & confirm password `TextField`s with secure toggles and 3-segment strength meter, mismatch error handling, "Reset password" button, toast notification on success leaving user signed in on Home tab.
  - **Mock Auth enhancements**: added `resendVerification(email)` to `src/mocks/auth-store.ts`, deterministic code behavior (any 6-digit code succeeds except `000000` which throws "invalid code"), and `resetPassword` leaves the user signed in.
- Changed files: `src/features/auth/screens/VerifyEmailScreen.tsx` (new), `src/features/auth/screens/ForgotPasswordScreen.tsx` (new), `src/features/auth/screens/ResetPasswordScreen.tsx` (new), `src/app/(auth)/verify-email.tsx`, `src/app/(auth)/forgot-password.tsx`, `src/app/(auth)/reset-password.tsx`, `src/features/auth/hooks.ts`, `src/features/auth/schemas.ts`, `src/mocks/auth-store.ts`, `docs/TRACKER.md`, `docs/log/maria.md`.
- Decisions/notes: Added `resendVerification` to mock auth store. In mock mode, any 6-digit code works except `000000`, which fails with an 'invalid code' error. A successful resetPassword leaves the user signed in.
- Quality gates: `npm run check` green (0 errors, 0 warnings), `node scripts/verify.mjs check` 6/7 (single pre-existing false positive on secret pattern).
- Next: P1-X1 (Delete legacy `src/components/auth-screen.tsx`) or P1-S18 (Lesson comments sheet).
- Blockers: none.

## 2026-10-13 — P1-S03
- Did: built the Signup screen matching the visual design (`docs/design/S03-signup.png`):
  - Top header with circular muted `HeaderBackButton` pill.
  - "Create your account" title and "It takes less than a minute" subtitle.
  - First name & Last name side-by-side row with pill `TextField`s.
  - Username pill input with automatic lowercase conversion, 400ms debounced live availability check against known accounts (showing ✓ available or ✗ taken).
  - Email pill input with emailAddress autocomplete and zod validation.
  - Password input with 3-segment strength meter (weak / good / strong) matching design.
  - Confirm password input with match validation.
  - "Create account" primary button with loading state.
  - Terms and Privacy policy footer disclaimer.
  - "Already have an account? Log in" navigation footer link (S02).
  - On successful signup, navigates to S04 verify-email with `?email=` parameter.
  - Form scrolls above the keyboard on small phones (360×640) via `Screen` with `keyboard` and `scroll`.
- Changed files: `src/features/auth/screens/SignupScreen.tsx` (new), `src/features/auth/schemas.ts`, `src/features/auth/hooks.ts`, `src/app/(auth)/signup.tsx`, `docs/TRACKER.md`, `docs/log/maria.md`.
- Decisions/notes: Username check derives debounced value cleanly to satisfy React 19 / ESLint `react-hooks/set-state-in-effect`.
- Quality gates: `npm run check` green (0 errors, 0 warnings), `node scripts/verify.mjs check` 6/7 (pre-existing secret false positive).
- Next: P1-S04 (Verify email).
- Blockers: none.

## 2026-10-13 — P1-S02
- Did: built the Login screen matching the visual design (`docs/design/S02-login.png`):
  - Brand header with rounded app icon and Aion logo title.
  - "Welcome back" title and "Log in to continue learning" subtitle.
  - Email and Password pill `TextField`s with secure text entry toggle, password manager autocomplete support (`email` / `password`), keyboard navigation ("next" moves to password, "go" submits).
  - "Forgot password?" header link positioned right above the password input navigating to S05.
  - Zod validation for valid email format and min 8 characters password with inline field errors.
  - Multi-state error banners: credentials error, rate-limited banner ("Too many attempts, try again in a few minutes"), network error, and unverified email with "Enter code →" action button (navigates to S04).
  - Primary "Log in" pill button with loading state; automatic landing on Home tab upon sign-in via `Stack.Protected`.
  - Footer navigation link to Sign up (S03) and bottom link to Verify a certificate (S29).
  - Enhanced `TextField` in `src/components/ui/` with `forwardRef` to support programmatic focus.
- Changed files: `src/features/auth/screens/LoginScreen.tsx` (new), `src/features/auth/schemas.ts` (new), `src/features/auth/hooks.ts` (new), `src/components/ui/TextField.tsx`, `src/app/(auth)/login.tsx`, `docs/TRACKER.md`, `docs/log/maria.md`.
- Decisions/notes: Implemented inline banner states for rate limiting and unverified email with one-tap deep link to verification.
- Quality gates: `npm run check` green, `node scripts/verify.mjs check` 6/7 (pre-existing secret false positive).
- Next: P1-S03 (Signup).
- Blockers: none.

## 2026-10-13 — P1-S01
- Did: built the Welcome screen matching the visual design (`docs/design/S01-welcome.png`):
  - 3 swipeable slides (Learn anywhere / Ask the AI tutor / Earn certificates) with hero illustration cards, titles, and descriptions.
  - Page dots synchronized bidirectionally with horizontal swipe gestures and tap selection.
  - Primary "Get started" button (navigates to signup) and secondary "I already have an account" link (navigates to login).
  - Stored `seenWelcome` flag in AsyncStorage (`src/lib/auth-storage.ts`); returning users who previously completed welcome are automatically redirected to login on launch.
  - Responsive layout scaling cleanly down to 360×640 phones, full dark mode and light mode support via `useTheme()` tokens without hard-coded colors.
- Changed files: `src/features/auth/screens/WelcomeScreen.tsx` (new), `src/app/(auth)/welcome.tsx`, `src/app/(auth)/_layout.tsx`, `src/lib/auth-storage.ts` (new), `src/mocks/auth-store.ts`, `docs/TRACKER.md`, `docs/log/maria.md`.
- Decisions/notes: Sized hero container dynamically using `useWindowDimensions` so that on 360×640 phones the cards scale gracefully without scrolling or clipping.
- Quality gates: `npm run check` green, `node scripts/verify.mjs check` 6/7 (single pre-existing false positive on secret check).
- Next: P1-S02 (Login).
- Blockers: none.
