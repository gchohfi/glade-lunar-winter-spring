import { normalizeClub, validClubDay } from "./club";
import { factKey, factOp, todayKey, type Fact, type PlayerState } from "./types";
import type { CourseResult, CourseState } from "./course-types";

export type Championship = { id: string; name: string; description: string };
export type CourseMatch = {
  id: string;
  championshipId: string;
  /** Global, zero-based course position; local match number is index % 5 + 1. */
  index: number;
  name: string;
  theme: string;
  description: string;
};

export const CHAMPIONSHIPS: readonly Championship[] = [
  { id: "bairro", name: "Copa do Bairro", description: "As primeiras jogadas da sua história." },
  {
    id: "cidade",
    name: "Copa da Cidade",
    description: "Novas tabuadas, com o que você já aprendeu.",
  },
  {
    id: "craques",
    name: "Liga dos Craques",
    description: "Multiplicar, dividir e descobrir metades.",
  },
  { id: "nico", name: "Copa do Nico", description: "Reunir e fortalecer suas jogadas." },
];

const THEMES = [
  ["Tabuada do 3", "Tabuada do 4", "Tabuada do 5", "Tabuada do 10", "Final do Bairro"],
  [
    "Tabuadas do 6 e do 7",
    "Tabuadas do 8 e do 9",
    "Tabuada do 11",
    "Tabuadas do 12 e do 13",
    "Final da Cidade",
  ],
  [
    "Dividir por 3 e por 4",
    "Dividir por 5 e por 6",
    "Dividir por 7, 8 e 9",
    "Metades com vírgula",
    "Final dos Craques",
  ],
  [
    "Revisar 3, 4, 5 e 10",
    "Revisar 6, 7, 8 e 9",
    "Revisar 11, 12 e 13",
    "Revisar divisões",
    "Final personalizada",
  ],
] as const;
const MATCH_NAMES = ["Abertura", "Rodada 2", "Rodada 3", "Semifinal", "Final"];

export const COURSE_MATCHES: readonly CourseMatch[] = CHAMPIONSHIPS.flatMap((cup, cupIndex) =>
  THEMES[cupIndex].map((theme, localIndex) => ({
    id: `${cup.id}-${localIndex + 1}`,
    championshipId: cup.id,
    index: cupIndex * 5 + localIndex,
    name: MATCH_NAMES[localIndex],
    theme,
    description:
      localIndex === 4
        ? "Vamos reunir o que você praticou nesta copa. Três acertos fazem um gol."
        : `Vamos jogar com ${theme.toLocaleLowerCase("pt-BR")}. Três acertos fazem um gol.`,
  })),
);

