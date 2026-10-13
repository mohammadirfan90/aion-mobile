#!/usr/bin/env node
/**
 * Project status and phase verification for Aion Mobile.
 *
 *   node scripts/verify.mjs status                 progress, next tasks per person, blockers (reads docs/TRACKER.md)
 *   node scripts/verify.mjs status --owner Maria   only Maria's next tasks
 *   node scripts/verify.mjs check                  quality gates for a single task (SPEC §9)
 *   node scripts/verify.mjs phase 0                verify that a phase is really complete (tracker + repo checks)
 *
 * After P0-05 the same commands are available as `npm run status` and `npm run verify -- <command>`.
 *
 * Options: --skip-commands (don't run npm/expo commands), --doctor (also run `npx expo-doctor`).
 * Exit code is 1 if any check fails. No dependencies; Node 18+.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

// ── output ────────────────────────────────────────────────────────────────────
const results = { pass: 0, fail: 0, warn: 0 };
const color = (code, s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const pass = (msg) => (results.pass++, console.log(`  ${color(32, "✔")} ${msg}`));
const fail = (msg, detail) => {
  results.fail++;
  console.log(`  ${color(31, "✖")} ${msg}`);
  if (detail) for (const line of [].concat(detail).slice(0, 15)) console.log(`      ${color(90, line)}`);
};
const warn = (msg, detail) => {
  results.warn++;
  console.log(`  ${color(33, "⚠")} ${msg}`);
  if (detail) for (const line of [].concat(detail).slice(0, 10)) console.log(`      ${color(90, line)}`);
};
const heading = (s) => console.log(`\n${color(1, s)}`);
const check = (ok, msg, detail) => (ok ? pass(msg) : fail(msg, detail));

// ── files ─────────────────────────────────────────────────────────────────────
const abs = (p) => join(ROOT, p);
const exists = (p) => existsSync(abs(p));
const read = (p) => (exists(p) ? readFileSync(abs(p), "utf8") : "");
const readJson = (p) => {
  try {
    return JSON.parse(read(p));
  } catch {
    return null;
  }
};
function walk(dir, filter = () => true) {
  const out = [];
  if (!exists(dir)) return out;
  for (const name of readdirSync(abs(dir))) {
    const rel = join(dir, name);
    if (statSync(abs(rel)).isDirectory()) out.push(...walk(rel, filter));
    else if (filter(rel)) out.push(rel);
  }
  return out;
}
const posix = (p) => p.split(sep).join("/");
const isTs = (p) => /\.(ts|tsx)$/.test(p) && !p.endsWith(".d.ts");
function grep(files, regex, { skip } = {}) {
  const hits = [];
  for (const f of files) {
    if (skip?.(f)) continue;
    read(f)
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (regex.test(line)) hits.push(`${posix(f)}:${i + 1}  ${line.trim().slice(0, 100)}`);
      });
  }
  return hits;
}
function run(cmd, cmdArgs) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32" });
  return { ok: r.status === 0, output: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
}
const git = (...a) => run("git", a);
const pkg = () => readJson("package.json") ?? {};
const deps = () => ({ ...pkg().dependencies, ...pkg().devDependencies });

// ── tracker ───────────────────────────────────────────────────────────────────
const STATUSES = ["todo", "doing", "blocked", "review", "done"];

function parseTracker() {
  const md = read("docs/TRACKER.md");
  if (!md) return null;
  const rows = [];
  const backend = [];
  let section = null;
  let phase = null;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^## (.+)/);
    if (h) {
      section = h[1];
      const p = section.match(/^Phase (\d)/);
      phase = p ? Number(p[1]) : null;
      continue;
    }
    if (!line.startsWith("|") || /^\|\s*(ID|---)/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    const clean = (s) => s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/`/g, "").replace(/\*/g, "").trim();
    if (phase !== null && cells.length >= 5) {
      rows.push({
        id: clean(cells[0]),
        task: clean(cells[1]),
        owner: clean(cells[2]),
        status: clean(cells[3]).toLowerCase(),
        depends: clean(cells[4]),
        notes: cells[5] ?? "",
        phase,
      });
    } else if (section?.startsWith("Backend dependencies") && cells.length >= 4) {
      backend.push({ id: clean(cells[0]), need: clean(cells[1]), status: clean(cells[2]).toLowerCase(), blocks: clean(cells[3]) });
    }
  }
  const current = md.match(/## Current state\s*\n([\s\S]*?)\n## /)?.[1]
    .split(/\r?\n/)
    .filter((l) => l.startsWith("- "))
    .join("\n");
  return { rows, backend, current };
}

