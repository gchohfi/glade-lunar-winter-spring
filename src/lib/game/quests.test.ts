import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { xpToNext } from "./progress.ts";
import { questIdsForDay, questsForDay, settleQuests, QUEST_XP, type QuestId } from "./quests.ts";
import { shiftDayKey } from "./shields.ts";
import {
  emptyState,
  factKey,
  todayKey,
  type MissionRecord,
  type PlayerState,
} from "./types.ts";

const NOW = new Date(Date.UTC(2026, 7, 31, 15));
const TODAY = todayKey(NOW);

/** Primeiro dia a partir de hoje cujo sorteio inclui a missão pedida. */
function dayWith(id: QuestId): string {
  let key = TODAY;
  for (let i = 0; i < 400; i += 1) {
    if (questIdsForDay(key).includes(id)) return key;
    key = shiftDayKey(key, 1);
  }
  throw new Error(`nenhum dia sorteia ${id}`);
}

function missionAt(dayKey: string, patch: Partial<MissionRecord> = {}): MissionRecord {
  const finishedAt = new Date(`${dayKey}T12:00:00-03:00`).getTime();
  return {
    id: `m${finishedAt}`,
    mode: "multiplication",
    rankId: "cadete",
    startedAt: finishedAt - 60_000,
    finishedAt,
    elapsedMs: 60_000,
    timeLimitMs: 135_000,
    correct: 15,
    wrong: 0,
    passed: true,
    ...patch,
  };
}

function base(patch: Partial<PlayerState> = {}): PlayerState {
  return { ...emptyState(), lastSettledDay: TODAY, ...patch };
}

function quest(state: PlayerState, dayKey: string, id: QuestId) {
  const found = questsForDay(state, dayKey).find((q) => q.id === id);
  assert.ok(found, `missão ${id} não sorteada em ${dayKey}`);
  return found;
}

describe("questIdsForDay", () => {
  it("é determinística, distinta e sempre abre com a meta", () => {
    let key = TODAY;
    for (let i = 0; i < 30; i += 1) {
      const ids = questIdsForDay(key);
      assert.deepEqual(ids, questIdsForDay(key));
      assert.equal(ids.length, 3);
      assert.equal(ids[0], "meta");
      assert.equal(new Set(ids).size, 3);
      key = shiftDayKey(key, 1);
    }
  });
});

describe("questsForDay", () => {
  it("meta acompanha os acertos do dia", () => {
    const state = base({ days: { [TODAY]: { answered: 9, correct: 7, missions: 0 } } });
    const q = quest(state, TODAY, "meta");
    assert.equal(q.progress, 7);
    assert.equal(q.done, false);
  });

  it("perfeita conta só missões de hoje sem erro", () => {
    const key = dayWith("perfeita");
    const yesterday = shiftDayKey(key, -1);
    const clean = base({ missions: [missionAt(yesterday)] });
    assert.equal(quest(clean, key, "perfeita").done, false);
    const today = base({ missions: [missionAt(key)] });
    assert.equal(quest(today, key, "perfeita").done, true);
    const flawed = base({ missions: [missionAt(key, { wrong: 2 })] });
    assert.equal(quest(flawed, key, "perfeita").done, false);
  });

  it("combo8 usa o melhor combo do dia e trata registros antigos como zero", () => {
    const key = dayWith("combo8");
    const state = base({
      missions: [missionAt(key, { bestCombo: 5 }), missionAt(key, { bestCombo: undefined })],
    });
    assert.equal(quest(state, key, "combo8").progress, 5);
    const done = base({ missions: [missionAt(key, { bestCombo: 9 })] });
    assert.equal(quest(done, key, "combo8").done, true);
  });

  it("recorde lê o contador do dia", () => {
    const key = dayWith("recorde");
    const state = base({
      days: { [key]: { answered: 0, correct: 0, missions: 0, records: 1 } },
    });
    assert.equal(quest(state, key, "recorde").done, true);
  });

  it("tabela mira a tabuada mais fraca", () => {
    const key = dayWith("tabela");
    const state = base({
      facts: {
        [factKey({ a: 7, b: 8 })]: { attempts: 4, correct: 1, wrong: 3, totalMs: 30_000, lastSeen: 0 },
      },
      days: { [key]: { answered: 4, correct: 4, missions: 0, tables: { 7: 4 } } },
    });
    const q = quest(state, key, "tabela");
    assert.ok(q.title.includes("7"));
    assert.equal(q.progress, 4);
    assert.equal(q.target, 6);
  });

  it("rapida exige vencer com 70% do relógio", () => {
    const key = dayWith("rapida");
    const fast = base({
      missions: [missionAt(key, { elapsedMs: 80_000, timeLimitMs: 135_000 })],
    });
    assert.equal(quest(fast, key, "rapida").done, true);
    const slow = base({
      missions: [missionAt(key, { elapsedMs: 130_000, timeLimitMs: 135_000 })],
    });
    assert.equal(quest(slow, key, "rapida").done, false);
  });

  it("conclusão registrada é pegajosa mesmo sem os insumos", () => {
    const key = dayWith("combo8");
    const state = base({
      days: { [key]: { answered: 0, correct: 0, missions: 0, questsDone: ["combo8"] } },
    });
    assert.equal(quest(state, key, "combo8").done, true);
  });
});

describe("settleQuests", () => {
  it("concede uma vez, registra no dia e nunca re-concede", () => {
    const key = dayWith("perfeita");
    const state = base({ missions: [missionAt(key)] });
    const once = settleQuests(state, key);
    assert.ok(once.completed.some((q) => q.id === "perfeita"));
    assert.equal(once.xpGained, once.completed.length * QUEST_XP);
    assert.ok(once.state.days[key]?.questsDone?.includes("perfeita"));
    const twice = settleQuests(once.state, key);
    assert.equal(twice.completed.length, 0);
    assert.equal(twice.state.xp, once.state.xp);
  });

  it("o XP das missões do dia sobe de nível", () => {
    const key = dayWith("perfeita");
    const state = base({
      level: 1,
      xp: xpToNext(1) - 10,
      missions: [missionAt(key)],
    });
    const { state: next } = settleQuests(state, key);
    assert.equal(next.level, 2);
  });
});
