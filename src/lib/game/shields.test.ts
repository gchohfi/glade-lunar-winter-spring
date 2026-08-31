import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { currentStreak } from "./adaptive.ts";
import { migrateState } from "./progress.ts";
import { maybeEarnShield, settleShields, shiftDayKey } from "./shields.ts";
import { DAILY_GOAL, emptyState, todayKey, type DayStat, type PlayerState } from "./types.ts";

// Meio-dia em São Paulo, para todayKey ser estável dentro do teste.
const NOW = new Date(Date.UTC(2026, 7, 31, 15));
const TODAY = todayKey(NOW);
const day = (delta: number) => shiftDayKey(TODAY, delta);

function met(): DayStat {
  return { answered: DAILY_GOAL, correct: DAILY_GOAL, missions: 1 };
}

function base(patch: Partial<PlayerState> = {}): PlayerState {
  return { ...emptyState(), lastSettledDay: day(0), ...patch };
}

describe("shiftDayKey", () => {
  it("vira mês e ano", () => {
    assert.equal(shiftDayKey("2026-08-31", 1), "2026-09-01");
    assert.equal(shiftDayKey("2026-01-01", -1), "2025-12-31");
  });
});

describe("settleShields", () => {
  it("primeira rodada só carimba, sem consumo retroativo", () => {
    const state = base({ lastSettledDay: "", shields: 2, days: {} });
    const next = settleShields(state, NOW);
    assert.equal(next.lastSettledDay, TODAY);
    assert.equal(next.shields, 2);
    assert.deepEqual(next.days, {});
  });

  it("no mesmo dia é no-op", () => {
    const state = base({ shields: 1 });
    assert.equal(settleShields(state, NOW), state);
  });

  it("relógio para trás não consome", () => {
    const state = base({ lastSettledDay: day(1), shields: 1 });
    assert.equal(settleShields(state, NOW), state);
  });

  it("um dia perdido gasta um escudo e marca o dia", () => {
    const state = base({
      lastSettledDay: day(-2),
      shields: 1,
      days: { [day(-2)]: met() },
    });
    const next = settleShields(state, NOW);
    assert.equal(next.shields, 0);
    assert.equal(next.days[day(-1)]?.shielded, true);
    assert.equal(next.lastSettledDay, TODAY);
  });

  it("dia parcial preserva as estatísticas e só ganha a marca", () => {
    const partial: DayStat = { answered: 5, correct: 3, missions: 0 };
    const state = base({
      lastSettledDay: day(-2),
      shields: 1,
      days: { [day(-2)]: met(), [day(-1)]: partial },
    });
    const next = settleShields(state, NOW);
    assert.deepEqual(next.days[day(-1)], { ...partial, shielded: true });
  });

  it("dois dias perdidos com um escudo: só o primeiro é coberto", () => {
    const state = base({
      lastSettledDay: day(-3),
      shields: 1,
      days: { [day(-3)]: met() },
    });
    const next = settleShields(state, NOW);
    assert.equal(next.shields, 0);
    assert.equal(next.days[day(-2)]?.shielded, true);
    assert.equal(next.days[day(-1)]?.shielded, undefined);
  });

  it("sequência já morta não desperdiça escudo", () => {
    const state = base({
      lastSettledDay: day(-3),
      shields: 2,
      days: {},
    });
    const next = settleShields(state, NOW);
    assert.equal(next.shields, 2);
  });

  it("dia aberto sem jogar é reexaminado na visita seguinte", () => {
    // Domingo com meta, segunda aberta sem jogar (carimbada), volta na quarta.
    const state = base({
      lastSettledDay: day(-2),
      shields: 2,
      days: { [day(-3)]: met() },
    });
    const next = settleShields(state, NOW);
    assert.equal(next.days[day(-2)]?.shielded, true);
    assert.equal(next.days[day(-1)]?.shielded, true);
    assert.equal(next.shields, 0);
  });

  it("re-assentar não re-consome", () => {
    const state = base({
      lastSettledDay: day(-2),
      shields: 2,
      days: { [day(-2)]: met() },
    });
    const once = settleShields(state, NOW);
    const laterNow = new Date(NOW.getTime() + 86_400_000);
    const twice = settleShields(once, laterNow);
    // Só o dia entre o assentamento e o novo hoje entra na conta.
    assert.equal(twice.shields, once.shields - 1);
    assert.equal(twice.days[day(-1)]?.shielded, true);
    assert.equal(twice.days[day(0)]?.shielded, true);
  });

  it("um buraco de mais de 60 dias não estoura", () => {
    const state = base({ lastSettledDay: "2020-01-01", shields: 2, days: {} });
    const next = settleShields(state, NOW);
    assert.equal(next.lastSettledDay, TODAY);
  });
});

describe("maybeEarnShield", () => {
  it("ganha ao emendar dois dias reais de meta", () => {
    const state = base({ days: { [day(-1)]: met() } });
    const { state: next, earned } = maybeEarnShield(state, true, NOW);
    assert.equal(earned, true);
    assert.equal(next.shields, 1);
  });

  it("sem meta ontem, sem dailyJustDone ou no teto: nada", () => {
    assert.equal(maybeEarnShield(base(), true, NOW).earned, false);
    assert.equal(
      maybeEarnShield(base({ days: { [day(-1)]: met() } }), false, NOW).earned,
      false,
    );
    assert.equal(
      maybeEarnShield(base({ shields: 2, days: { [day(-1)]: met() } }), true, NOW).earned,
      false,
    );
  });

  it("ontem escudado não emenda a dupla", () => {
    const shieldedDay: DayStat = { answered: 0, correct: 0, missions: 0, shielded: true };
    const state = base({ days: { [day(-1)]: shieldedDay } });
    assert.equal(maybeEarnShield(state, true, NOW).earned, false);
  });
});

describe("currentStreak com escudo", () => {
  it("atravessa o dia protegido sem somar", () => {
    const state = base({
      days: {
        [day(0)]: met(),
        [day(-1)]: { answered: 0, correct: 0, missions: 0, shielded: true },
        [day(-2)]: met(),
      },
    });
    assert.equal(currentStreak(state, NOW), 2);
  });
});

describe("migração v3", () => {
  it("round-trip JSON preserva escudos e marcas", () => {
    const state = base({
      shields: 2,
      days: {
        [day(-1)]: {
          answered: 3,
          correct: 3,
          missions: 0,
          shielded: true,
          tables: { 7: 3 },
          records: 1,
          questsDone: ["meta"],
        },
      },
    });
    const revived = migrateState(JSON.parse(JSON.stringify(state)));
    assert.equal(revived.shields, 2);
    assert.equal(revived.lastSettledDay, day(0));
    assert.deepEqual(revived.days[day(-1)], state.days[day(-1)]);
  });

  it("clampa escudos corrompidos", () => {
    const dirty = { ...base(), shields: 99 };
    assert.equal(migrateState(JSON.parse(JSON.stringify(dirty))).shields, 2);
  });
});
