# Irfan — work log

Newest entries on top. Format is in [../TRACKER.md](../TRACKER.md#how-to-use-this-file).

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
