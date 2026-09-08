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
const root = fileURLToPath(new URL("../", import.meta.url));
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

async function database(dataDir) {
  // Successful account writes must exercise genuinely file-backed storage.
  const ownedDirectory = dataDir ? null : mkdtempSync(join(tmpdir(), "course-sync-test-"));
  const load = loadModules({ PGLITE_DATA_DIR: dataDir ?? ownedDirectory });
  const db = load("src/lib/db.ts");
  const sql = await db.getSql();
  const pg = await db.getPglite();
  const service = load("src/lib/server/course-service.server.ts").createCourseService(
    sql,
    db.dbStorage,
    () => Date.UTC(2026, 8, 9, 15),
  );
  // Existing sync tests exercise an authenticated adult for administrative steps.
  // Raw authorization denials and PIN behaviour have separate integration tests.
  const authority = async (userId) => {
    const now = Date.UTC(2026, 8, 9, 15);
    await sql`insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") values (${userId}, 'Teste', ${userId + "@example.test"}, false, now(), now()) on conflict do nothing`;
    await sql`insert into "session" (id, token, "userId", "createdAt", "updatedAt", "expiresAt") values (${userId + "-session"}, ${userId + "-token"}, ${userId}, now(), now(), to_timestamp(${(now + 86400000) / 1000})) on conflict do nothing`;
    const session = { id: userId + "-session", userId, createdAt: now, expiresAt: now + 86400000 };
    const security = load("src/lib/server/parent-security.server.ts").createParentSecurity(
      sql,
      "persistent",
      () => now,
    );
    const unlocked = await security.setPin(session, "948372");
    return { session, grant: unlocked.grant };
  };
  const adultService = {
    ...service,
    save: async (userId, input) =>
      service.save(
        userId,
        input,
        ["settings", "claim-prize"].includes(input.command.type)
          ? await authority(userId)
          : undefined,
      ),
    importLegacy: async (userId, input) =>
      service.importLegacy(userId, input, await authority(userId)),
  };
  return {
    load,
    db,
    sql,
    service: adultService,
    close: async () => {
      await pg.close();
      if (ownedDirectory) rmSync(ownedDirectory, { recursive: true, force: true });
    },
  };
}
function request(revision, operationId, command, deviceId = "device-a") {
  return { protocolVersion: 3, expectedRevision: revision, operationId, deviceId, command };
}
function legacy(load, balance = 0) {
  const state = load("src/lib/game/types.ts").emptyState();
  delete state.course;
  state.childName = "Teste sintético";
  state.onboarded = true;
  state.club.balance = balance;
  return state;
}
async function complete(db, userId, initial = null, prefix = "match") {
  let envelope = initial ?? (await db.service.load(userId));
  let sequence = 0;
  let lastRequest;
  const send = async (command) => {
    lastRequest = request(envelope?.revision ?? 0, `${prefix}-${sequence++}`, command);
    envelope = await db.service.save(userId, lastRequest);
    assert.equal(envelope.status, "applied", envelope.message);
  };
  await send({ type: "start", matchId: "bairro-1" });
  while (envelope.activeAttempt) {
    const attempt = envelope.activeAttempt;
    if (attempt.phase === "answer")
      await send({
        type: "answer",
        attemptId: attempt.id,
        guess: db.load("src/lib/game/types.ts").factAnswer(attempt.fact),
        elapsedMs: 1000,
      });
    else if (attempt.phase === "feedback") await send({ type: "continue", attemptId: attempt.id });
    else if (attempt.phase === "shot")
      await send({ type: "shoot", attemptId: attempt.id, direction: "left" });
    else assert.fail("unexpected paused attempt");
  }
  return { envelope, lastRequest };
}

