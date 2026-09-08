import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
function modules(storage) {
  const cache = new Map();
  function load(name) {
    if (cache.has(name)) return cache.get(name).exports;
    if (name === "audio") return { setSoundEnabled() {} };
    if (name === "notify") return { fireParentNotify() {} };
    const module = { exports: {} };
    cache.set(name, module);
    const source = readFileSync(new URL(`../src/lib/game/${name}.ts`, import.meta.url), "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    new Function("require", "module", "exports", "window", output)(
      (id) => (id.startsWith("./") ? load(id.slice(2)) : require(id)),
      module,
      module.exports,
      storage ? { localStorage: storage } : undefined,
    );
    return module.exports;
  }
  return load;
}

const load = modules();
const { emptyState, todayKey } = load("types");
const { migrateState } = load("progress");
const { normalizeCourse } = load("course");
const {
  COSMETICS,
  cosmeticItem,
  equipCosmetic,
  cosmeticUnlocked,
  normalizeCosmetics,
  newCosmetics,
} = load("wardrobe");
const { applyClubRewards, normalizeClub, clubSummary, purchaseCosmetic, chooseGoal, validClubDay } =
  load("club");
const day = "2026-09-08";
const reward = (state, values = {}) =>
  applyClubRewards(state, {
    day,
    missionCompleted: true,
    focusCompleted: true,
    ...values,
  });
function funded(balance = 100) {
  const state = emptyState();
  state.club.balance = balance;
  return state;
}

test("daily rewards cap at 30 coins and replay is idempotent across JSON reload", () => {
  const start = emptyState(),
    original = structuredClone(start);
  const mission = reward(start, { focusCompleted: false });
  assert.equal(mission.coinsGained, 20);
  assert.equal(mission.missionRewarded, true);
  assert.equal(mission.focusRewarded, false);
  assert.deepEqual(start, original);
  const focus = reward(mission.state);
  assert.equal(focus.coinsGained, 10);
  assert.equal(focus.missionRewarded, false);
  assert.equal(focus.focusRewarded, true);
  const reloaded = migrateState(JSON.parse(JSON.stringify(focus.state)));
  for (let repeat = 0; repeat < 50; repeat++) {
    const replay = reward(reloaded);
    assert.equal(replay.state, reloaded);
    assert.equal(replay.coinsGained, 0);
  }
  assert.equal(clubSummary(reloaded, day).todayEarned, 30);
  assert.equal(reward(reloaded, { day: "2026-09-09" }).state.club.balance, 60);
  assert.equal(reward(reloaded, { day: "2026-10-20" }).state.club.balance, 60);
  assert.deepEqual({ ...focus.state, club: start.club }, start);
});

test("login, failed tasks and invalid calendar dates cannot grant currency", () => {
  const state = emptyState();
  assert.equal(reward(state, { missionCompleted: false, focusCompleted: false }).state, state);
  for (const value of ["", "__proto__", "2026-02-30", "2026-13-01", "2026-9-8", null, 1]) {
    assert.equal(validClubDay(value), false);
    assert.equal(reward(state, { day: value }).state, state);
  }
  assert.equal(validClubDay("2024-02-29"), true);
  assert.equal(validClubDay("2026-02-29"), false);
  assert.equal(reward(funded(Number.MAX_SAFE_INTEGER)).coinsGained, 0);
  assert.equal(todayKey(new Date("2026-09-09T02:30:00Z")), day);
  assert.equal(todayKey(new Date("2026-09-09T03:30:00Z")), "2026-09-09");
});

test("daily ledger survives long absences without repeating an old grant", () => {
  let state = emptyState();
  for (let index = 0; index < 430; index++) {
    const date = new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10);
    state = reward(state, { day: date }).state;
  }
  state = migrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(Object.keys(state.club.rewardDays).length, 430);
  assert.equal(reward(state, { day: "2025-01-01" }).coinsGained, 0);
});

test("club migration rejects malformed balances, IDs, goals and dates without retroactive rewards", () => {
  const base = emptyState().club;
  for (const raw of [null, 9, [], "club"]) assert.deepEqual(normalizeClub(raw), base);
  for (const balance of [-1, 0.1, NaN, Infinity, "100", Number.MAX_SAFE_INTEGER + 1])
    assert.equal(normalizeClub({ balance }).balance, 0);
  const club = normalizeClub({
    balance: 12,
    ownedItemIds: ["ball-gold", "ball-gold", "ball-classic", "alien", 9],
    goalItemId: "ball-gold",
    rewardDays: { [day]: { mission: true, focus: false }, "2026-02-30": { mission: true } },
  });
  assert.deepEqual(club.ownedItemIds, ["ball-gold"]);
  assert.equal(club.goalItemId, null);
  assert.deepEqual(Object.keys(club.rewardDays), [day]);
  assert.equal(normalizeClub({ goalItemId: "ball-classic" }).goalItemId, null);
  const old = { ...emptyState(), xp: 321, level: 9, totalMissionsPassed: 8, prizesEarned: 2 };
  delete old.club;
  const migrated = migrateState(old);
  assert.deepEqual(migrated.club, base);
  assert.deepEqual(migrated.course, normalizeCourse(old));
  delete migrated.club;
  delete migrated.course;
  assert.deepEqual(migrated, old);
});

