import { allFactsForRank, factBand } from "./adaptive";
import {
  factAnswer,
  factKey,
  factOp,
  formatAnswer,
  parseGuess,
  todayKey,
  type Fact,
  type PlayerState,
  type RankId,
} from "./types";

export const PRACTICE_LENGTH = 5;

export function equationText(fact: Fact): string {
  return `${fact.a} ${factOp(fact) === "div" ? "÷" : "×"} ${fact.b}`;
}

export function explainFact(fact: Fact) {
  const answer = factAnswer(fact);
  if (factOp(fact) === "mul") {
    const first = fact.b > 5 ? 5 : fact.b - 1;
    const parts: Fact[] = [
      { a: fact.a, b: first },
      { a: fact.a, b: fact.b - first },
    ];
    return {
      title: "Dois passes para resolver",
      intro: `Separe o ${fact.b} em ${first} + ${fact.b - first}. Multiplique cada parte por ${fact.a}.`,
      parts,
      conclusion: `${parts.map((p) => formatAnswer(factAnswer(p))).join(" + ")} = ${formatAnswer(answer)}`,
      combined: parts.reduce((sum, p) => sum + factAnswer(p), 0),
    };
  }
  if (Number.isInteger(answer)) {
    return {
      title: "A multiplicação ajuda na divisão",
      intro: `Pense: ${fact.b} vezes qual número dá ${fact.a}?`,
      parts: [{ a: fact.b, b: answer } satisfies Fact],
      conclusion: `Então, ${equationText(fact)} = ${formatAnswer(answer)}.`,
      combined: answer,
    };
  }
  // The game's only fractional divisions are halves of odd integers.
  if (fact.b !== 2 || !Number.isInteger(fact.a))
    throw new Error("Divisão fora do treino de metades");
  const parts: Fact[] = [
    { a: fact.a - 1, b: 2, op: "div" },
    { a: 1, b: 2, op: "div" },
  ];
  return {
    title: "Uma metade de cada vez",
    intro: `Separe ${fact.a} em ${fact.a - 1} + 1. A metade de 1 é 0,5.`,
    parts,
    conclusion: `${parts.map((p) => formatAnswer(factAnswer(p))).join(" + ")} = ${formatAnswer(answer)}`,
    combined: parts.reduce((sum, p) => sum + factAnswer(p), 0),
  };
}

export function practiceDeck(state: PlayerState, rankId: RankId): Fact[] {
  const pool = allFactsForRank(rankId);
  const priority = (fact: Fact) => {
    const stat = state.facts[factKey(fact)];
    if (!stat?.attempts || !stat.wrong) return 0;
    return stat.wrong / stat.attempts;
  };
  return [...pool]
    .sort(
      (a, b) =>
        priority(b) - priority(a) ||
        Number(factBand(a) !== "easy") - Number(factBand(b) !== "easy") ||
        a.a - b.a ||
        a.b - b.b,
    )
    .slice(0, PRACTICE_LENGTH);
}

export type PracticeState = {
  deck: Fact[];
  index: number;
  typed: string;
  phase: "answer" | "explain" | "correct" | "done";
  assisted: boolean;
};
export type PracticeAction =
  | { type: "digit"; digit: string }
  | { type: "back" | "submit" | "help" | "retry" }
  | { type: "next"; rankId: RankId };

export function startPractice(deck: Fact[]): PracticeState {
  return {
    deck: [...deck],
    index: 0,
    typed: "",
    phase: deck.length ? "answer" : "done",
    assisted: false,
  };
}

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  if (state.phase === "done") return state;
  if (action.type === "retry" && state.phase === "explain") {
    return { ...state, typed: "", phase: "answer" };
  }
  if (action.type === "next" && state.phase === "correct") {
    const index = state.index + 1;
    const deck = [...state.deck];
    if (state.assisted && index < deck.length) {
      const current = deck[state.index];
      const seen = new Set(deck.slice(0, index).map(factKey));
      // Transfer the same strategy to a nearby, eligible fact, not a repeat.
      const related = allFactsForRank(action.rankId)
        .filter(
          (f) =>
            factOp(f) === factOp(current) &&
            Number.isInteger(factAnswer(f)) === Number.isInteger(factAnswer(current)) &&
            !seen.has(factKey(f)) &&
            (factOp(f) === "div" ? f.b === current.b : f.a === current.a),
        )
        .sort(
          (a, b) =>
            Math.abs(a.a - current.a) +
            Math.abs(a.b - current.b) -
            Math.abs(b.a - current.a) -
            Math.abs(b.b - current.b),
        )[0];
      if (related) {
        const later = deck.findIndex((f, i) => i >= index && factKey(f) === factKey(related));
        if (later >= index) [deck[index], deck[later]] = [deck[later], deck[index]];
        else deck[index] = related;
      }
    }
    return {
      deck,
      index,
      typed: "",
      phase: index === deck.length ? "done" : "answer",
      assisted: false,
    };
  }
  if (state.phase !== "answer") return state;
  if (action.type === "help") return { ...state, phase: "explain", assisted: true };
  if (action.type === "back") return { ...state, typed: state.typed.slice(0, -1) };
  if (action.type === "digit") {
    if (
      !/^[0-9,]$/.test(action.digit) ||
      state.typed.length >= 5 ||
      (action.digit === "," && state.typed.includes(","))
    )
      return state;
    return { ...state, typed: state.typed + action.digit };
  }
  if (action.type === "submit") {
    const guess = parseGuess(state.typed);
    if (!Number.isFinite(guess)) return state;
    // Integers and halves are exact in binary; nearby answers are still wrong.
    return guess === factAnswer(state.deck[state.index])
      ? { ...state, phase: "correct" }
      : { ...state, phase: "explain", assisted: true };
  }
  return state;
}

export function weeklyLearning(state: PlayerState, now = new Date()) {
  const today = todayKey(now);
  const noon = Date.parse(`${today}T12:00:00Z`);
  const summarize = (offset: number) => {
    const keys = Array.from({ length: 7 }, (_, i) =>
      new Date(noon - (offset + i) * 86_400_000).toISOString().slice(0, 10),
    );
    const days = keys.map((key) => state.days[key]).filter(Boolean);
    const answered = days.reduce((sum, day) => sum + day.answered, 0);
    const correct = days.reduce((sum, day) => sum + day.correct, 0);
    const completed = state.missions.filter(
      (m) =>
        m.mode === "multiplication" && m.passed && keys.includes(todayKey(new Date(m.finishedAt))),
    );
    return {
      answered,
      accuracy: answered ? Math.round((100 * correct) / answered) : null,
      missions: days.reduce((sum, day) => sum + day.missions, 0),
      averageMs: completed.length
        ? completed.reduce((sum, m) => sum + m.elapsedMs, 0) / completed.length
        : null,
      timedSamples: completed.length,
    };
  };
  return { current: summarize(0), previous: summarize(7) };
}
