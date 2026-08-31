import { o as __toESM } from "../_runtime.mjs";
import { B as require_react, _ as Link, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as displayName, v as todayKey } from "./progress-CTrhxREx.mjs";
import { r as cn } from "./card-ihLnJYyv.mjs";
import { m as currentStreak } from "./router-DSOyIJNs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/input-BTiXZO5m.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AppShell({ children, right, compact }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "paper-grid min-h-dvh",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-10 safe-top sm:px-6", compact && "max-w-5xl"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6 flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "font-display text-lg tracking-tight text-ink no-underline",
					children: "Missão Tabuada"
				}), right]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1",
				children
			})]
		})
	});
}
var WEEK_LABELS = [
	"S",
	"T",
	"Q",
	"Q",
	"S",
	"S",
	"D"
];
function weekStrip(now = /* @__PURE__ */ new Date()) {
	const today = todayKey(now);
	const [year, month, day] = today.split("-").map(Number);
	const noonUtc = Date.UTC(year, month - 1, day, 15);
	const dow = new Date(noonUtc).getUTCDay();
	const mondayShift = dow === 0 ? -6 : 1 - dow;
	return WEEK_LABELS.map((label, i) => {
		const ms = noonUtc + (mondayShift + i) * 864e5;
		const key = new Date(ms).toISOString().slice(0, 10);
		return {
			key,
			label,
			isToday: key === today
		};
	});
}
function dayMet(day) {
	return (day?.correct ?? 0) >= 15;
}
function todayDone(state, now = /* @__PURE__ */ new Date()) {
	return dayMet(state.days[todayKey(now)]);
}
function Badge({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium tracking-wide text-muted", className),
		...props
	});
}
function prizeLabel(name) {
	const t = (name ?? "").trim();
	return t.length > 0 ? t : "o prêmio combinado";
}
function missionsToPrize(state) {
	return Math.max(0, 10 - state.prizeCycle);
}
function nicoCheer(state) {
	const name = displayName(state);
	const left = missionsToPrize(state);
	const prize = prizeLabel(state.prizeName);
	const streak = currentStreak(state);
	const done = todayDone(state);
	if (state.prizeCycle >= 10) return {
		mood: "win",
		text: `${name}, dez missões. Hora de receber ${prize}.`
	};
	if (done && streak >= 5) return {
		mood: "win",
		text: `${streak} dias seguidos. Isso já é hábito. Pode parar.`
	};
	if (done) return {
		mood: "win",
		text: left === 1 ? `Hoje está feito. Falta uma missão para ${prize}.` : `Hoje está feito. Faltam ${left} para ${prize}.`
	};
	if (left === 1) return {
		mood: "idle",
		text: `Uma missão hoje e ${prize} chega.`
	};
	if (streak >= 2) return {
		mood: "idle",
		text: `A sequência está em ${streak} dias. Uma decolagem e o dia está pago.`
	};
	return {
		mood: "idle",
		text: `Quinze acertos, uns três minutos. Faltam ${left} missões para ${prize}.`
	};
}
var Input = (0, import_react.forwardRef)(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
	ref,
	className: cn("h-12 w-full rounded-md border border-line bg-surface px-4 text-base text-ink placeholder:text-faint", className),
	...props
}));
Input.displayName = "Input";
//#endregion
export { missionsToPrize as a, todayDone as c, dayMet as i, weekStrip as l, Badge as n, nicoCheer as o, Input as r, prizeLabel as s, AppShell as t };