test("paid items stay locked until purchased; mission cosmetics remain free", () => {
  const state = funded();
  assert.equal(cosmeticUnlocked(cosmeticItem("ball-gold"), state), false);
  assert.equal(equipCosmetic(state, "ball-gold"), state);
  assert.deepEqual(normalizeCosmetics({ ballId: "ball-gold" }, state), state.cosmetics);
  assert.equal(cosmeticUnlocked(cosmeticItem("ball-classic"), state), true);
  state.planetStars[0] = 1;
  state.planetStars[5] = 3;
  assert.equal(cosmeticUnlocked(cosmeticItem("ball-training"), state), true);
  assert.equal(cosmeticUnlocked(cosmeticItem("field-sunset"), state), true);
  assert.equal(purchaseCosmetic(state, "ball-training").reason, "not-for-sale");
});

test("purchase deducts the catalog price once, retains learning and does not auto-equip", () => {
  const state = chooseGoal(funded(30), "ball-gold");
  const before = structuredClone(state);
  const bought = purchaseCosmetic(state, "ball-gold");
  assert.equal(bought.ok, true);
  assert.equal(bought.state.club.balance, 0);
  assert.deepEqual(bought.state.club.ownedItemIds, ["ball-gold"]);
  assert.equal(bought.state.club.goalItemId, null);
  assert.deepEqual(bought.state.cosmetics, state.cosmetics);
  assert.deepEqual({ ...bought.state, club: state.club }, state);
  assert.deepEqual(state, before);
  const duplicate = purchaseCosmetic(bought.state, "ball-gold");
  assert.equal(duplicate.reason, "owned");
  assert.equal(duplicate.state, bought.state);
  assert.deepEqual(
    newCosmetics(state, bought.state).map((item) => item.id),
    ["ball-gold"],
  );
  const equipped = equipCosmetic(bought.state, "ball-gold");
  assert.equal(migrateState(JSON.parse(JSON.stringify(equipped))).cosmetics.ballId, "ball-gold");
});

test("invalid or unaffordable purchases cannot mutate state, and malformed catalog prices fail closed", () => {
  const state = funded(29);
  assert.equal(purchaseCosmetic(state, "ball-gold").reason, "insufficient-coins");
  assert.equal(purchaseCosmetic(state, "missing").reason, "unknown-item");
  const item = COSMETICS.find((entry) => entry.id === "ball-gold");
  const price = item.cost;
  try {
    for (const invalid of [0, -1, NaN, Infinity, "30", 1.5]) {
      item.cost = invalid;
      assert.equal(purchaseCosmetic(funded(), item.id).reason, "not-for-sale");
    }
  } finally {
    item.cost = price;
  }
  assert.equal(state.club.balance, 29);
});

test("goals are optional, free to switch and clear, and report remaining coins honestly", () => {
  const state = funded(20);
  const goal = chooseGoal(state, "ball-gold");
  assert.equal(clubSummary(goal, day).goalRemaining, 10);
  assert.equal(clubSummary(goal, day).goalProgress, 66);
  assert.equal(chooseGoal(goal, "ball-gold"), goal);
  assert.equal(chooseGoal(goal, "missing"), goal);
  assert.equal(chooseGoal(goal, "ball-classic"), goal);
  assert.equal(chooseGoal(goal, null).club.goalItemId, null);
  assert.equal(chooseGoal(goal, "field-night").club.balance, 20);
  const owned = purchaseCosmetic(funded(), "ball-gold").state;
  assert.equal(chooseGoal(owned, "ball-gold"), owned);
});

