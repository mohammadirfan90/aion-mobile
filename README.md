# Aion — Mobile App

The student app for the **Aion** learning platform (LMS). Browse courses, enroll,
take lessons, track progress, keep notes, ask the AI tutor, discuss in the
forum, and earn certificates — all from iOS, Android, and the web.

> **Status: Phase 0 — Cleanup & scaffold.** The app is being built by Irfan and
> Maria for a university Mobile App Development course. The current phase only
> removes the starter template, sets the project identity, and wires up the
> build tooling. Real screens come in Phase 1.
>
> See [`docs/TRACKER.md`](docs/TRACKER.md) for the full plan, status of every
> task, and the phase we're in.

---

## Stack

- **Expo SDK 57** (managed workflow) + **React Native 0.86** + **React 19.2**
- **TypeScript 6** (strict)
- **Expo Router** (file-based navigation, typed routes)
- **expo-image**, **expo-font**, **expo-splash-screen**, **expo-video**,
  **expo-symbols**, **expo-glass-effect**
- **react-native-reanimated**, **react-native-gesture-handler**,
  **react-native-svg**, **react-native-safe-area-context**

Phase 0 also installs (but doesn't use yet): **react-query**, **zustand**,
**react-hook-form**, **zod**, **@hookform/resolvers**, **lucide-react-native**,
**openapi-fetch**, **@supabase/supabase-js**, **@react-native-async-storage/async-storage**.

---

## Getting started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ (or `bun` / `yarn` — Expo supports either)
- Expo Go on a physical device, or an Android Emulator / iOS Simulator

### Setup

```bash
git clone <repo-url>
cd aion-mobile
npm install
cp .env.example .env          # fill in values; defaults work for mock mode
```

`.env` is **never** committed. The five `EXPO_PUBLIC_*` keys are listed and
documented in [`.env.example`](.env.example); they are validated at startup by
[`src/lib/env.ts`](src/lib/env.ts).

### Run the dev server

```bash
npm start              # interactive: press a, i, or w
npm run android        # Android emulator / device
npm run ios            # iOS simulator
npm run web            # web preview
```

---

## Scripts

| Command | What it does |
| :--- | :--- |
| `npm start` | Start the Expo dev server |
| `npm run android` | Start Expo and open the Android target |
| `npm run ios` | Start Expo and open the iOS target |
| `npm run web` | Launch the web preview |
| `npm run lint` | Run `expo lint` (ESLint with `eslint-config-expo`) |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run check` | Run `lint` then `typecheck` (SPEC §9 quality gate) |
| `npm run api:types` | Regenerate `src/api/schema.d.ts` from `api/openapi.json` |

---

## Project layout

```
api/             OpenAPI 3.1 snapshot of the backend (typed by api:types)
assets/          App icon, splash, adaptive icon (replaced in P4-01)
docs/            CONTEXT, SPEC, SCREENS, API, TEAM, TRACKER + per-person logs
scripts/         verify.mjs — phase / status / quality-gate checks
src/
  app/           Expo Router routes (one file per screen + _layout files)
  components/    Shared React components
  components/ui/ Shared UI kit (built in P0-09)
  features/      One folder per area: hooks.ts, api.ts, schemas.ts, screens/
  api/           openapi-fetch client, generated schema, hand-written types
  lib/           env, supabase, auth-store, format, course, lesson, sse
  mocks/         Fixtures + in-memory mutations (built in P0-10)
  theme/         Design tokens + useTheme() (built in P0-08)
app.json         Expo config (name, slug, scheme, bundle IDs, plugins)
package.json     Deps and scripts
tsconfig.json    TypeScript (extends expo/tsconfig.base)
```

---

## Team

| Person | Owns |
| :--- | :--- |
| **Irfan** | Discover & Learn screens (S07–S17), backend dependencies (B-xx), API client + Supabase setup, EAS builds & release |
| **Maria** | Auth, Community, Support, Account, Certificate screens (S01–S06, S18–S29), media upload helper, README & demo video |

---

## Docs

- [`docs/CONTEXT.md`](docs/CONTEXT.md) — what the project is, the decision log
  (D-01 … D-12), constraints, glossary
- [`docs/SPEC.md`](docs/SPEC.md) — technical spec: stack, folder layout, env,
  data layer, auth, design tokens, UI kit, quality gates
- [`docs/SCREENS.md`](docs/SCREENS.md) — all 29 screens with acceptance lists
- [`docs/API.md`](docs/API.md) — REST endpoints the mobile app uses
- [`docs/TEAM.md`](docs/TEAM.md) — ownership and screen split
- [`docs/TRACKER.md`](docs/TRACKER.md) — current state, all task rows, how to
  start/end a session
- [`docs/log/irfan.md`](docs/log/irfan.md), [`docs/log/maria.md`](docs/log/maria.md) —
  per-person work logs
- [`api/openapi.json`](api/openapi.json) — backend OpenAPI 3.1 snapshot

---

## License

[MIT](LICENSE) — Aion Mobile contributors, 2026.
