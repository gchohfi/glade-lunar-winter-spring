import { dayMet } from "./daily.ts";
import { SHIELD_MAX, todayKey, type PlayerState } from "./types.ts";

/**
 * Escudo de sequência (o "streak freeze"): um dia perdido gasta um escudo e a
 * sequência sobrevive — o dia protegido só não soma. O consumo é ASSENTADO e
 * gravado no estado (`lastSettledDay` + `days[key].shielded`); nunca é
 * recontado por preguiça, senão cada releitura gastaria escudos de novo.
 */

const DAY_MS = 86_400_000;
const SETTLE_WINDOW_DAYS = 60;

/** Soma `delta` dias a uma chave YYYY-MM-DD sem depender do fuso local. */
export function shiftDayKey(key: string, delta: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const noonUtc = Date.UTC(year, month - 1, day, 15);
  return new Date(noonUtc + delta * DAY_MS).toISOString().slice(0, 10);
}

export function settleShields(state: PlayerState, now = new Date()): PlayerState {
  const today = todayKey(now);
  if (state.lastSettledDay === "") {
    // Primeira vez (save migrado): só carimba — nunca consome retroativo.
    return { ...state, lastSettledDay: today };
  }
  if (state.lastSettledDay >= today) return state;

  const floor = shiftDayKey(today, -SETTLE_WINDOW_DAYS);
  // Inclusivo: quando foi carimbado, lastSettledDay era "hoje" e ainda não podia
  // ser escudado — um dia aberto sem jogar é reexaminado na próxima visita.
  let cursor = state.lastSettledDay;
  if (cursor < floor) cursor = floor;

  const days = { ...state.days };
  let shields = state.shields;
  // Só vale gastar escudo enquanto a sequência estiver viva até aquele dia —
  // ancorado no dia anterior ao início da varredura (meta batida ou já escudado).
  const prevStat = days[shiftDayKey(cursor, -1)];
  let canSpend = dayMet(prevStat) || prevStat?.shielded === true;
  while (cursor < today) {
    const stat = days[cursor];
    if (dayMet(stat)) {
      canSpend = true;
    } else if (stat?.shielded) {
      // já assentado numa rodada anterior
    } else if (canSpend && shields > 0) {
      shields -= 1;
      const base = stat ?? { answered: 0, correct: 0, missions: 0 };
      days[cursor] = { ...base, shielded: true };
    } else {
      canSpend = false;
    }
    cursor = shiftDayKey(cursor, 1);
  }
  return { ...state, days, shields, lastSettledDay: today };
}

export function maybeEarnShield(
  state: PlayerState,
  dailyJustDone: boolean,
  now = new Date(),
): { state: PlayerState; earned: boolean } {
  if (!dailyJustDone || state.shields >= SHIELD_MAX) return { state, earned: false };
  const yesterday = shiftDayKey(todayKey(now), -1);
  // Dia escudado tem correct 0: folga protegida não emenda a dupla que ganha escudo.
  if (!dayMet(state.days[yesterday])) return { state, earned: false };
  return { state: { ...state, shields: state.shields + 1 }, earned: true };
}
