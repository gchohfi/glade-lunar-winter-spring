import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyPracticeResult,
  buildPracticeDeck,
  hasPractice,
  practiceTargets,
  PRACTICE_SIZE,
  PRACTICE_XP_CAP,
} from "./practice.ts";
import { shiftDayKey } from "./shields.ts";
import {
  DAILY_GOAL,
  emptyState,
  factKey,
  todayKey,
  type Fact,
  type FactStat,
  type PlayerState,
} from "./types.ts";

const NOW = new Date(Date.UTC(2026, 7, 31, 15));
const TODAY = todayKey(NOW);
const day = (delta: number) => shiftDayKey(TODAY, delta);

function stat(attempts: number, correct: number, totalMs: number): FactStat {
  return { attempts, correct, wrong: attempts - correct, totalMs, lastSeen: 0 };
}

function base(patch: Partial<PlayerState> = {}): PlayerState {
  return { ...emptyState(), lastSettledDay: TODAY, ...patch };
}

function withWeakFacts(count: number): PlayerState {
  const state = base();
  const tables = [2, 3, 4, 5, 6, 7, 8, 9];
  let i = 0;
  for (const a of tables) {
    for (const b of [6, 7, 8]) {
      if (i >= count) return state;
      // Precisões crescentes: o primeiro fato é sempre o mais fraco.
      state.facts[factKey({ a, b })] = stat(10, i, 40_000);
      i += 1;
    }
  }
  return state;
}

describe("practiceTargets", () => {
  it("exclui contas já fluentes", () => {
    const state = base({
      facts: {
        [factKey({ a: 7, b: 8 })]: stat(5, 5, 5_000),
        [factKey({ a: 6, b: 9 })]: stat(5, 2, 30_000),
      },
    });
    const targets = practiceTargets(state);
    assert.equal(targets.length, 1);
    assert.deepEqual(targets[0].fact, { a: 6, b: 9 });
  });

  it("hasPractice exige pelo menos 3 alvos", () => {
    assert.equal(hasPractice(withWeakFacts(2)), false);
    assert.equal(hasPractice(withWeakFacts(3)), true);
  });
});

describe("buildPracticeDeck", () => {
  it("tira 10 contas únicas, fracas primeiro", () => {
    const state = withWeakFacts(12);
    const deck = buildPracticeDeck(state);
    assert.equal(deck.length, PRACTICE_SIZE);
    assert.equal(new Set(deck.map(factKey)).size, PRACTICE_SIZE);
    assert.deepEqual(deck[0], { a: 2, b: 6 });
  });

  it("completa a sessão quando faltam alvos", () => {
    const deck = buildPracticeDeck(withWeakFacts(2));
    assert.equal(deck.length, PRACTICE_SIZE);
    assert.equal(new Set(deck.map(factKey)).size, PRACTICE_SIZE);
  });
});

describe("applyPracticeResult", () => {
  const spread: Fact[] = [
    { a: 2, b: 6 },
    { a: 3, b: 7 },
    { a: 4, b: 8 },
    { a: 5, b: 6 },
    { a: 6, b: 7 },
    { a: 7, b: 8 },
    { a: 8, b: 6 },
    { a: 9, b: 7 },
    { a: 2, b: 8 },
    { a: 3, b: 6 },
  ];
  const allOk = spread.map((fact) => ({ fact, ok: true, ms: 2_000 }));

  it("atualiza estatísticas e meta do dia sem tocar na carreira", () => {
    const state = base();
    const result = applyPracticeResult(state, { factsTried: allOk }, NOW);
    assert.equal(result.xpGained, PRACTICE_XP_CAP);
    assert.equal(result.state.facts[factKey({ a: 7, b: 8 })]?.attempts, 1);
    const today = result.state.days[TODAY];
    assert.equal(today?.answered, 10);
    assert.equal(today?.correct, 10);
    assert.equal(today?.tables?.[7], 1);
    assert.equal(result.state.totalMissionsPassed, 0);
    assert.equal(result.state.missions.length, 0);
    assert.equal(result.state.prizeCycle, 0);
    assert.deepEqual(result.state.planetStars, state.planetStars);
    assert.deepEqual(result.state.planetBestMs, state.planetBestMs);
  });

  it("cruzar a meta do dia dispara escudo e missão do dia", () => {
    const tried = allOk.slice(0, 5);
    const state = base({
      days: {
        [day(-1)]: { answered: DAILY_GOAL, correct: DAILY_GOAL, missions: 1 },
        [TODAY]: { answered: 10, correct: 10, missions: 0 },
      },
    });
    const result = applyPracticeResult(state, { factsTried: tried }, NOW);
    assert.equal(result.dailyJustDone, true);
    assert.equal(result.shieldEarned, true);
    assert.ok(result.questsCompleted.some((q) => q.id === "meta"));
    assert.equal(result.state.xp, 10 + result.questsCompleted.length * 20);
  });

  it("assenta os dias perdidos antes de registrar o de hoje", () => {
    const state = base({
      lastSettledDay: day(-2),
      shields: 1,
      days: { [day(-2)]: { answered: DAILY_GOAL, correct: DAILY_GOAL, missions: 1 } },
    });
    const result = applyPracticeResult(state, { factsTried: allOk }, NOW);
    assert.equal(result.state.shields, 0);
    assert.equal(result.state.days[day(-1)]?.shielded, true);
    assert.equal(result.state.lastSettledDay, TODAY);
  });
});
