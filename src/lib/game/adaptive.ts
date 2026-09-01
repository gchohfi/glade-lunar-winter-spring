import { rankById, RANK_DIV_SHARE, RANK_MIX, type FactMix } from "./ranks";
import { applyRunProgress, type ProgressDelta } from "./progress";
import { collectParentAlerts } from "./alerts";
import {
  factAnswer,
  factKey,
  factOp,
  todayKey,
  type Fact,
  type FactStat,
  type MissionRecord,
  type PlayerState,
  type RankId,
  PRIZE_EVERY,
  DAILY_GOAL,
  TARGET_CORRECT,
} from "./types";

const DIVISORS = [2, 3, 4, 5, 6, 7, 8, 9];

export function allMulFactsForRank(rankId: RankId): Fact[] {
  const rank = rankById(rankId);
  const facts: Fact[] = [];
  for (const a of rank.tables) {
    for (const b of rank.factors) {
      facts.push({ a, b, op: "mul" });
    }
  }
  return facts;
}

/**
 * Division facts are built as the inverse of the rank's multiplication
 * range: divisor is always a single digit (2–9, never 1), and the quotient
 * comes from the same factor progression as multiplication (3–13
 * eventually). Even divisors additionally spawn a x.5 variant (15÷2=7.5)
 * so answers are always a whole number or exactly a half — never a
 * repeating remainder like 3.33.
 */
export function allDivFactsForRank(rankId: RankId): Fact[] {
  const rank = rankById(rankId);
  const facts: Fact[] = [];
  for (const divisor of DIVISORS) {
    for (const quotient of rank.factors) {
      const whole = divisor * quotient;
      if (whole >= 3 && whole <= 99) {
        facts.push({ a: whole, b: divisor, op: "div" });
      }
      if (divisor % 2 === 0) {
        const half = whole + divisor / 2;
        if (half >= 3 && half <= 99) {
          facts.push({ a: half, b: divisor, op: "div" });
        }
      }
    }
  }
  return facts;
}

export function allFactsForRank(rankId: RankId): Fact[] {
  return [...allMulFactsForRank(rankId), ...allDivFactsForRank(rankId)];
}

export type FactBand = "easy" | "medium" | "hard";

export function factBand(fact: Fact): FactBand {
  if (factOp(fact) === "div") {
    const answer = factAnswer(fact);
    if (!Number.isInteger(answer)) return "hard";
    if (fact.b >= 7 || answer >= 7) return "hard";
    if (fact.b <= 3 || answer <= 3) return "easy";
    return "medium";
  }
  if (fact.a === 3 || fact.b === 3) return "easy";
  if ((fact.a >= 7 && fact.a <= 13) || (fact.b >= 7 && fact.b <= 13)) return "hard";
  return "medium";
}

