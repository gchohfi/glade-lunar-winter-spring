import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const module = { exports: {} };
  cache.set(name, module);
  const source = readFileSync(new URL(`../src/lib/game/${name}.ts`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "module", "exports", output)(
    (id) => load(id.slice(2)),
    module,
    module.exports,
  );
  return module.exports;
}
const { getDailyCoach, coachedMissionFacts, evaluateFocus, learningEvidence } = load("coaching");
const { emptyState, factKey, factOp } = load("types");
const { applyMissionResult, allFactsForRank } = load("adaptive");
const { RANKS } = load("ranks");
const { migrateState } = load("progress");
const now = new Date("2026-09-08T15:00:00Z");
const attempts = (facts) => facts.map((fact) => ({ fact, ok: true, ms: 3000 }));
function mission(state, date = now) {
  const plan = getDailyCoach(state, "cadete", date);
  const rest = allFactsForRank("cadete")
    .filter((f) => !plan.focusFacts.some((target) => factKey(f) === factKey(target)))
    .slice(0, 12);
  return {
    mode: "multiplication",
    rankId: "cadete",
    startedAt: date.getTime(),
    finishedAt: date.getTime() + 60000,
    elapsedMs: 60000,
    timeLimitMs: 150000,
    correct: 15,
    wrong: 0,
    passed: true,
    factsTried: attempts([...plan.focusFacts, ...rest]),
    planetIndex: 0,
  };
}

test("daily focus is deterministic, eligible and included early in actual varied decks at every rank", () => {
  for (const rank of RANKS) {
    const state = { ...emptyState(), rankId: rank.id };
    const before = structuredClone(state);
    const plan = getDailyCoach(state, rank.id, now);
    assert.deepEqual(getDailyCoach(state, rank.id, now), plan);
    const allowed = new Set(allFactsForRank(rank.id).map(factKey));
    for (let i = 0; i < 10; i++) {
      const deck = coachedMissionFacts(state, now);
      assert.ok(deck.length >= 15);
      assert.equal(new Set(deck.map(factKey)).size, deck.length);
      assert.ok(deck.every((fact) => allowed.has(factKey(fact))));
      assert.ok(
        plan.focusFacts.every((focus) =>
          deck.slice(0, 10).some((f) => factKey(f) === factKey(focus)),
        ),
      );
      if (rank.id === "cadete") assert.ok(deck.every((fact) => factOp(fact) === "mul"));
    }
    assert.deepEqual(state, before);
  }
});

test("history selects support for the eligible weak table; old division cannot leak into Base", () => {
  const state = emptyState();
  state.facts["7x8"] = {
    attempts: 5,
    correct: 1,
    wrong: 4,
    totalMs: 0,
    lastSeen: now.getTime() - 86400000,
  };
  state.facts["15d2"] = { attempts: 50, correct: 0, wrong: 50, totalMs: 0, lastSeen: 0 };
  const plan = getDailyCoach(state, "cadete", now);
  assert.equal(plan.focusTable, 7);
  assert.equal(plan.reason, "support");
  assert.ok(plan.focusFacts.some((fact) => factKey(fact) === "7x8"));
});

test("a formerly learned fact due after two days is selected for review", () => {
  const state = emptyState();
  state.facts["6x7"] = {
    attempts: 3,
    correct: 3,
    wrong: 0,
    totalMs: 0,
    lastSeen: now.getTime() - 3 * 86400000,
  };
  assert.equal(getDailyCoach(state, "cadete", now).reason, "review");
});

test("focus counts only the first answer to three distinct targets; correction and repeats do not pass", () => {
  const plan = getDailyCoach(emptyState(), "cadete", now);
  const [a, b, c] = plan.focusFacts;
  assert.equal(evaluateFocus(plan, attempts([a, a, a])).correct, 1);
  assert.equal(
    evaluateFocus(plan, [{ fact: a, ok: false }, ...attempts([a, b, c])]).completed,
    false,
  );
  assert.equal(evaluateFocus(plan, attempts([a, b, c])).completed, true);
});

