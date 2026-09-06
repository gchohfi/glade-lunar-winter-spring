import type { CosmeticSelection, PlayerState } from "./types";
import { PLANETS, STADIUM_ART } from "./worlds";

export type CosmeticKind = "ball" | "field";
export type CosmeticItem = {
  id: string;
  kind: CosmeticKind;
  name: string;
  description: string;
  art: string;
  sceneArt?: string;
  stageIndex: number | null;
};

export const COSMETICS: readonly CosmeticItem[] = [
  {
    id: "ball-classic",
    kind: "ball",
    name: "Bola clássica",
    description: "Preto e branco, do primeiro passe ao último gol.",
    art: "/game/football/ball-v2.webp",
    stageIndex: null,
  },
  {
    id: "field-club",
    kind: "field",
    name: "Campo do clube",
    description: "O nosso campo de todo dia, com o Nico no seu time.",
    art: "/game/football/pitch-v2.webp",
    sceneArt: STADIUM_ART,
    stageIndex: null,
  },
  {
    id: "ball-training",
    kind: "ball",
    name: "Bola de treino",
    description: "Verde e marfim para lembrar do seu primeiro jogo completo.",
    art: "/game/football/ball-treino.webp",
    stageIndex: 0,
  },
  {
    id: "field-sunset",
    kind: "field",
    name: "Campo ao entardecer",
    description: "O mesmo campo, com a luz suave de fim de tarde. As contas continuam iguais.",
    art: "/game/football/pitch-sunset.webp",
    stageIndex: 5,
  },
];

export const DEFAULT_COSMETICS: CosmeticSelection = {
  ballId: "ball-classic",
  fieldId: "field-club",
};
type Career = Pick<PlayerState, "planetStars">;

export function cosmeticItem(id: string): CosmeticItem | undefined {
  return COSMETICS.find((item) => item.id === id);
}

/** A selected/unlocked stage, level, or claimed prize is not a completed stage. */
export function cosmeticUnlocked(item: CosmeticItem, career: Career): boolean {
  if (item.stageIndex === null) return true;
  const stars = career.planetStars?.[item.stageIndex];
  return Number.isInteger(stars) && stars >= 1 && stars <= 3;
}

export function cosmeticRequirement(item: CosmeticItem, completed = false): string {
  return item.stageIndex === null
    ? "Disponível desde o início"
    : `${completed ? "Conquistado em" : "Conclua"} ${PLANETS[item.stageIndex].name}`;
}

/** Allowlisted, additive migration. Unknown, mismatched or locked items fall back. */
export function normalizeCosmetics(raw: unknown, career: Career): CosmeticSelection {
  const candidate = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const valid = (key: keyof CosmeticSelection, kind: CosmeticKind) => {
    const item = typeof candidate[key] === "string" ? cosmeticItem(candidate[key]) : undefined;
    return item?.kind === kind && cosmeticUnlocked(item, career) ? item.id : DEFAULT_COSMETICS[key];
  };
  return { ballId: valid("ballId", "ball"), fieldId: valid("fieldId", "field") };
}

export function cosmeticStatus(
  item: CosmeticItem,
  state: Pick<PlayerState, "cosmetics" | "planetStars">,
) {
  if (!cosmeticUnlocked(item, state)) return "locked" as const;
  const selection = normalizeCosmetics(state.cosmetics, state);
  return selection[item.kind === "ball" ? "ballId" : "fieldId"] === item.id
    ? ("equipped" as const)
    : ("unlocked" as const);
}

export function equipCosmetic(state: PlayerState, id: string): PlayerState {
  const item = cosmeticItem(id);
  if (!item || !cosmeticUnlocked(item, state)) return state;
  const selection = normalizeCosmetics(state.cosmetics, state);
  const key = item.kind === "ball" ? "ballId" : "fieldId";
  if (selection[key] === item.id) return state;
  return { ...state, cosmetics: { ...selection, [key]: item.id } };
}

export function nextCosmetic(career: Career) {
  return COSMETICS.find((item) => !cosmeticUnlocked(item, career));
}

export function newCosmetics(before: Career, after: Career) {
  return COSMETICS.filter(
    (item) => !cosmeticUnlocked(item, before) && cosmeticUnlocked(item, after),
  );
}

export function cosmeticsForStage(stageIndex: number) {
  return COSMETICS.filter((item) => item.stageIndex === stageIndex);
}
