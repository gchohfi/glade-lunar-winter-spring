import { todayKey, type ClubState, type PlayerState } from "./types";
import { cosmeticItem, type CosmeticItem } from "./wardrobe";

export const MISSION_COINS = 20;
export const FOCUS_COINS = 10;
export const DAILY_CLUB_COINS = MISSION_COINS + FOCUS_COINS;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Calendar dates only: impossible dates and prototype keys never enter the ledger. */
export function validClubDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function purchasable(item: CosmeticItem | undefined): item is CosmeticItem & { cost: number } {
  return Boolean(item && Number.isSafeInteger(item.cost) && (item.cost ?? 0) > 0);
}

/** Additive save migration, without touching educational progress or earned free items. */
export function normalizeClub(raw: unknown): ClubState {
  const source = isRecord(raw) ? raw : {};
  const ownedItemIds = Array.isArray(source.ownedItemIds)
    ? Array.from(
        new Set(
          source.ownedItemIds.filter(
            (id): id is string => typeof id === "string" && purchasable(cosmeticItem(id)),
          ),
        ),
      )
    : [];
  const goal = typeof source.goalItemId === "string" ? cosmeticItem(source.goalItemId) : undefined;
  const rewardDays: ClubState["rewardDays"] = {};
  if (isRecord(source.rewardDays)) {
    for (const [day, reward] of Object.entries(source.rewardDays)) {
      if (!validClubDay(day) || !isRecord(reward)) continue;
      // An unrecognizable claimed flag cannot mint coins on the next replay.
      const mission = reward.mission !== false && reward.mission !== undefined;
      const focus = reward.focus !== false && reward.focus !== undefined;
      if (mission || focus) rewardDays[day] = { mission, focus };
    }
  }
  return {
    balance:
      Number.isSafeInteger(source.balance) && (source.balance as number) >= 0
        ? (source.balance as number)
        : 0,
    ownedItemIds,
    goalItemId: purchasable(goal) && !ownedItemIds.includes(goal.id) ? goal.id : null,
    rewardDays,
  };
}

/** Call only after a completed course mission; practice and logins never call this. */
export function applyClubRewards(
  state: PlayerState,
  input: { day: string; missionCompleted: boolean; focusCompleted: boolean },
): { state: PlayerState; coinsGained: number; missionRewarded: boolean; focusRewarded: boolean } {
  const unchanged = { state, coinsGained: 0, missionRewarded: false, focusRewarded: false };
  if (!validClubDay(input.day)) return unchanged;
  const club = normalizeClub(state.club);
  const before = club.rewardDays[input.day] ?? { mission: false, focus: false };
  const missionRewarded = input.missionCompleted === true && !before.mission;
  const focusRewarded = input.focusCompleted === true && !before.focus;
  const coinsGained = (missionRewarded ? MISSION_COINS : 0) + (focusRewarded ? FOCUS_COINS : 0);
  if (!coinsGained || !Number.isSafeInteger(club.balance + coinsGained)) return unchanged;
  return {
    state: {
      ...state,
      club: {
        ...club,
        balance: club.balance + coinsGained,
        rewardDays: {
          ...club.rewardDays,
          [input.day]: {
            mission: before.mission || missionRewarded,
            focus: before.focus || focusRewarded,
          },
        },
      },
    },
    coinsGained,
    missionRewarded,
    focusRewarded,
  };
}

export function clubSummary(state: Pick<PlayerState, "club">, day = todayKey()) {
  const club = normalizeClub(state.club);
  const reward = validClubDay(day) ? club.rewardDays[day] : undefined;
  const goalItem = club.goalItemId ? cosmeticItem(club.goalItemId) : undefined;
  const goalCost = goalItem?.cost ?? 0;
  return {
    balance: club.balance,
    todayEarned: (reward?.mission ? MISSION_COINS : 0) + (reward?.focus ? FOCUS_COINS : 0),
    missionRewarded: Boolean(reward?.mission),
    focusRewarded: Boolean(reward?.focus),
    goalItem,
    goalRemaining: Math.max(0, goalCost - club.balance),
    goalProgress: goalCost ? Math.min(100, Math.floor((club.balance / goalCost) * 100)) : 0,
  };
}

export type PurchaseReason =
  "purchased" | "unknown-item" | "not-for-sale" | "owned" | "insufficient-coins";

/** Catalog price is authoritative. Purchasing never auto-equips or spends XP. */
export function purchaseCosmetic(
  state: PlayerState,
  id: string,
): {
  state: PlayerState;
  ok: boolean;
  reason: PurchaseReason;
} {
  const item = cosmeticItem(id);
  if (!item) return { state, ok: false, reason: "unknown-item" };
  if (!purchasable(item)) return { state, ok: false, reason: "not-for-sale" };
  const club = normalizeClub(state.club);
  if (club.ownedItemIds.includes(id)) return { state, ok: false, reason: "owned" };
  if (club.balance < item.cost) return { state, ok: false, reason: "insufficient-coins" };
  return {
    state: {
      ...state,
      club: {
        ...club,
        balance: club.balance - item.cost,
        ownedItemIds: [...club.ownedItemIds, id],
        goalItemId: club.goalItemId === id ? null : club.goalItemId,
      },
    },
    ok: true,
    reason: "purchased",
  };
}

export function chooseGoal(state: PlayerState, id: string | null): PlayerState {
  const club = normalizeClub(state.club);
  if (id !== null && (!purchasable(cosmeticItem(id)) || club.ownedItemIds.includes(id)))
    return state;
  if (club.goalItemId === id) return state;
  return { ...state, club: { ...club, goalItemId: id } };
}
