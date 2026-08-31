import { rankById } from "./ranks";
import { PLANETS, shipForLevel } from "./worlds";
import {
  displayName,
  PRIZE_EVERY,
  type ParentAlert,
  type PlayerState,
} from "./types";

export const IMPORTANT_LEVELS = [5, 10, 15, 20, 25, 30] as const;

function alertId(kind: string, key: string): string {
  return `${kind}-${key}-${Date.now().toString(36)}`;
}

export function unreadAlerts(state: PlayerState): ParentAlert[] {
  return (state.parentAlerts ?? []).filter((a) => !a.read);
}

export function collectParentAlerts(input: {
  prev: PlayerState;
  next: PlayerState;
  prizeJustReady: boolean;
}): ParentAlert[] {
  const at = Date.now();
  const name = displayName(input.next);
  const out: ParentAlert[] = [];

  const prevLevel = input.prev.level ?? 1;
  const nextLevel = input.next.level ?? 1;
  let levelNoted = false;
  for (const mark of IMPORTANT_LEVELS) {
    if (prevLevel < mark && nextLevel >= mark) {
      const ship = shipForLevel(mark);
      const shipUnlock = ship.minLevel === mark;
      out.push({
        id: alertId("level", String(mark)),
        at,
        kind: "level",
        title: `${name} chegou ao nível ${mark}`,
        body: shipUnlock
          ? `Nível importante. Nova nave: ${ship.name}.`
          : "Nível importante na Rota das Estrelas.",
        read: false,
      });
      levelNoted = true;
    }
  }

  const prevRank = PLANETS[input.prev.furthestPlanet ?? 0]?.rankId ?? input.prev.rankId;
  const nextRank = PLANETS[input.next.furthestPlanet ?? 0]?.rankId ?? input.next.rankId;
  if (prevRank !== nextRank) {
    const rank = rankById(nextRank);
    const planet = PLANETS[input.next.furthestPlanet] ?? PLANETS[0];
    out.push({
      id: alertId("rank", nextRank),
      at,
      kind: "rank",
      title: `${name} é ${rank.name}`,
      body: `Nova patente. Próximo planeta: ${planet.name}.`,
      read: false,
    });
  }

  const prevShip = shipForLevel(prevLevel);
  const nextShip = shipForLevel(nextLevel);
  if (prevShip.id !== nextShip.id && !levelNoted) {
    out.push({
      id: alertId("ship", nextShip.id),
      at,
      kind: "ship",
      title: `Nova nave: ${nextShip.name}`,
      body: `${name} destrancou uma nave no nível ${nextLevel}.`,
      read: false,
    });
  }

  if (input.prizeJustReady) {
    out.push({
      id: alertId("prize", String(input.next.prizesEarned)),
      at,
      kind: "prize",
      title: `${name} completou ${PRIZE_EVERY} missões`,
      body: "Hora de entregar o que combinaram.",
      read: false,
    });
  }

  return out;
}
