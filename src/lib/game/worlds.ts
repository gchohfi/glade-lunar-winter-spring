import type { RankId } from "./types";

export type Planet = {
  id: string;
  name: string;
  blurb: string;
  rankId: RankId;
  art: string;
};

export const PLANETS: Planet[] = [
  {
    id: "lua",
    name: "Lua Clara",
    blurb: "Primeiro pouso. Contas mais amigas, tempo de sobra.",
    rankId: "cadete",
    art: "/game/planet-lua.jpg",
  },
  {
    id: "porto",
    name: "Porto Areia",
    blurb: "Ainda Cadete, já com o mar à vista.",
    rankId: "cadete",
    art: "/game/planet-porto.jpg",
  },
  {
    id: "vale",
    name: "Vale Verde",
    blurb: "Entram contas médias e as primeiras divisões.",
    rankId: "aprendiz",
    art: "/game/planet-vale.jpg",
  },
  {
    id: "ilha",
    name: "Ilha Coral",
    blurb: "Aprendiz firme. Recifes e tabuada do 3 e 4.",
    rankId: "aprendiz",
    art: "/game/planet-ilha.jpg",
  },
  {
    id: "estacao",
    name: "Estação Cinco",
    blurb: "Piloto: quinze acertos em um minuto e meio.",
    rankId: "piloto",
    art: "/game/planet-estacao.jpg",
  },
  {
    id: "pico",
    name: "Pico Sete",
    blurb: "O ar rarefaz. Mais 6, 7 e 8.",
    rankId: "piloto",
    art: "/game/planet-pico.jpg",
  },
  {
    id: "cometa",
    name: "Cometa Oito",
    blurb: "Capitão. Pouca folga, muito brilho.",
    rankId: "capitao",
    art: "/game/planet-cometa.jpg",
  },
  {
    id: "abismo",
    name: "Abismo Nove",
    blurb: "As contas duras moram no fosso.",
    rankId: "capitao",
    art: "/game/planet-abismo.jpg",
  },
  {
    id: "farol",
    name: "Farol Onze",
    blurb: "Comandante. ×11, ×12 e ×13 entram na rota.",
    rankId: "comandante",
    art: "/game/planet-estacao.jpg",
  },
  {
    id: "anel",
    name: "Anel Doze",
    blurb: "Quase só as teimosas.",
    rankId: "comandante",
    art: "/game/planet-pico.jpg",
  },
  {
    id: "fossa",
    name: "Fossa Leste",
    blurb: "Almirante. 6 a 9 e 11 a 13.",
    rankId: "almirante",
    art: "/game/planet-abismo.jpg",
  },
  {
    id: "coroa",
    name: "Coroa Lenda",
    blurb: "Tudo misturado, quase no automático.",
    rankId: "lenda",
    art: "/game/planet-coroa.jpg",
  },
];

export type Ship = {
  id: string;
  name: string;
  minLevel: number;
  art: string;
};

export const SHIPS: Ship[] = [
  { id: "cadete", name: "Foguete de Papel", minLevel: 1, art: "/game/ship-cadete.jpg" },
  { id: "piloto", name: "Asa Teal", minLevel: 5, art: "/game/ship-piloto.jpg" },
  { id: "lenda", name: "Nau-Coroa", minLevel: 10, art: "/game/ship-lenda.jpg" },
  { id: "cometa", name: "Asa-Cometa", minLevel: 15, art: "/game/planet-cometa.jpg" },
  { id: "farol", name: "Farol Voador", minLevel: 20, art: "/game/planet-estacao.jpg" },
  { id: "fossa", name: "Couraça Leste", minLevel: 25, art: "/game/planet-abismo.jpg" },
  { id: "coroa", name: "Nau-Lenda", minLevel: 30, art: "/game/planet-coroa.jpg" },
];

export function planetAt(index: number): Planet {
  const i = Math.max(0, Math.min(PLANETS.length - 1, index));
  return PLANETS[i];
}

export function firstPlanetForRank(rankId: RankId): number {
  const i = PLANETS.findIndex((p) => p.rankId === rankId);
  return i < 0 ? 0 : i;
}

export function shipForLevel(level: number): Ship {
  let chosen = SHIPS[0];
  for (const ship of SHIPS) {
    if (level >= ship.minLevel) chosen = ship;
  }
  return chosen;
}

export function nextShip(level: number): Ship | null {
  return SHIPS.find((s) => s.minLevel > level) ?? null;
}
