/**
 * SMOKE CHECK — the fourth commit gate.
 *
 * `tsc --noEmit`, `lint` and `build` all verify that the code COMPILES.
 * Not one of them verifies that a page OPENS. This does.
 *
 * It exists because the same bug shipped twice — a function passed across
 * the Server -> Client boundary (commit 245f4f3, which 500'd /profile;
 * then 2026-08-20, which 500'd /admin/roles). Both times the three
 * existing gates passed. See CODING_GUIDELINES.md §5a.
 *
 * WHY IT SIGNS IN. Most routes in this app end with redirect() for a
 * signed-out visitor, so an unauthenticated request returns 307 WITHOUT
 * EVER RENDERING the page. That is not a theory: /admin/roles returned
 * 307 with no session and 500 with one, from the same broken build. A
 * smoke check that does not authenticate would have passed straight
 * through the bug it exists to catch.
 *
 *   npm run smoke          # public + authenticated (needs SMOKE_TEST_*)
 *   npm run smoke:public   # public routes only (what CI can run)
 *
 * CI runs the public tier only: it builds with placeholder Supabase
 * credentials, so no session is obtainable there. Covering the protected
 * routes in CI needs a dedicated test Supabase project — TECH_DEBT #6,
 * not a new item.
 *
 * A route is a FAILURE if it returns >= 500, or if it returns 200 while
 * rendering the global error boundary (a client-side throw is caught by
 * app/error.tsx and still answers 200 — status alone would miss it).
 */

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.SMOKE_PORT || 3100);
const BASE = `http://127.0.0.1:${PORT}`;
const PUBLIC_ONLY = process.argv.includes("--public-only");

/** Rendered by app/error.tsx. A page that throws during client render
 *  still answers 200 with this in the body. */
const ERROR_BOUNDARY_MARKER = "حدث خطأ غير متوقع";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/update-password", "/courses"];

/** Every static route behind auth. Dynamic routes ([id]) are resolved at
 *  run time below, and SKIPPED LOUDLY when no real row exists — never
 *  silently dropped. */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/onboarding",
  "/community",
  "/games",
  "/level2/games",
  "/assessments",
  "/instructors",
  "/ai-assist",
  "/project",
  "/project/new",
  "/admin/roles",
  "/admin/pricing",
  "/admin/content/pmp",
  "/admin/content/english",
  "/instructor/courses",
  "/instructor/review",
  "/assessor/queue",
];