function commuteKey(fact: Fact): string {
  return `${Math.min(fact.a, fact.b)}:${Math.max(fact.a, fact.b)}`;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function freshnessScore(stat: FactStat | undefined, now: number): number {
  if (!stat || stat.attempts === 0) return 4 + Math.random();
  const acc = stat.correct / stat.attempts;
  const age = now - stat.lastSeen;
  let score = Math.random();
  if (age < 90_000) score -= 12;
  else if (age < 8 * 60_000) score -= 3;
  else if (age > 2 * 86_400_000) score += 1.4;
  if (acc < 0.7) score += 1.2;
  return score;
}

function groupByTable(facts: Fact[]): Map<number, Fact[]> {
  const map = new Map<number, Fact[]>();
  for (const fact of facts) {
    const list = map.get(fact.a) ?? [];
    list.push(fact);
    map.set(fact.a, list);
  }
  return map;
}

function takeRoundRobin(
  candidates: Fact[],
  n: number,
  picked: Fact[],
  used: Set<string>,
  commute: Set<string>,
  tableCount: Map<number, number>,
  maxPerTable = 2,
): void {
  const grouped = groupByTable(
    candidates.filter((fact) => {
      const key = factKey(fact);
      return !used.has(key) && !commute.has(commuteKey(fact));
    }),
  );
  const tables = shuffle([...grouped.keys()]);
  let guard = 0;
  while (n > 0 && guard < 80) {
    guard += 1;
    let took = false;
    for (const table of tables) {
      if (n <= 0) return;
      if ((tableCount.get(table) ?? 0) >= maxPerTable) continue;
      const list = grouped.get(table);
      if (!list?.length) continue;
      const last = picked[picked.length - 1];
      if (last && last.a === table) continue;
      const fact = list.shift();
      if (!fact) continue;
      picked.push(fact);
      used.add(factKey(fact));
      commute.add(commuteKey(fact));
      tableCount.set(table, (tableCount.get(table) ?? 0) + 1);
      n -= 1;
      took = true;
    }
    if (!took) break;
  }
}

function arrangeVariety(facts: Fact[]): Fact[] {
  const grouped = groupByTable(facts);
  const tables = shuffle([...grouped.keys()]);
  const ordered: Fact[] = [];
  let guard = 0;
  while (ordered.length < facts.length && guard < 80) {
    guard += 1;
    let took = false;
    for (const table of tables) {
      const list = grouped.get(table);
      if (!list?.length) continue;
      const last = ordered[ordered.length - 1];
      if (last && last.a === table) {
        const other = tables.some(
          (alt) => alt !== table && (grouped.get(alt)?.length ?? 0) > 0,
        );
        if (other) continue;
      }
      ordered.push(list.shift()!);
      took = true;
    }
    if (!took) break;
  }
  return ordered;
}

function splitByMix(total: number, mix: FactMix): FactMix {
  if (total <= 0) return { easy: 0, medium: 0, hard: 0 };
  const sum = mix.easy + mix.medium + mix.hard || 1;
  const easy = Math.round((mix.easy / sum) * total);
  const medium = Math.round((mix.medium / sum) * total);
  const hard = Math.max(0, total - easy - medium);
  return { easy, medium, hard };
}

function pickFromPool(
  pool: Fact[],
  want: FactMix,
  state: PlayerState,
  now: number,
  picked: Fact[],
  used: Set<string>,
  commute: Set<string>,
  tableCount: Map<number, number>,
): void {
  const buckets: Record<FactBand, Fact[]> = { easy: [], medium: [], hard: [] };
  for (const fact of pool) {
    buckets[factBand(fact)].push(fact);
  }
  for (const band of Object.keys(buckets) as FactBand[]) {
    buckets[band] = shuffle(buckets[band]).sort(
      (a, b) =>
        freshnessScore(state.facts[factKey(b)], now) -
        freshnessScore(state.facts[factKey(a)], now),
    );
  }
  takeRoundRobin(buckets.easy, want.easy, picked, used, commute, tableCount);
  takeRoundRobin(buckets.medium, want.medium, picked, used, commute, tableCount);
  takeRoundRobin(buckets.hard, want.hard, picked, used, commute, tableCount);
}

export function pickMissionFacts(state: PlayerState, count = TARGET_CORRECT + 4): Fact[] {
  const now = Date.now();
  const mulPool = allMulFactsForRank(state.rankId);
  const divPool = allDivFactsForRank(state.rankId);
  const mix = RANK_MIX[state.rankId];
  const divShare = RANK_DIV_SHARE[state.rankId] ?? 0.3;
  const divCount = Math.round(count * divShare);
  const mulCount = count - divCount;

  const picked: Fact[] = [];
  const used = new Set<string>();
  const commute = new Set<string>();
  const tableCount = new Map<number, number>();

  pickFromPool(
    mulPool,
    splitByMix(mulCount, mix),
    state,
    now,
    picked,
    used,
    commute,
    tableCount,
  );
  pickFromPool(
    divPool,
    splitByMix(divCount, mix),
    state,
    now,
    picked,
    used,
    commute,
    tableCount,
  );

  const pool = [...mulPool, ...divPool];
  const leftovers = shuffle(pool);
  takeRoundRobin(leftovers, count - picked.length, picked, used, commute, tableCount, 3);

  if (picked.length < count) {
    for (const fact of leftovers) {
      if (picked.length >= count) break;
      const key = factKey(fact);
      if (used.has(key)) continue;
      picked.push(fact);
      used.add(key);
    }
  }

  const arranged = arrangeVariety(picked.slice(0, count));
  if (state.rankId === "cadete" || state.rankId === "aprendiz") {
    const easyIdx = arranged.findIndex((f) => factBand(f) === "easy");
    if (easyIdx > 0) {
      [arranged[0], arranged[easyIdx]] = [arranged[easyIdx], arranged[0]];
    }
  }
  return arranged;
}

export function drawNext(queue: Fact[], last?: Fact): { fact: Fact; queue: Fact[] } {
  if (queue.length === 0) {
    const fallback: Fact =
      last && last.a === 3 && last.b === 4 ? { a: 4, b: 5, op: "mul" } : { a: 3, b: 4, op: "mul" };
    return { fact: fallback, queue: [] };
  }
  let idx = 0;
  if (last) {
    const found = queue.findIndex((f) => factKey(f) !== factKey(last) && f.a !== last.a);
    if (found >= 0) idx = found;
    else {
      const different = queue.findIndex((f) => factKey(f) !== factKey(last));
      if (different >= 0) idx = different;
    }
  }
  const fact = queue[idx];
  const nextQueue = queue.filter((_, i) => i !== idx);
  return { fact, queue: nextQueue };
}

export function recycleMiss(queue: Fact[], missed: Fact): Fact[] {
  const key = factKey(missed);
  const rest = queue.filter((f) => factKey(f) !== key);
  const slot = Math.min(3, rest.length);
  return [...rest.slice(0, slot), missed, ...rest.slice(slot)];
}

function bumpFact(
  facts: Record<string, FactStat>,
  fact: Fact,
  ok: boolean,
  ms: number,
): Record<string, FactStat> {
  const key = factKey(fact);
  const prev = facts[key] ?? {
    attempts: 0,
    correct: 0,
    wrong: 0,
    totalMs: 0,
    lastSeen: 0,
  };
  return {
    ...facts,
    [key]: {
      attempts: prev.attempts + 1,
      correct: prev.correct + (ok ? 1 : 0),
      wrong: prev.wrong + (ok ? 0 : 1),
      totalMs: prev.totalMs + Math.max(0, Math.round(ms)),
      lastSeen: Date.now(),
    },
  };
}

export type MissionOutcome = {
  state: PlayerState;
  promotedTo: RankId | null;
  demotedTo: RankId | null;
  prizeReady: boolean;
  progress: ProgressDelta;
  newAlerts: ReturnType<typeof collectParentAlerts>;
  dailyJustDone: boolean;
};

export function applyMissionResult(
  state: PlayerState,
  record: Omit<MissionRecord, "id"> & {
    factsTried: Array<{ fact: Fact; ok: boolean; ms: number }>;
    bestCombo?: number;
    planetIndex?: number;
  },
): MissionOutcome {
  const day = todayKey();
  const dayPrev = state.days[day] ?? { answered: 0, correct: 0, missions: 0 };

  let facts = state.facts;
  for (const tried of record.factsTried) {
    facts = bumpFact(facts, tried.fact, tried.ok, tried.ms);
  }

  const passed = record.passed;
  const consecutiveWins = passed ? state.consecutiveWins + 1 : 0;
  const consecutiveFails = passed ? 0 : state.consecutiveFails + 1;
  const rankId = record.rankId;
  const promotedTo: RankId | null = null;
  const demotedTo: RankId | null = null;

  const prizeCycle = (() => {
    if (!passed) return state.prizeCycle;
    if (state.prizeCycle >= PRIZE_EVERY) return PRIZE_EVERY;
    return state.prizeCycle + 1;
  })();
  const prizesEarned =
    passed && state.prizeCycle === PRIZE_EVERY - 1
      ? state.prizesEarned + 1
      : state.prizesEarned;
  const prizeReady = prizeCycle >= PRIZE_EVERY;

  const mission: MissionRecord = {
    id: record.startedAt.toString(36) + Math.random().toString(36).slice(2, 6),
    mode: record.mode,
    rankId: record.rankId,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    elapsedMs: record.elapsedMs,
    timeLimitMs: record.timeLimitMs,
    correct: record.correct,
    wrong: record.wrong,
    passed,
  };

  const mid: PlayerState = {
    ...state,
    rankId,
    consecutiveWins,
    consecutiveFails,
    totalMissionsPassed: state.totalMissionsPassed + (passed ? 1 : 0),
    prizeCycle: prizeReady ? PRIZE_EVERY : prizeCycle,
    prizesEarned,
    facts,
    missions: [mission, ...state.missions].slice(0, 60),
    days: {
      ...state.days,
      [day]: {
        answered: dayPrev.answered + record.correct + record.wrong,
        correct: dayPrev.correct + record.correct,
        missions: dayPrev.missions + (passed ? 1 : 0),
      },
    },
  };

  const progressed = applyRunProgress(mid, {
    passed,
    correct: record.correct,
    wrong: record.wrong,
    bestCombo: record.bestCombo ?? 0,
    elapsedMs: record.elapsedMs,
    timeLimitMs: record.timeLimitMs,
    planetIndex: record.planetIndex ?? state.selectedPlanet,
  });

  const prizeJustReady = prizeReady && state.prizeCycle < PRIZE_EVERY;
  const newAlerts = collectParentAlerts({
    prev: state,
    next: progressed.state,
    prizeJustReady,
  });
  const parentAlerts = [...newAlerts, ...(progressed.state.parentAlerts ?? [])].slice(0, 40);
  const prevCorrect = state.days[day]?.correct ?? 0;
  const nextCorrect = progressed.state.days[day]?.correct ?? 0;
  const dailyJustDone = prevCorrect < DAILY_GOAL && nextCorrect >= DAILY_GOAL;

  return {
    state: { ...progressed.state, parentAlerts },
    promotedTo,
    demotedTo,
    prizeReady,
    progress: progressed.delta,
    newAlerts,
    dailyJustDone,
  };
}

export function claimPrize(state: PlayerState): PlayerState {
  if (state.prizeCycle < PRIZE_EVERY) return state;
  return {
    ...state,
    prizeCycle: 0,
    prizesClaimed: state.prizesClaimed + 1,
  };
}

export function weakestFacts(
  state: PlayerState,
  limit = 8,
): Array<{ fact: Fact; stat: FactStat; accuracy: number; avgMs: number }> {
  const rows = Object.entries(state.facts)
    .map(([key, stat]) => {
      const match = key.match(/^(\d+)([xd])(\d+)$/);
      if (!match) return null;
      const [, aStr, opChar, bStr] = match;
      const fact: Fact = {
        a: Number(aStr),
        b: Number(bStr),
        op: opChar === "d" ? "div" : "mul",
      };
      return {
        fact,
        stat,
        accuracy: stat.attempts ? stat.correct / stat.attempts : 0,
        avgMs: stat.attempts ? stat.totalMs / stat.attempts : 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null && row.stat.attempts >= 2)
    .sort((a, b) => a.accuracy - b.accuracy || b.avgMs - a.avgMs);
  return rows.slice(0, limit);
}

export function currentStreak(state: PlayerState): number {
  let streak = 0;
  const start = new Date();
  for (let i = 0; i < 60; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() - i);
    const key = todayKey(d);
    const day = state.days[key];
    if (day && day.correct >= DAILY_GOAL) {
      streak += 1;
      continue;
    }
    if (i === 0) continue;
    break;
  }
  return streak;
}
