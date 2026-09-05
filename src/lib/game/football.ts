import { TARGET_CORRECT } from "./types";

export const PASSES_PER_GOAL = 3;
export const GOALS_PER_MATCH = TARGET_CORRECT / PASSES_PER_GOAL;
export type PlayFeedback = "none" | "ok" | "bad";

/** Goals derive from recorded answers, never from animation callbacks. */
export function footballState(correct: number, feedback: PlayFeedback = "none") {
  const count = Math.min(TARGET_CORRECT, Math.max(0, Math.floor(correct)));
  const goals = Math.floor(count / PASSES_PER_GOAL);
  const goalJustScored = count > 0 && count % PASSES_PER_GOAL === 0 && feedback === "ok";
  const passes = count % PASSES_PER_GOAL;
  return {
    goals,
    goalJustScored,
    ballPercent: goalJustScored || count === TARGET_CORRECT ? 90 : [26, 48, 70][passes],
    nextPlay:
      count === TARGET_CORRECT
        ? "Partida completa"
        : ["Primeiro passe", "Segundo passe", "Chute para o gol"][passes],
    line:
      feedback === "bad"
        ? "Tudo bem. Vamos aprender essa juntos e tentar outra jogada."
        : goalJustScored
          ? goals === GOALS_PER_MATCH
            ? "Golaço! Completamos a partida!"
            : "Gol do nosso time! Vamos para a próxima jogada."
          : feedback === "ok"
            ? "Passe certeiro! A bola avançou."
            : passes === 2
              ? "A bola está na área. Acerte para marcar!"
              : "Eu jogo com você. Dois passes e um chute fazem um gol.",
  };
}