test("store persists goal, purchase and equipment across reload with one debit", () => {
  let raw = JSON.stringify(funded());
  const storage = {
    getItem: () => raw,
    setItem: (_key, value) => {
      raw = value;
    },
  };
  const store = modules(storage)("store").usePlayer;
  assert.equal(store.getState().setCosmeticGoal("ball-gold"), "selected");
  assert.equal(JSON.parse(raw).club.goalItemId, "ball-gold");
  assert.equal(store.getState().buyCosmetic("ball-gold"), "purchased");
  assert.equal(store.getState().buyCosmetic("ball-gold"), "owned");
  assert.equal(JSON.parse(raw).club.balance, 70);
  assert.equal(store.getState().equipCosmetic("ball-gold"), "equipped");
  const next = modules(storage)("store").usePlayer.getState().snapshot();
  assert.equal(next.cosmetics.ballId, "ball-gold");
  assert.equal(next.club.balance, 70);
  assert.equal(next.club.goalItemId, null);
  store.getState().replaceState(emptyState());
  assert.equal(store.getState().club.balance, 0);
  assert.deepEqual(store.getState().club.ownedItemIds, []);
  assert.equal(store.getState().cosmetics.ballId, "ball-classic");
});

test("failed storage keeps ownership, goal, balance and equipment unchanged", () => {
  const store = modules({
    getItem: () => JSON.stringify(funded()),
    setItem: () => {
      throw new Error("quota");
    },
  })("store").usePlayer;
  const before = store.getState().snapshot();
  assert.equal(store.getState().setCosmeticGoal("ball-gold"), "storage-error");
  assert.equal(store.getState().buyCosmetic("ball-gold"), "storage-error");
  assert.equal(store.getState().equipCosmetic("ball-gold"), "unavailable");
  assert.deepEqual(store.getState().snapshot(), before);
  store.setState({ hydrated: false });
  assert.equal(store.getState().buyCosmetic("ball-gold"), "unavailable");
  assert.equal(store.getState().setCosmeticGoal("ball-gold"), "unavailable");
});

test("mission reports localSaved honestly and preserves the in-memory match after a write failure", () => {
  for (const succeeds of [true, false]) {
    let raw = JSON.stringify(emptyState());
    const game = modules({
      getItem: () => raw,
      setItem: (_key, value) => {
        if (!succeeds) throw new Error("quota");
        raw = value;
      },
    });
    const store = game("store").usePlayer;
    const result = store.getState().applyMission({
      mode: "multiplication",
      rankId: "cadete",
      startedAt: new Date("2026-09-08T15:00:00Z").getTime(),
      finishedAt: new Date("2026-09-08T15:01:00Z").getTime(),
      elapsedMs: 60_000,
      timeLimitMs: 150_000,
      correct: 15,
      wrong: 0,
      passed: true,
      factsTried: game("adaptive")
        .allFactsForRank("cadete")
        .slice(0, 15)
        .map((fact) => ({ fact, ok: true, ms: 1000 })),
    });
    assert.equal(result.localSaved, succeeds);
    assert.equal(store.getState().totalMissionsPassed, 1);
    assert.ok(store.getState().club.balance >= 20);
    assert.equal(JSON.parse(raw).totalMissionsPassed, succeeds ? 1 : 0);
  }
});

test("a first-day mission plus focus earns the first real purchase and equipped item survives reload", () => {
  let raw = JSON.stringify(emptyState());
  const storage = {
    getItem: () => raw,
    setItem: (_key, value) => {
      raw = value;
    },
  };
  const game = modules(storage);
  const store = game("store").usePlayer;
  assert.equal(store.getState().club.balance, 0);
  assert.equal(store.getState().buyCosmetic("ball-gold"), "insufficient-coins");
  assert.equal(store.getState().setCosmeticGoal("ball-gold"), "selected");
  const startedAt = new Date("2026-09-08T15:00:00Z");
  const deck = game("coaching").coachedMissionFacts(store.getState().snapshot(), startedAt);
  const result = store.getState().applyMission({
    mode: "multiplication",
    rankId: "cadete",
    startedAt: startedAt.getTime(),
    finishedAt: startedAt.getTime() + 60_000,
    elapsedMs: 60_000,
    timeLimitMs: 150_000,
    correct: 15,
    wrong: 0,
    passed: true,
    factsTried: deck.slice(0, 15).map((fact) => ({ fact, ok: true, ms: 1000 })),
  });
  assert.equal(result.localSaved, true);
  assert.equal(result.clubReward.coinsGained, 30);
  assert.equal(store.getState().club.balance, 30);
  assert.equal(store.getState().buyCosmetic("ball-gold"), "purchased");
  assert.equal(store.getState().club.balance, 0);
  assert.equal(store.getState().equipCosmetic("ball-gold"), "equipped");
  const reloaded = modules(storage)("store").usePlayer.getState().snapshot();
  assert.equal(reloaded.club.balance, 0);
  assert.deepEqual(reloaded.club.ownedItemIds, ["ball-gold"]);
  assert.equal(reloaded.cosmetics.ballId, "ball-gold");
  assert.equal(reloaded.club.goalItemId, null);
  assert.equal(reloaded.totalMissionsPassed, 1);
});