/** "P0-09, P0-10", "P1-S02…S06", "P2-04…P2-14", "Phase 0", "B-01" → predicate list */
function expandDepends(text) {
  if (!text || text === "—") return [];
  return text.split(",").map((t) => t.trim()).filter(Boolean).flatMap((token) => {
    const phase = token.match(/^Phase (\d)$/);
    if (phase) return [{ phase: Number(phase[1]) }];
    const range = token.split(/…|\.\.\./);
    if (range.length === 2) {
      const left = range[0].trim();
      const m = left.match(/^(.*?)(\d+)$/);
      const right = range[1].trim().match(/(\d+)$/);
      if (m && right) {
        const [, prefix, from] = m;
        const ids = [];
        for (let n = Number(from); n <= Number(right[1]); n++) ids.push({ id: prefix + String(n).padStart(from.length, "0") });
        return ids;
      }
    }
    return [{ id: token }];
  });
}

function depsSatisfied(row, tracker) {
  const byId = new Map([...tracker.rows, ...tracker.backend].map((r) => [r.id, r]));
  const missing = [];
  for (const dep of expandDepends(row.depends)) {
    if (dep.phase !== undefined) {
      const unfinished = tracker.rows.filter((r) => r.phase === dep.phase && r.status !== "done" && !isStretch(r));
      if (unfinished.length) missing.push(`Phase ${dep.phase}`);
    } else {
      const target = byId.get(dep.id);
      if (!target || target.status !== "done") missing.push(dep.id);
    }
  }
  return missing;
}
const isStretch = (r) => /stretch/i.test(r.task) || /^P\d-S\d$/.test(r.id) || r.owner === "Unassigned";
const ownerMatches = (row, who) =>
  row.owner === "Any" || row.owner.toLowerCase().split(/\s*\+\s*/).includes(who.toLowerCase());

