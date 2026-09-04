import { rankById, RANK_MIX } from "./ranks";
import { applyRunProgress, type ProgressDelta } from "./progress";
import { collectParentAlerts } from "./alerts";
import {
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

function pushUnique(facts: Fact[], seen: Set<string>, fact: Fact): void {
  const key = factKey(fact);
  if (seen.has(key)) return;
  seen.add(key);
  facts.push(fact);
}

export function allFactsForRank(rankId: RankId): Fact[] {
  const rank = rankById(rankId);
  const facts: Fact[] = [];
  const seen = new Set<string>();
  for (const a of rank.tables) {
    for (const b of rank.factors) {
      if (a < 3 || b < 3) continue;
      pushUnique(facts, seen, { a, b, op: "mul" });
    }
  }
  for (const table of rank.tables) {
    for (const factor of rank.factors) {
      const product = table * factor;
      if (product < 4 || product > 99) continue;
      if (DIVISORS.includes(table)) {
        pushUnique(facts, seen, { a: product, b: table, op: "div" });
      }
      if (DIVISORS.includes(factor)) {
        pushUnique(facts, seen, { a: product, b: factor, op: "div" });
      }
    }
  }
  for (let n = 11; n <= 99; n += 2) {
    if (rankId === "cadete" && n > 31) continue;
    pushUnique(facts, seen, { a: n, b: 2, op: "div" });
  }
  return facts;
}

export type FactBand = "easy" | "medium" | "hard";

export function factBand(fact: Fact): FactBand {
  if (factOp(fact) === "div") {
    if (!Number.isInteger(fact.a / fact.b)) return "hard";
    if (fact.b === 5 || fact.a <= 24) return "easy";
    if ([6, 7, 8, 9].includes(fact.b) && fact.a >= 36) return "hard";
    return "medium";
  }
  if (fact.a === 5 || fact.b === 5 || fact.a === 10 || fact.b === 10) return "easy";
  if ((fact.a === 3 || fact.b === 3 || fact.a === 4 || fact.b === 4) && fact.a <= 10 && fact.b <= 10) {
    return "easy";
  }
  if ([6, 7, 8, 9, 12, 13].includes(fact.a) && [6, 7, 8, 9, 12, 13].includes(fact.b)) {
    return "hard";
  }
  return "medium";
}

function commuteKey(fact: Fact): string {
  if (factOp(fact) === "div") return `d:${fact.a}/${fact.b}`;
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
    const table = factOp(fact) === "div" ? fact.b : fact.a;
    const list = map.get(table) ?? [];
    list.push(fact);
    map.set(table, list);
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
      const lastTable = last ? (factOp(last) === "div" ? last.b : last.a) : null;
      if (lastTable === table) continue;
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
      const lastTable = last ? (factOp(last) === "div" ? last.b : last.a) : null;
      if (lastTable === table) {
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

export function pickMissionFacts(state: PlayerState, count = TARGET_CORRECT + 4): Fact[] {
  const now = Date.now();
  const pool = allFactsForRank(state.rankId);
  const mix = RANK_MIX[state.rankId];
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

  const picked: Fact[] = [];
  const used = new Set<string>();
  const commute = new Set<string>();
  const tableCount = new Map<number, number>();

  takeRoundRobin(buckets.easy, mix.easy, picked, used, commute, tableCount);
  takeRoundRobin(buckets.medium, mix.medium, picked, used, commute, tableCount);
  takeRoundRobin(buckets.hard, mix.hard, picked, used, commute, tableCount);

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
    return { fact: { a: 4, b: 7, op: "mul" }, queue: [] };
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
  const extraMission = passed && dayPrev.missions >= 1;
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
    extraMission,
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
      const div = key.includes("d");
      const [a, b] = key.split(div ? "d" : "x").map(Number);
      return {
        fact: { a, b, op: div ? ("div" as const) : ("mul" as const) },
        stat,
        accuracy: stat.attempts ? stat.correct / stat.attempts : 0,
        avgMs: stat.attempts ? stat.totalMs / stat.attempts : 0,
      };
    })
    .filter((row) => row.stat.attempts >= 2 && Number.isFinite(row.fact.a) && Number.isFinite(row.fact.b))
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
