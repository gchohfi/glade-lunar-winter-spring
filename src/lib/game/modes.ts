import type { ModeId } from "./types";

export type ModeCard = {
  id: ModeId;
  title: string;
  blurb: string;
  available: boolean;
};

export const MODES: ModeCard[] = [
  {
    id: "multiplication",
    title: "Tabuada",
    blurb: "Quinze acertos contra o relógio. Do 2 ao 9, vezes 1 até 12.",
    available: true,
  },
  {
    id: "vocabulary",
    title: "Palavras",
    blurb: "Acertar a palavra certa, no estilo da escola americana.",
    available: false,
  },
  {
    id: "definitions",
    title: "Significados",
    blurb: "Desafios de significado — o que a palavra quer dizer.",
    available: false,
  },
];
