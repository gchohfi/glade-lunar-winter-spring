import { usePlayer } from "@/lib/game/store";
import { normalizeCosmetics } from "@/lib/game/wardrobe";

export function useCosmetics() {
  const cosmetics = usePlayer((s) => s.cosmetics);
  const planetStars = usePlayer((s) => s.planetStars);
  return normalizeCosmetics(cosmetics, { planetStars });
}
