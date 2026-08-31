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
    blurb: "Quinze acertos. Do 3 ao 13, vezes e divisão — até com vírgula.",
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