// The same executable runs in two separate processes to prove disk persistence,
// never opening a PGLite directory concurrently from different processes.
if (process.argv[2] === "durability-worker") {
  const db = await database(process.argv[4]);
  if (process.argv[3] === "write") {
    const result = await complete(db, "durable-child");
    const bought = await db.service.save(
      "durable-child",
      request(result.envelope.revision, "durable-buy", { type: "buy", itemId: "ball-gold" }),
    );
    assert.equal(bought.status, "applied");
    const equipped = await db.service.save(
      "durable-child",
      request(bought.revision, "durable-equip", { type: "equip", itemId: "ball-gold" }),
    );
    assert.equal(equipped.status, "applied");
    const started = await db.service.save(
      "durable-child",
      request(equipped.revision, "durable-attempt", { type: "start", matchId: "bairro-2" }),
    );
    const paused = await db.service.save(
      "durable-child",
      request(started.revision, "durable-pause", {
        type: "pause",
        attemptId: started.activeAttempt.id,
        elapsedMs: 12345,
      }),
    );
    assert.equal(paused.status, "applied");
  } else {
    const state = await db.service.load("durable-child");
    assert.equal(state.storage, "persistent");
    assert.deepEqual(state.state.course.completedMatches, ["bairro-1"]);
    assert.equal(state.state.club.balance, 0);
    assert.equal(state.state.cosmetics.ballId, "ball-gold");
    assert.equal(state.activeAttempt.phase, "paused");
    assert.equal(state.activeAttempt.mathElapsedMs, 12345);
    assert.equal((await db.sql`select * from learning_events where user_id = 'durable-child'`).length, 15);
    const durableCoins = await db.sql`select amount from coin_events where user_id = 'durable-child'`;
    assert.deepEqual(durableCoins.map((row) => row.amount).sort((a, b) => a - b), [-30, 30]);
    const duplicate = await db.service.save(
      "durable-child",
      request(0, "durable-buy", { type: "buy", itemId: "ball-gold" }),
    );
    assert.equal(duplicate.status, "duplicate");
    assert.equal(duplicate.revision, state.revision);
    const resumed = await db.service.save(
      "durable-child",
      request(
        state.revision,
        "durable-resume",
        { type: "resume", attemptId: state.activeAttempt.id, takeover: true },
        "device-b",
      ),
    );
    assert.equal(resumed.activeAttempt.ownerDeviceId, "device-b");
    assert.equal(resumed.activeAttempt.mathElapsedMs, 12345);
  }
  await db.close();
} else {
  test("real connected service: completed course match, once-only daily30, purchase and equipment", async () => {
    const db = await database();
    try {
      assert.equal(await db.service.load("child-a"), null);
      const first = await complete(db, "child-a");
      assert.equal(first.envelope.state.club.balance, 30);
      assert.deepEqual(first.envelope.state.course.completedMatches, ["bairro-1"]);
      assert.equal(first.envelope.state.course.lastResult.goals, 5);
      const duplicate = await db.service.save("child-a", first.lastRequest);
      assert.equal(duplicate.status, "duplicate");
      assert.equal(duplicate.state.totalMissionsPassed, 1);
      const bought = await db.service.save(
        "child-a",
        request(duplicate.revision, "buy-first", { type: "buy", itemId: "ball-gold" }),
      );
      assert.equal(bought.state.club.balance, 0);
      const equipped = await db.service.save(
        "child-a",
        request(bought.revision, "equip-first", { type: "equip", itemId: "ball-gold" }),
      );
      assert.equal(equipped.state.cosmetics.ballId, "ball-gold");
      const buyAgain = await db.service.save(
        "child-a",
        request(0, "buy-first", { type: "buy", itemId: "ball-gold" }),
      );
      assert.equal(buyAgain.status, "duplicate");
      assert.equal(buyAgain.revision, equipped.revision);
      assert.equal(buyAgain.state.cosmetics.ballId, "ball-gold");
      const repeated = await complete(db, "child-a", buyAgain, "replay");
      assert.equal(repeated.envelope.state.club.balance, 0);
      assert.deepEqual(repeated.envelope.state.course.completedMatches, ["bairro-1"]);
    } finally {
      await db.close();
    }
  });

  test("concurrent devices use CAS, and an operation ID cannot be reused for another command", async () => {
    const db = await database();
    try {
      const imported = await db.service.importLegacy("cas-child", {
        protocolVersion: 3,
        operationId: "import-cas",
        legacyState: legacy(db.load, 60),
      });
      const results = await Promise.all([
        db.service.save(
          "cas-child",
          request(imported.revision, "buy-a", { type: "buy", itemId: "ball-gold" }),
        ),
        db.service.save(
          "cas-child",
          request(imported.revision, "buy-b", { type: "buy", itemId: "ball-ice" }, "device-b"),
        ),
      ]);
      assert.deepEqual(results.map((result) => result.status).sort(), ["applied", "conflict"]);
      const current = await db.service.load("cas-child");
      assert.equal(current.state.club.ownedItemIds.length, 1);
      const collision = await db.service.save(
        "cas-child",
        request(current.revision, results[0].status === "applied" ? "buy-a" : "buy-b", {
          type: "goal",
          itemId: "field-night",
        }),
      );
      assert.equal(collision.status, "rejected");
      assert.deepEqual((await db.service.load("cas-child")).state.club, current.state.club);
    } finally {
      await db.close();
    }
  });

  test("actors are isolated and explicit import cannot overwrite an existing account", async () => {
    const db = await database();
    try {
      const input = {
        protocolVersion: 3,
        operationId: "same-op",
        legacyState: legacy(db.load, 30),
      };
      const first = await db.service.importLegacy("actor-a", input);
      const again = await db.service.importLegacy("actor-a", input);
      assert.equal(again.status, "duplicate");
      assert.equal(first.revision, again.revision);
      assert.equal(await db.service.load("actor-b"), null);
      const other = await db.service.importLegacy("actor-b", {
        ...input,
        legacyState: legacy(db.load, 60),
      });
      assert.equal(other.status, "applied");
      const overwrite = await db.service.importLegacy("actor-a", {
        ...input,
        operationId: "overwrite",
        legacyState: legacy(db.load, 999),
      });
      assert.equal(overwrite.status, "rejected");
      assert.equal(overwrite.state.club.balance, 30);
      await assert.rejects(() => db.service.load(""), /Unauthorized/);
      const validate = db.load("src/lib/server/course-service.server.ts");
      assert.throws(() =>
        validate.validateCourseRequest({
          ...request(0, "bad", { type: "buy", itemId: "ball-gold" }),
          userId: "actor-b",
        }),
      );
      assert.throws(() => validate.validateCourseRequest(legacy(db.load)));
      assert.throws(() =>
        validate.validateLegacyImport({
          ...input,
          legacyState: { ...input.legacyState, course: { completedMatches: ["nico-5"] } },
        }),
      );
    } finally {
      await db.close();
    }
  });

  test("legacy12 migration is idempotent, preserves collection and does not award new lessons or coins", async () => {
    const db = await database();
    try {
      const old = legacy(db.load, 17);
      old.planetStars[0] = 2;
      old.planetStars[5] = 3;
      old.cosmetics = { ballId: "ball-training", fieldId: "field-sunset" };
      old.totalMissionsPassed = 12;
      old.course = { version: 1, completedMatches: ["bairro-1"], selectedMatchId: "bairro-2" };
      old.club.ownedItemIds = ["ball-gold"];
      old.club.rewardDays["2026-09-09"] = { mission: true, focus: false };
      await db.sql`insert into players (user_id, state) values (${"legacy-child"}, ${JSON.stringify(old)}::jsonb)`;
      const migrated = await db.service.load("legacy-child");
      assert.equal(migrated.revision, 1);
      assert.equal(migrated.state.course.selectedMatchId, "bairro-1");
      assert.deepEqual(migrated.state.course.completedMatches, []);
      assert.deepEqual(migrated.state.planetStars, old.planetStars);
      assert.deepEqual(migrated.state.cosmetics, old.cosmetics);
      assert.equal(migrated.state.course.rewardDays["2026-09-09"], 20);
      assert.deepEqual(await db.service.load("legacy-child"), migrated);
      const game = await complete(db, "legacy-child", migrated);
      assert.equal(game.envelope.state.club.balance, 17);
      await assert.rejects(
        () =>
          db.sql`update players set state = ${JSON.stringify(old)}::jsonb where user_id = ${"legacy-child"}`,
        /COURSE_UPDATE_REQUIRED/,
      );
      assert.equal((await db.service.load("legacy-child")).revision, game.envelope.revision);
    } finally {
      await db.close();
    }
  });

  test("draft takeover preserves answer time; obsolete device and repeated checkpoint cannot alter it", async () => {
    const db = await database();
    try {
      const started = await db.service.save(
        "draft-child",
        request(0, "start-draft", { type: "start", matchId: "bairro-1" }),
      );
      const checkpoint = request(started.revision, "checkpoint-draft", {
        type: "checkpoint",
        attemptId: started.activeAttempt.id,
        elapsedMs: 3210,
      });
      const saved = await db.service.save("draft-child", checkpoint);
      assert.equal(saved.activeAttempt.mathElapsedMs, 3210);
      assert.equal(
        (await db.service.save("draft-child", checkpoint)).activeAttempt.mathElapsedMs,
        3210,
      );
      const takeover = await db.service.save(
        "draft-child",
        request(
          saved.revision,
          "takeover",
          { type: "resume", attemptId: started.activeAttempt.id, takeover: true },
          "device-b",
        ),
      );
      assert.equal(takeover.activeAttempt.ownerDeviceId, "device-b");
      const oldDevice = await db.service.save(
        "draft-child",
        request(takeover.revision, "old-device", {
          type: "checkpoint",
          attemptId: started.activeAttempt.id,
          elapsedMs: 100,
        }),
      );
      assert.equal(oldDevice.status, "rejected");
      assert.equal(oldDevice.activeAttempt.mathElapsedMs, 3210);
      const expired = await db.service.save(
        "draft-child",
        request(
          takeover.revision,
          "expire-draft",
          { type: "expire", attemptId: started.activeAttempt.id, elapsedMs: 180000 - 3210 },
          "device-b",
        ),
      );
      assert.equal(expired.state.course.lastResult.passed, false);
      assert.equal(expired.state.club.balance, 0);
      assert.deepEqual(expired.state.course.completedMatches, []);
    } finally {
      await db.close();
    }
  });

  test("the real database wrapper rolls back state and operation together when the ledger insert fails", async () => {
    const db = await database();
    try {
      await db.service.save(
        "rollback-child",
        request(0, "initial", { type: "settings", childName: "Antes" }),
      );
      const before = await db.service.load("rollback-child");
      await db.sql.query(
        "alter table player_operations add constraint reject_test_operation check (operation_id <> 'rollback-operation')",
      );
      await assert.rejects(
        () =>
          db.service.save(
            "rollback-child",
            request(before.revision, "rollback-operation", {
              type: "settings",
              childName: "Depois",
            }),
          ),
        /reject_test_operation/,
      );
      assert.deepEqual(await db.service.load("rollback-child"), before);
    } finally {
      await db.close();
    }
  });

  test("Postgres transactions use one dedicated connection and release it on success or rollback", async () => {
    const calls = [];
    const client = {
      query: async (text) => {
        calls.push(text);
        return { rows: [{ ok: true }] };
      },
      release: () => calls.push("RELEASE"),
    };
    class Pool {
      async query() {
        throw new Error("transaction leaked onto pool.query");
      }
      async connect() {
        calls.push("CONNECT");
        return client;
      }
    }
    const load = loadModules(
      { DATABASE_URL: "postgres://unit-test.invalid/unused" },
      { pg: { Pool, types: { setTypeParser() {} } } },
    );
    const sql = await load("src/lib/db.ts").getSql();
    await sql.transaction(async (tx) => {
      await tx.query("select isolated");
    });
    assert.deepEqual(calls, ["CONNECT", "BEGIN", "select isolated", "COMMIT", "RELEASE"]);
    calls.length = 0;
    await assert.rejects(
      () =>
        sql.transaction(async (tx) => {
          await tx.query("select failing");
          throw new Error("rollback");
        }),
      /rollback/,
    );
    assert.deepEqual(calls, ["CONNECT", "BEGIN", "select failing", "ROLLBACK", "RELEASE"]);
  });

  test("three server functions keep real auth and receive actor only from context", () => {
    const source = readFileSync(join(root, "src/lib/server/player.ts"), "utf8");
    assert.equal(
      (source.match(/\.middleware\(\[(?:authMiddleware|parentContext)\]\)/g) ?? []).length,
      3,
    );
    const parentMiddleware = readFileSync(
      join(root, "src/lib/server/parent-middleware.ts"),
      "utf8",
    );
    assert.match(parentMiddleware, /\.middleware\(\[authMiddleware\]\)/);
    assert.equal((source.match(/context\.userId/g) ?? []).length, 3);
    assert.doesNotMatch(source, /dev-user|test-user|data\.userId/);
  });

  test("storage labels never call hosted or in-memory PGLite a persistent database", async () => {
    for (const env of [
      {},
      { PGLITE_DATA_DIR: "memory://" },
      { VERCEL: "1", PGLITE_DATA_DIR: "/ignored-on-vercel" },
    ]) {
      const load = loadModules(env);
      const db = load("src/lib/db.ts");
      assert.equal(db.dbStorage, "temporary");
      const pg = await db.getPglite();
      await pg.close();
    }
  });

  test("temporary storage fails closed for saves and imports without blocking reads or changing rows", async () => {
    for (const env of [{}, { VERCEL: "1", PGLITE_DATA_DIR: "/ignored-on-vercel" }]) {
      const load = loadModules(env);
      const db = load("src/lib/db.ts");
      const sql = await db.getSql();
      const pg = await db.getPglite();
      const service = load("src/lib/server/course-service.server.ts").createCourseService(
        sql,
        db.dbStorage,
      );
      try {
        assert.equal(await service.load("new-child"), null);
        const state = load("src/lib/game/progress.ts").migrateState(legacy(load, 30));
        await sql`insert into players (user_id, state, protocol_version) values (${"existing-child"}, ${JSON.stringify(state)}::jsonb, 3)`;
        const before = await service.load("existing-child");
        assert.equal(before.storage, "temporary");
        assert.equal(before.state.club.balance, 30);
        await assert.rejects(
          () =>
            service.save(
              "new-child",
              request(0, "new-start", { type: "start", matchId: "bairro-1" }),
            ),
          /armazenamento permanente/,
        );
        await assert.rejects(
          () =>
            service.save("existing-child", request(0, "buy", { type: "buy", itemId: "ball-gold" })),
          /armazenamento permanente/,
        );
        await assert.rejects(
          () =>
            service.importLegacy("import-child", {
              protocolVersion: 3,
              operationId: "import",
              legacyState: legacy(load, 60),
            }),
          /armazenamento permanente/,
        );
        assert.equal(await service.load("new-child"), null);
        assert.equal(await service.load("import-child"), null);
        assert.deepEqual(await service.load("existing-child"), before);
        assert.equal((await sql`select count(*)::int as count from player_operations`)[0].count, 0);
      } finally {
        await pg.close();
      }
    }
  });

  test("file-backed local database survives process restart with collection, ledger and active draft", () => {
    const directory = mkdtempSync(join(tmpdir(), "course-sync-durable-"));
    const env = { ...process.env };
    delete env.DATABASE_URL;
    try {
      for (const mode of ["write", "read"]) {
        const child = spawnSync(
          process.execPath,
          [fileURLToPath(import.meta.url), "durability-worker", mode, directory],
          { cwd: root, env, encoding: "utf8", timeout: 60000 },
        );
        assert.equal(child.status, 0, `${mode}: ${child.stderr}\n${child.stdout}`);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
