import { todayKey } from "./types";

export const NICO_INTRO_VIDEO = "/mascots/nico-leao/entrada-v1.mp4";
export const NICO_INTRO_POSTER = "/mascots/nico-leao/entrada-v1-poster.jpg";
export const INTRO_STORAGE_PREFIX = "missao-nico-intro-v1:";

type IntroStorage = Pick<Storage, "getItem" | "setItem">;

/** Presentation only: never reads or writes a player's progress or rewards. */
export function createIntroHistory() {
  const seen = new Map<string, string>();
  return {
    claim(accountId: string, now: Date, storage?: IntroStorage): boolean {
      if (!accountId) return false;
      const day = todayKey(now);
      const key = INTRO_STORAGE_PREFIX + encodeURIComponent(accountId);
      if (seen.get(key) === day) return false;
      try {
        if (storage?.getItem(key) === day) {
          seen.set(key, day);
          return false;
        }
      } catch {
        // Blocked storage still suppresses repeat introductions in this tab.
      }
      seen.set(key, day);
      try {
        storage?.setItem(key, day);
      } catch {
        // This optional presentation must never prevent entry into the game.
      }
      return true;
    },
  };
}

export const introHistory = createIntroHistory();
