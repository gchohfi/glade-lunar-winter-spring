import { bumpFact, factBand, pickMissionFacts, weakestFacts } from "./adaptive.ts";
import { collectParentAlerts } from "./alerts.ts";
import { masteryOf } from "./mastery.ts";
import { applyXp } from "./progress.ts";
import { settleQuests, type Quest } from "./quests.ts";
import { maybeEarnShield, settleShields } from "./shields.ts";
import {
  DAILY_GOAL,
  factKey,
  todayKey,
  type Fact,
  type ParentAlert,
  type PlayerState,
} from "./types.ts";

/**
 * Treino das teimosas: sessão curta SEM relógio, semeada pelas contas mais
 * fracas. Atualiza a estatística por conta e a meta do dia, dá um XP pequeno —
 * e nada mais: sem missão registrada, sem planeta, sem prêmio.
 */

export const PRACTICE_SIZE = 10;
export const PRACTICE_XP_PER_HIT = 2;
export const PRACTICE_XP_CAP = 20;

export type PracticeTarget = { fact: Fact; accuracy: number; avgMs: number };

export function practiceTargets(state: PlayerState, limit = PRACTICE_SIZE): PracticeTarget[] {
  return weakestFacts(state, 96)
    .filter((row) => masteryOf(row.stat) !== "fluente")
    .slice(0, limit)
    .map((row) => ({ fact: row.fact, accuracy: row.accuracy, avgMs: row.avgMs }));
}

/** Gate dos pontos de entrada: só oferece treino com pelo menos 3 alvos reais. */
export function hasPractice(state: PlayerState): boolean {
  return practiceTargets(state, 3).length >= 3;
}

export function buildPracticeDeck(state: PlayerState, size = PRACTICE_SIZE): Fact[] {
  const deck: Fact[] = [];
  const used = new Set<string>();
  const push = (fact: Fact) => {
    const key = factKey(fact);
    if (used.has(key)) return;
    used.add(key);
    deck.push(fact);
  };
  for (const target of practiceTargets(state, size)) push(target.fact);
  if (deck.length < size) {
    const pool = pickMissionFacts(state, size * 2);
    for (const fact of pool) {
      if (deck.length >= size) break;
      if (factBand(fact) === "hard") push(fact);
    }
    for (const fact of pool) {
      if (deck.length >= size) break;
      push(fact);
    }
  }
  return deck.slice(0, size);
}

export type PracticeOutcome = {
  state: PlayerState;
  xpGained: number;
  levelsGained: number;
  dailyJustDone: boolean;
  shieldEarned: boolean;
  questsCompleted: Quest[];
  newAlerts: ParentAlert[];
};

export function applyPracticeResult(
  state: PlayerState,
  input: { factsTried: Array<{ fact: Fact; ok: boolean; ms: number }> },
  now = new Date(),
): PracticeOutcome {
  const settled = settleShields(state, now);
  const day = todayKey(now);
  const dayPrev = settled.days[day] ?? { answered: 0, correct: 0, missions: 0 };

  let facts = settled.facts;
  let hits = 0;
  const tables = { ...dayPrev.tables };
  for (const tried of input.factsTried) {
    facts = bumpFact(facts, tried.fact, tried.ok, tried.ms);
    if (tried.ok) {
      hits += 1;
      tables[tried.fact.a] = (tables[tried.fact.a] ?? 0) + 1;
    }
  }

  const xpGained = Math.min(PRACTICE_XP_CAP, hits * PRACTICE_XP_PER_HIT);
  const leveled = applyXp(settled.level, settled.xp, xpGained);

  let next: PlayerState = {
    ...settled,
    facts,
    level: leveled.level,
    xp: leveled.xp,
    days: {
      ...settled.days,
      [day]: {
        ...dayPrev,
        answered: dayPrev.answered + input.factsTried.length,
        correct: dayPrev.correct + hits,
        tables,
      },
    },
  };

  const dailyJustDone =
    dayPrev.correct < DAILY_GOAL && dayPrev.correct + hits >= DAILY_GOAL;
  const earned = maybeEarnShield(next, dailyJustDone, now);
  next = earned.state;

  const quests = settleQuests(next, day);
  next = quests.state;

  const newAlerts = collectParentAlerts({ prev: state, next, prizeJustReady: false });
  const parentAlerts = [...newAlerts, ...(next.parentAlerts ?? [])].slice(0, 40);

  return {
    state: { ...next, parentAlerts },
    xpGained,
    levelsGained: leveled.levelsGained,
    dailyJustDone,
    shieldEarned: earned.earned,
    questsCompleted: quests.completed,
    newAlerts,
  };
}