test("a real completed mission earns30 once, replay does not duplicate XP or coins, another same-day mission earns0", () => {
  const player = emptyState();
  const record = mission(player);
  const first = applyMissionResult(player, record);
  assert.equal(first.clubReward.coinsGained, 30);
  assert.equal(first.focus.correct, 3);
  const duplicate = applyMissionResult(first.state, record);
  assert.equal(duplicate.state, first.state);
  assert.equal(duplicate.progress.xpGained, 0);
  const another = applyMissionResult(
    first.state,
    mission(first.state, new Date(now.getTime() + 600000)),
  );
  assert.equal(another.clubReward.coinsGained, 0);
});

test("wrong then corrected focus gets mission20 but no focus10", () => {
  const player = emptyState();
  const record = mission(player);
  record.factsTried.unshift({ ...record.factsTried[0], ok: false });
  record.wrong = 1;
  const result = applyMissionResult(player, record);
  assert.equal(result.clubReward.coinsGained, 20);
  assert.equal(result.focus.correct, 2);
  assert.deepEqual(result.state.facts[factKey(record.factsTried[0].fact)].independentDays, []);
});

test("unsuccessful or incomplete matches and other course modes do not mint coins", () => {
  for (const override of [
    { passed: false },
    { correct: 14 },
    { mode: "vocabulary" },
    { factsTried: [] },
  ]) {
    const player = emptyState();
    const result = applyMissionResult(player, { ...mission(player), ...override });
    assert.equal(result.clubReward.coinsGained, 0);
  }
});

test("independent evidence needs separate days, survives migration, and never retroactively labels old stats", () => {
  const player = emptyState();
  player.facts["13x13"] = { attempts: 100, correct: 100, wrong: 0, totalMs: 0, lastSeen: 0 };
  assert.deepEqual(learningEvidence(player), { returning: 0, reinforced: 0 });
  let current = applyMissionResult(player, mission(player)).state;
  assert.equal(learningEvidence(current).returning, 0);
  current = applyMissionResult(current, mission(current, new Date(now.getTime() + 600000))).state;
  assert.equal(learningEvidence(current).returning, 0);
  const later = applyMissionResult(current, mission(current, new Date(now.getTime() + 86400000)));
  assert.ok(later.retainedFacts > 0);
  const tomorrow = new Date(now.getTime() + 86400000);
  assert.ok(learningEvidence(later.state, tomorrow).returning > 0);
  assert.deepEqual(
    learningEvidence(migrateState(later.state), tomorrow),
    learningEvidence(later.state, tomorrow),
  );
});

test("reward is attributed to the actual finish day across Sao Paulo midnight", () => {
  const player = emptyState();
  const record = mission(player, new Date("2026-09-09T02:59:30Z"));
  const result = applyMissionResult(player, record);
  assert.equal(result.state.club.rewardDays["2026-09-09"].mission, true);
  assert.equal(result.state.club.rewardDays["2026-09-08"], undefined);
});

test("bad dates, duplicate dates and future evidence never inflate learning summaries", () => {
  const state = emptyState();
  state.facts["3x4"] = {
    attempts: 3,
    correct: 3,
    wrong: 0,
    totalMs: 0,
    lastSeen: 0,
    independentDays: ["bad", "2026-02-31", "2099-01-01", "2026-09-08", "2026-09-08"],
  };
  assert.deepEqual(learningEvidence(state, now), { returning: 0, reinforced: 0 });
  state.facts["3x4"].independentDays = { unexpected: true };
  assert.deepEqual(learningEvidence(state, now), { returning: 0, reinforced: 0 });
});

test("facts successful on several days still become due later", () => {
  const state = emptyState();
  state.facts["6x7"] = {
    attempts: 3,
    correct: 3,
    wrong: 0,
    totalMs: 0,
    lastSeen: now.getTime() - 8 * 86400000,
    independentDays: ["2026-08-27", "2026-08-29", "2026-08-31"],
  };
  const plan = getDailyCoach(state, "cadete", now);
  assert.equal(plan.reason, "review");
  assert.equal(plan.focusTable, 6);
});
