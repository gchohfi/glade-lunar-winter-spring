import { rankById } from "./ranks";
import { PLANETS, shipForLevel } from "./worlds";
import { displayName, PRIZE_EVERY, type ParentAlert, type PlayerState } from "./types";

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
          ? `Nível importante. Nova conquista: ${ship.name}.`
          : "Nível importante na jornada do futebol.",
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
      body: `Nova categoria. Próxima etapa: ${planet.name}.`,
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
      title: `Nova conquista: ${nextShip.name}`,
      body: `${name} desbloqueou uma conquista no nível ${nextLevel}.`,
      read: false,
    });
  }

  if (input.prizeJustReady) {
    out.push({
      id: alertId("prize", String(input.next.prizesEarned)),
      at,
      kind: "prize",
      title: `${name} completou ${PRIZE_EVERY} partidas`,
      body: "Hora de entregar o que combinaram.",
      read: false,
    });
  }

  return out;
}

// Translate only system-generated legacy messages for display; never mutate history.
export function footballAlertText(alert: ParentAlert): { title: string; body: string } {
  const oldTheme =
    /Nova nave:|Nova patente\.|Próximo planeta:|Rota das Estrelas|destrancou uma nave/.test(
      alert.title + " " + alert.body,
    );
  if (!oldTheme) return { title: alert.title, body: alert.body };
  return {
    title: alert.kind === "rank" ? "Nova categoria conquistada" : "Nova conquista registrada",
    body: "Este marco da sua trajetória continua salvo no campeonato com Nico.",
  };
}
