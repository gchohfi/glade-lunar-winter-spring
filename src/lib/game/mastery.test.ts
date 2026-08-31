import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FLUENT_MAX_AVG_MS,
  masteryCounts,
  masteryGrid,
  masteryOf,
  weakestTable,
} from "./mastery.ts";
import { emptyState, factKey, type FactStat } from "./types.ts";

function stat(attempts: number, correct: number, totalMs: number): FactStat {
  return { attempts, correct, wrong: attempts - correct, totalMs, lastSeen: 0 };
}

describe("masteryOf", () => {
  it("sem tentativas é novo", () => {
    assert.equal(masteryOf(undefined), "novo");
    assert.equal(masteryOf(stat(0, 0, 0)), "novo");
  });

  it("fluente exige 3+ tentativas, 90% e média até 3s", () => {
    assert.equal(masteryOf(stat(3, 3, 3 * FLUENT_MAX_AVG_MS)), "fluente");
    assert.equal(masteryOf(stat(10, 9, 10_000)), "fluente");
  });

  it("acerto alto mas lento não é fluente", () => {
    assert.equal(masteryOf(stat(10, 9, 40_000)), "quase");
  });

  it("duas tentativas perfeitas ainda não bastam", () => {
    assert.equal(masteryOf(stat(2, 2, 2_000)), "quase");
  });

  it("80% é quase; abaixo é aprendendo", () => {
    assert.equal(masteryOf(stat(10, 8, 50_000)), "quase");
    assert.equal(masteryOf(stat(10, 5, 50_000)), "aprendendo");
  });
});

describe("masteryGrid", () => {
  it("tem 8 linhas de 12 células, chaveadas por factKey", () => {
    const rows = masteryGrid(emptyState());
    assert.equal(rows.length, 8);
    for (const row of rows) assert.equal(row.cells.length, 12);
    assert.equal(rows[0].table, 2);
    assert.equal(rows[0].cells[0].key, factKey({ a: 2, b: 1 }));
    assert.equal(rows[7].cells[11].key, factKey({ a: 9, b: 12 }));
  });

  it("counts soma 96", () => {
    const counts = masteryCounts(emptyState());
    assert.equal(counts.fluente + counts.quase + counts.aprendendo + counts.novo, 96);
    assert.equal(counts.novo, 96);
  });
});

describe("weakestTable", () => {
  it("null sem histórico", () => {
    assert.equal(weakestTable(emptyState()), null);
  });

  it("aponta a tabuada menos fluente entre as tentadas", () => {
    const state = emptyState();
    state.facts[factKey({ a: 2, b: 3 })] = stat(4, 4, 4_000);
    state.facts[factKey({ a: 7, b: 8 })] = stat(4, 1, 30_000);
    assert.equal(weakestTable(state), 7);
  });

  it("desempata por mais erros acumulados", () => {
    const state = emptyState();
    state.facts[factKey({ a: 6, b: 7 })] = stat(4, 2, 20_000);
    state.facts[factKey({ a: 8, b: 7 })] = stat(6, 2, 20_000);
    assert.equal(weakestTable(state), 8);
  });
});
