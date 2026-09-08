import { usePlayer } from "@/lib/game/store";
import { normalizeCosmetics } from "@/lib/game/wardrobe";

export function useCosmetics() {
  const cosmetics = usePlayer((s) => s.cosmetics);
  const planetStars = usePlayer((s) => s.planetStars);
  const club = usePlayer((s) => s.club);
  const course = usePlayer((s) => s.course);
  return normalizeCosmetics(cosmetics, { planetStars, club, course });
}
