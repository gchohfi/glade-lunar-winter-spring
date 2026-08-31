import { i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { I as record, L as string, N as number, O as array, P as object, R as union, j as literal, k as boolean, z as unknown } from "../_libs/@better-auth/core+[...].mjs";
import { c as emptyState, h as migrateState, m as getSql, o as authMiddleware } from "./progress-CTrhxREx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/player-BrsCpGnQ.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var playerStateSchema = object({
	version: union([literal(1), literal(2)]),
	childName: string(),
	rankId: string(),
	consecutiveWins: number(),
	consecutiveFails: number(),
	totalMissionsPassed: number(),
	prizeCycle: number(),
	prizesEarned: number(),
	prizesClaimed: number(),
	facts: record(string(), unknown()),
	missions: array(unknown()),
	days: record(string(), unknown()),
	sound: boolean(),
	onboarded: boolean(),
	level: number().optional(),
	xp: number().optional(),
	selectedPlanet: number().optional(),
	furthestPlanet: number().optional(),
	planetStars: array(number()).optional(),
	planetBestMs: array(number()).optional(),
	bestCombo: number().optional(),
	extraTimeSec: number().optional(),
	parentAlerts: array(unknown()).optional(),
	notifyParents: boolean().optional(),
	prizeName: string().optional()
}).passthrough();
function asState(value) {
	const raw = typeof value === "string" ? JSON.parse(value) : value;
	const parsed = playerStateSchema.safeParse(raw);
	if (!parsed.success) return emptyState();
	return migrateState(parsed.data);
}
var loadProgress_createServerFn_handler = createServerRpc({
	id: "5578011dbc5082e94fe92f94c22e4e13b6cde04375d7157e15fac326e98de2f3",
	name: "loadProgress",
	filename: "src/lib/server/player.ts"
}, (opts) => loadProgress.__executeServer(opts));
var loadProgress = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(loadProgress_createServerFn_handler, async ({ context }) => {
	const rows = await (await getSql())`
      select state from players where user_id = ${context.userId} limit 1
    `;
	if (!rows[0]) return null;
	return asState(rows[0].state);
});
var saveProgress_createServerFn_handler = createServerRpc({
	id: "9cd4f929bba1603bb3913cbd935442a2177027886a5c43882669c3720650e83c",
	name: "saveProgress",
	filename: "src/lib/server/player.ts"
}, (opts) => saveProgress.__executeServer(opts));
var saveProgress = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => migrateState(playerStateSchema.parse(input))).handler(saveProgress_createServerFn_handler, async ({ context, data }) => {
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
	return { ok: true };
});
//#endregion
export { loadProgress_createServerFn_handler, saveProgress_createServerFn_handler };
