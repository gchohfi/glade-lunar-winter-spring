import { PRIZE_EVERY, displayName, type PlayerState } from "./types";
import { todayDone } from "./daily";
import { currentStreak } from "./adaptive";

export function prizeLabel(name: string | undefined): string {
  const t = (name ?? "").trim();
  return t.length > 0 ? t : "o prêmio combinado";
}

export function missionsToPrize(state: PlayerState): number {
  return Math.max(0, PRIZE_EVERY - state.prizeCycle);
}

export function nicoCheer(state: PlayerState): { mood: "idle" | "win" | "try"; text: string } {
  const name = displayName(state);
  const left = missionsToPrize(state);
  const prize = prizeLabel(state.prizeName);
  const streak = currentStreak(state);
  const done = todayDone(state);

  if (state.prizeCycle >= PRIZE_EVERY) {
    return { mood: "win", text: `${name}, dez partidas. Hora de receber ${prize}.` };
  }
  if (done && streak >= 5) {
    return { mood: "win", text: `${streak} dias seguidos. Isso já é hábito. Pode parar.` };
  }
  if (done) {
    return {
      mood: "win",
      text:
        left === 1
          ? `Hoje está feito. Falta uma partida para ${prize}.`
          : `Hoje está feito. Faltam ${left} para ${prize}.`,
    };
  }
  if (left === 1) {
    return { mood: "idle", text: `Uma partida hoje e ${prize} chega.` };
  }
  if (streak >= 2) {
    return {
      mood: "idle",
      text: `A sequência está em ${streak} dias. Um treino curto para manter o ritmo.`,
    };
  }
  return {
    mood: "idle",
    text: `Quinze acertos, uns três minutos. Faltam ${left} partidas para ${prize}.`,
  };
}