export function courseMatch(id: string): CourseMatch | undefined {
  return COURSE_MATCHES.find((match) => match.id === id);
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeResult(raw: unknown): CourseResult | null {
  if (
    !record(raw) ||
    typeof raw.attemptId !== "string" ||
    !raw.attemptId ||
    typeof raw.matchId !== "string" ||
    !courseMatch(raw.matchId) ||
    typeof raw.passed !== "boolean"
  )
    return null;
  const keys = ["correct", "wrong", "goals", "mathElapsedMs", "coinsGained", "finishedAt"] as const;
  if (keys.some((key) => !Number.isFinite(raw[key]) || (raw[key] as number) < 0)) return null;
  if (
    !Number.isInteger(raw.correct) ||
    !Number.isInteger(raw.wrong) ||
    !Number.isInteger(raw.goals) ||
    (raw.correct as number) > 15 ||
    (raw.goals as number) > 5 ||
    ![0, 30].includes(raw.coinsGained as number) ||
    (raw.passed && (raw.correct !== 15 || raw.goals !== 5))
  )
    return null;
  return raw as CourseResult;
}

/** Add the new course without translating legacy stars into unplayed new lessons. */
export function normalizeCourse(state: PlayerState): CourseState {
  const raw: unknown = state.course;
  const source = record(raw) ? raw : {};
  const supplied = new Set(
    Array.isArray(source.completedMatches)
      ? source.completedMatches.filter((id): id is string => typeof id === "string")
      : [],
  );
  // Completion is a contiguous prefix. Unknown IDs and isolated future wins cannot unlock a cup.
  const completedMatches: string[] = [];
  for (const match of COURSE_MATCHES) {
    if (!supplied.has(match.id)) break;
    completedMatches.push(match.id);
  }
  const next = COURSE_MATCHES[completedMatches.length] ?? COURSE_MATCHES[COURSE_MATCHES.length - 1];
  const selected =
    typeof source.selectedMatchId === "string" ? courseMatch(source.selectedMatchId) : undefined;
  const rewardDays: CourseState["rewardDays"] = {};
  if (record(source.rewardDays)) {
    for (const [day, value] of Object.entries(source.rewardDays)) {
      if (
        !validClubDay(day) ||
        value === false ||
        value === null ||
        value === undefined ||
        value === 0
      )
        continue;
      // Preserve actual historic 10/20/30 grants. Malformed claimed flags fail closed.
      rewardDays[day] =
        Number.isSafeInteger(value) && (value as number) > 0 ? Math.min(30, value as number) : 30;
    }
  }
  for (const [day, grant] of Object.entries(normalizeClub(state.club).rewardDays)) {
    if (Object.hasOwn(rewardDays, day)) continue;
    const granted = (grant.mission ? 20 : 0) + (grant.focus ? 10 : 0);
    if (granted > 0) rewardDays[day] = granted;
  }
  return {
    version: 1,
    completedMatches,
    selectedMatchId: selected && selected.index <= completedMatches.length ? selected.id : next.id,
    durationSec: [120, 180, 300].includes(source.durationSec as number)
      ? (source.durationSec as CourseState["durationSec"])
      : 180,
    rewardDays,
    lastResult: normalizeResult(source.lastResult),
  };
}

export function nextCourseMatch(state: PlayerState): CourseMatch {
  return COURSE_MATCHES[normalizeCourse(state).completedMatches.length] ?? COURSE_MATCHES[19];
}

export function courseMatchUnlocked(state: PlayerState, id: string): boolean {
  const match = courseMatch(id);
  return Boolean(match && match.index <= normalizeCourse(state).completedMatches.length);
}

export function completedCup(state: PlayerState, cupId: string): boolean {
  const matches = COURSE_MATCHES.filter((match) => match.championshipId === cupId);
  const completed = new Set(normalizeCourse(state).completedMatches);
  return matches.length === 5 && matches.every((match) => completed.has(match.id));
}

const RANGE = Array.from({ length: 11 }, (_, index) => index + 3);
function identity(fact: Fact): string {
  return factOp(fact) === "div"
    ? factKey(fact)
    : `${Math.min(fact.a, fact.b)}x${Math.max(fact.a, fact.b)}`;
}

function poolForMatch(index: number): { pool: Fact[]; focus: (fact: Fact) => boolean } {
  const tables =
    index === 0
      ? [3]
      : index === 1
        ? [3, 4]
        : index === 2
          ? [3, 4, 5]
          : index <= 4
            ? [3, 4, 5, 10]
            : index === 5
              ? [3, 4, 5, 6, 7, 10]
              : index === 6
                ? [3, 4, 5, 6, 7, 8, 9, 10]
                : index === 7
                  ? [3, 4, 5, 6, 7, 8, 9, 10, 11]
                  : index === 15
                    ? [3, 4, 5, 10]
                    : index === 16
                      ? [6, 7, 8, 9]
                      : index === 17
                        ? [11, 12, 13]
                        : index === 18
                          ? []
                          : RANGE;
  const maxFactor = index <= 6 ? 10 : index === 7 ? 11 : 13;
  const pool: Fact[] = tables.flatMap((a) =>
    RANGE.filter((b) => b <= maxFactor).map((b) => ({ a, b, op: "mul" })),
  );
  if (index >= 10 && (index <= 14 || index >= 18)) {
    const divisors = index === 10 ? [3, 4] : index === 11 ? [3, 4, 5, 6] : [3, 4, 5, 6, 7, 8, 9];
    for (const b of divisors)
      for (const quotient of RANGE) {
        const a = b * quotient;
        if (a <= 99) pool.push({ a, b, op: "div" });
      }
  }
  if (index === 13 || index === 14 || index >= 18)
    for (let a = 11; a <= 99; a += 2) pool.push({ a, b: 2, op: "div" });
  const focusTables =
    index === 0
      ? [3]
      : index === 1
        ? [4]
        : index === 2
          ? [5]
          : index === 3
            ? [10]
            : index === 5
              ? [6, 7]
              : index === 6
                ? [8, 9]
                : index === 7
                  ? [11]
                  : index === 8
                    ? [12, 13]
                    : [];
  const focusDivisors =
    index === 10 ? [3, 4] : index === 11 ? [5, 6] : index === 12 ? [7, 8, 9] : [];
  const focus = (fact: Fact) =>
    index >= 10 && index <= 12
      ? factOp(fact) === "div" && focusDivisors.includes(fact.b)
      : index === 13
        ? factOp(fact) === "div" && fact.b === 2
        : focusTables.includes(fact.a) && factOp(fact) === "mul";
  const unique = new Map<string, Fact>();
  // Keep newly introduced orientation when two commutative forms are equivalent.
  for (const fact of pool)
    if (!unique.has(identity(fact)) || focus(fact)) unique.set(identity(fact), fact);
  return { pool: [...unique.values()], focus };
}

function hash(value: string): number {
  let result = 2166136261;
  for (const letter of value) result = Math.imul(result ^ letter.charCodeAt(0), 16777619) >>> 0;
  return result;
}

/** Deterministic, varied eligible deck; past history can prioritize but never unlock content. */
export function courseFacts(state: PlayerState, matchId: string, now = Date.now()): Fact[] {
  const match = courseMatch(matchId);
  if (!match) return [];
  const { pool, focus } = poolForMatch(match.index);
  const latest = Math.max(
    0,
    ...Object.values(state.facts).map((stat) =>
      Number.isFinite(stat.lastSeen) ? stat.lastSeen : 0,
    ),
  );
  const at = Number.isFinite(now) && now >= 0 ? now : latest;
  const seed = `${matchId}:${state.totalMissionsPassed}:${latest}:${todayKey(new Date(at))}`;
  const score = (fact: Fact) => {
    // Commutative history may prioritize a review; it never fabricates evidence for its inverse.
    const stat =
      state.facts[factKey(fact)] ??
      (factOp(fact) === "mul" ? state.facts[`${fact.b}x${fact.a}`] : undefined);
    const attempts = Math.max(0, stat?.attempts ?? 0);
    const weak = attempts ? Math.min(1, Math.max(0, stat.wrong / attempts)) : 0;
    const age = stat ? Math.max(0, at - stat.lastSeen) / 86_400_000 : 0;
    return (
      (focus(fact) ? 6 : 0) +
      weak * (match.index === 19 ? 8 : 4) +
      Math.min(4, stat?.helpRequests ?? 0) +
      Math.min(3, age / 2) +
      (attempts ? 0 : 1) +
      hash(seed + factKey(fact)) / 0x100000000
    );
  };
  const sorted = pool.sort((a, b) => score(b) - score(a));
  const pending = [...sorted];
  const deck: Fact[] = [];
  while (deck.length < 30) {
    if (!pending.length) pending.push(...sorted);
    const previous = deck[deck.length - 1];
    const lastTwo = deck.slice(-2);
    const focusSlot =
      match.index <= 13 && [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13].includes(match.index)
        ? deck.length % 3 !== 2
        : false;
    let choices = pending.filter(
      (fact) =>
        !previous ||
        ((factOp(fact) !== factOp(previous) || fact.a !== previous.a) && fact.b !== previous.b),
    );
    if (!choices.length) choices = pending;
    const notRecent = choices.filter(
      (fact) => !deck.slice(-3).some((recent) => identity(recent) === identity(fact)),
    );
    if (notRecent.length) choices = notRecent;
    const preferred = choices.filter((fact) => focus(fact) === focusSlot);
    if (preferred.length) choices = preferred;
    // Mixed review explicitly rotates operations instead of letting the larger mul pool dominate.
    if (
      [14, 19].includes(match.index) &&
      lastTwo.length === 2 &&
      lastTwo.every((fact) => factOp(fact) === factOp(lastTwo[0]))
    ) {
      const alternate = choices.filter((fact) => factOp(fact) !== factOp(lastTwo[0]));
      if (alternate.length) choices = alternate;
    }
    const selected = choices[0];
    deck.push(selected);
    pending.splice(pending.indexOf(selected), 1);
  }
  return deck;
}
