import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import ts from "typescript";
import { runSignOut } from "./sign-out-plan.mjs";

// These integration tests use only synthetic accounts and isolated PGLite.
// No running app, browser storage, environment secret, or real database is read.
// The auth template stays unchanged; exercise its actual adapter and schema.
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const dialectModule = { exports: {} };
new Function(
  "require",
  "module",
  "exports",
  ts.transpileModule(readFileSync(join(root, "src/lib/auth/pglite-dialect.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
)(require, dialectModule, dialectModule.exports);

const schema = readFileSync(join(root, "migrations/0001_auth.sql"), "utf8");
const secret = "synthetic-course-auth-test-secret-never-for-production";

async function isolatedAuth(dataDir) {
  const pg = new PGlite(dataDir ? { dataDir } : {});
  await pg.exec(schema);
  const auth = betterAuth({
    baseURL: "http://localhost:8082",
    secret,
    database: { dialect: dialectModule.exports.pgliteDialect(() => pg), type: "postgres" },
    emailAndPassword: { enabled: true },
    session: { cookieCache: { enabled: true, maxAge: 300 } },
    advanced: {
      useSecureCookies: false,
      defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
      cookies: {
        session_token: { name: "__Host-grok-auth.session_token" },
        session_data: { name: "__Host-grok-auth.session_data" },
        account_data: { name: "__Host-grok-auth.account_data" },
        dont_remember: { name: "__Host-grok-auth.dont_remember" },
      },
    },
    plugins: [bearer()],
  });
  return { auth, close: () => pg.close() };
}

async function signup(auth) {
  const response = await auth.api.signUpEmail({
    body: {
      name: "Course auth synthetic test",
      email: "course-auth@example.test",
      password: "Synthetic-only-password-247!",
    },
    asResponse: true,
  });
  assert.equal(response.status, 200);
  return responseHeaders(response);
}

function responseHeaders(response) {
  // Only synthetic response cookies are held in memory; never log their values.
  return new Headers({
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; "),
  });
}

async function after301Seconds(work) {
  const RealDate = Date;
  globalThis.Date = class extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [RealDate.now() + 301_000]));
    }
    static now() {
      return RealDate.now() + 301_000;
    }
  };
  try {
    return await work();
  } finally {
    globalThis.Date = RealDate;
  }
}

test("auth parity: actual PGLite session remains valid when the five-minute cookie cache expires", async () => {
  const template = readFileSync(join(root, "src/lib/auth/server.ts"), "utf8");
  assert.match(template, /cookieCache:\s*\{\s*enabled:\s*true,\s*maxAge:\s*300\s*\}/);
  assert.match(template, /secret:\s*env\("BETTER_AUTH_SECRET"\)\s*\?\?\s*previewAuthSecret\(\)/);
  for (const name of ["session_token", "session_data", "account_data", "dont_remember"])
    assert.ok(template.includes(`__Host-grok-auth.${name}`));

  const db = await isolatedAuth();
  try {
    const headers = await signup(db.auth);
    const cached = await db.auth.api.getSession({ headers });
    const uncached = await db.auth.api.getSession({ headers, query: { disableCookieCache: true } });
    assert.ok(cached?.user.id);
    assert.equal(uncached?.user.id, cached.user.id);
    const refreshed = await after301Seconds(() => db.auth.api.getSession({ headers }));
    assert.equal(refreshed?.user.id, cached.user.id);
  } finally {
    await db.close();
  }
});

test("auth durability: reopening an isolated local database with a stable secret preserves the session", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lunar-course-auth-"));
  let db;
  try {
    db = await isolatedAuth(join(dir, "db"));
    const headers = await signup(db.auth);
    const original = await db.auth.api.getSession({ headers, query: { disableCookieCache: true } });
    assert.ok(original?.user.id);
    await db.close();
    db = undefined;

    db = await isolatedAuth(join(dir, "db"));
    const restored = await after301Seconds(() =>
      db.auth.api.getSession({ headers, query: { disableCookieCache: true } }),
    );
    assert.equal(restored?.user.id, original.user.id);
  } finally {
    if (db) await db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("auth regression: supported sign-out clears a stale bearer before email login and avoids the cache-expiry failure", async () => {
  const login = readFileSync(join(root, "src/routes/login.tsx"), "utf8");
  assert.match(
    login,
    /if\s*\(getBearerToken\(\)\)\s*\{\s*await signOut\(parents \? "\/login\?parents=true" : "\/login"\);\s*return;/,
  );

  const db = await isolatedAuth();
  try {
    const headers = await signup(db.auth);
    let storedBearer = "synthetic-expired-token-not-in-database";
    headers.set("authorization", `Bearer ${storedBearer}`);
    const cached = await db.auth.api.getSession({ headers });
    assert.ok(cached?.user.id);
    // This documents the actual conflicting-credentials failure, not fake auth:
    // the cookie cache masks an obsolete bearer until the database is consulted.
    assert.equal(
      await db.auth.api.getSession({ headers, query: { disableCookieCache: true } }),
      null,
    );
    assert.equal(await after301Seconds(() => db.auth.api.getSession({ headers })), null);

    const steps = [];
    await runSignOut({
      livePreview: false,
      hasBearer: Boolean(storedBearer),
      requestSignOut: async () => {
        const response = await db.auth.api.signOut({ headers, asResponse: true });
        assert.equal(response.status, 200);
        assert.ok(response.headers.getSetCookie().some((value) => /max-age=0/i.test(value)));
        steps.push("server-confirmed");
      },
      clearToken: () => {
        storedBearer = null;
        steps.push("token-cleared");
      },
      redirect: () => steps.push("login-redirect"),
    });
    assert.equal(storedBearer, null);
    assert.deepEqual(steps, ["server-confirmed", "token-cleared", "login-redirect"]);

    const response = await db.auth.api.signInEmail({
      body: { email: "course-auth@example.test", password: "Synthetic-only-password-247!" },
      asResponse: true,
    });
    assert.equal(response.status, 200);
    const freshHeaders = responseHeaders(response);
    const restored = await after301Seconds(() => db.auth.api.getSession({ headers: freshHeaders }));
    assert.equal(restored?.user.id, cached.user.id);
  } finally {
    await db.close();
  }
});
