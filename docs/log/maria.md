# Maria — work log

Newest entries on top. Format is in [../TRACKER.md](../TRACKER.md#how-to-use-this-file).

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
