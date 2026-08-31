import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { emptyState, type PlayerState } from "@/lib/game/types";
import { migrateState } from "@/lib/game/progress";

const playerStateSchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    childName: z.string(),
    rankId: z.string(),
    consecutiveWins: z.number(),
    consecutiveFails: z.number(),
    totalMissionsPassed: z.number(),
    prizeCycle: z.number(),
    prizesEarned: z.number(),
    prizesClaimed: z.number(),
    facts: z.record(z.string(), z.unknown()),
    missions: z.array(z.unknown()),
    days: z.record(z.string(), z.unknown()),
    sound: z.boolean(),
    onboarded: z.boolean(),
    level: z.number().optional(),
    xp: z.number().optional(),
    selectedPlanet: z.number().optional(),
    furthestPlanet: z.number().optional(),
    planetStars: z.array(z.number()).optional(),
    planetBestMs: z.array(z.number()).optional(),
    bestCombo: z.number().optional(),
    extraTimeSec: z.number().optional(),
    parentAlerts: z.array(z.unknown()).optional(),
    notifyParents: z.boolean().optional(),
    prizeName: z.string().optional(),
    shields: z.number().optional(),
    lastSettledDay: z.string().optional(),
  })
  .passthrough();

function asState(value: unknown): PlayerState {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  const parsed = playerStateSchema.safeParse(raw);
  if (!parsed.success) return emptyState();
  return migrateState(parsed.data as Partial<PlayerState>);
}

export const loadProgress = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ state: unknown }>`
      select state from players where user_id = ${context.userId} limit 1
    `;
    if (!rows[0]) return null;
    return asState(rows[0].state);
  });

export const saveProgress = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: PlayerState) => migrateState(playerStateSchema.parse(input) as Partial<PlayerState>))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const payload = JSON.stringify(data);
    await sql`
      insert into players (
        user_id, child_name, rank_id, consecutive_wins, consecutive_fails,
        total_missions, prize_cycle, prizes_earned, prizes_claimed,
        sound_on, onboarded, state, updated_at
      ) values (
        ${context.userId},
        ${data.childName},
        ${data.rankId},
        ${data.consecutiveWins},
        ${data.consecutiveFails},
        ${data.totalMissionsPassed},
        ${data.prizeCycle},
        ${data.prizesEarned},
        ${data.prizesClaimed},
        ${data.sound},
        ${data.onboarded},
        ${payload}::jsonb,
        now()
      )
      on conflict (user_id) do update set
        child_name = excluded.child_name,
        rank_id = excluded.rank_id,
        consecutive_wins = excluded.consecutive_wins,
        consecutive_fails = excluded.consecutive_fails,
        total_missions = excluded.total_missions,
        prize_cycle = excluded.prize_cycle,
        prizes_earned = excluded.prizes_earned,
        prizes_claimed = excluded.prizes_claimed,
        sound_on = excluded.sound_on,
        onboarded = excluded.onboarded,
        state = excluded.state,
        updated_at = now()
    `;
    return { ok: true as const };
  });
