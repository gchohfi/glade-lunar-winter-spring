import { firstPlanetForRank, PLANETS, shipForLevel } from "./worlds";
import { emptyState, EXTRA_TIME_OPTIONS, type PlayerState, type RankId } from "./types";

export const MAX_LEVEL = 30;
export const STAR_MAX = 3;
export const EXTRA_MISSION_XP = 1 / 3;

export function xpToNext(level: number): number {
  return 60 + Math.max(1, level) * 20;
}

export function xpRemaining(level: number, xp: number): number {
  return Math.max(0, xpToNext(level) - Math.max(0, xp));
}

export function starsForMission(
  passed: boolean,
  wrong: number,
  elapsedMs: number,
  timeLimitMs: number,
): number {
  if (!passed) return 0;
  if (wrong === 0 && elapsedMs <= timeLimitMs * 0.7) return 3;
  if (wrong <= 1) return 2;
  return 1;
}

export function xpForMission(input: {
  passed: boolean;
  correct: number;
  wrong: number;
  bestCombo: number;
  elapsedMs: number;
  timeLimitMs: number;
  extraMission?: boolean;
}): number {
  const combo = Math.max(0, Math.min(10, input.bestCombo));
  if (!input.passed) return 8 + input.correct * 4;
  const timeLeft = Math.max(0, 1 - input.elapsedMs / Math.max(1, input.timeLimitMs));
  const timeBonus = Math.round(timeLeft * 28);
  const full = 48 + input.correct * 4 + combo * 4 + Math.max(0, 8 - input.wrong) * 3 + timeBonus;
  if (input.extraMission) return Math.max(1, Math.round(full * EXTRA_MISSION_XP));
  return full;
}

export function applyXp(
  level: number,
  xp: number,
  gained: number,
): { level: number; xp: number; levelsGained: number } {
  let nextLevel = Math.max(1, level);
  let nextXp = Math.max(0, xp) + Math.max(0, gained);
  let gainedLevels = 0;
  while (nextLevel < MAX_LEVEL && nextXp >= xpToNext(nextLevel)) {
    nextXp -= xpToNext(nextLevel);
    nextLevel += 1;
    gainedLevels += 1;
  }
  return { level: nextLevel, xp: nextXp, levelsGained: gainedLevels };
}

export type ProgressDelta = {
  xpGained: number;
  starsEarned: number;
  levelsGained: number;
  unlockedPlanet: number | null;
  newShipName: string | null;
  leveledTo: number | null;
  isRecord: boolean;
  xpScaled: boolean;
};

export function applyRunProgress(
  state: PlayerState,
  input: {
    passed: boolean;
    correct: number;
    wrong: number;
    bestCombo: number;
    elapsedMs: number;
    timeLimitMs: number;
    planetIndex: number;
    extraMission?: boolean;
  },
): { state: PlayerState; delta: ProgressDelta } {
  const planetIndex = Math.max(0, Math.min(PLANETS.length - 1, input.planetIndex));
  const starsEarned = starsForMission(
    input.passed,
    input.wrong,
    input.elapsedMs,
    input.timeLimitMs,
  );
  const xpGained = xpForMission(input);
  const leveled = applyXp(state.level, state.xp, xpGained);

  const stars = state.planetStars.slice();
  while (stars.length < PLANETS.length) stars.push(0);
  stars[planetIndex] = Math.max(stars[planetIndex] ?? 0, starsEarned);

  const bests = Array.isArray(state.planetBestMs) ? state.planetBestMs.slice() : [];
  while (bests.length < PLANETS.length) bests.push(0);
  const prevBest = bests[planetIndex] ?? 0;
  const isRecord = input.passed && (prevBest === 0 || input.elapsedMs < prevBest);
  if (isRecord) bests[planetIndex] = input.elapsedMs;

  let furthest = state.furthestPlanet;
  let unlockedPlanet: number | null = null;
  if (input.passed && planetIndex >= furthest && furthest < PLANETS.length - 1) {
    furthest = planetIndex + 1;
    unlockedPlanet = furthest;
  }

  const prevShip = shipForLevel(state.level);
  const next = shipForLevel(leveled.level);
  const rankId = PLANETS[furthest]?.rankId ?? state.rankId;

  return {
    state: {
      ...state,
      version: 2,
      level: leveled.level,
      xp: leveled.xp,
      furthestPlanet: furthest,
      selectedPlanet: state.selectedPlanet,
      planetStars: stars,
      planetBestMs: bests,
      rankId,
      bestCombo: Math.max(state.bestCombo, input.bestCombo),
    },
    delta: {
      xpGained,
      starsEarned,
      levelsGained: leveled.levelsGained,
      unlockedPlanet,
      newShipName: next.id !== prevShip.id ? next.name : null,
      leveledTo: leveled.levelsGained > 0 ? leveled.level : null,
      isRecord,
      xpScaled: Boolean(input.extraMission && input.passed),
    },
  };
}

export function migrateState(raw: Partial<PlayerState> & { version?: number }): PlayerState {
  const base = emptyState();
  const merged = { ...base, ...raw };
  const missions = merged.totalMissionsPassed ?? 0;
  const fromRank = firstPlanetForRank((merged.rankId as RankId) ?? "cadete");
  const autoFurthest = Math.min(
    PLANETS.length - 1,
    Math.max(fromRank, Math.floor(missions / 2)),
  );
  const stars = Array.isArray(merged.planetStars)
    ? [...merged.planetStars]
    : Array.from({ length: PLANETS.length }, () => 0);
  while (stars.length < PLANETS.length) stars.push(0);
  const bests = Array.isArray(merged.planetBestMs)
    ? [...merged.planetBestMs]
    : Array.from({ length: PLANETS.length }, () => 0);
  while (bests.length < PLANETS.length) bests.push(0);
  const furthest = Math.min(
    PLANETS.length - 1,
    merged.furthestPlanet ?? autoFurthest,
  );
  const selected = Math.min(furthest, merged.selectedPlanet ?? furthest);
  const level = Math.max(1, merged.level ?? Math.max(1, missions));
  return {
    ...merged,
    version: 2,
    level,
    xp: merged.xp ?? 0,
    selectedPlanet: selected,
    furthestPlanet: furthest,
    planetStars: stars.slice(0, PLANETS.length),
    planetBestMs: bests.slice(0, PLANETS.length),
    bestCombo: merged.bestCombo ?? 0,
    extraTimeSec: (EXTRA_TIME_OPTIONS as readonly number[]).includes(merged.extraTimeSec ?? 15)
      ? (merged.extraTimeSec ?? 15)
      : 15,
    parentAlerts: Array.isArray(merged.parentAlerts) ? merged.parentAlerts : [],
    notifyParents: merged.notifyParents ?? false,
    prizeName: typeof merged.prizeName === "string" ? merged.prizeName.slice(0, 40) : "",
    rankId: PLANETS[furthest]?.rankId ?? merged.rankId ?? "cadete",
  };
}

export function careerLabel(state: PlayerState): string {
  const planet = PLANETS[state.furthestPlanet] ?? PLANETS[0];
  return `Nível ${state.level} · ${planet.name}`;
}
