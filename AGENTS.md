# Aion Mobile — agent instructions

This is the **Aion** mobile app, the student app for the Aion learning platform. It is an Expo/React Native
app built by **Irfan** and **Maria** for a university course. The API it talks to lives in a separate private
repository. Prioritize mobile-first patterns, performance and cross-platform compatibility.

## Start here (every session)

0. Run `node scripts/verify.mjs status` to see where the project stands and what's next.
1. Read, in order: [docs/CONTEXT.md](docs/CONTEXT.md) → [docs/SPEC.md](docs/SPEC.md) →
   [docs/TRACKER.md](docs/TRACKER.md). Then read the sections of [docs/SCREENS.md](docs/SCREENS.md) and
   [docs/API.md](docs/API.md) that your task needs. For screen work, also open that screen's visual design
   ([docs/DESIGN.md](docs/DESIGN.md)). Ownership is in [docs/TEAM.md](docs/TEAM.md). For Phase 2 rows, read [docs/INTEGRATION.md](docs/INTEGRATION.md) first.
2. Work out who you are working for (**Irfan** or **Maria**): check `git config user.name`, and ask if it's unclear.
3. Follow the "How to use this file" protocol in TRACKER.md: pick the next task, mark it `doing`, do it, run
   `node scripts/verify.mjs check` until it passes, mark it `done`, write a log entry in `docs/log/<name>.md`,
   and update "Current state". **When a phase's last task is done, `node scripts/verify.mjs phase <n>` must pass**
   before you move on. If it can't pass, report why instead of skipping it.
4. When the user just says **"implement it"** or **"continue"**, that means: take the next task for the person
   you're working for, following that protocol. Keep going task by task. Stop and report when a task is blocked,
   a decision isn't covered by the docs, or the phase is finished.

## Hard rules for this repo

- **Public repo:** never commit secrets, `.env`, backend code, or real user data (CONTEXT §5).
- **Order:** Phase 0 (cleanup & scaffold) → Phase 1 (screens on mock data) → Phase 2 (real API) → Phase 3
  (native & polish) → Phase 4 (release). Don't start a later phase's work for an area until its earlier rows are
  done.
- **Screens get data only through `src/features/*/hooks.ts`** (D-07). No `fetch` in screens.
- **No hard-coded colors**: use `useTheme()` tokens (SPEC §6).
- **Don't add a library or change an architecture decision without recording it** in CONTEXT.md's decision log.
- **Commits:** one line, `<task-id>: <summary>`, on a branch named `<name>/<task-id>-<slug>`.
- If the docs and the code disagree, the docs win, unless the docs are clearly out of date. In that case fix the
  docs and log it.

---

# Expo guidance

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