// ── status command ────────────────────────────────────────────────────────────
function status() {
  const tracker = parseTracker();
  if (!tracker) return fail("docs/TRACKER.md not found");

  heading("Current state (from TRACKER.md)");
  console.log(tracker.current ? tracker.current.replace(/^/gm, "  ") : "  (missing)");

  heading("Progress by phase");
  const names = ["Cleanup & scaffold", "Screens (mock data)", "Integration (real API)", "Native & polish", "Release"];
  let activePhase = null;
  for (let p = 0; p <= 4; p++) {
    const rows = tracker.rows.filter((r) => r.phase === p && !isStretch(r));
    const done = rows.filter((r) => r.status === "done").length;
    const counts = STATUSES.filter((s) => s !== "done")
      .map((s) => [s, rows.filter((r) => r.status === s).length])
      .filter(([, n]) => n)
      .map(([s, n]) => `${n} ${s}`)
      .join(", ");
    const width = 20;
    const filled = rows.length ? Math.round((done / rows.length) * width) : 0;
    const bar = `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
    if (activePhase === null && done < rows.length) activePhase = p;
    console.log(`  Phase ${p} ${names[p].padEnd(24)} ${bar} ${done}/${rows.length}${counts ? `  (${counts})` : ""}`);
  }
  console.log(`\n  Active phase: ${activePhase === null ? "all phases done 🎉" : `Phase ${activePhase}`}`);

  const unknown = tracker.rows.filter((r) => !STATUSES.includes(r.status));
  if (unknown.length) warn("Rows with an unknown status", unknown.map((r) => `${r.id}: "${r.status}"`));

  const inFlight = tracker.rows.filter((r) => ["doing", "review", "blocked"].includes(r.status));
  heading("In progress / review / blocked");
  if (!inFlight.length) console.log("  none");
  for (const r of inFlight) console.log(`  ${r.status.padEnd(8)} ${r.id.padEnd(7)} ${r.owner.padEnd(14)} ${r.task.slice(0, 70)}${r.status === "blocked" && r.notes ? `\n           ↳ ${r.notes.slice(0, 100)}` : ""}`);

  heading("Next available tasks (status todo, dependencies done)");
  const who = option("--owner");
  for (const person of who ? [who] : ["Irfan", "Maria"]) {
    const next = tracker.rows
      .filter((r) => r.status === "todo" && !isStretch(r) && ownerMatches(r, person) && depsSatisfied(r, tracker).length === 0)
      .slice(0, 4);
    console.log(`  ${person}:`);
    if (!next.length) {
      const waiting = tracker.rows.find((r) => r.status === "todo" && !isStretch(r) && ownerMatches(r, person));
      console.log(waiting ? `    nothing unblocked; first waiting task ${waiting.id} needs ${depsSatisfied(waiting, tracker).join(", ")}` : "    nothing left 🎉");
    }
    for (const r of next) console.log(`    ${r.id.padEnd(7)} ${r.task.slice(0, 80)}${r.owner === "Any" ? "  [Any]" : ""}`);
  }

  heading("Backend dependencies");
  for (const b of tracker.backend) {
    const label = (b.status || "—").padEnd(8);
    const mark = b.status === "done" ? color(32, label) : b.status === "ongoing" ? color(90, label) : color(33, label);
    console.log(`  ${b.id.padEnd(5)} ${mark} ${b.need.slice(0, 80)}`);
  }

  // Screen implementation snapshot: route files still holding the P0-11 placeholder marker.
  const routes = ROUTES.filter((r) => exists(r.file));
  if (routes.length) {
    const placeholders = routes.filter((r) => PLACEHOLDER.test(read(r.file)));
    heading("Screens");
    console.log(`  ${routes.length - placeholders.length}/${ROUTES.length} routes implemented (no placeholder), ${ROUTES.length - routes.length} missing`);
  }

  const log = (name) => read(`docs/log/${name}.md`).match(/^## .+$/m)?.[0]?.replace("## ", "") ?? "no entries";
  heading("Latest log entries");
  console.log(`  Irfan: ${log("irfan")}\n  Maria: ${log("maria")}`);
  console.log(`\n  Verify a finished phase with:  node scripts/verify.mjs phase <n>`);
  return true;
}

// ── shared checks ─────────────────────────────────────────────────────────────
/** A route still showing its P0-11 placeholder: the literal marker or the shared <Placeholder> component. */
const PLACEHOLDER = /TODO S\d\d|<Placeholder\b/;

const ROUTES = [
  ["src/app/_layout.tsx", "root"],
  ["src/app/(auth)/_layout.tsx", "auth"],
  ["src/app/(auth)/welcome.tsx", "S01"],
  ["src/app/(auth)/login.tsx", "S02"],
  ["src/app/(auth)/signup.tsx", "S03"],
  ["src/app/(auth)/verify-email.tsx", "S04"],
  ["src/app/(auth)/forgot-password.tsx", "S05"],
  ["src/app/(auth)/reset-password.tsx", "S06"],
  ["src/app/(app)/_layout.tsx", "app"],
  ["src/app/(app)/(tabs)/_layout.tsx", "tabs"],
  ["src/app/(app)/(tabs)/index.tsx", "S07"],
  ["src/app/(app)/(tabs)/explore.tsx", "S08"],
  ["src/app/(app)/(tabs)/learning.tsx", "S09"],
  ["src/app/(app)/(tabs)/community.tsx", "S19"],
  ["src/app/(app)/(tabs)/profile.tsx", "S25"],
  ["src/app/(app)/course/[id]/index.tsx", "S10"],
  ["src/app/(app)/course/[id]/curriculum.tsx", "S11"],
  ["src/app/(app)/course/[id]/certificate.tsx", "S28"],
  ["src/app/(app)/lesson/[id]/index.tsx", "S12"],
  ["src/app/(app)/lesson/[id]/notes.tsx", "S13"],
  ["src/app/(app)/lesson/[id]/summary.tsx", "S14"],
  ["src/app/(app)/lesson/[id]/comments.tsx", "S18"],
  ["src/app/(app)/lesson/[id]/quiz.tsx", "S15"],
  ["src/app/(app)/lesson/[id]/assignment.tsx", "S16"],
  ["src/app/(app)/tutor.tsx", "S17"],
  ["src/app/(app)/forum/[id].tsx", "S20"],
  ["src/app/(app)/forum/new.tsx", "S21"],
  ["src/app/(app)/support/index.tsx", "S22"],
  ["src/app/(app)/support/[id].tsx", "S23"],
  ["src/app/(app)/support/new.tsx", "S24"],
  ["src/app/(app)/profile/edit.tsx", "S26"],
  ["src/app/(app)/settings.tsx", "S27"],
  ["src/app/verify/index.tsx", "S29"],
  ["src/app/verify/[code].tsx", "S29"],
].map(([file, screen]) => ({ file, screen }));

function hygieneChecks() {
  heading("Repo hygiene (public repo rules)");
  const tracked = git("ls-files").output.split(/\r?\n/).filter(Boolean);
  check(!tracked.some((f) => /^\.env($|\.)/.test(f) && f !== ".env.example"), "no .env files committed", tracked.filter((f) => /^\.env/.test(f) && f !== ".env.example"));
  check(!tracked.some((f) => /^(ios|android)\//.test(f)), "no generated ios/ or android/ folders committed");
  const secretPattern = /service_role|sk_live_|sk_test_|RECAPTCHA_SECRET|CLOUDINARY_API_SECRET|STRIPE_SECRET|-----BEGIN [A-Z ]*PRIVATE KEY/;
  const scanned = tracked.filter((f) => !/(package-lock\.json|openapi\.json|scripts\/verify\.mjs|\.(png|jpg|jpeg|gif|webp|ttf|otf))$/.test(f) && existsSync(abs(f)));
  const secrets = grep(scanned, secretPattern);
  check(secrets.length === 0, "no secrets or server keys in tracked files", secrets);
}

function codeChecks() {
  heading("Code rules (SPEC §4, §6, §9)");
  const appCode = [...walk("src/app", isTs), ...walk("src/features", isTs), ...walk("src/components", isTs)];
  if (!appCode.length) return warn("no source files in src/app, src/features or src/components yet");
  // auth-screen.tsx is the legacy visual reference, kept until P1-X1 deletes it.
  const hex = grep(appCode, /['"`]#[0-9a-fA-F]{3,8}['"`]|\brgba?\(/, {
    skip: (f) => posix(f).includes("/theme/") || posix(f).endsWith("components/auth-screen.tsx"),
  });
  check(hex.length === 0, "no hard-coded colors outside src/theme", hex);
  const screens = [...walk("src/app", isTs), ...walk("src/features", (f) => isTs(f) && posix(f).includes("/screens/"))];
  const fetches = grep(screens, /\bfetch\(/);
  check(fetches.length === 0, "screens and routes never call fetch() (use feature hooks)", fetches);
  const logs = grep(walk("src", isTs), /console\.log\(/);
  check(logs.length === 0, "no console.log left in src", logs);
  const routeLogic = walk("src/app", isTs).filter((f) => read(f).split(/\r?\n/).length > 60 && !posix(f).endsWith("_layout.tsx"));
  if (routeLogic.length) warn("route files over 60 lines; routes should only render a feature screen", routeLogic.map(posix));
}

function commandChecks() {
  if (flag("--skip-commands")) return warn("skipped npm commands (--skip-commands)");
  heading("Commands");
  const scripts = pkg().scripts ?? {};
  if (!scripts.check) fail('npm script "check" is missing (P0-05 adds it: lint + typecheck)');
  else {
    const r = run("npm", ["run", "check", "--silent"]);
    check(r.ok, "npm run check (lint + typecheck)", r.ok ? undefined : r.output.split(/\r?\n/).slice(-15));
  }
  if (scripts.test) {
    const r = run("npm", ["test", "--silent", "--", "--watchAll=false"]);
    check(r.ok, "npm test", r.ok ? undefined : r.output.split(/\r?\n/).slice(-15));
  }
  if (flag("--doctor")) {
    const r = run("npx", ["expo-doctor"]);
    check(r.ok, "npx expo-doctor", r.ok ? undefined : r.output.split(/\r?\n/).slice(-15));
  }
}

function trackerPhaseCheck(phase) {
  heading(`Tracker: Phase ${phase} rows`);
  const tracker = parseTracker();
  if (!tracker) return fail("docs/TRACKER.md not found");
  const rows = tracker.rows.filter((r) => r.phase === phase && !isStretch(r));
  const open = rows.filter((r) => r.status !== "done");
  check(open.length === 0, `all ${rows.length} Phase ${phase} tasks are done`, open.map((r) => `${r.id} (${r.status}, ${r.owner})`));
  const logsUpdated = ["irfan", "maria"].some((n) => /^## \d{4}-\d{2}-\d{2}/m.test(read(`docs/log/${n}.md`)));
  check(logsUpdated, "work logs have dated entries");
}

const requireDeps = (names, level = "fail") => {
  const have = deps();
  const missing = names.filter((n) => !have[n]);
  (level === "fail" ? check : (ok, m, d) => (ok ? pass(m) : warn(m, d)))(missing.length === 0, `packages installed: ${names.join(", ")}`, missing.map((m) => `missing ${m}`));
};
const requireFiles = (files, label) => {
  const missing = files.filter((f) => !exists(f));
  check(missing.length === 0, label, missing.map((f) => `missing ${f}`));
};

// ── phase checks ──────────────────────────────────────────────────────────────
const PHASES = {
  0() {
    heading("Phase 0: cleanup");
    const leftovers = [
      "src/app/explore.tsx", "src/components/animated-icon.tsx", "src/components/animated-icon.web.tsx",
      "src/components/animated-icon.module.css", "src/components/app-tabs.tsx", "src/components/app-tabs.web.tsx",
      "src/components/external-link.tsx", "src/components/hint-row.tsx", "src/components/web-badge.tsx",
      "src/components/ui/collapsible.tsx", "src/components/themed-text.tsx", "src/components/themed-view.tsx",
      "src/constants/theme.ts", "assets/images/react-logo.png", "assets/images/expo-badge.png",
      "assets/images/expo-logo.png", "assets/images/tutorial-web.png", "assets/images/tabIcons",
      "scripts/reset-project.js",
    ].filter(exists);
    check(leftovers.length === 0, "template leftovers removed (P0-01)", leftovers);

    const expo = readJson("app.json")?.expo ?? {};
    check(expo.name === "Aion" && expo.slug === "aion-mobile" && expo.scheme === "aion", 'app.json name "Aion", slug "aion-mobile", scheme "aion" (P0-02)', [`name=${expo.name} slug=${expo.slug} scheme=${expo.scheme}`]);
    check(Boolean(expo.ios?.bundleIdentifier && expo.android?.package), "ios.bundleIdentifier and android.package set (P0-02)");
    check(pkg().name === "aion-mobile" && !pkg().scripts?.["reset-project"], 'package.json name "aion-mobile", no reset-project script (P0-02)');
    check(!/your-org|Aion_MobileApp/.test(read("README.md")) && !/650 Industries/.test(read("LICENSE")), "README and LICENSE no longer template text (P0-03)");

    heading("Phase 0: environment & tooling");
    const envExample = read(".env.example");
    const envKeys = ["EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_WEB_URL", "EXPO_PUBLIC_USE_MOCKS"];
    check(envKeys.every((k) => envExample.includes(k)), ".env.example lists every EXPO_PUBLIC_* variable (P0-04)", envKeys.filter((k) => !envExample.includes(k)));
    check(/^\.env$/m.test(read(".gitignore")), ".gitignore ignores .env (P0-04)");
    requireFiles(["src/lib/env.ts"], "src/lib/env.ts exists (P0-04)");
    const scripts = pkg().scripts ?? {};
    const wanted = ["typecheck", "check", "api:types", "status", "verify"];
    check(wanted.every((s) => scripts[s]), `npm scripts ${wanted.join(", ")} exist (P0-05)`, wanted.filter((s) => !scripts[s]));
    requireDeps(["@tanstack/react-query", "zustand", "react-hook-form", "zod", "@hookform/resolvers", "lucide-react-native", "openapi-fetch", "openapi-typescript", "@supabase/supabase-js", "@react-native-async-storage/async-storage"]);

    heading("Phase 0: scaffold");
    requireFiles(["src/api/client.ts", "src/api/schema.d.ts", "src/api/types.ts", "src/api/query-keys.ts", "src/lib/errors.ts"], "API layer files exist (P0-07)");
    requireFiles(["src/theme/tokens.ts", "src/theme/index.tsx"], "theme files exist (P0-08)");
    const kit = ["Screen", "Text", "Button", "IconButton", "TextField", "OtpInput", "Card", "ListItem", "Avatar", "Badge", "Chip", "SegmentedControl", "ProgressBar", "ProgressRing", "Skeleton", "EmptyState", "ErrorState", "Divider", "SearchBar", "Toast", "Header"];
    const kitFiles = walk("src/components/ui", isTs).map((f) => posix(f).split("/").pop().replace(/\.tsx?$/, "").replace(/-/g, "").toLowerCase());
    const missingKit = kit.filter((c) => !kitFiles.includes(c.toLowerCase()));
    check(missingKit.length === 0, `UI kit complete: ${kit.length} components (P0-09)`, missingKit.map((c) => `missing src/components/ui/${c}.tsx`));
    const fixtures = walk("src/mocks/fixtures").map((f) => posix(f).toLowerCase());
    const areas = ["user", "course", "curriculum", "enrollment", "progress", "note", "comment", "quiz", "assignment", "forum", "ticket", "ai", "certificate"];
    const missingAreas = areas.filter((a) => !fixtures.some((f) => f.includes(a)));
    check(missingAreas.length === 0, "fixtures cover every area (P0-10)", missingAreas.map((a) => `no fixture file for "${a}"`));
    const missingRoutes = ROUTES.filter((r) => !exists(r.file));
    check(missingRoutes.length === 0, `all ${ROUTES.length} route files exist (P0-11)`, missingRoutes.map((r) => `missing ${r.file} (${r.screen})`));
  },

  1() {
    heading("Phase 1: screens");
    const missing = ROUTES.filter((r) => !exists(r.file));
    check(missing.length === 0, "all route files exist", missing.map((r) => r.file));
    const placeholders = ROUTES.filter((r) => exists(r.file) && PLACEHOLDER.test(read(r.file)));
    check(placeholders.length === 0, "no placeholder screens left (no TODO Sxx marker or <Placeholder>)", placeholders.map((r) => `${r.screen}  ${r.file}`));
    check(!exists("src/components/auth-screen.tsx"), "legacy auth-screen.tsx deleted (P1-X1)");
    const designs = walk("docs/design").map((f) => posix(f).split("/").pop());
    const screenIds = [...new Set(ROUTES.map((r) => r.screen).filter((s) => /^S\d\d$/.test(s)))];
    const undesigned = screenIds.filter((id) => !designs.some((f) => f.startsWith(`${id}-`)));
    if (undesigned.length) warn("screens without a design image in docs/design (build from SCREENS.md)", undesigned);
    else pass(`design images present for all ${screenIds.length} screens`);
    const features = ["auth", "home", "catalog", "learning", "lesson", "quiz", "assignment", "tutor", "community", "support", "profile", "certificate"];
    const noHooks = features.filter((f) => !exists(`src/features/${f}/hooks.ts`));
    check(noHooks.length === 0, "every feature has hooks.ts (data only through hooks, D-07)", noHooks.map((f) => `missing src/features/${f}/hooks.ts`));
    requireDeps(["expo-video", "react-native-webview"]);
  },

  2() {
    heading("Phase 2: integration");
    requireFiles(["src/lib/supabase.ts", "src/lib/sse.ts", "src/lib/course.ts", "src/lib/lesson.ts"], "integration helpers exist");
    const tests = walk("src", (f) => /\.test\.(ts|tsx)$/.test(f)).map(posix);
    const untested = ["course", "lesson", "sse"].filter((n) => !tests.some((t) => t.includes(`lib/${n}.test`)));
    check(untested.length === 0, "lib helpers have unit tests (SPEC §9)", untested.map((n) => `missing src/lib/${n}.test.ts`));
    check(Boolean(pkg().scripts?.test), 'npm script "test" exists');
    check(/X-Aion-Client/.test(walk("src", isTs).map(read).join("\n")), "signup sends X-Aion-Client: mobile (API §2)");
    check(/EXPO_PUBLIC_USE_MOCKS=false/.test(read(".env.example")), "mocks off by default in .env.example (P2-15)");
    const realLess = walk("src/features", (f) => posix(f).endsWith("/api.ts")).filter((f) => !/\bapi\.(GET|POST|PUT|PATCH|DELETE)\b|unwrap\(|\brequest[<(]|supabase\./.test(read(f)));
    check(realLess.length === 0, "every feature api.ts has a real (non-mock) implementation", realLess.map(posix));
    requireDeps(["expo-image-picker", "expo-document-picker", "expo-image-manipulator"]);
  },

  3() {
    heading("Phase 3: native & polish");
    requireDeps(["expo-camera", "expo-local-authentication", "expo-sharing"]);
    const src = walk("src", isTs).map(read).join("\n");
    check(/persistQueryClient|PersistQueryClientProvider/.test(src), "react-query cache is persisted (P3-02)");
    check(/useLocalAuthentication|LocalAuthentication\./.test(src), "biometric lock implemented (P3-04)");
    check(/CameraView|useCameraPermissions/.test(src), "QR scanner implemented (P3-01)");
    check(readJson("app.json")?.expo?.scheme === "aion", 'deep link scheme "aion" (P3-06)');
  },

  4() {
    heading("Phase 4: release");
    const eas = readJson("eas.json");
    check(Boolean(eas?.build?.preview), "eas.json has a preview build profile (P4-01)");
    check(eas?.build?.preview?.android?.buildType === "apk", "preview profile builds an APK (P4-01)");
    const readme = read("README.md");
    check(/screenshot/i.test(readme) && /demo/i.test(readme), "README has screenshots and demo info (P4-03)");
    const tag = git("tag", "--list", "v1.0.0").output;
    tag ? pass("git tag v1.0.0 exists (P4-06)") : warn("git tag v1.0.0 not created yet (P4-06)");
  },
};

// ── main ──────────────────────────────────────────────────────────────────────
const [command, value] = args.filter((a) => !a.startsWith("--") && a !== option("--owner"));

if (!command || command === "status") {
  status();
} else if (command === "check") {
  console.log(color(1, "Task quality gates (SPEC §9)"));
  hygieneChecks();
  codeChecks();
  commandChecks();
} else if (command === "phase" && PHASES[value]) {
  const n = Number(value);
  console.log(color(1, `Verifying Phase ${n}`));
  trackerPhaseCheck(n);
  PHASES[n]();
  hygieneChecks();
  codeChecks();
  commandChecks();
} else {
  console.log("Usage: node scripts/verify.mjs status [--owner <name>] | check | phase <0-4>   [--skip-commands] [--doctor]");
  process.exit(2);
}

if (command && command !== "status") {
  const summary = `${results.pass} passed, ${results.fail} failed, ${results.warn} warnings`;
  console.log(`\n${results.fail ? color(31, `✖ ${summary}`) : color(32, `✔ ${summary}`)}`);
  if (command === "phase" && !results.fail) console.log(`Phase ${value} verified. Update "Current state" in docs/TRACKER.md.`);
  process.exit(results.fail ? 1 : 0);
}
