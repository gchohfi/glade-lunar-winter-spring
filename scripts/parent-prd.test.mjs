import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { testDb, loadModules } from "./helpers/parent-test-db.mjs";

const request = (envelope, id, command, deviceId = "device-a") => ({
  protocolVersion: 3,
  expectedRevision: envelope?.revision ?? 0,
  operationId: id,
  deviceId,
  command,
});

test("parent session lookup accepts verified cookie and popup bearer formats, but checks live DB ownership", async () => {
  const db = await testDb();
  try {
    const session = await db.session();
    let headers = new Headers();
    const load = loadModules(
      {},
      { "@tanstack/react-start/server": { getRequest: () => ({ headers }) } },
    );
    const resolve = load("src/lib/server/parent-session.server.ts").parentSession;
    const raw = session.id + "-token";
    // Signature verification belongs to the authMiddleware precondition. This tests only
    // representation normalization, ownership and revocation in the additional DB check.
    for (const bearer of [raw, raw + ".signature", encodeURIComponent(raw + ".signature=")]) {
      assert.equal((await resolve(db.sql, session.userId, bearer, db.now())).id, session.id);
      await assert.rejects(
        () => resolve(db.sql, "another-owner", bearer, db.now()),
        /Unauthorized/,
      );
    }
    headers = new Headers({
      cookie: "__Host-grok-auth.session_token=" + encodeURIComponent(raw + ".signature="),
    });
    assert.equal(
      (await resolve(db.sql, session.userId, undefined, db.now())).createdAt,
      session.createdAt,
    );
    await db.sql`delete from "session" where id = ${session.id}`;
    await assert.rejects(
      () => resolve(db.sql, session.userId, undefined, db.now()),
      /Unauthorized/,
    );
  } finally {
    await db.close();
  }
});
async function access(db, userId = "parent-a", suffix = "") {
  const session = await db.session(userId, suffix);
  const unlocked = await db.security.setPin(session, "948372");
  return { session, grant: unlocked.grant };
}
async function play(db, userId = "parent-a", matchId = "bairro-1") {
  let envelope = await db.service.load(userId);
  let index = 0;
  const prefix = "play-" + db.now() + "-" + (envelope?.revision ?? 0);
  const send = async (command) => {
    const input = request(envelope, prefix + "-" + index++, command);
    envelope = await db.service.save(userId, input);
    assert.equal(envelope.status, "applied", envelope.message);
    return { envelope, input };
  };
  await send({ type: "start", matchId });
  const complete = async () => {
    let last;
    while (envelope.activeAttempt) {
      const a = envelope.activeAttempt;
      last = await send(
        a.phase === "answer"
          ? {
              type: "answer",
              attemptId: a.id,
              guess: db.load("src/lib/game/types.ts").factAnswer(a.fact),
              elapsedMs: 500,
            }
          : a.phase === "feedback"
            ? { type: "continue", attemptId: a.id }
            : {
                type: "shoot",
                attemptId: a.id,
                direction: ["left", "center", "right"][a.goals % 3],
              },
      );
    }
    return last;
  };
  return { send, complete, current: () => envelope };
}

test("PIN: six digits, salted scrypt, account isolation and recent authentication enforced", async () => {
  const db = await testDb();
  try {
    const a = await access(db);
    const b = await access(db, "parent-b");
    const rows = await db.sql`select pin_hash, pin_salt from parent_security order by user_id`;
    assert.notEqual(rows[0].pin_salt, rows[1].pin_salt);
    assert.notEqual(rows[0].pin_hash, rows[1].pin_hash);
    assert.equal(rows[0].pin_hash.length, 128);
    assert.doesNotMatch(JSON.stringify(rows), /948372/);
    const { assertParentGrant } = db.load("src/lib/server/parent-security.server.ts");
    await assert.rejects(
      () => db.sql.transaction((tx) => assertParentGrant(tx, "parent-b", a, db.now())),
      /PIN/,
    );
    await db.sql.transaction((tx) => assertParentGrant(tx, "parent-b", b, db.now()));
    await assert.rejects(() => db.security.setPin(a.session, "123"), /seis/);
    db.advance(300001);
    await assert.rejects(() => db.security.setPin(a.session, "123456"), /novamente/);
    assert.equal((await db.security.status(a.session)).recentAuth, false);
  } finally {
    await db.close();
  }
});