function loadEnv() {
  const env = { ...process.env };
  if (existsSync(".env.local")) {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(BASE, { redirect: "manual" });
      if (r.status > 0) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function signIn(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = env.SMOKE_TEST_EMAIL;
  const password = env.SMOKE_TEST_PASSWORD;
  if (!url || !key || !email || !password) return null;

  const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`smoke: sign-in failed — ${JSON.stringify(j)}`);

  // Same cookie shape @supabase/ssr reads on the server.
  const ref = new URL(url).hostname.split(".")[0];
  const session = {
    access_token: j.access_token,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: j.expires_at,
    refresh_token: j.refresh_token,
    user: j.user,
  };
  const b64 = Buffer.from(JSON.stringify(session)).toString("base64");
  return { cookie: `sb-${ref}-auth-token=base64-${b64}`, token: j.access_token, url, key };
}

/** One real id per dynamic route, read through the signed-in user's own
 *  session so RLS applies exactly as it would in the browser. */
async function resolveDynamicRoutes(session) {
  if (!session) return [];
  const get = async (table, select = "id") => {
    const r = await fetch(`${session.url}/rest/v1/${table}?select=${select}&limit=1`, {
      headers: { apikey: session.key, Authorization: `Bearer ${session.token}` },
    });
    if (!r.ok) return null;
    const rows = await r.json();
    return rows?.[0]?.id ?? null;
  };

  const routes = [];
  const courseId = await get("courses");
  if (courseId) routes.push(`/courses/${courseId}`);
  else console.warn("  ! skipped /courses/[id] — no readable course row");

  const projectId = await get("projects");
  if (projectId) routes.push(`/project/${projectId}`);
  else console.warn("  ! skipped /project/[id] — no readable project row");

  return routes;
}

async function check(path, cookie) {
  const headers = cookie ? { cookie } : {};
  let res;
  try {
    res = await fetch(BASE + path, { headers, redirect: "manual" });
  } catch (err) {
    return { path, ok: false, detail: `request failed: ${err.message}` };
  }
  if (res.status >= 500) return { path, ok: false, detail: `HTTP ${res.status}` };

  // A REDIRECT IS NOT A PASS. The page never rendered, so nothing about
  // it was verified — and this is precisely how the bug this gate exists
  // for stays hidden (/admin/roles: 307 signed-out, 500 signed-in). It is
  // not a failure either, since the redirect may be correct for this
  // account; it is reported as UNVERIFIED and summarised at the end.
  if (res.status >= 300 && res.status < 400) {
    return { path, ok: true, unverified: true, detail: `HTTP ${res.status} -> ${res.headers.get("location") || "?"} (NOT RENDERED)` };
  }

  if (res.status === 200) {
    const body = await res.text();
    if (body.includes(ERROR_BOUNDARY_MARKER)) {
      return { path, ok: false, detail: "HTTP 200 but rendered the global error boundary" };
    }
  }
  return { path, ok: true, detail: `HTTP ${res.status}` };
}

async function main() {
  const env = loadEnv();

  console.log(`smoke: starting next start on :${PORT}`);
  // node on next's bin directly, NOT `npx`/`shell: true`. With a shell
  // wrapper on Windows, server.kill() kills the wrapper and leaves the
  // real server listening, its pipes hold stdout open, and this process
  // never exits — a gate that hangs is a gate nobody runs.
  const nextBin = new URL("../node_modules/next/dist/bin/next", import.meta.url);
  const server = spawn(process.execPath, [fileURLToPath(nextBin), "start", "-p", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env,
  });
  let serverLog = "";
  server.stdout.on("data", (d) => (serverLog += d));
  server.stderr.on("data", (d) => (serverLog += d));

  const failures = [];
  const unverified = [];
  try {
    if (!(await waitForServer())) {
      console.error("smoke: server never became ready.\n" + serverLog);
      process.exitCode = 1;
      return;
    }

    let session = null;
    if (!PUBLIC_ONLY) {
      session = await signIn(env);
      if (!session) {
        // Loud, not silent. A gate that quietly covers less than it
        // claims is worse than no gate.
        console.warn(
          "\n  !! SMOKE_TEST_EMAIL / SMOKE_TEST_PASSWORD not set — " +
            "PROTECTED ROUTES WERE NOT CHECKED.\n" +
            "     These are exactly the routes where Server->Client " +
            "boundary bugs surface (a signed-out request redirects\n" +
            "     before rendering). Set them in .env.local to close the gate.\n"
        );
      }
    }

    // Public routes are checked SIGNED OUT and protected ones SIGNED IN —
    // each in the state it is written for. Requesting /login with a
    // session just redirects to /profile and verifies nothing.
    const routes = [
      ...PUBLIC_ROUTES.map((p) => ({ path: p, cookie: null })),
      ...(session ? PROTECTED_ROUTES.map((p) => ({ path: p, cookie: session.cookie })) : []),
      ...(await resolveDynamicRoutes(session)).map((p) => ({ path: p, cookie: session?.cookie })),
    ];

    console.log(`smoke: checking ${routes.length} route(s)${session ? " (signed in)" : ""}\n`);
    for (const { path, cookie } of routes) {
      const r = await check(path, cookie);
      console.log(`  ${r.ok ? (r.unverified ? "--  " : "ok  ") : "FAIL"}  ${path}  —  ${r.detail}`);
      if (!r.ok) failures.push(r);
      else if (r.unverified) unverified.push(r);
    }
  } finally {
    server.kill();
  }

  if (unverified.length > 0) {
    console.warn(
      `\nsmoke: ${unverified.length} route(s) REDIRECTED and were never rendered — ` +
        `nothing about them was verified:`
    );
    for (const u of unverified) console.warn(`  ${u.path} — ${u.detail}`);
    console.warn(
      "  Use a smoke account with the broadest role (admin) so these render;\n" +
        "  otherwise this gate is quietly covering less than it appears to."
    );
  }

  if (failures.length > 0) {
    console.error(`\nsmoke: ${failures.length} route(s) failed:`);
    for (const f of failures) console.error(`  ${f.path} — ${f.detail}`);
    console.error("\nServer output:\n" + serverLog.slice(-4000));
    process.exitCode = 1;
  } else {
    console.log("\nsmoke: all routes opened.");
  }

  // Explicit: even after kill(), a lingering stdio handle can keep the
  // event loop alive. The gate must always terminate.
  process.exit(failures.length > 0 ? 1 : 0);
}

main();
