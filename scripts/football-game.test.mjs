import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import ts from "typescript";

// Execute the real pure game modules with the installed compiler, without a
// browser, persisted player data or an additional test-runner dependency.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cache = new Map();
function loadGame(name) {
  const path = resolve(root, "src/lib/game", name + ".ts");
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const output = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (id) => {
    assert.ok(id.startsWith("./"), "Pure game test unexpectedly imports " + id);
    return loadGame(id.slice(2));
  };
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}
const { footballState } = loadGame("football");
const { PLANETS, SHIPS, CHAPTERS } = loadGame("worlds");
const { migrateState, applyRunProgress } = loadGame("progress");
const { factAnswer, parseGuess, guessesMatch, formatAnswer, emptyState, STORAGE_KEY } =
  loadGame("types");
const { footballAlertText } = loadGame("alerts");
const { RANKS } = loadGame("ranks");

test("two passes and one shot, five goals for exactly fifteen correct answers", () => {
  for (let n = 0; n <= 15; n++) {
    assert.equal(footballState(n).goals, Math.floor(n / 3));
    assert.equal(footballState(n, "ok").goalJustScored, n > 0 && n % 3 === 0);
  }
  assert.equal(footballState(15).nextPlay, "Partida completa");
  assert.equal(footballState(16).goals, 5);
  assert.equal(footballState(-1).goals, 0);
});
test("the ball advances, enters the goal, and resets for the next play", () => {
  assert.deepEqual(
    [0, 1, 2, 3].map((n) => footballState(n, "ok").ballPercent),
    [26, 48, 70, 90],
  );
  assert.equal(footballState(3).ballPercent, 26);
});
test("a wrong answer does not remove goals or celebrate another goal", () => {
  assert.equal(footballState(6, "bad").goals, 2);
  assert.equal(footballState(6, "bad").goalJustScored, false);
  assert.match(footballState(6, "bad").line, /juntos/);
});
test("multiplication, division and decimal comma use the actual operation", () => {
  assert.equal(factAnswer({ a: 33, b: 3, op: "div" }), 11);
  assert.equal(factAnswer({ a: 33, b: 3 }), 99);
  assert.equal(factAnswer({ a: 33, b: 6, op: "div" }), 5.5);
  assert.ok(guessesMatch(parseGuess("5,5"), 5.5));
  assert.equal(formatAnswer(5.5), "5,5");
  assert.equal(guessesMatch(parseGuess("5"), 5.5), false);
});
test("all five chapters preserve twelve legacy stage IDs and seven unlock levels", () => {
  assert.equal(CHAPTERS.length, 5);
  assert.deepEqual(
    PLANETS.map((p) => p.id),
    [
      "lua",
      "porto",
      "vale",
      "ilha",
      "estacao",
      "pico",
      "cometa",
      "abismo",
      "farol",
      "anel",
      "fossa",
      "coroa",
    ],
  );
  assert.deepEqual(
    SHIPS.map((s) => s.minLevel),
    [1, 5, 10, 15, 20, 25, 30],
  );
  assert.deepEqual([...new Set(PLANETS.map((p) => p.chapter))], [0, 1, 2, 3, 4]);
  assert.equal(STORAGE_KEY, "missao-tabuada-v1");
  assert.deepEqual(
    RANKS.map((r) => r.secondsPerFact),
    [9, 7.5, 6, 5, 4.5, 4, 2.8],
  );
});
test("existing saved career, stars, records, prize and facts survive the theme change", () => {
  const original = {
    ...emptyState(),
    childName: "Teste",
    onboarded: true,
    level: 9,
    xp: 73,
    selectedPlanet: 4,
    furthestPlanet: 6,
    rankId: "capitao",
    totalMissionsPassed: 8,
    prizeCycle: 8,
    prizeName: "Cinema",
    planetStars: [3, 2, 1, 3, 2, 1, 0, 0, 0, 0, 0, 0],
    planetBestMs: [45000, 47000, 52000, 46000, 0, 0, 0, 0, 0, 0, 0, 0],
  };
  assert.deepEqual(migrateState(structuredClone(original)), original);
});
test("completion unlocks only the next stage, keeps better records and awards XP", () => {
  const player = emptyState();
  const result = applyRunProgress(player, {
    passed: true,
    correct: 15,
    wrong: 0,
    bestCombo: 15,
    elapsedMs: 30000,
    timeLimitMs: 150000,
    planetIndex: 0,
  });
  assert.equal(result.state.furthestPlanet, 1);
  assert.equal(result.state.planetStars[0], 3);
  assert.equal(result.state.planetBestMs[0], 30000);
  assert.ok(result.delta.xpGained > 0);
  const repeated = applyRunProgress(result.state, {
    passed: true,
    correct: 15,
    wrong: 2,
    bestCombo: 5,
    elapsedMs: 60000,
    timeLimitMs: 150000,
    planetIndex: 0,
  });
  assert.equal(repeated.state.furthestPlanet, 1);
  assert.equal(repeated.state.planetBestMs[0], 30000);
  assert.equal(repeated.state.planetStars[0], 3);
});
test("a timed-out training grants practice XP without unlocking an unearned stage", () => {
  const result = applyRunProgress(emptyState(), {
    passed: false,
    correct: 5,
    wrong: 1,
    bestCombo: 3,
    elapsedMs: 150000,
    timeLimitMs: 150000,
    planetIndex: 0,
  });
  assert.equal(result.state.furthestPlanet, 0);
  assert.equal(result.state.planetStars[0], 0);
  assert.ok(result.delta.xpGained > 0);
});
test("old system alerts display football copy without rewriting historical data", () => {
  const alert = {
    title: "Nova nave: Asa Teal",
    body: "Nova patente. Próximo planeta: Ilha Coral.",
    kind: "ship",
  };
  const before = structuredClone(alert);
  assert.doesNotMatch(JSON.stringify(footballAlertText(alert)), /nave|planeta|patente/i);
  assert.deepEqual(alert, before);
});