test("PIN: five wrong attempts lock for fifteen minutes without extending lock; reset revokes grants", async () => {
  const db = await testDb();
  try {
    const a = await access(db);
    let value;
    for (let i = 0; i < 5; i++) value = await db.security.unlock(a.session, "000000");
    assert.equal(value.ok, false);
    assert.equal(value.lockedUntil, db.now() + 900000);
    const locked = await db.security.unlock(a.session, "948372");
    assert.equal(locked.ok, false);
    assert.equal(locked.lockedUntil, value.lockedUntil);
    assert.equal((await db.sql`select * from parent_grants`).length, 0);
    db.advance(900000);
    const reopened = await db.security.unlock(a.session, "948372");
    assert.equal(reopened.ok, true);
    const recent = await db.session("parent-a", "-reauth");
    await db.security.setPin(recent, "284639");
    const { assertParentGrant } = db.load("src/lib/server/parent-security.server.ts");
    await assert.rejects(
      () =>
        db.sql.transaction((tx) =>
          assertParentGrant(
            tx,
            "parent-a",
            { session: a.session, grant: reopened.grant },
            db.now(),
          ),
        ),
      /terminou/,
    );
    assert.equal((await db.security.unlock(a.session, "948372")).ok, false);
    assert.equal((await db.security.unlock(recent, "284639")).ok, true);
  } finally {
    await db.close();
  }
});

test("PIN grants expire at ten minutes and close/sign-out revoke server authorization", async () => {
  const db = await testDb();
  try {
    let a = await access(db);
    const { assertParentGrant } = db.load("src/lib/server/parent-security.server.ts");
    db.advance(600000);
    await assert.rejects(
      () => db.sql.transaction((tx) => assertParentGrant(tx, "parent-a", a, db.now())),
      /terminou/,
    );
    a = { session: a.session, grant: (await db.security.unlock(a.session, "948372")).grant };
    await db.security.close(a.session, a.grant);
    await assert.rejects(
      () => db.sql.transaction((tx) => assertParentGrant(tx, "parent-a", a, db.now())),
      /terminou/,
    );
    const opened = await db.security.unlock(a.session, "948372");
    await db.sql`delete from "session" where id = ${a.session.id}`;
    await assert.rejects(
      () =>
        db.sql.transaction((tx) =>
          assertParentGrant(tx, "parent-a", { session: a.session, grant: opened.grant }, db.now()),
        ),
      /terminou/,
    );
  } finally {
    await db.close();
  }
});

test("settings, prize delivery and legacy import require PIN on the server; gameplay closes parent access", async () => {
  const db = await testDb();
  try {
    const a = await access(db);
    for (const command of [{ type: "settings", durationSec: 300 }, { type: "claim-prize" }])
      await assert.rejects(
        () => db.service.save("parent-a", request(null, command.type, command)),
        /PIN/,
      );
    const legacy = db.load("src/lib/game/types.ts").emptyState();
    delete legacy.course;
    await assert.rejects(
      () =>
        db.service.importLegacy("parent-a", {
          protocolVersion: 3,
          operationId: "import",
          legacyState: legacy,
        }),
      /PIN/,
    );
    assert.equal(await db.service.load("parent-a"), null);
    let saved = await db.service.save(
      "parent-a",
      request(null, "settings-ok", { type: "settings", durationSec: 300 }),
      a,
    );
    assert.equal(saved.state.course.durationSec, 300);
    saved = await db.service.save(
      "parent-a",
      request(saved, "play", { type: "start", matchId: "bairro-1" }),
      a,
    );
    assert.equal(saved.activeAttempt.timeLimitMs, 300000);
    await assert.rejects(
      () =>
        db.service.save(
          "parent-a",
          request(saved, "forbidden", { type: "settings", durationSec: 120 }),
          a,
        ),
      /terminou/,
    );
  } finally {
    await db.close();
  }
});

