import type { RankDef, RankId } from "./types";
import { TARGET_CORRECT } from "./types";

const CADETE_FACTORS = [3, 4, 5, 6, 7, 8, 9, 10];
const PILOTO_FACTORS = [3, 4, 5, 6, 7, 8, 9, 10, 11];
const CAPITAO_FACTORS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const FULL_FACTORS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

function questionLimitMs(secondsPerFact: number): number {
  return Math.round(secondsPerFact * 1000);
}

/**
 * Times scale with TARGET_CORRECT (15 acertos) via secondsPerFact.
 *
 * Factors run 3–13 (tables 1 and 2 are gone — too easy to matter). Cadete
 * starts on 3–10; Piloto adds 11, Capitão adds 12, and Comandante onward
 * uses the full 3–13 spread. Division is mixed into every rank via
 * RANK_DIV_SHARE, and each rank's secondsPerFact both sets the mission
 * clock (secondsPerFact * 15 + extra time) and the per-question countdown.
 */
export const RANKS: RankDef[] = [
  {
    id: "cadete",
    name: "Cadete",
    blurb: "Mistura do 3 ao 10, com mais contas fáceis e tempo de sobra.",
    tables: CADETE_FACTORS,
    factors: CADETE_FACTORS,
    timeLimitMs: Math.round(6 * TARGET_CORRECT * 1000),
    secondsPerFact: 6,
    questionLimitMs: questionLimitMs(6),
  },
  {
    id: "aprendiz",
    name: "Aprendiz",
    blurb: "Ainda tem calma, mas já entram contas médias e a divisão.",
    tables: CADETE_FACTORS,
    factors: CADETE_FACTORS,
    timeLimitMs: Math.round(5 * TARGET_CORRECT * 1000),
    secondsPerFact: 5,
    questionLimitMs: questionLimitMs(5),
  },
  {
    id: "piloto",
    name: "Piloto",
    blurb: "Quinze acertos com o relógio apertando, tabuadas e divisões misturadas.",
    tables: PILOTO_FACTORS,
    factors: PILOTO_FACTORS,
    timeLimitMs: Math.round(4.5 * TARGET_CORRECT * 1000),
    secondsPerFact: 4.5,
    questionLimitMs: questionLimitMs(4.5),
  },
  {
    id: "capitao",
    name: "Capitão",
    blurb: "Menos folga. Mais 7, 8, 9 e 12, e divisão em quase toda missão.",
    tables: CAPITAO_FACTORS,
    factors: CAPITAO_FACTORS,
    timeLimitMs: Math.round(4 * TARGET_CORRECT * 1000),
    secondsPerFact: 4,
    questionLimitMs: questionLimitMs(4),
  },
  {
    id: "comandante",
    name: "Comandante",
    blurb: "Quase só as contas duras, inclusive ×11, ×12, ×13 e divisão.",
    tables: FULL_FACTORS,
    factors: FULL_FACTORS,
    timeLimitMs: Math.round(3.5 * TARGET_CORRECT * 1000),
    secondsPerFact: 3.5,
    questionLimitMs: questionLimitMs(3.5),
  },
  {
    id: "almirante",
    name: "Almirante",
    blurb: "Só as mais teimosas: 3 a 13, com metades na divisão.",
    tables: FULL_FACTORS,
    factors: FULL_FACTORS,
    timeLimitMs: Math.round(3.2 * TARGET_CORRECT * 1000),
    secondsPerFact: 3.2,
    questionLimitMs: questionLimitMs(3.2),
  },
  {
    id: "lenda",
    name: "Lenda",
    blurb: "Tudo misturado, quase no automático.",
    tables: FULL_FACTORS,
    factors: FULL_FACTORS,
    timeLimitMs: Math.round(2.6 * TARGET_CORRECT * 1000),
    secondsPerFact: 2.6,
    questionLimitMs: questionLimitMs(2.6),
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

/**
 * Share of each mission's facts that come from division rather than
 * multiplication. Grows with rank, staying inside the 22–48% band.
 */
export const RANK_DIV_SHARE: Record<RankId, number> = {
  cadete: 0.22,
  aprendiz: 0.28,
  piloto: 0.34,
  capitao: 0.38,
  comandante: 0.42,
  almirante: 0.46,
  lenda: 0.48,
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
