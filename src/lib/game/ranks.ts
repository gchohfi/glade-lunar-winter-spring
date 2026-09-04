import type { RankDef, RankId } from "./types";
import { TARGET_CORRECT } from "./types";

const ALL_TABLES = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const ALL_FACTORS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/**
 * Sem 1 e sem 2 em nenhum lado. Tabuadas 3–13.
 * O relógio escala com TARGET_CORRECT (15) via secondsPerFact.
 */
export const RANKS: RankDef[] = [
  {
    id: "cadete",
    name: "Cadete",
    blurb: "Do 3 ao 13, com mais contas amigas e tempo de sobra.",
    tables: ALL_TABLES,
    factors: ALL_FACTORS,
    timeLimitMs: 135_000,
    secondsPerFact: 9,
  },
  {
    id: "aprendiz",
    name: "Aprendiz",
    blurb: "Ainda tem calma. Entram divisões e meios.",
    tables: ALL_TABLES,
    factors: ALL_FACTORS,
    timeLimitMs: 113_000,
    secondsPerFact: 7.5,
  },
  {
    id: "piloto",
    name: "Piloto",
    blurb: "Quinze acertos em um minuto e meio. Vezes e dividido.",
    tables: ALL_TABLES,
    factors: ALL_FACTORS,
    timeLimitMs: 90_000,
    secondsPerFact: 6,
  },
  {
    id: "capitao",
    name: "Capitão",
    blurb: "Menos folga. Mais 6, 7, 8, 9 e 13.",
    tables: ALL_TABLES,
    factors: ALL_FACTORS,
    timeLimitMs: 75_000,
    secondsPerFact: 5,
  },
  {
    id: "comandante",
    name: "Comandante",
    blurb: "Quase só as duras, inclusive ×11, ×12 e ×13.",
    tables: ALL_TABLES,
    factors: ALL_FACTORS,
    timeLimitMs: 68_000,
    secondsPerFact: 4.5,
  },
  {
    id: "almirante",
    name: "Almirante",
    blurb: "Só as teimosas: 6 a 9 e 11 a 13.",
    tables: [6, 7, 8, 9, 11, 12, 13],
    factors: [6, 7, 8, 9, 11, 12, 13],
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
  cadete: { easy: 7, medium: 5, hard: 3 },
  aprendiz: { easy: 4, medium: 7, hard: 4 },
  piloto: { easy: 2, medium: 6, hard: 7 },
  capitao: { easy: 1, medium: 5, hard: 9 },
  comandante: { easy: 0, medium: 4, hard: 11 },
  almirante: { easy: 0, medium: 2, hard: 13 },
  lenda: { easy: 0, medium: 2, hard: 13 },
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