test("responses and help persist exactly once, update adaptive support, and never become independent corrections", async () => {
  const db = await testDb();
  try {
    const game = await play(db);
    const a = game.current().activeAttempt;
    const helped = await game.send({ type: "help", attemptId: a.id, elapsedMs: 800 });
    assert.equal((await db.service.save("parent-a", helped.input)).status, "duplicate");
    await game.send({ type: "continue", attemptId: a.id });
    const first = await game.send({
      type: "answer",
      attemptId: a.id,
      guess: a.fact.a * a.fact.b,
      elapsedMs: 400,
    });
    await db.service.save("parent-a", first.input);
    const rows =
      await db.sql`select payload from learning_events where user_id = 'parent-a' order by kind`;
    assert.equal(rows.length, 2);
    const answer = rows.find((row) => row.payload.kind === "answer").payload;
    assert.equal(answer.firstInDay, true);
    assert.equal(answer.helpBeforeFirst, true);
    assert.equal(answer.activeMs, 1200);
    assert.equal(answer.assisted, true);
    const key = db.load("src/lib/game/types.ts").factKey(a.fact);
    assert.equal(first.envelope.state.facts[key].helpRequests, 1);
    assert.deepEqual(first.envelope.state.facts[key].independentDays, []);
    await game.complete();
    const summary = game.current().state.course.lastResult.learning;
    assert.ok(summary.assistedCorrect >= 1);
    assert.ok(summary.independentCorrect < 15);
    assert.equal(summary.firstResponses + summary.repeatedResponses, 15);
  } finally {
    await db.close();
  }
});

test("a first daily error cannot be replaced by a later correct answer, even in another attempt", async () => {
  const db = await testDb();
  try {
    const first = await play(db);
    const a = first.current().activeAttempt;
    await first.send({ type: "answer", attemptId: a.id, guess: -1, elapsedMs: 200 });
    await first.complete();
    const replay = await play(db);
    await replay.complete();
    const key = db.load("src/lib/game/types.ts").factKey(a.fact);
    const rows =
      await db.sql`select payload from learning_events where user_id = 'parent-a' and fact_key = ${key} and kind = 'answer'`;
    assert.ok(rows.length > 1);
    assert.equal(rows.filter((row) => row.payload.firstInDay).length, 1);
    assert.equal(rows.find((row) => row.payload.firstInDay).payload.ok, false);
    assert.deepEqual(replay.current().state.facts[key].independentDays, []);
    const report = await db
      .load("src/lib/server/evidence.server.ts")
      .readParentReport(db.sql, "parent-a", replay.current().state, db.now());
    assert.equal(report.facts.find((fact) => fact.key === key).days[0].ok, false);
  } finally {
    await db.close();
  }
});

test("coin statement records actual daily rewards and purchases atomically; replays and duplicate operations do not double-credit", async () => {
  const db = await testDb();
  try {
    const game = await play(db);
    const final = await game.complete();
    await db.service.save("parent-a", final.input);
    const input = request(game.current(), "buy", { type: "buy", itemId: "ball-gold" });
    const purchase = await db.service.save("parent-a", input);
    await db.service.save("parent-a", input);
    assert.equal(purchase.state.club.balance, 0);
    assert.equal(purchase.state.cosmetics.ballId, "ball-classic");
    const replay = await play(db);
    await replay.complete();
    assert.equal(replay.current().state.course.lastResult.coinsGained, 0);
    db.advance(86400000);
    const tomorrow = await play(db);
    await tomorrow.complete();
    assert.equal(tomorrow.current().state.course.lastResult.coinsGained, 30);
    const rows =
      await db.sql`select kind, amount from coin_events where user_id = 'parent-a' order by occurred_ms, operation_id`;
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((row) => row.amount).sort((a, b) => a - b),
      [-30, 30, 30],
    );
  } finally {
    await db.close();
  }
});

test("failed operation ledger rolls back learning event, adaptive data and revision together", async () => {
  const db = await testDb();
  try {
    await play(db);
    const before = await db.service.load("parent-a");
    const a = before.activeAttempt;
    await db.sql.query(
      "alter table player_operations add constraint reject_evidence_op check (operation_id <> 'bad-event')",
    );
    await assert.rejects(
      () =>
        db.service.save(
          "parent-a",
          request(before, "bad-event", { type: "help", attemptId: a.id, elapsedMs: 100 }),
        ),
      /reject_evidence_op/,
    );
    assert.deepEqual(await db.service.load("parent-a"), before);
    assert.equal((await db.sql`select * from learning_events`).length, 0);
  } finally {
    await db.close();
  }
});

