import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../", import.meta.url));
const migrations = Object.fromEntries(
  readdirSync(join(root, "migrations"))
    .filter((name) => name.endsWith(".sql"))
    .map((name) => [`/migrations/${name}`, readFileSync(join(root, "migrations", name), "utf8")]),
);

function loadModules(env = {}, overrides = {}) {
  const cache = new Map(),
    isolatedGlobal = {};
  const load = (name) => {
    const path = resolve(root, name);
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    let source = readFileSync(path, "utf8");
    source = source.replace(
      /import\.meta\.glob\("\/migrations\/\*\.sql",\s*\{[\s\S]*?\}\)/g,
      "TEST_MIGRATIONS",
    );
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function(
      "require",
      "module",
      "exports",
      "process",
      "window",
      "globalThis",
      "TEST_MIGRATIONS",
      output,
    )(
      (id) => {
        if (overrides[id]) return overrides[id];
        if (id.startsWith("@/")) return load(`src/${id.slice(2)}.ts`);
        if (id.startsWith(".") && !id.endsWith(".mjs"))
          return load(resolve(dirname(path), `${id}.ts`));
        return id.startsWith(".") ? require(resolve(dirname(path), id)) : require(id);
      },
      module,
      module.exports,
      { env },
      undefined,
      isolatedGlobal,
      migrations,
    );
    return module.exports;
  };
  return load;
}

export { loadModules };
export async function testDb() {
  const directory = mkdtempSync(join(tmpdir(), "parent-prd-test-"));
  const load = loadModules({ PGLITE_DATA_DIR: directory });
  const db = load("src/lib/db.ts");
  const sql = await db.getSql();
  const pg = await db.getPglite();
  let time = Date.UTC(2026, 8, 9, 15);
  const now = () => time;
  const service = load("src/lib/server/course-service.server.ts").createCourseService(
    sql,
    "persistent",
    now,
  );
  const security = load("src/lib/server/parent-security.server.ts").createParentSecurity(
    sql,
    "persistent",
    now,
  );
  const session = async (userId = "parent-a", suffix = "") => {
    const id = userId + "-session" + suffix;
    await sql`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
      values (${userId}, 'Adulto de teste', ${userId + "@example.test"}, false, now(), now()) on conflict do nothing`;
    await sql`insert into "session" (id, token, "userId", "createdAt", "updatedAt", "expiresAt")
      values (${id}, ${id + "-token"}, ${userId}, to_timestamp(${time / 1000}), now(), to_timestamp(${(time + 86400000) / 1000})) on conflict do nothing`;
    return { id, userId, createdAt: time, expiresAt: time + 86400000 };
  };
  return {
    load,
    sql,
    service,
    security,
    session,
    now,
    advance: (ms) => {
      time += ms;
    },
    close: async () => {
      await pg.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
