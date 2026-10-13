# Maria — work log

Newest entries on top. Format is in [../TRACKER.md](../TRACKER.md#how-to-use-this-file).

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
