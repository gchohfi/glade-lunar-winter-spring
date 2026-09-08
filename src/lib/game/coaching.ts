import { allFactsForRank, factBand, pickMissionFacts } from "./adaptive";
import { validClubDay } from "./club";
import { factKey, factOp, todayKey, type Fact, type PlayerState, type RankId } from "./types";

export const FOCUS_TARGET = 3;
const DAY_MS = 86_400_000;

/** Evidence is only collected from first attempts in real matches, never copied answers. */
function evidenceDays(value: unknown, today = todayKey()): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.filter((day): day is string => validClubDay(day) && day <= today)))
        .sort()
        .slice(-7)
    : [];
}

export function independentDays(state: PlayerState, fact: Fact, today = todayKey()): string[] {
  const days = state.facts[factKey(fact)]?.independentDays;
  return evidenceDays(days, today);
}

export function getDailyCoach(state: PlayerState, rankId: RankId = state.rankId, now = new Date()) {
  const day = todayKey(now);
  const pool = allFactsForRank(rankId);
  const score = (fact: Fact) => {
    const stat = state.facts[factKey(fact)];
    if (!stat?.attempts) return 0;
    const evidence = independentDays(state, fact, day).length;
    const needsSupport = stat.wrong > 0 && stat.correct / stat.attempts < 0.85 && evidence < 3;
    const age = Math.max(0, now.getTime() - stat.lastSeen);
    // A small transparent schedule: even confident facts return for later review.
    const interval = [2, 2, 4, 7, 14, 21, 28, 30][Math.min(7, evidence)] * DAY_MS;
    return (
      (needsSupport ? (10 * stat.wrong) / stat.attempts : 0) +
      (age >= interval ? 4 + Math.min(3, age / interval) : 0)
    );
  };
  const candidates = [...pool].sort(
    (a, b) => score(b) - score(a) || factKey(a).localeCompare(factKey(b)),
  );
  const supported = candidates.find((fact) => score(fact) > 0);
  const startingTables = [5, 3, 4, 10].filter((table) =>
    pool.some((f) => factOp(f) === "mul" && f.a === table),
  );
  const rotation = [...day].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const fallbackTable = startingTables[rotation % startingTables.length];
  const anchor =
    supported ?? pool.find((f) => factOp(f) === "mul" && f.a === fallbackTable) ?? pool[0];
  const focusOp = factOp(anchor);
  const focusTable = focusOp === "div" ? anchor.b : anchor.a;
  const focusLabel = focusOp === "div" ? `Dividir por ${focusTable}` : `Tabuada do ${focusTable}`;
  const stat = state.facts[factKey(anchor)];
  const reason = supported
    ? stat?.wrong &&
      stat.correct / stat.attempts < 0.85 &&
      independentDays(state, anchor, day).length < 3
      ? "support"
      : "review"
    : "discover";
  const focusFacts = pool
    .filter(
      (f) => factOp(f) === focusOp && (focusOp === "div" ? f.b === focusTable : f.a === focusTable),
    )
    .sort(
      (a, b) =>
        score(b) - score(a) ||
        Number(factBand(a) !== "easy") - Number(factBand(b) !== "easy") ||
        a.a - b.a ||
        a.b - b.b,
    )
    .slice(0, FOCUS_TARGET);
  return {
    day,
    focusTable,
    focusOp,
    focusLabel,
    focusTarget: FOCUS_TARGET,
    focusFacts,
    reason,
    title:
      reason === "support"
        ? "Uma nova chance para essas jogadas"
        : reason === "review"
          ? "Vamos ver o que ficou na memória?"
          : "Seu próximo pequeno desafio",
    description:
      reason === "support"
        ? `${focusLabel}: o Nico escolheu contas que ainda pedem um pouco de treino.`
        : reason === "review"
          ? `${focusLabel}: vamos reencontrar contas de outros dias, sem pressa para decorar.`
          : `${focusLabel}: três jogadas especiais dentro da sua partida.`,
  };
}

/** Keep the existing varied curriculum; weave three chosen facts into the first ten. */
export function coachedMissionFacts(state: PlayerState, now = new Date()): Fact[] {
  const plan = getDailyCoach(state, state.rankId, now);
  const identity = (fact: Fact) =>
    factOp(fact) === "div"
      ? factKey(fact)
      : `${Math.min(fact.a, fact.b)}x${Math.max(fact.a, fact.b)}`;
  const focused = new Set(plan.focusFacts.map(identity));
  const ordinary = pickMissionFacts(state).filter((fact) => !focused.has(identity(fact)));
  const deck: Fact[] = [];
  let focusIndex = 0;
  for (let slot = 0; ordinary.length || focusIndex < plan.focusFacts.length; slot++) {
    if (([1, 5, 9].includes(slot) || !ordinary.length) && focusIndex < plan.focusFacts.length) {
      deck.push(plan.focusFacts[focusIndex++]);
    } else if (ordinary.length) deck.push(ordinary.shift()!);
  }
  return deck;
}

export function evaluateFocus(
  plan: ReturnType<typeof getDailyCoach>,
  attempts: Array<{ fact: Fact; ok: boolean }>,
) {
  const focus = new Set(plan.focusFacts.map(factKey));
  const seen = new Set<string>();
  const correct: Fact[] = [];
  for (const attempt of attempts) {
    const key = factKey(attempt.fact);
    if (seen.has(key)) continue;
    seen.add(key);
    if (attempt.ok && focus.has(key)) correct.push(attempt.fact);
  }
  return {
    correct: correct.length,
    target: plan.focusTarget,
    completed: correct.length >= plan.focusTarget,
    facts: correct,
  };
}

export function learningEvidence(state: PlayerState, now = new Date()) {
  const entries = Object.values(state.facts);
  const today = todayKey(now);
  const returning = entries.filter(
    (stat) => evidenceDays(stat.independentDays, today).length >= 2,
  ).length;
  const reinforced = entries.filter(
    (stat) => evidenceDays(stat.independentDays, today).length >= 3,
  ).length;
  return { returning, reinforced };
}
