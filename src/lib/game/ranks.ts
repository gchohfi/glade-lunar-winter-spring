import type { RankDef, RankId } from "./types.ts";
import { TARGET_CORRECT } from "./types.ts";

const ALL_TABLES = [2, 3, 4, 5, 6, 7, 8, 9];
const ALL_FACTORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Times scale with TARGET_CORRECT (15 acertos) via secondsPerFact.
 *
 * Every rank uses tables 2–9 × 1–12. What changes is the mix of easy/hard
 * facts and the clock — so the same 7×8 does not loop while 9×12 never appears.
 */
export const RANKS: RankDef[] = [
  {
    id: "cadete",
    name: "Cadete",
    blurb: "Mistura do 2 ao 9, com mais contas fáceis e tempo de sobra.",
    tables: ALL_TABLES,
    factors: ALL_FACTORS,
    timeLimitMs: 135_000,
    secondsPerFact: 9,
  },
  {
    id: "aprendiz",
    name: "Aprendiz",
    blurb: "Ainda tem calma, mas já entram contas médias.",
    tables: ALL_TABLES,
    factors: ALL_FACTORS,
    timeLimitMs: 113_000,
    secondsPerFact: 7.5,
  },
  {
    id: "piloto",
    name: "Piloto",
    blurb: "Quinze acertos em um minuto e meio, tabuadas misturadas.",
    tables: ALL_TABLES,
    factors: ALL_FACTORS,
    timeLimitMs: 90_000,
    secondsPerFact: 6,
  },
  {
    id: "capitao",
    name: "Capitão",
    blurb: "Menos folga. Mais 6, 7, 8 e 9.",
    tables: ALL_TABLES,
    factors: ALL_FACTORS,
    timeLimitMs: 75_000,
    secondsPerFact: 5,
  },
  {
    id: "comandante",
    name: "Comandante",
    blurb: "Quase só as contas duras, inclusive ×11 e ×12.",
    tables: ALL_TABLES,
    factors: ALL_FACTORS,
    timeLimitMs: 68_000,
    secondsPerFact: 4.5,
  },
  {
    id: "almirante",
    name: "Almirante",
    blurb: "Só as mais teimosas: 6 a 9 vezes 6 a 12.",
    tables: [6, 7, 8, 9],
    factors: [6, 7, 8, 9, 10, 11, 12],
    timeLimitMs: 60_000,
    secondsPerFact: 4,
  },
  {
    id: "lenda",
    name: "Lenda",
    blurb: "Tudo misturado, quase no automático.",
    tables: ALL_TABLES,
    factors: ALL_FACTORS,
    timeLimitMs: 42_000,
    secondsPerFact: 2.8,
  },
];

export type FactMix = { easy: number; medium: number; hard: number };

export const RANK_MIX: Record<RankId, FactMix> = {
  cadete: { easy: 9, medium: 4, hard: 2 },
  aprendiz: { easy: 6, medium: 6, hard: 3 },
  piloto: { easy: 3, medium: 7, hard: 5 },
  capitao: { easy: 2, medium: 6, hard: 7 },
  comandante: { easy: 0, medium: 5, hard: 10 },
  almirante: { easy: 0, medium: 3, hard: 12 },
  lenda: { easy: 0, medium: 3, hard: 12 },
};

export function rankById(id: RankId): RankDef {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

export function rankIndex(id: RankId): number {
  return Math.max(0, RANKS.findIndex((r) => r.id === id));
}

export function nextRank(id: RankId): RankDef | null {
  const i = rankIndex(id);
  return i < RANKS.length - 1 ? RANKS[i + 1] : null;
}

export function prevRank(id: RankId): RankDef | null {
  const i = rankIndex(id);
  return i > 0 ? RANKS[i - 1] : null;
}

export function timeWithBoost(
  rank: RankDef,
  consecutiveFails: number,
  extraMs = 0,
): number {
  const base =
    Math.round(rank.secondsPerFact * TARGET_CORRECT * 1000) + Math.max(0, extraMs);
  if (consecutiveFails >= 3) return base + 15_000;
  if (consecutiveFails >= 2) return base + 8_000;
  return base;
}
