import { currentStreak } from "./adaptive";
import { xpRemaining, xpToNext } from "./progress";
import { rankById } from "./ranks";
import {
  DAILY_GOAL,
  PRIZE_EVERY,
  displayName,
  todayKey,
  type PlayerState,
  type RankId,
} from "./types";
import { PLANETS, SHIPS, nextShip, planetAt, shipForLevel } from "./worlds";

export type CadeteStats = {
  precisao: number;
  velocidade: number;
  resiliencia: number;
  foco: number;
  streak: number;
};

export type CadeteSheetData = {
  nome: string;
  avatar: "nico";
  planetaId: string;
  planetaNome: string;
  patenteId: RankId;
  patenteNome: string;
  nivel: number;
  xp: number;
  xpParaProximo: number;
  faltamXp: number;
  naveAtual: string;
  naveAtualArt: string;
  proximaNave: string | null;
  streak: number;
  hojeFeito: boolean;
  acertosHoje: number;
  stats: CadeteStats;
  frota: Array<{ id: string; nome: string; minLevel: number; unlocked: boolean; atual: boolean }>;
  planetas: Array<{
    id: string;
    nome: string;
    unlocked: boolean;
    atual: boolean;
    stars: number;
  }>;
  premio: {
    nome: string;
    ciclo: number;
    aCada: number;
    pronto: boolean;
    entregues: number;
  };
  historico: Array<{
    id: string;
    acertos: number;
    erros: number;
    tempoMs: number;
    passou: boolean;
    dataIso: string;
  }>;
};

export function sheetFromPlayer(state: PlayerState): CadeteSheetData {
  const facts = Object.values(state.facts ?? {});
  const att = facts.reduce((s, f) => s + f.attempts, 0);
  const ok = facts.reduce((s, f) => s + f.correct, 0);
  const ms = facts.reduce((s, f) => s + f.totalMs, 0);
  const played = state.missions.length;
  const losses = state.missions.filter((m) => !m.passed).length;
  const days = Object.values(state.days ?? {});
  const daysMet = days.filter((d) => d.correct >= DAILY_GOAL).length;
  const today = state.days[todayKey()] ?? { answered: 0, correct: 0, missions: 0 };
  const planet = planetAt(state.selectedPlanet);
  const rank = rankById(state.rankId);
  const ship = shipForLevel(state.level);
  const upcoming = nextShip(state.level);

  return {
    nome: displayName(state),
    avatar: "nico",
    planetaId: planet.id,
    planetaNome: planet.name,
    patenteId: state.rankId,
    patenteNome: rank.name,
    nivel: state.level,
    xp: state.xp,
    xpParaProximo: xpToNext(state.level),
    faltamXp: xpRemaining(state.level, state.xp),
    naveAtual: ship.name,
    naveAtualArt: ship.art,
    proximaNave: upcoming?.name ?? null,
    streak: currentStreak(state),
    hojeFeito: today.correct >= DAILY_GOAL,
    acertosHoje: today.correct,
    stats: {
      precisao: att ? ok / att : 0,
      velocidade: att ? ms / att / 1000 : 0,
      resiliencia: played ? 1 - losses / played : 1,
      foco: Math.min(
        1,
        (state.bestCombo / 10) * 0.5 + (days.length ? daysMet / days.length : 0) * 0.5,
      ),
      streak: currentStreak(state),
    },
    frota: SHIPS.map((s) => ({
      id: s.id,
      nome: s.name,
      minLevel: s.minLevel,
      unlocked: state.level >= s.minLevel,
      atual: s.id === ship.id,
    })),
    planetas: PLANETS.map((p, i) => ({
      id: p.id,
      nome: p.name,
      unlocked: i <= state.furthestPlanet,
      atual: i === state.selectedPlanet,
      stars: state.planetStars[i] ?? 0,
    })),
    premio: {
      nome: state.prizeName.trim() || "o que combinaram",
      ciclo: state.prizeCycle,
      aCada: PRIZE_EVERY,
      pronto: state.prizeCycle >= PRIZE_EVERY,
      entregues: state.prizesClaimed,
    },
    historico: state.missions.slice(0, 12).map((m) => ({
      id: m.id,
      acertos: m.correct,
      erros: m.wrong,
      tempoMs: m.elapsedMs,
      passou: m.passed,
      dataIso: new Date(m.finishedAt).toISOString(),
    })),
  };
}

export function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function formatSec(n: number): string {
  if (n <= 0) return "—";
  return `${n.toFixed(1).replace(".", ",")}s`;
}
