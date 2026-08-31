import { rankById, RANK_MIX } from "./ranks.ts";
import { applyRunProgress, type ProgressDelta } from "./progress.ts";
import { collectParentAlerts } from "./alerts.ts";
import { maybeEarnShield, settleShields } from "./shields.ts";
import { settleQuests, type Quest } from "./quests.ts";
import {
  factKey,
  todayKey,
  type Fact,
  type FactStat,
  type MissionRecord,
  type PlayerState,
  type RankId,
  PRIZE_EVERY,
  DAILY_GOAL,
  TARGET_CORRECT,
} from "./types.ts";

export function allFactsForRank(rankId: RankId): Fact[] {
  const rank = rankById(rankId);
  const facts: Fact[] = [];
  for (const a of rank.tables) {
    for (const b of rank.factors) {
      facts.push({ a, b });
    }
  }
  return facts;
}

export type FactBand = "easy" | "medium" | "hard";

export function factBand(fact: Fact): FactBand {
  if (fact.b === 1 || fact.b === 2 || fact.b === 5 || fact.b === 10) return "easy";
  if ((fact.a === 2 || fact.a === 5) && fact.b <= 6) return "easy";
  if ([6, 7, 8, 9].includes(fact.a) && [6, 7, 8, 9, 11, 12].includes(fact.b)) {
    return "hard";
  }
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
    const fallback = last && last.a === 2 && last.b === 3 ? { a: 4, b: 7 } : { a: 2, b: 3 };
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

export function bumpFact(
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
  shieldEarned: boolean;
  questsCompleted: Quest[];
};

export function applyMissionResult(
  state: PlayerState,
  record: Omit<MissionRecord, "id"> & {
    factsTried: Array<{ fact: Fact; ok: boolean; ms: number }>;
    bestCombo?: number;
    planetIndex?: number;
  },
  now = new Date(),
): MissionOutcome {
  // Dias perdidos desde a última visita são assentados (escudos) ANTES de
  // registrar o resultado de hoje.
  const settled = settleShields(state, now);
  const day = todayKey(now);
  const dayPrev = settled.days[day] ?? { answered: 0, correct: 0, missions: 0 };

  let facts = settled.facts;
  for (const tried of record.factsTried) {
    facts = bumpFact(facts, tried.fact, tried.ok, tried.ms);
  }

  const passed = record.passed;
  const consecutiveWins = passed ? settled.consecutiveWins + 1 : 0;
  const consecutiveFails = passed ? 0 : settled.consecutiveFails + 1;
  const rankId = record.rankId;
  const promotedTo: RankId | null = null;
  const demotedTo: RankId | null = null;

  const prizeCycle = (() => {
    if (!passed) return settled.prizeCycle;
    if (settled.prizeCycle >= PRIZE_EVERY) return PRIZE_EVERY;
    return settled.prizeCycle + 1;
  })();
  const prizesEarned =
    passed && settled.prizeCycle === PRIZE_EVERY - 1
      ? settled.prizesEarned + 1
      : settled.prizesEarned;
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
    bestCombo: record.bestCombo ?? 0,
  };

  const tables = { ...dayPrev.tables };
  for (const tried of record.factsTried) {
    if (!tried.ok) continue;
    tables[tried.fact.a] = (tables[tried.fact.a] ?? 0) + 1;
  }

  const mid: PlayerState = {
    ...settled,
    rankId,
    consecutiveWins,
    consecutiveFails,
    totalMissionsPassed: settled.totalMissionsPassed + (passed ? 1 : 0),
    prizeCycle: prizeReady ? PRIZE_EVERY : prizeCycle,
    prizesEarned,
    facts,
    missions: [mission, ...settled.missions].slice(0, 60),
    days: {
      ...settled.days,
      [day]: {
        ...dayPrev,
        answered: dayPrev.answered + record.correct + record.wrong,
        correct: dayPrev.correct + record.correct,
        missions: dayPrev.missions + (passed ? 1 : 0),
        tables,
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
    planetIndex: record.planetIndex ?? settled.selectedPlanet,
  });

  let next = progressed.state;
  if (progressed.delta.isRecord) {
    const d = next.days[day] ?? { answered: 0, correct: 0, missions: 0 };
    next = {
      ...next,
      days: { ...next.days, [day]: { ...d, records: (d.records ?? 0) + 1 } },
    };
  }

  const prevCorrect = state.days[day]?.correct ?? 0;
  const nextCorrect = next.days[day]?.correct ?? 0;
  const dailyJustDone = prevCorrect < DAILY_GOAL && nextCorrect >= DAILY_GOAL;

  const earned = maybeEarnShield(next, dailyJustDone, now);
  next = earned.state;

  const quests = settleQuests(next, day);
  next = quests.state;

  const prizeJustReady = prizeReady && state.prizeCycle < PRIZE_EVERY;
  // Alertas por último: o XP das missões do dia também pode cruzar um marco de nível.
  const newAlerts = collectParentAlerts({
    prev: state,
    next,
    prizeJustReady,
  });
  const parentAlerts = [...newAlerts, ...(next.parentAlerts ?? [])].slice(0, 40);

  return {
    state: { ...next, parentAlerts },
    promotedTo,
    demotedTo,
    prizeReady,
    progress: progressed.delta,
    newAlerts,
    dailyJustDone,
    shieldEarned: earned.earned,
    questsCompleted: quests.completed,
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
      const [a, b] = key.split("x").map(Number);
      return {
        fact: { a, b },
        stat,
        accuracy: stat.attempts ? stat.correct / stat.attempts : 0,
        avgMs: stat.attempts ? stat.totalMs / stat.attempts : 0,
      };
    })
    .filter((row) => row.stat.attempts >= 2)
    .sort((a, b) => a.accuracy - b.accuracy || b.avgMs - a.avgMs);
  return rows.slice(0, limit);
}

export function currentStreak(state: PlayerState, now = new Date()): number {
  let streak = 0;
  for (let i = 0; i < 60; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = todayKey(d);
    const day = state.days[key];
    if (day && day.correct >= DAILY_GOAL) {
      streak += 1;
      continue;
    }
    // Dia protegido por escudo: a sequência atravessa sem somar.
    if (day?.shielded) continue;
    if (i === 0) continue;
    break;
  }
  return streak;
}
