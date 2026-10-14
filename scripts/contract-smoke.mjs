#!/usr/bin/env node
/**
 * Contract smoke test against the deployed API (INTEGRATION.md §4, step 1).
 * Signs in as a test student, calls the endpoints the app depends on and fails
 * loudly when a response doesn't have the shape the app expects.
 *
 *   node scripts/contract-smoke.mjs            public checks, plus signed-in checks with AION_SMOKE_EMAIL / AION_SMOKE_PASSWORD (.env)
 *   node scripts/contract-smoke.mjs --signup   create that account first (needs "Confirm email" off, D-17)
 *
 * Reads EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
 * and the smoke credentials from `.env`. Never commit those credentials.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const env = { ...readDotEnv(join(ROOT, ".env")), ...process.env };
const API = (env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");
const SUPABASE = (env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = env.AION_SMOKE_EMAIL;
const PASSWORD = env.AION_SMOKE_PASSWORD;

let failures = 0;
const ok = (m) => console.log(`  ✔ ${m}`);
const bad = (m, d) => { failures++; console.log(`  ✖ ${m}${d ? `\n      ${d}` : ""}`); };

function readDotEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8").split(/\r?\n/)
      .filter((l) => /^[A-Z0-9_]+=/.test(l))
      .map((l) => { const [k, v] = l.split(/=(.*)/); return [k, (v ?? "").replace(/^"|"$/g, "")]; }),
  );
}

async function api(path, { token, method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${API}/api/v1${path}`, {
    method,
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

/** Checks `obj` has every key in `keys` (dot paths allowed for one level). */
function hasKeys(label, obj, keys) {
  if (!obj || typeof obj !== "object") return bad(`${label}: not an object`, JSON.stringify(obj)?.slice(0, 200));
  const missing = keys.filter((k) => !(k in obj));
  missing.length ? bad(`${label}: missing ${missing.join(", ")}`, `got keys: ${Object.keys(obj).join(", ")}`) : ok(`${label} shape`);
}

async function main() {
  if (!API || !SUPABASE || !ANON) throw new Error("Set EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env");

  console.log(`API ${API}`);
  const t0 = Date.now();
  const health = await fetch(`${API}/health`).then((r) => r.json()).catch(() => null);
  health?.status === "ok" ? ok(`health (${Date.now() - t0} ms)`) : bad("health", JSON.stringify(health));

  if (process.argv.includes("--signup")) {
    const r = await api("/auth/signup", {
      method: "POST",
      headers: { "X-Aion-Client": "mobile" },
      body: { email: EMAIL, password: PASSWORD, firstName: "Smoke", lastName: "Student", username: "smoke_student" },
    });
    if (r.json?.success) ok(`signup (session ${r.json.data.session ? "returned: confirm-email is off" : "null: confirm-email is ON"})`);
    else console.log(`  · signup: ${r.status} ${r.json?.error?.code} ${r.json?.error?.message}`);
  }

  // Public endpoints (no account needed).
  const pub = await api("/courses?limit=100");
  const list = pub.json?.data;
  if (!Array.isArray(list) || !list.length) bad("GET /courses", JSON.stringify(pub.json)?.slice(0, 200));
  else {
    ok(`GET /courses (${list.length} courses)`);
    hasKeys("Course", list[0], ["id", "title", "slug", "level", "pricingConfig", "accessConfig", "thumbnail"]);
    "inviteCode" in (list[0].accessConfig ?? {}) ? bad("Course.accessConfig leaks inviteCode") : ok("Course.accessConfig has no inviteCode");
    const cur = await api(`/courses/${list[0].id}/curriculum`);
    hasKeys("GET /courses/{id}/curriculum", cur.json?.data, ["course", "chapters", "stats"]);
    const ch = cur.json?.data?.chapters?.[0];
    if (ch) hasKeys("Chapter", ch, ["id", "title", "position", "isLocked", "activities"]);
    const lesson = ch?.activities?.[0];
    if (lesson) {
      hasKeys("Lesson outline", lesson, ["id", "type", "title", "content", "videoUrl", "metadata", "durationSeconds"]);
      lesson.content === null && lesson.videoUrl === null ? ok("anonymous curriculum hides lesson content") : bad("anonymous curriculum exposes lesson content");
      const l = await api(`/lessons/${lesson.id}`);
      l.status === 401 || lesson.metadata?.isPreview ? ok("GET /lessons/{id} needs sign-in") : bad("GET /lessons/{id} anonymous", `${l.status}`);
    }
  }
  const forum = await api("/forum/posts?limit=2");
  hasKeys("GET /forum/posts", forum.json?.data, ["posts", "total"]);

  if (!EMAIL || !PASSWORD) {
    console.log("  · signed-in checks skipped: set AION_SMOKE_EMAIL and AION_SMOKE_PASSWORD in .env");
  } else {
    const auth = await fetch(`${SUPABASE}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    }).then((r) => r.json());
    if (!auth.access_token) bad("Supabase password sign-in", auth.error_code || auth.msg || JSON.stringify(auth));
    else {
      ok("Supabase password sign-in");
      const token = auth.access_token;
      const me = await api("/users/me", { token });
      hasKeys("GET /users/me", me.json?.data, ["id", "email", "username", "name", "role", "avatarUrl", "aiConsent", "createdAt"]);
      const summary = await api("/users/me/learning-summary", { token });
      hasKeys("GET /users/me/learning-summary", summary.json?.data, ["totalEnrolled", "totalCompleted", "inProgress", "totalLessonsFinished", "courses"]);
      const enrollments = await api("/enrollments/my", { token });
      Array.isArray(enrollments.json?.data) ? ok(`GET /enrollments/my (${enrollments.json.data.length} rows)`) : bad("GET /enrollments/my", JSON.stringify(enrollments.json));
      const tickets = await api("/support/tickets", { token });
      hasKeys("GET /support/tickets", tickets.json?.data, ["tickets", "total"]);
    }
  }

  console.log(failures ? `\n✖ ${failures} contract check(s) failed` : "\n✔ contract smoke passed");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(`✖ ${e.message}`); process.exit(1); });
