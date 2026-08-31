import { o as __toESM } from "../_runtime.mjs";
import { B as require_react, b as require_jsx_runtime, f as createRouter, g as createRootRoute, h as createFileRoute, l as Scripts, m as lazyRouteComponent, p as Outlet, u as HeadContent, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn, s as __exportAll } from "./ssr.mjs";
import { I as record, L as string, N as number, O as array, P as object, R as union, j as literal, k as boolean, z as unknown } from "../_libs/@better-auth/core+[...].mjs";
import { t as authClient } from "./client-B40BzJxt.mjs";
import { _ as shipForLevel, a as applyRunProgress, c as emptyState, d as firstPlanetForRank, h as migrateState, n as PLANETS, o as authMiddleware, r as STORAGE_KEY, s as displayName, t as EXTRA_TIME_OPTIONS, u as factKey, v as todayKey } from "./progress-CTrhxREx.mjs";
import { n as auth } from "./server-1utkiyn2.mjs";
import { r as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-DSOyIJNs.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-bg text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-bad",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-lg",
				children: "Algo deu errado"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-muted",
				children: error.message || "Tente recarregar a página."
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	if (typeof window === "undefined") return () => {};
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	const parentOrigin = resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		if (envelope.data.type === "hello") {
			if (!HelloSchema.safeParse(event.data).success) return;
			announce();
			return;
		}
		if (envelope.data.type === "navigate") {
			const parsed = NavigateSchema.safeParse(event.data);
			if (!parsed.success) return;
			navigate(parsed.data.path);
			queueMicrotask(reportLocation);
			return;
		}
		if (envelope.data.type === "history") {
			const parsed = HistorySchema.safeParse(event.data);
			if (!parsed.success) return;
			if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
			window.history.go(parsed.data.delta);
		}
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	const { data, isPending } = authClient.useSession();
	const user = data?.user;
	return {
		user: user ? {
			id: user.id,
			displayName: user.name ?? null,
			primaryEmail: user.email ?? null,
			profileImageUrl: user.image ?? null,
			isDevFallback: false
		} : null,
		isPending
	};
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
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
var loadProgress = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("5578011dbc5082e94fe92f94c22e4e13b6cde04375d7157e15fac326e98de2f3"));
var saveProgress = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => migrateState(playerStateSchema.parse(input))).handler(createSsrRpc("9cd4f929bba1603bb3913cbd935442a2177027886a5c43882669c3720650e83c"));
var ALL_TABLES = [
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9
];
var ALL_FACTORS = [
	1,
	2,
	3,
	4,
	5,
	6,
	7,
	8,
	9,
	10,
	11,
	12
];
/**
* Times scale with TARGET_CORRECT (15 acertos) via secondsPerFact.
*
* Every rank uses tables 2–9 × 1–12. What changes is the mix of easy/hard
* facts and the clock — so the same 7×8 does not loop while 9×12 never appears.
*/
var RANKS = [
	{
		id: "cadete",
		name: "Cadete",
		blurb: "Mistura do 2 ao 9, com mais contas fáceis e tempo de sobra.",
		tables: ALL_TABLES,
		factors: ALL_FACTORS,
		timeLimitMs: 135e3,
		secondsPerFact: 9
	},
	{
		id: "aprendiz",
		name: "Aprendiz",
		blurb: "Ainda tem calma, mas já entram contas médias.",
		tables: ALL_TABLES,
		factors: ALL_FACTORS,
		timeLimitMs: 113e3,
		secondsPerFact: 7.5
	},
	{
		id: "piloto",
		name: "Piloto",
		blurb: "Quinze acertos em um minuto e meio, tabuadas misturadas.",
		tables: ALL_TABLES,
		factors: ALL_FACTORS,
		timeLimitMs: 9e4,
		secondsPerFact: 6
	},
	{
		id: "capitao",
		name: "Capitão",
		blurb: "Menos folga. Mais 6, 7, 8 e 9.",
		tables: ALL_TABLES,
		factors: ALL_FACTORS,
		timeLimitMs: 75e3,
		secondsPerFact: 5
	},
	{
		id: "comandante",
		name: "Comandante",
		blurb: "Quase só as contas duras, inclusive ×11 e ×12.",
		tables: ALL_TABLES,
		factors: ALL_FACTORS,
		timeLimitMs: 68e3,
		secondsPerFact: 4.5
	},
	{
		id: "almirante",
		name: "Almirante",
		blurb: "Só as mais teimosas: 6 a 9 vezes 6 a 12.",
		tables: [
			6,
			7,
			8,
			9
		],
		factors: [
			6,
			7,
			8,
			9,
			10,
			11,
			12
		],
		timeLimitMs: 6e4,
		secondsPerFact: 4
	},
	{
		id: "lenda",
		name: "Lenda",
		blurb: "Tudo misturado, quase no automático.",
		tables: ALL_TABLES,
		factors: ALL_FACTORS,
		timeLimitMs: 42e3,
		secondsPerFact: 2.8
	}
];
var RANK_MIX = {
	cadete: {
		easy: 9,
		medium: 4,
		hard: 2
	},
	aprendiz: {
		easy: 6,
		medium: 6,
		hard: 3
	},
	piloto: {
		easy: 3,
		medium: 7,
		hard: 5
	},
	capitao: {
		easy: 2,
		medium: 6,
		hard: 7
	},
	comandante: {
		easy: 0,
		medium: 5,
		hard: 10
	},
	almirante: {
		easy: 0,
		medium: 3,
		hard: 12
	},
	lenda: {
		easy: 0,
		medium: 3,
		hard: 12
	}
};
function rankById(id) {
	return RANKS.find((r) => r.id === id) ?? RANKS[0];
}
function timeWithBoost(rank, consecutiveFails, extraMs = 0) {
	const base = Math.round(rank.secondsPerFact * 15 * 1e3) + Math.max(0, extraMs);
	if (consecutiveFails >= 3) return base + 15e3;
	if (consecutiveFails >= 2) return base + 8e3;
	return base;
}
var IMPORTANT_LEVELS = [
	5,
	10,
	15,
	20,
	25,
	30
];
function alertId(kind, key) {
	return `${kind}-${key}-${Date.now().toString(36)}`;
}
function unreadAlerts(state) {
	return (state.parentAlerts ?? []).filter((a) => !a.read);
}
function collectParentAlerts(input) {
	const at = Date.now();
	const name = displayName(input.next);
	const out = [];
	const prevLevel = input.prev.level ?? 1;
	const nextLevel = input.next.level ?? 1;
	let levelNoted = false;
	for (const mark of IMPORTANT_LEVELS) if (prevLevel < mark && nextLevel >= mark) {
		const ship = shipForLevel(mark);
		const shipUnlock = ship.minLevel === mark;
		out.push({
			id: alertId("level", String(mark)),
			at,
			kind: "level",
			title: `${name} chegou ao nível ${mark}`,
			body: shipUnlock ? `Nível importante. Nova nave: ${ship.name}.` : "Nível importante na Rota das Estrelas.",
			read: false
		});
		levelNoted = true;
	}
	const prevRank = PLANETS[input.prev.furthestPlanet ?? 0]?.rankId ?? input.prev.rankId;
	const nextRank = PLANETS[input.next.furthestPlanet ?? 0]?.rankId ?? input.next.rankId;
	if (prevRank !== nextRank) {
		const rank = rankById(nextRank);
		const planet = PLANETS[input.next.furthestPlanet] ?? PLANETS[0];
		out.push({
			id: alertId("rank", nextRank),
			at,
			kind: "rank",
			title: `${name} é ${rank.name}`,
			body: `Nova patente. Próximo planeta: ${planet.name}.`,
			read: false
		});
	}
	const prevShip = shipForLevel(prevLevel);
	const nextShip = shipForLevel(nextLevel);
	if (prevShip.id !== nextShip.id && !levelNoted) out.push({
		id: alertId("ship", nextShip.id),
		at,
		kind: "ship",
		title: `Nova nave: ${nextShip.name}`,
		body: `${name} destrancou uma nave no nível ${nextLevel}.`,
		read: false
	});
	if (input.prizeJustReady) out.push({
		id: alertId("prize", String(input.next.prizesEarned)),
		at,
		kind: "prize",
		title: `${name} completou 10 missões`,
		body: "Hora de entregar o que combinaram.",
		read: false
	});
	return out;
}
function allFactsForRank(rankId) {
	const rank = rankById(rankId);
	const facts = [];
	for (const a of rank.tables) for (const b of rank.factors) facts.push({
		a,
		b
	});
	return facts;
}
function factBand(fact) {
	if (fact.b === 1 || fact.b === 2 || fact.b === 5 || fact.b === 10) return "easy";
	if ((fact.a === 2 || fact.a === 5) && fact.b <= 6) return "easy";
	if ([
		6,
		7,
		8,
		9
	].includes(fact.a) && [
		6,
		7,
		8,
		9,
		11,
		12
	].includes(fact.b)) return "hard";
	return "medium";
}
function commuteKey(fact) {
	return `${Math.min(fact.a, fact.b)}:${Math.max(fact.a, fact.b)}`;
}
function shuffle(items) {
	const next = [...items];
	for (let i = next.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[next[i], next[j]] = [next[j], next[i]];
	}
	return next;
}
function freshnessScore(stat, now) {
	if (!stat || stat.attempts === 0) return 4 + Math.random();
	const acc = stat.correct / stat.attempts;
	const age = now - stat.lastSeen;
	let score = Math.random();
	if (age < 9e4) score -= 12;
	else if (age < 48e4) score -= 3;
	else if (age > 1728e5) score += 1.4;
	if (acc < .7) score += 1.2;
	return score;
}
function groupByTable(facts) {
	const map = /* @__PURE__ */ new Map();
	for (const fact of facts) {
		const list = map.get(fact.a) ?? [];
		list.push(fact);
		map.set(fact.a, list);
	}
	return map;
}
function takeRoundRobin(candidates, n, picked, used, commute, tableCount, maxPerTable = 2) {
	const grouped = groupByTable(candidates.filter((fact) => {
		const key = factKey(fact);
		return !used.has(key) && !commute.has(commuteKey(fact));
	}));
	const tables = shuffle([...grouped.keys()]);
	let guard = 0;
	while (n > 0 && guard < 80) {
		guard += 1;
		let took = false;
		for (const table of tables) {
			if (n <= 0) return;
			if ((tableCount.get(table) ?? 0) >= maxPerTable) continue;
			const list = grouped.get(table);
			if (!list?.length) continue;
			const last = picked[picked.length - 1];
			if (last && last.a === table) continue;
			const fact = list.shift();
			if (!fact) continue;
			picked.push(fact);
			used.add(factKey(fact));
			commute.add(commuteKey(fact));
			tableCount.set(table, (tableCount.get(table) ?? 0) + 1);
			n -= 1;
			took = true;
		}
		if (!took) break;
	}
}
function arrangeVariety(facts) {
	const grouped = groupByTable(facts);
	const tables = shuffle([...grouped.keys()]);
	const ordered = [];
	let guard = 0;
	while (ordered.length < facts.length && guard < 80) {
		guard += 1;
		let took = false;
		for (const table of tables) {
			const list = grouped.get(table);
			if (!list?.length) continue;
			const last = ordered[ordered.length - 1];
			if (last && last.a === table) {
				if (tables.some((alt) => alt !== table && (grouped.get(alt)?.length ?? 0) > 0)) continue;
			}
			ordered.push(list.shift());
			took = true;
		}
		if (!took) break;
	}
	return ordered;
}
function pickMissionFacts(state, count = 19) {
	const now = Date.now();
	const pool = allFactsForRank(state.rankId);
	const mix = RANK_MIX[state.rankId];
	const buckets = {
		easy: [],
		medium: [],
		hard: []
	};
	for (const fact of pool) buckets[factBand(fact)].push(fact);
	for (const band of Object.keys(buckets)) buckets[band] = shuffle(buckets[band]).sort((a, b) => freshnessScore(state.facts[factKey(b)], now) - freshnessScore(state.facts[factKey(a)], now));
	const picked = [];
	const used = /* @__PURE__ */ new Set();
	const commute = /* @__PURE__ */ new Set();
	const tableCount = /* @__PURE__ */ new Map();
	takeRoundRobin(buckets.easy, mix.easy, picked, used, commute, tableCount);
	takeRoundRobin(buckets.medium, mix.medium, picked, used, commute, tableCount);
	takeRoundRobin(buckets.hard, mix.hard, picked, used, commute, tableCount);
	const leftovers = shuffle(pool);
	takeRoundRobin(leftovers, count - picked.length, picked, used, commute, tableCount, 3);
	if (picked.length < count) for (const fact of leftovers) {
		if (picked.length >= count) break;
		const key = factKey(fact);
		if (used.has(key)) continue;
		picked.push(fact);
		used.add(key);
	}
	const arranged = arrangeVariety(picked.slice(0, count));
	if (state.rankId === "cadete" || state.rankId === "aprendiz") {
		const easyIdx = arranged.findIndex((f) => factBand(f) === "easy");
		if (easyIdx > 0) [arranged[0], arranged[easyIdx]] = [arranged[easyIdx], arranged[0]];
	}
	return arranged;
}
function drawNext(queue, last) {
	if (queue.length === 0) return {
		fact: last && last.a === 2 && last.b === 3 ? {
			a: 4,
			b: 7
		} : {
			a: 2,
			b: 3
		},
		queue: []
	};
	let idx = 0;
	if (last) {
		const found = queue.findIndex((f) => factKey(f) !== factKey(last) && f.a !== last.a);
		if (found >= 0) idx = found;
		else {
			const different = queue.findIndex((f) => factKey(f) !== factKey(last));
			if (different >= 0) idx = different;
		}
	}
	return {
		fact: queue[idx],
		queue: queue.filter((_, i) => i !== idx)
	};
}
function recycleMiss(queue, missed) {
	const key = factKey(missed);
	const rest = queue.filter((f) => factKey(f) !== key);
	const slot = Math.min(3, rest.length);
	return [
		...rest.slice(0, slot),
		missed,
		...rest.slice(slot)
	];
}
function bumpFact(facts, fact, ok, ms) {
	const key = factKey(fact);
	const prev = facts[key] ?? {
		attempts: 0,
		correct: 0,
		wrong: 0,
		totalMs: 0,
		lastSeen: 0
	};
	return {
		...facts,
		[key]: {
			attempts: prev.attempts + 1,
			correct: prev.correct + (ok ? 1 : 0),
			wrong: prev.wrong + (ok ? 0 : 1),
			totalMs: prev.totalMs + Math.max(0, Math.round(ms)),
			lastSeen: Date.now()
		}
	};
}
function applyMissionResult(state, record) {
	const day = todayKey();
	const dayPrev = state.days[day] ?? {
		answered: 0,
		correct: 0,
		missions: 0
	};
	let facts = state.facts;
	for (const tried of record.factsTried) facts = bumpFact(facts, tried.fact, tried.ok, tried.ms);
	const passed = record.passed;
	const consecutiveWins = passed ? state.consecutiveWins + 1 : 0;
	const consecutiveFails = passed ? 0 : state.consecutiveFails + 1;
	const rankId = record.rankId;
	const promotedTo = null;
	const demotedTo = null;
	const prizeCycle = (() => {
		if (!passed) return state.prizeCycle;
		if (state.prizeCycle >= 10) return 10;
		return state.prizeCycle + 1;
	})();
	const prizesEarned = passed && state.prizeCycle === 9 ? state.prizesEarned + 1 : state.prizesEarned;
	const prizeReady = prizeCycle >= 10;
	const mission = {
		id: record.startedAt.toString(36) + Math.random().toString(36).slice(2, 6),
		mode: record.mode,
		rankId: record.rankId,
		startedAt: record.startedAt,
		finishedAt: record.finishedAt,
		elapsedMs: record.elapsedMs,
		timeLimitMs: record.timeLimitMs,
		correct: record.correct,
		wrong: record.wrong,
		passed
	};
	const mid = {
		...state,
		rankId,
		consecutiveWins,
		consecutiveFails,
		totalMissionsPassed: state.totalMissionsPassed + (passed ? 1 : 0),
		prizeCycle: prizeReady ? 10 : prizeCycle,
		prizesEarned,
		facts,
		missions: [mission, ...state.missions].slice(0, 60),
		days: {
			...state.days,
			[day]: {
				answered: dayPrev.answered + record.correct + record.wrong,
				correct: dayPrev.correct + record.correct,
				missions: dayPrev.missions + (passed ? 1 : 0)
			}
		}
	};
	const progressed = applyRunProgress(mid, {
		passed,
		correct: record.correct,
		wrong: record.wrong,
		bestCombo: record.bestCombo ?? 0,
		elapsedMs: record.elapsedMs,
		timeLimitMs: record.timeLimitMs,
		planetIndex: record.planetIndex ?? state.selectedPlanet
	});
	const prizeJustReady = prizeReady && state.prizeCycle < 10;
	const newAlerts = collectParentAlerts({
		prev: state,
		next: progressed.state,
		prizeJustReady
	});
	const parentAlerts = [...newAlerts, ...progressed.state.parentAlerts ?? []].slice(0, 40);
	const prevCorrect = state.days[day]?.correct ?? 0;
	const nextCorrect = progressed.state.days[day]?.correct ?? 0;
	const dailyJustDone = prevCorrect < 15 && nextCorrect >= 15;
	return {
		state: {
			...progressed.state,
			parentAlerts
		},
		promotedTo,
		demotedTo,
		prizeReady,
		progress: progressed.delta,
		newAlerts,
		dailyJustDone
	};
}
function claimPrize(state) {
	if (state.prizeCycle < 10) return state;
	return {
		...state,
		prizeCycle: 0,
		prizesClaimed: state.prizesClaimed + 1
	};
}
function weakestFacts(state, limit = 8) {
	return Object.entries(state.facts).map(([key, stat]) => {
		const [a, b] = key.split("x").map(Number);
		return {
			fact: {
				a,
				b
			},
			stat,
			accuracy: stat.attempts ? stat.correct / stat.attempts : 0,
			avgMs: stat.attempts ? stat.totalMs / stat.attempts : 0
		};
	}).filter((row) => row.stat.attempts >= 2).sort((a, b) => a.accuracy - b.accuracy || b.avgMs - a.avgMs).slice(0, limit);
}
function currentStreak(state) {
	let streak = 0;
	const start = /* @__PURE__ */ new Date();
	for (let i = 0; i < 60; i += 1) {
		const d = new Date(start);
		d.setDate(start.getDate() - i);
		const key = todayKey(d);
		const day = state.days[key];
		if (day && day.correct >= 15) {
			streak += 1;
			continue;
		}
		if (i === 0) continue;
		break;
	}
	return streak;
}
var ctx = null;
var master = null;
var enabled = true;
function getCtx() {
	if (typeof window === "undefined") return null;
	if (!ctx) {
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return null;
		ctx = new AC({ latencyHint: "interactive" });
		master = ctx.createGain();
		master.gain.value = .7;
		master.connect(ctx.destination);
	}
	return ctx;
}
function unlockAudio() {
	const audio = getCtx();
	if (!audio) return;
	if (audio.state === "suspended") audio.resume();
}
function setSoundEnabled(on) {
	enabled = on;
}
function tone(freq, when, duration, type = "triangle", volume = .08) {
	if (!enabled) return;
	const audio = getCtx();
	if (!audio || !master) return;
	const osc = audio.createOscillator();
	const gain = audio.createGain();
	osc.type = type;
	osc.frequency.setValueAtTime(freq, when);
	gain.gain.setValueAtTime(Math.max(1e-4, volume), when);
	gain.gain.exponentialRampToValueAtTime(1e-4, when + duration);
	osc.connect(gain);
	gain.connect(master);
	osc.start(when);
	osc.stop(when + duration + .02);
	osc.onended = () => {
		osc.disconnect();
		gain.disconnect();
	};
}
function playTap() {
	const audio = getCtx();
	if (!audio) return;
	tone(760, audio.currentTime, .04, "square", .03);
}
function playCorrect() {
	const audio = getCtx();
	if (!audio) return;
	const t = audio.currentTime;
	tone(523.25, t, .07, "triangle", .07);
	tone(659.25, t + .06, .1, "triangle", .08);
}
function playWrong() {
	const audio = getCtx();
	if (!audio) return;
	const t = audio.currentTime;
	tone(196, t, .16, "sine", .07);
	tone(155, t + .05, .14, "sine", .05);
}
function playWin() {
	const audio = getCtx();
	if (!audio) return;
	const t = audio.currentTime;
	[
		523.25,
		659.25,
		783.99,
		1046.5
	].forEach((freq, i) => {
		tone(freq, t + i * .09, .18, "triangle", .09);
	});
}
function playFail() {
	const audio = getCtx();
	if (!audio) return;
	const t = audio.currentTime;
	tone(246.94, t, .18, "sine", .06);
	tone(196, t + .14, .22, "sine", .06);
}
function playPromote() {
	const audio = getCtx();
	if (!audio) return;
	const t = audio.currentTime;
	[
		392,
		523.25,
		659.25,
		783.99,
		1046.5
	].forEach((freq, i) => {
		tone(freq, t + i * .08, .2, "triangle", .08);
	});
}
function wireAudioUnlock() {
	if (typeof window === "undefined") return;
	const resume = () => unlockAudio();
	window.addEventListener("pointerdown", resume, { once: true });
	window.addEventListener("keydown", resume, { once: true });
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") unlockAudio();
	});
}
function notificationPermission() {
	if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
	return Notification.permission;
}
async function enableDeviceNotify() {
	if (typeof window === "undefined" || typeof Notification === "undefined") return false;
	if (Notification.permission === "granted") return true;
	if (Notification.permission === "denied") return false;
	return await Notification.requestPermission() === "granted";
}
function fireParentNotify(alert) {
	if (typeof window === "undefined" || typeof Notification === "undefined") return;
	if (Notification.permission !== "granted") return;
	try {
		const note = new Notification(alert.title, {
			body: alert.body,
			tag: alert.kind,
			lang: "pt-BR",
			silent: false
		});
		note.onclick = () => {
			window.focus();
			note.close();
			window.location.assign("/pais");
		};
	} catch {}
}
function pickState(s) {
	return migrateState({
		version: 2,
		childName: s.childName,
		rankId: s.rankId,
		consecutiveWins: s.consecutiveWins,
		consecutiveFails: s.consecutiveFails,
		totalMissionsPassed: s.totalMissionsPassed,
		prizeCycle: s.prizeCycle,
		prizesEarned: s.prizesEarned,
		prizesClaimed: s.prizesClaimed,
		facts: s.facts,
		missions: s.missions,
		days: s.days,
		sound: s.sound,
		onboarded: s.onboarded,
		level: s.level,
		xp: s.xp,
		selectedPlanet: s.selectedPlanet,
		furthestPlanet: s.furthestPlanet,
		planetStars: s.planetStars,
		planetBestMs: s.planetBestMs,
		bestCombo: s.bestCombo,
		extraTimeSec: s.extraTimeSec,
		parentAlerts: s.parentAlerts,
		notifyParents: s.notifyParents,
		prizeName: s.prizeName
	});
}
function readLocal() {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		const state = parsed && typeof parsed === "object" && "childName" in parsed ? parsed : parsed.state;
		if (!state) return null;
		return migrateState(state);
	} catch {
		return null;
	}
}
function writeLocal(state) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {}
}
var usePlayer = create()((set, get) => ({
	...emptyState(),
	hydrated: false,
	setChildName: (childName) => {
		set({ childName });
		writeLocal(pickState(get()));
	},
	setPrizeName: (prizeName) => {
		set({ prizeName: prizeName.slice(0, 40) });
		writeLocal(pickState(get()));
	},
	setRank: (rankId) => {
		const planet = firstPlanetForRank(rankId);
		set({
			rankId,
			selectedPlanet: planet,
			furthestPlanet: Math.max(get().furthestPlanet, planet),
			consecutiveWins: 0,
			consecutiveFails: 0
		});
		writeLocal(pickState(get()));
	},
	setPlanet: (index) => {
		const furthest = get().furthestPlanet;
		set({ selectedPlanet: Math.max(0, Math.min(furthest, index)) });
		writeLocal(pickState(get()));
	},
	setSound: (sound) => {
		setSoundEnabled(sound);
		set({ sound });
		writeLocal(pickState(get()));
	},
	setExtraTime: (sec) => {
		set({ extraTimeSec: EXTRA_TIME_OPTIONS.includes(sec) ? sec : 15 });
		writeLocal(pickState(get()));
	},
	setNotifyParents: (notifyParents) => {
		set({ notifyParents });
		writeLocal(pickState(get()));
	},
	markAlertsRead: () => {
		set({ parentAlerts: (get().parentAlerts ?? []).map((a) => ({
			...a,
			read: true
		})) });
		writeLocal(pickState(get()));
	},
	finishOnboarding: (name) => {
		set({
			childName: name.trim(),
			onboarded: true
		});
		writeLocal(pickState(get()));
	},
	applyMission: (input) => {
		const result = applyMissionResult(pickState(get()), input);
		set({ ...result.state });
		writeLocal(result.state);
		if (result.state.notifyParents && result.newAlerts.length > 0) fireParentNotify(result.newAlerts[0]);
		return result;
	},
	claimPrize: () => {
		const next = claimPrize(pickState(get()));
		set({ ...next });
		writeLocal(next);
	},
	replaceState: (state) => {
		const next = migrateState(state);
		set({
			...next,
			hydrated: true
		});
		writeLocal(next);
	},
	snapshot: () => pickState(get())
}));
function hydratePlayer() {
	const local = readLocal();
	const current = usePlayer.getState();
	if (current.hydrated && current.onboarded && current.totalMissionsPassed >= (local?.totalMissionsPassed ?? 0)) return;
	if (local) {
		setSoundEnabled(local.sound);
		usePlayer.setState({
			...local,
			hydrated: true
		});
	} else if (!current.hydrated) usePlayer.setState({ hydrated: true });
}
if (typeof window !== "undefined") hydratePlayer();
function CloudSync() {
	const { user, isPending } = useCurrentUserState();
	const hydrated = usePlayer((s) => s.hydrated);
	const pushed = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		wireAudioUnlock();
		hydratePlayer();
		const t = window.setTimeout(() => {
			if (!usePlayer.getState().hydrated) usePlayer.setState({ hydrated: true });
		}, 200);
		return () => window.clearTimeout(t);
	}, []);
	(0, import_react.useEffect)(() => {
		if (hydrated) setSoundEnabled(usePlayer.getState().sound);
	}, [hydrated]);
	(0, import_react.useEffect)(() => {
		if (isPending || !user || !hydrated || pushed.current) return;
		pushed.current = true;
		const local = usePlayer.getState().snapshot();
		loadProgress().then(async (remote) => {
			if (remote && (remote.totalMissionsPassed > local.totalMissionsPassed || remote.totalMissionsPassed === local.totalMissionsPassed && remote.onboarded && !local.onboarded)) {
				usePlayer.getState().replaceState(remote);
				return;
			}
			if (local.onboarded || local.totalMissionsPassed > 0 || local.childName) await saveProgress({ data: local });
		}).catch(() => {
			pushed.current = false;
		});
	}, [
		user,
		isPending,
		hydrated
	]);
	return null;
}
function persistCloud() {
	saveProgress({ data: usePlayer.getState().snapshot() }).catch(() => void 0);
}
var styles_default = "/assets/styles-BXs6zazc.css";
var APP_NAME = "Missão Tabuada";
var Route$5 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: "Jogo de tabuada: 12 planetas, níveis, naves e um prêmio a cada dez missões."
			},
			{
				name: "theme-color",
				content: "#F4EFE6"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=IBM+Plex+Mono:wght@500&family=Lexend:wght@400;500;600;700&display=swap"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "pt-BR",
		suppressHydrationWarning: true,
		className: "antialiased",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AuthProvider, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloudSync, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	})
});
var $$splitComponentImporter$3 = () => import("./routes-DVyYqOyx.mjs");
var Route$4 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./login-BnzhwHUC.mjs");
var Route$3 = createFileRoute("/login")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./pais-DNjStbWB.mjs");
var Route$2 = createFileRoute("/pais")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./play-DF-SELTB.mjs");
var Route$1 = createFileRoute("/play")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var Route = createFileRoute("/api/auth/$")({ server: { handlers: {
	GET: ({ request }) => auth.handler(request),
	POST: ({ request }) => auth.handler(request)
} } });
var rootRouteChildren = {
	IndexRoute: Route$4.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$5
	}),
	LoginRoute: Route$3.update({
		id: "/login",
		path: "/login",
		getParentRoute: () => Route$5
	}),
	PaisRoute: Route$2.update({
		id: "/pais",
		path: "/pais",
		getParentRoute: () => Route$5
	}),
	PlayRoute: Route$1.update({
		id: "/play",
		path: "/play",
		getParentRoute: () => Route$5
	}),
	ApiAuthSplatRoute: Route.update({
		id: "/api/auth/$",
		path: "/api/auth/$",
		getParentRoute: () => Route$5
	})
};
var routeTree = Route$5._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { loadProgress as C, timeWithBoost as S, useCurrentUserState as T, recycleMiss as _, fireParentNotify as a, RANKS as b, playFail as c, playWin as d, playWrong as f, pickMissionFacts as g, drawNext as h, enableDeviceNotify as i, playPromote as l, currentStreak as m, persistCloud as n, notificationPermission as o, unlockAudio as p, usePlayer as r, playCorrect as s, router_exports as t, playTap as u, weakestFacts as v, useCurrentUser as w, rankById as x, unreadAlerts as y };
