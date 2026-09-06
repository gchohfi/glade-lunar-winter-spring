import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createRequire } from "node:module";
import ts from "typescript";

const cache = new Map();
const require = createRequire(import.meta.url);
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const module = { exports: {} };
  cache.set(name, module);
  const source = readFileSync(new URL(`../src/lib/game/${name}.ts`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("require", "module", "exports", output)(
    (id) => (id.startsWith("./") ? load(id.slice(2)) : require(id)),
    module,
    module.exports,
  );
  return module.exports;
}
const { allFactsForRank, pickMissionFacts } = load("adaptive");
const { RANKS } = load("ranks");
const { factAnswer, factOp, factKey, emptyState } = load("types");
const { explainFact, practiceDeck, startPractice, practiceReducer, weeklyLearning } =
  load("learning");

test("Base has multiplication, Promessa adds exact division, Titular adds halves", () => {
  assert.ok(allFactsForRank("cadete").every((f) => factOp(f) === "mul"));
  const second = allFactsForRank("aprendiz");
  assert.ok(second.some((f) => factOp(f) === "div"));
  assert.ok(second.every((f) => Number.isInteger(factAnswer(f))));
  assert.ok(allFactsForRank("piloto").some((f) => !Number.isInteger(factAnswer(f))));
  for (const rank of RANKS) {
    const mult = allFactsForRank(rank.id).filter((f) => factOp(f) === "mul");
    assert.equal(mult.length, rank.tables.length * rank.factors.length);
  }
});

test("every generated explanation recombines to the exact answer at every rank", () => {
  for (const rank of RANKS)
    for (const fact of allFactsForRank(rank.id)) {
      const explanation = explainFact(fact);
      assert.equal(explanation.combined, factAnswer(fact), factKey(fact));
      assert.ok(explanation.parts.every((p) => Number.isFinite(factAnswer(p)) && p.b > 0));
      if (factOp(fact) === "div" && Number.isInteger(factAnswer(fact))) {
        assert.equal(factAnswer(explanation.parts[0]), fact.a);
      } else {
        assert.equal(
          explanation.parts.reduce((sum, p) => sum + factAnswer(p), 0),
          factAnswer(fact),
        );
      }
    }
});

test("actual match decks follow the new entry sequence without changing saved history", () => {
  const player = emptyState();
  player.facts["15d2"] = { attempts: 4, correct: 1, wrong: 3, totalMs: 10000, lastSeen: 0 };
  const original = structuredClone(player);
  for (let n = 0; n < 30; n++) {
    assert.ok(pickMissionFacts(player).every((f) => factOp(f) === "mul"));
    assert.ok(
      pickMissionFacts({ ...player, rankId: "aprendiz" }).every((f) =>
        Number.isInteger(factAnswer(f)),
      ),
    );
  }
  assert.deepEqual(player, original);
});

test("a related halves question keeps the strategy rather than switching to exact division", () => {
  let state = startPractice([
    { a: 15, b: 2, op: "div" },
    { a: 3, b: 5 },
  ]);
  state = practiceReducer(state, { type: "help" });
  state = practiceReducer(state, { type: "retry" });
  state = practiceReducer(typeAnswer(state, "7,5"), { type: "submit" });
  state = practiceReducer(state, { type: "next", rankId: "piloto" });
  assert.equal(factOp(state.deck[1]), "div");
  assert.equal(state.deck[1].b, 2);
  assert.equal(Number.isInteger(factAnswer(state.deck[1])), false);
  assert.notEqual(state.deck[1].a, 15);
});

test("six times seven is thirty plus twelve, and odd halves keep decimal comma", () => {
  const six = explainFact({ a: 6, b: 7 });
  assert.equal(six.conclusion, "30 + 12 = 42");
  assert.deepEqual(six.parts.map(factAnswer), [30, 12]);
  assert.equal(explainFact({ a: 15, b: 2, op: "div" }).conclusion, "7 + 0,5 = 7,5");
});

test("practice prioritizes eligible weak facts without changing player data", () => {
  const player = emptyState();
  player.facts["6x7"] = { attempts: 4, correct: 1, wrong: 3, totalMs: 12000, lastSeen: 0 };
  player.facts["15d2"] = { attempts: 10, correct: 0, wrong: 10, totalMs: 12000, lastSeen: 0 };
  const before = structuredClone(player);
  const deck = practiceDeck(player, "cadete");
  assert.equal(deck.length, 5);
  assert.equal(factKey(deck[0]), "6x7");
  assert.ok(deck.every((f) => factOp(f) === "mul"));
  assert.equal(new Set(deck.map(factKey)).size, 5);
  assert.deepEqual(player, before);
});

const typeAnswer = (state, raw) =>
  [...raw].reduce((s, digit) => practiceReducer(s, { type: "digit", digit }), state);
test("wrong answers explain until explicit retry; duplicate submissions cannot advance", () => {
  let state = startPractice([
    { a: 6, b: 7 },
    { a: 3, b: 5 },
  ]);
  state = practiceReducer(typeAnswer(state, "0"), { type: "submit" });
  assert.equal(state.phase, "explain");
  for (const action of [
    { type: "digit", digit: "4" },
    { type: "submit" },
    { type: "next", rankId: "cadete" },
  ]) {
    assert.equal(practiceReducer(state, action), state);
  }
  state = practiceReducer(state, { type: "retry" });
  assert.equal(state.typed, "");
  state = practiceReducer(typeAnswer(state, "42"), { type: "submit" });
  assert.equal(state.phase, "correct");
  assert.equal(practiceReducer(state, { type: "submit" }), state);
  state = practiceReducer(state, { type: "next", rankId: "cadete" });
  assert.equal(state.index, 1);
  assert.equal(state.deck[1].a, 6);
  assert.notEqual(factKey(state.deck[1]), "6x7");
});

test("explicit hint does not advance; comma input and completion work without rewards", () => {
  let state = startPractice([{ a: 15, b: 2, op: "div" }]);
  state = practiceReducer(state, { type: "help" });
  assert.equal(state.index, 0);
  state = practiceReducer(state, { type: "retry" });
  state = typeAnswer(state, "7,5");
  assert.equal(practiceReducer(state, { type: "digit", digit: "," }), state);
  state = practiceReducer(state, { type: "submit" });
  assert.equal(state.phase, "correct");
  state = practiceReducer(state, { type: "next", rankId: "piloto" });
  assert.equal(state.phase, "done");
  assert.equal(practiceReducer(state, { type: "next", rankId: "piloto" }), state);
  assert.equal("xp" in state, false);
  const component = readFileSync(
    new URL("../src/components/practice-play.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    component,
    /applyMission|persistCloud|setInterval|setTimeout|requestAnimationFrame/,
  );
});

test("nearby decimal values are not accepted as a correct lesson answer", () => {
  for (const raw of ["7", "7,49", "7,54"]) {
    const state = typeAnswer(startPractice([{ a: 15, b: 2, op: "div" }]), raw);
    assert.equal(practiceReducer(state, { type: "submit" }).phase, "explain");
  }
});

test("weekly accuracy is weighted by answers and empty history stays unknown", () => {
  const state = emptyState();
  const now = new Date("2026-09-05T15:00:00Z");
  assert.equal(weeklyLearning(state, now).current.accuracy, null);
  assert.equal(weeklyLearning(state, now).current.averageMs, null);
  state.days = {
    "2026-09-05": { answered: 10, correct: 10, missions: 0 },
    "2026-09-04": { answered: 30, correct: 15, missions: 1 },
    "2026-08-29": { answered: 20, correct: 10, missions: 1 },
  };
  const { current, previous } = weeklyLearning(state, now);
  assert.equal(current.accuracy, 63);
  assert.equal(current.answered, 40);
  assert.equal(previous.accuracy, 50);
  assert.equal(current.averageMs, null);
});

test("weekly completed-match time uses completion day in the game's timezone", () => {
  const state = emptyState();
  const sample = {
    id: "a",
    mode: "multiplication",
    rankId: "cadete",
    startedAt: 0,
    finishedAt: Date.parse("2026-08-30T01:00:00Z"),
    elapsedMs: 30000,
    timeLimitMs: 150000,
    correct: 15,
    wrong: 1,
    passed: true,
  };
  state.missions = [sample, { ...sample, id: "b", elapsedMs: 150000, passed: false }];
  const result = weeklyLearning(state, new Date("2026-09-05T15:00:00Z"));
  assert.equal(result.current.timedSamples, 0);
  assert.equal(result.previous.timedSamples, 1);
  assert.equal(result.previous.averageMs, 30000);
});
