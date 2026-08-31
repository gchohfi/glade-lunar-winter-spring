import { factKey, type Fact, type FactStat, type PlayerState } from "./types.ts";

/**
 * Domínio por conta, no critério de automaticidade das escolas (Reflex/IXL):
 * "fluente" exige acerto alto E resposta rápida — saber devagar ainda não é
 * saber de cor.
 */
export type MasteryTier = "fluente" | "quase" | "aprendendo" | "novo";

export const MASTERY_TABLES = [2, 3, 4, 5, 6, 7, 8, 9] as const;
export const MASTERY_FACTORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const FLUENT_MIN_ATTEMPTS = 3;
export const FLUENT_MAX_AVG_MS = 3000;

export function masteryOf(stat: FactStat | undefined): MasteryTier {
  if (!stat || stat.attempts === 0) return "novo";
  const acc = stat.correct / stat.attempts;
  const avgMs = stat.totalMs / stat.attempts;
  if (stat.attempts >= FLUENT_MIN_ATTEMPTS && acc >= 0.9 && avgMs <= FLUENT_MAX_AVG_MS) {
    return "fluente";
  }
  if (acc >= 0.8) return "quase";
  return "aprendendo";
}

export type MasteryCell = {
  fact: Fact;
  key: string;
  tier: MasteryTier;
  stat: FactStat | null;
};

export type MasteryRow = {
  table: number;
  cells: MasteryCell[];
  fluent: number;
};

export function masteryGrid(state: PlayerState): MasteryRow[] {
  return MASTERY_TABLES.map((table) => {
    const cells = MASTERY_FACTORS.map((factor) => {
      const fact = { a: table, b: factor };
      const key = factKey(fact);
      const stat = state.facts[key];
      return { fact, key, tier: masteryOf(stat), stat: stat ?? null };
    });
    return {
      table,
      cells,
      fluent: cells.filter((c) => c.tier === "fluente").length,
    };
  });
}

export function masteryCounts(state: PlayerState): Record<MasteryTier, number> {
  const counts: Record<MasteryTier, number> = { fluente: 0, quase: 0, aprendendo: 0, novo: 0 };
  for (const row of masteryGrid(state)) {
    for (const cell of row.cells) counts[cell.tier] += 1;
  }
  return counts;
}

/**
 * A tabuada com menos células fluentes, entre as já tentadas — o alvo natural
 * da missão do dia "tabela". Empate: mais erros acumulados; depois a maior.
 */
export function weakestTable(state: PlayerState): number | null {
  const rows = masteryGrid(state)
    .map((row) => ({
      table: row.table,
      fluent: row.fluent,
      attempted: row.cells.some((c) => (c.stat?.attempts ?? 0) > 0),
      wrong: row.cells.reduce((sum, c) => sum + (c.stat?.wrong ?? 0), 0),
    }))
    .filter((row) => row.attempted);
  if (rows.length === 0) return null;
  rows.sort((a, b) => a.fluent - b.fluent || b.wrong - a.wrong || b.table - a.table);
  return rows[0].table;
}