test("reports are scoped by account, periods include sample sizes, and old records remain explicitly coarse", async () => {
  const db = await testDb();
  try {
    const a = await access(db);
    const state = db.load("src/lib/game/types.ts").emptyState();
    delete state.course;
    state.club.balance = 60;
    state.club.rewardDays = { "2026-09-01": { mission: true, focus: false } };
    state.facts = {
      "3x4": { attempts: 8, correct: 5, wrong: 3, totalMs: 9000, lastSeen: db.now() - 86400000 },
    };
    await db.service.importLegacy(
      "parent-a",
      { protocolVersion: 3, operationId: "legacy", legacyState: state },
      a,
    );
    const game = await play(db);
    await game.complete();
    const { readParentReport } = db.load("src/lib/server/evidence.server.ts");
    const report = await readParentReport(db.sql, "parent-a", game.current().state, db.now());
    assert.equal(report.previous.responses, 0);
    assert.equal(report.previous.independentPercent, null);
    assert.equal(report.current.responses, 15);
    assert.ok(report.current.firstResponses < 15);
    assert.equal(report.legacyFacts["3x4"].attempts, 8);
    assert.equal(report.openingBalance, 60);
    assert.equal(report.legacyRewards[0].amount, 20);
    const other = await readParentReport(
      db.sql,
      "parent-b",
      db.load("src/lib/game/types.ts").emptyState(),
      db.now(),
    );
    assert.equal(other.facts.length, 0);
    assert.equal(other.coinEvents.length, 0);
    assert.equal(other.detailedSince, null);
  } finally {
    await db.close();
  }
});

test("game responses exclude protected histories and prize preferences", async () => {
  const db = await testDb();
  try {
    const a = await access(db);
    let state = await db.service.save(
      "parent-a",
      request(null, "prefs", { type: "settings", prizeName: "Combinado privado" }),
      a,
    );
    const game = await play(db);
    await game.complete();
    state = game.current();
    const view = db.load("src/lib/server/game-view.server.ts").gameView(state);
    assert.deepEqual(view.state.facts, {});
    assert.deepEqual(view.state.missions, []);
    assert.deepEqual(view.state.days, {});
    assert.notEqual(view.state.prizeName, "Combinado privado");
    assert.equal(view.state.club.balance, state.state.club.balance);
    assert.deepEqual(view.state.course.completedMatches, ["bairro-1"]);
    assert.ok(view.state.course.lastResult.learning);
    const api = readFileSync(new URL("../src/lib/server/parents.ts", import.meta.url), "utf8");
    assert.match(api, /assertParentGrant\(tx, context.userId, context.parentAuthority/);
    assert.doesNotMatch(api, /data\.userId|localStorage/);
  } finally {
    await db.close();
  }
});

test("legacy incompatible attempt is archived once without coins or new-course completions", async () => {
  const db = await testDb();
  try {
    const legacy = db.load("src/lib/game/types.ts").emptyState();
    delete legacy.course;
    legacy.club.balance = 70;
    legacy.planetStars[0] = 2;
    const attempt = { legacyQuestion: "7 × 4", correct: 2, phase: "old-game" };
    await db.sql`insert into players (user_id, state, active_attempt, protocol_version, revision)
      values ('legacy-child', ${JSON.stringify(legacy)}::jsonb, ${JSON.stringify(attempt)}::jsonb, 2, 0)`;
    const first = await db.service.load("legacy-child");
    const second = await db.service.load("legacy-child");
    assert.deepEqual(second, first);
    assert.equal(first.activeAttempt, null);
    assert.equal(first.state.club.balance, 70);
    assert.equal(first.state.planetStars[0], 2);
    assert.deepEqual(first.state.course.completedMatches, []);
    const rows =
      await db.sql`select attempt from legacy_attempt_archives where user_id = 'legacy-child'`;
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].attempt, attempt);
    assert.equal((await db.sql`select * from coin_events`).length, 0);
  } finally {
    await db.close();
  }
});

test("coin-ledger failure rolls back the purchase and original command can be retried once", async () => {
  const db = await testDb();
  try {
    const game = await play(db);
    await game.complete();
    const before = await db.service.load("parent-a");
    await db.sql.query(
      "alter table coin_events add constraint fail_purchase check (operation_id <> 'retry-purchase')",
    );
    const input = request(before, "retry-purchase", { type: "buy", itemId: "ball-gold" });
    await assert.rejects(() => db.service.save("parent-a", input), /fail_purchase/);
    assert.deepEqual(await db.service.load("parent-a"), before);
    await db.sql.query("alter table coin_events drop constraint fail_purchase");
    assert.equal((await db.service.save("parent-a", input)).state.club.balance, 0);
    assert.equal((await db.service.save("parent-a", input)).status, "duplicate");
    assert.equal(
      (await db.sql`select * from coin_events where operation_id = 'retry-purchase'`).length,
      1,
    );
  } finally {
    await db.close();
  }
});
