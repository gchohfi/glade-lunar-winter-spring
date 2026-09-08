import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import ts from "typescript";

// Client state-machine unit tests: real Zustand + real course engine, mocked transport/storage.
// These do not establish browser rendering, authentication, network or production persistence.
const require = createRequire(import.meta.url);
const { create } = require("zustand");
const cache = new Map();
function gameModule(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const module = { exports: {} };
  cache.set(name, module);
  const source = readFileSync(new URL(`../src/lib/game/${name}.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "module", "exports", compiled)(
    (id) => (id.startsWith("./") ? gameModule(id.slice(2)) : require(id)),
    module,
    module.exports,
  );
  return module.exports;
}
const { emptyState, factAnswer } = gameModule("types");
const { migrateState } = gameModule("progress");
const { applyCourseCommand } = gameModule("course-engine");
const source = readFileSync(new URL("../src/lib/game/connected-store.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const PREFIX = "missao-course-v3:";
const NOW = Date.parse("2026-09-08T15:00:00Z");
let nextId = 0;

function storage(existing = new Map()) {
  return {
    values: existing,
    failWrites: false,
    getItem(key) {
      return existing.has(key) ? existing.get(key) : null;
    },
    setItem(key, value) {
      if (this.failWrites) throw new Error("quota");
      existing.set(key, value);
    },
    removeItem(key) {
      existing.delete(key);
    },
  };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function backend() {
  return {
    actor: "",
    envelopes: new Map(),
    ledger: new Map(),
    requests: [],
    imports: [],
    loseNextReply: false,
    saveBarrier: null,
    importBarrier: null,
    async loadProgress() {
      return structuredClone(this.envelopes.get(this.actor) ?? null);
    },
    async saveProgress({ data }) {
      const account = this.actor;
      this.requests.push({ account, data: structuredClone(data) });
      const barrier = this.saveBarrier;
      this.saveBarrier = null;
      if (barrier) await barrier.promise;
      const row = this.envelopes.get(account) ?? {
        protocolVersion: 3,
        revision: 0,
        state: migrateState(emptyState()),
        activeAttempt: null,
        storage: "persistent",
      };
      const key = account + ":" + data.operationId;
      const duplicate = this.ledger.get(key);
      let result;
      if (duplicate)
        result = { ...structuredClone(row), status: duplicate.ok ? "duplicate" : "rejected" };
      else if (data.expectedRevision !== row.revision)
        result = { ...structuredClone(row), status: "conflict" };
      else {
        const applied = applyCourseCommand(row.state, row.activeAttempt, data.command, {
          now: NOW,
          deviceId: data.deviceId,
          operationId: data.operationId,
        });
        this.ledger.set(key, { ok: applied.ok });
        const next = applied.ok
          ? {
              ...row,
              state: applied.state,
              activeAttempt: applied.activeAttempt,
              revision: row.revision + 1,
            }
          : row;
        this.envelopes.set(account, structuredClone(next));
        result = {
          ...structuredClone(next),
          status: applied.ok ? "applied" : "rejected",
          message: applied.message,
        };
      }
      if (this.loseNextReply) {
        this.loseNextReply = false;
        throw new Error("reply lost after commit");
      }
      return result;
    },
    async importLegacyProgress({ data }) {
      const account = this.actor;
      this.imports.push({ account, data: structuredClone(data) });
      if (this.importBarrier) await this.importBarrier.promise;
      const next = {
        protocolVersion: 3,
        revision: 1,
        state: migrateState(data.legacyState),
        activeAttempt: null,
        storage: "persistent",
      };
      this.envelopes.set(account, structuredClone(next));
      return { ...next, status: "applied" };
    },
  };
}
function harness(options = {}) {
  const local = options.local ?? storage(),
    session = options.session ?? storage();
  const server = options.server ?? backend(),
    navigator = { onLine: true };
  const mirror = create()((set) => ({
    ...emptyState(),
    ...(options.mirror ?? {}),
    replaceState: (state) => set(state),
  }));
  const module = { exports: {} };
  new Function(
    "require",
    "module",
    "exports",
    "localStorage",
    "sessionStorage",
    "navigator",
    "crypto",
    compiled,
  )(
    (id) =>
      id === "@/lib/server/player"
        ? {
            loadProgress: server.loadProgress.bind(server),
            saveProgress: server.saveProgress.bind(server),
            importLegacyProgress: server.importLegacyProgress.bind(server),
          }
        : id === "./store"
          ? { usePlayer: mirror }
          : id.startsWith("./")
            ? gameModule(id.slice(2))
            : require(id),
    module,
    module.exports,
    local,
    session,
    navigator,
    { randomUUID: () => `client-id-${++nextId}` },
  );
  const sync = module.exports.useCourseSync;
  return {
    sync,
    mirror,
    local,
    session,
    server,
    navigator,
    remember: module.exports.rememberAnswerTime,
    async connect(account) {
      server.actor = account;
      await sync.getState().connect(account);
    },
    send(command) {
      return sync.getState().send(command);
    },
    refresh() {
      return sync.getState().refresh();
    },
    get state() {
      return sync.getState();
    },
    get attempt() {
      return sync.getState().envelope?.activeAttempt;
    },
    key(kind, account = sync.getState().accountId) {
      return PREFIX + account + ":" + kind + sync.getState().deviceId;
    },
    async start() {
      return this.send({ type: "start", matchId: "bairro-1" });
    },
  };
}

test("client settles a matching navigation journal before resume instead of restoring thinking time", async () => {
  const h = harness();
  await h.connect("family-a");
  await h.start();
  h.remember(h.attempt.id, h.state.envelope.revision, 1500);
  const count = h.server.requests.length;
  const response = await h.send({ type: "resume", attemptId: h.attempt.id });
  assert.equal(response.status, "applied");
  assert.deepEqual(
    h.server.requests.slice(count).map((entry) => entry.data.command.type),
    ["checkpoint", "resume"],
  );
  assert.equal(h.attempt.mathElapsedMs, 1500);
  assert.equal(h.attempt.phase, "answer");
  assert.equal(h.local.getItem(h.key("journal")), null);
  assert.equal(h.local.getItem(h.key("pending")), null);
});

test("lost reply is retried with identical operation after reload and does not duplicate an answer", async () => {
  const h = harness();
  await h.connect("family-a");
  await h.start();
  const attemptId = h.attempt.id,
    guess = factAnswer(h.attempt.fact);
  h.server.loseNextReply = true;
  assert.equal(await h.send({ type: "answer", attemptId, guess, elapsedMs: 700 }), null);
  assert.equal(h.state.status, "error");
  const pending = JSON.parse(h.local.getItem(h.key("pending")));
  assert.equal(h.server.envelopes.get("family-a").activeAttempt.correct, 1);
  const reloaded = harness({ local: h.local, session: h.session, server: h.server });
  await reloaded.connect("family-a");
  const retries = h.server.requests.filter(
    (entry) => entry.data.operationId === pending.operationId,
  );
  assert.equal(retries.length, 2);
  assert.deepEqual(retries[0].data, retries[1].data);
  assert.equal(reloaded.attempt.correct, 1);
  assert.equal(reloaded.attempt.mathElapsedMs, 700);
  assert.equal(reloaded.state.status, "ready");
  assert.equal(h.local.getItem(reloaded.key("pending")), null);
});

test("pending operations stay account-scoped and late replies cannot paint another account", async () => {
  const h = harness();
  await h.connect("family-a");
  await h.start();
  const barrier = deferred();
  h.server.saveBarrier = barrier;
  const request = h.send({
    type: "answer",
    attemptId: h.attempt.id,
    guess: factAnswer(h.attempt.fact),
    elapsedMs: 800,
  });
  const pendingA = JSON.parse(h.local.getItem(h.key("pending", "family-a")));
  await h.connect("family-b");
  assert.equal(h.state.accountId, "family-b");
  assert.equal(h.state.envelope.activeAttempt, null);
  barrier.resolve();
  await request;
  assert.equal(h.state.accountId, "family-b");
  assert.equal(h.state.envelope.activeAttempt, null);
  assert.ok(h.local.getItem(h.key("pending", "family-a")));
  await h.connect("family-a");
  assert.equal(h.attempt.correct, 1);
  assert.equal(
    h.server.requests.filter((entry) => entry.data.operationId === pendingA.operationId).length,
    2,
  );
  assert.ok(
    h.server.requests
      .filter((entry) => entry.data.operationId === pendingA.operationId)
      .every((entry) => entry.account === "family-a"),
  );
});

test("connect resets optional course and child data immediately when signing out", async () => {
  const h = harness({
    mirror: { childName: "Previous child", course: { completedMatches: ["bairro-1"] } },
  });
  await h.connect(null);
  assert.equal(h.state.status, "signed-out");
  assert.equal(h.mirror.getState().childName, "");
  assert.equal(h.mirror.getState().course, undefined);
  assert.equal(h.state.envelope, null);
});

test("offline input is not acknowledged and recovery saves the local interruption as a pause", async () => {
  const h = harness();
  await h.connect("family-a");
  await h.start();
  const attemptId = h.attempt.id;
  h.remember(attemptId, h.state.envelope.revision, 900);
  const count = h.server.requests.length;
  h.navigator.onLine = false;
  const response = await h.send({
    type: "answer",
    attemptId,
    guess: factAnswer(h.attempt.fact),
    elapsedMs: 950,
  });
  assert.equal(response, null);
  assert.equal(h.state.status, "offline");
  assert.equal(h.server.requests.length, count);
  assert.ok(h.local.getItem(h.key("journal")));
  h.navigator.onLine = true;
  await h.refresh();
  assert.equal(h.state.status, "ready");
  assert.equal(h.attempt.phase, "paused");
  assert.equal(h.attempt.mathElapsedMs, 900);
  assert.equal(h.attempt.correct, 0);
  assert.equal(h.local.getItem(h.key("journal")), null);
});

test("stale or other-device journal is discarded without overwriting the authoritative clock", async () => {
  for (const reason of ["revision", "owner"]) {
    const h = harness();
    await h.connect("family-a");
    await h.start();
    h.remember(h.attempt.id, h.state.envelope.revision, 1000);
    const remote = h.server.envelopes.get("family-a");
    if (reason === "revision") remote.revision += 1;
    else remote.activeAttempt.ownerDeviceId = "other-device";
    remote.activeAttempt.mathElapsedMs = 3000;
    const before = h.server.requests.length;
    await h.refresh();
    assert.equal(h.server.requests.length, before);
    assert.equal(h.attempt.mathElapsedMs, 3000);
    assert.equal(h.local.getItem(h.key("journal")), null);
  }
});

test("storage failure prevents sending a command and never claims confirmation", async () => {
  const h = harness();
  await h.connect("family-a");
  await h.start();
  h.local.failWrites = true;
  const count = h.server.requests.length;
  assert.equal(await h.send({ type: "help", attemptId: h.attempt.id, elapsedMs: 100 }), null);
  assert.equal(h.state.status, "error");
  assert.equal(h.server.requests.length, count);
  assert.equal(h.attempt.phase, "answer");
});

test("one request in flight prevents duplicate taps and retains the exact pending command", async () => {
  const h = harness();
  await h.connect("family-a");
  await h.start();
  const barrier = deferred();
  h.server.saveBarrier = barrier;
  const command = {
    type: "answer",
    attemptId: h.attempt.id,
    guess: factAnswer(h.attempt.fact),
    elapsedMs: 300,
  };
  const first = h.send(command);
  const pending = h.local.getItem(h.key("pending"));
  assert.equal(await h.send(command), null);
  assert.equal(h.local.getItem(h.key("pending")), pending);
  barrier.resolve();
  await first;
  assert.equal(h.attempt.correct, 1);
});

test("an old import failure after switching accounts does not mark the new account failed", async () => {
  const local = storage();
  local.setItem(
    PREFIX + "legacy-backup",
    JSON.stringify({ ...emptyState(), onboarded: true, childName: "Historic child" }),
  );
  const h = harness({ local });
  await h.connect("family-a");
  const barrier = deferred();
  h.server.importBarrier = barrier;
  const importing = h.sync.getState().importLegacy();
  await h.connect("family-b");
  barrier.reject(new Error("old import failed"));
  await importing;
  assert.equal(h.state.accountId, "family-b");
  assert.equal(h.state.status, "ready");
  assert.equal(h.state.message, null);
});
