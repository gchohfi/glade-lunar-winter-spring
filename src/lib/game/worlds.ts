import type { RankId } from "./types";

// Persisted IDs, ordering and unlock levels stay stable for existing players.
// These legacy names are storage adapters, not the game's visible vocabulary.
export const CHAPTERS = [
  "Entrada em campo",
  "Centro de treinamento",
  "Partida do dia",
  "Campeonato pessoal",
  "Sala de troféus",
] as const;
export const STADIUM_ART = "/game/football/stadium.webp";
export type Planet = {
  id: string;
  name: string;
  blurb: string;
  rankId: RankId;
  art: string;
  chapter: number;
};
const stage = (
  id: string,
  name: string,
  blurb: string,
  rankId: RankId,
  chapter: number,
): Planet => ({ id, name, blurb, rankId, chapter, art: STADIUM_ART });

export const PLANETS: Planet[] = [
  stage(
    "lua",
    "Primeiro toque",
    "Conheça o campo: dois passes e um chute. Três acertos fazem um gol.",
    "cadete",
    0,
  ),
  stage("porto", "Passe certeiro", "Encontre seu ritmo, uma conta de cada vez.", "cadete", 1),
  stage(
    "vale",
    "Drible de números",
    "Multiplicação e divisão entram na mesma jogada.",
    "aprendiz",
    1,
  ),
  stage("ilha", "Chute colocado", "Treine a precisão. O Nico está no seu time.", "aprendiz", 1),
  stage("estacao", "Primeiro tempo", "Quinze acertos para completar sua partida.", "piloto", 2),
  stage("pico", "Bola na área", "Mantenha o ritmo e prepare o próximo gol.", "piloto", 2),
  stage("cometa", "Dia de jogo", "Concentre-se na próxima jogada. Vamos juntos.", "capitao", 2),
  stage(
    "abismo",
    "Copa da turma",
    "Um campeonato só seu, sem ranking ou adversários online.",
    "capitao",
    3,
  ),
  stage(
    "farol",
    "Quartas de final",
    "Contas desafiadoras também se aprendem com treino.",
    "comandante",
    3,
  ),
  stage("anel", "Semifinal", "O próximo passe vale tanto quanto o gol.", "comandante", 3),
  stage("fossa", "Grande final", "Use tudo o que treinou. Uma conta de cada vez.", "almirante", 3),
  stage(
    "coroa",
    "Lenda do campo",
    "Celebre sua trajetória e continue treinando no seu ritmo.",
    "lenda",
    4,
  ),
];

export type Ship = { id: string; name: string; minLevel: number; art: string };
export const SHIPS: Ship[] = [
  { id: "cadete", name: "Estreante do time", minLevel: 1, art: STADIUM_ART },
  { id: "piloto", name: "Craque dos passes", minLevel: 5, art: STADIUM_ART },
  { id: "lenda", name: "Artilheiro", minLevel: 10, art: STADIUM_ART },
  { id: "cometa", name: "Dono da bola", minLevel: 15, art: STADIUM_ART },
  { id: "farol", name: "Capitão do time", minLevel: 20, art: STADIUM_ART },
  { id: "fossa", name: "Craque da temporada", minLevel: 25, art: STADIUM_ART },
  { id: "coroa", name: "Lenda do futebol", minLevel: 30, art: STADIUM_ART },
];

export function planetAt(index: number): Planet {
  return PLANETS[Math.max(0, Math.min(PLANETS.length - 1, index))];
}
export function firstPlanetForRank(rankId: RankId): number {
  const i = PLANETS.findIndex((p) => p.rankId === rankId);
  return i < 0 ? 0 : i;
}
export function shipForLevel(level: number): Ship {
  let chosen = SHIPS[0];
  for (const ship of SHIPS) if (level >= ship.minLevel) chosen = ship;
  return chosen;
}
export function nextShip(level: number): Ship | null {
  return SHIPS.find((s) => s.minLevel > level) ?? null;
}
