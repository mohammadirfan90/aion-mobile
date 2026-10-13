# Irfan — work log

Newest entries on top. Format is in [../TRACKER.md](../TRACKER.md#how-to-use-this-file).

## 2026-10-13 — P0-04
- Did: added `.env.example` (5 EXPO_PUBLIC_* keys with comments, per SPEC §3) and `src/lib/env.ts` (zod-validated). The validator picks a permissive schema when `EXPO_PUBLIC_USE_MOCKS=true` (default) so the app boots with empty values; a strict schema when mocks are off. Throws a clear error listing missing/invalid keys in real mode (the P0-11 nav skeleton will show this on a real error screen). Added an explicit `.env` line to `.gitignore` (was previously only `.env*.local`).
- Changed files: .env.example (new), .gitignore, src/lib/env.ts (new), docs/TRACKER.md.
- Decisions/notes: zod 3.25 is already in node_modules as a transitive dep of eslint-config-expo, so the typecheck passes without a separate install. P0-06 will add it as a direct dep at SDK-compatible version to make this dependency explicit.
- Quality gates: `npx expo lint` → 0 errors, `npx tsc --noEmit` → clean.
- Next: P0-05 (tooling scripts: typecheck, check, api:types, plus Prettier).
- Blockers: none.

## 2026-10-13 — P0-03
- Did: rewrote README.md to only describe what exists (current phase, stack, setup, scripts, team, links to the six docs). LICENSE copyright → "Aion Mobile contributors".
- Changed files: README.md, LICENSE, docs/TRACKER.md.
- Decisions/notes: README makes the Phase 0 status very explicit and contains no "Key Features" list of screens that aren't built yet. The Phase 0 stack list mentions packages that will be installed in P0-06 because they are already committed to `package.json` research and the README is forward-looking on tooling.
- Quality gates: `npx expo lint` → 0 errors, `npx tsc --noEmit` → clean.
- Next: P0-04 (.env.example + src/lib/env.ts).
- Blockers: none.

## 2026-10-13 — P0-02
- Did: set the Aion app identity. `app.json`: name "Aion", slug "aion-mobile", scheme "aion", ios.bundleIdentifier "com.aion.mobile", android.package "com.aion.mobile", splash backgroundColor #0A0A0A (neutral dark, per SPEC §6). `package.json`: name "aion-mobile"; removed the "reset-project" script and deleted `scripts/reset-project.js`.
- Changed files: app.json, package.json, scripts/reset-project.js (deleted), docs/TRACKER.md.
- Decisions/notes: none. Splash backgroundColor set to a single dark value for both modes — the native splash can't follow the system theme, and SPEC §6 says `background` is #0A0A0A in dark and #FFFFFF in light; a single dark splash looks neutral against the in-app white in light mode and matches dark mode. P4-01 replaces the splash image and may revisit this.
- Quality gates: `npx expo lint` → 0 errors, `npx tsc --noEmit` → clean.
- Next: P0-03 (rewrite README + LICENSE).
- Blockers: none.

## 2026-10-13 — P0-01
- Did: removed Expo starter template leftovers listed in TRACKER.md "Phase 0 details" (src/app/explore.tsx, the animated-icon / app-tabs / external-link / hint-row / web-badge / themed-* / ui/collapsible components, src/hooks/*, src/constants/theme.ts, src/global.css, template images, tabIcons/). Replaced src/app/_layout.tsx with a minimal Stack and src/app/index.tsx with a tiny placeholder so the app still boots. Kept src/components/auth-screen.tsx (visual reference for P1-X1) and the icon/splash assets. Added an `eslint-disable react/no-unescaped-entities` header to auth-screen.tsx so SPEC §9 lint is clean until P1-X1 cleans up the apostrophes.
- Changed files: see above + docs/TRACKER.md (P0-01 row → done, "Current state" updated).
- Decisions/notes: none. P0-01 has no architectural decisions. AGENTS.md, package.json, package-lock.json, eslint.config.js, scripts/verify.mjs, api/, docs/ are also modified on disk but **not** part of this commit — they belong to P0-05 and the planning snap-in.
- Quality gates: `npx expo lint` → 0 errors (1 stylistic warning in the kept legacy file), `npx tsc --noEmit` → clean. `npx expo-doctor` not run (Windows shell; logged in the global "quality gates not run" note).
- Next: P0-02 (app identity in app.json + package.json).
- Blockers: none.

## 2026-10-13 — backend B-01, B-08; verify script
- Did:
  - Backend (private repo):
    - Lesson content now requires enrollment; curriculum and lesson lists return outlines otherwise.
    - Course responses no longer include invite codes.
    - Rate-limit 429s are JSON.
    - Signup can skip reCAPTCHA for `X-Aion-Client: mobile` behind a server flag.
  - Refreshed `api/openapi.json`; updated API.md (§1–§4), SPEC and SCREENS (S04, S10).
  - Added `scripts/verify.mjs` (status / check / phase) and wired it into AGENTS.md, TRACKER and SPEC §9.
- Next: B-02 (Supabase email templates, dashboard only); set `ALLOW_MOBILE_SIGNUP_WITHOUT_CAPTCHA` at deploy.
- Blockers: none

## 2026-10-13 — planning
- Did: wrote the planning docs (CONTEXT, SPEC, SCREENS, API, TEAM, TRACKER); added the `api/openapi.json` snapshot.
- Next: Phase 0 (P0-01), Any owner.
- Blockers: none
