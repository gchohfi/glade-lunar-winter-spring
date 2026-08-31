import { o as __toESM } from "../_runtime.mjs";
import { B as require_react, _ as Link, b as require_jsx_runtime, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { _ as shipForLevel, f as formatClock, g as planetAt, u as factKey, y as xpToNext } from "./progress-CTrhxREx.mjs";
import { n as Card, r as cn, t as Button } from "./card-ihLnJYyv.mjs";
import { c as CornerDownLeft, l as Clock, s as Delete, t as X } from "../_libs/lucide-react.mjs";
import { S as timeWithBoost, _ as recycleMiss, c as playFail, d as playWin, f as playWrong, g as pickMissionFacts, h as drawNext, l as playPromote, n as persistCloud, p as unlockAudio, r as usePlayer, s as playCorrect, u as playTap, x as rankById } from "./router-DSOyIJNs.mjs";
import { t as Progress } from "./progress-Ch61xvnJ.mjs";
import { t as StarRow } from "./star-row-CMZ6pwJF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/play-DF-SELTB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KEYS = [
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"back",
	"0",
	"ok"
];
function NumberPad({ onDigit, onBack, onSubmit, disabled }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-3 gap-2",
		children: KEYS.map((key) => {
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled,
				onPointerDown: (e) => e.preventDefault(),
				onClick: () => {
					if (key === "back") onBack();
					else if (key === "ok") onSubmit();
					else onDigit(key);
				},
				className: cn("flex h-16 items-center justify-center rounded-md border text-2xl font-display transition-[transform,background-color] duration-150 ease-out touch-manipulation active:not-disabled:scale-[0.96] disabled:opacity-40", key === "back" || key === "ok" ? "border-line bg-wash text-ink" : "border-line bg-surface text-ink hover:bg-wash", key === "ok" && "bg-accent text-accent-fg hover:bg-accent"),
				"aria-label": key === "back" ? "Apagar" : key === "ok" ? "Confirmar" : key,
				children: key === "back" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Delete, {
					className: "size-6",
					strokeWidth: 2
				}) : key === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CornerDownLeft, {
					className: "size-6",
					strokeWidth: 2
				}) : key
			}, key);
		})
	});
}
function FlightTrack({ correct, combo, shipArt, planetArt }) {
	const pct = Math.min(1, correct / 15);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative mt-4 h-14",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-x-12 top-7 h-1 rounded-full bg-line" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute top-7 left-12 h-1 rounded-full bg-accent transition-[width] duration-200",
				style: { width: `calc((100% - 6rem) * ${pct})` }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: shipArt,
				alt: "",
				className: "pointer-events-none absolute top-1 h-11 w-11 -translate-x-1/2 rounded-full bg-bg object-cover shadow-soft transition-[left] duration-300",
				style: { left: `calc(3rem + (100% - 6rem) * ${pct})` },
				draggable: false
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: planetArt,
				alt: "",
				className: "pointer-events-none absolute right-0 top-0.5 h-12 w-12 rounded-full object-cover shadow-soft",
				draggable: false
			}),
			combo >= 2 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "absolute -top-1 left-1/2 -translate-x-1/2 rounded-full border border-accent/20 bg-wash px-2 py-0.5 font-display text-xs text-accent",
				children: ["Combo ×", combo]
			}) : null
		]
	});
}
function MissionPlay() {
	const navigate = useNavigate();
	const snapshot = usePlayer((s) => s.snapshot);
	const applyMission = usePlayer((s) => s.applyMission);
	const consecutiveFails = usePlayer((s) => s.consecutiveFails);
	const selectedPlanet = usePlayer((s) => s.selectedPlanet);
	const setPlanet = usePlayer((s) => s.setPlanet);
	const level = usePlayer((s) => s.level);
	const xp = usePlayer((s) => s.xp);
	const extraTimeSec = usePlayer((s) => s.extraTimeSec);
	const planetBestMs = usePlayer((s) => s.planetBestMs);
	const planet = planetAt(selectedPlanet);
	const rank = rankById(planet.rankId);
	const ship = shipForLevel(level);
	const defaultLimit = timeWithBoost(rank, consecutiveFails, extraTimeSec * 1e3);
	const [phase, setPhase] = (0, import_react.useState)("ready");
	const [flash, setFlash] = (0, import_react.useState)("none");
	const [flashKey, setFlashKey] = (0, import_react.useState)(0);
	const [typed, setTyped] = (0, import_react.useState)("");
	const [correct, setCorrect] = (0, import_react.useState)(0);
	const [wrong, setWrong] = (0, import_react.useState)(0);
	const [combo, setCombo] = (0, import_react.useState)(0);
	const [remaining, setRemaining] = (0, import_react.useState)(defaultLimit);
	const [runLimit, setRunLimit] = (0, import_react.useState)(defaultLimit);
	const [fact, setFact] = (0, import_react.useState)({
		a: 3,
		b: 4
	});
	const [reveal, setReveal] = (0, import_react.useState)(null);
	const [prizeReady, setPrizeReady] = (0, import_react.useState)(false);
	const [elapsed, setElapsed] = (0, import_react.useState)(0);
	const [delta, setDelta] = (0, import_react.useState)(null);
	const [dailyJustDone, setDailyJustDone] = (0, import_react.useState)(false);
	const queueRef = (0, import_react.useRef)([]);
	const startedAtRef = (0, import_react.useRef)(0);
	const qStartRef = (0, import_react.useRef)(0);
	const limitRef = (0, import_react.useRef)(defaultLimit);
	const triedRef = (0, import_react.useRef)([]);
	const endedRef = (0, import_react.useRef)(false);
	const factRef = (0, import_react.useRef)(fact);
	const typedRef = (0, import_react.useRef)("");
	const correctRef = (0, import_react.useRef)(0);
	const wrongRef = (0, import_react.useRef)(0);
	const comboRef = (0, import_react.useRef)(0);
	const bestComboRef = (0, import_react.useRef)(0);
	const revealRef = (0, import_react.useRef)(null);
	const phaseRef = (0, import_react.useRef)(phase);
	const revealTimer = (0, import_react.useRef)(null);
	const winningRef = (0, import_react.useRef)(false);
	factRef.current = fact;
	typedRef.current = typed;
	correctRef.current = correct;
	wrongRef.current = wrong;
	comboRef.current = combo;
	revealRef.current = reveal;
	phaseRef.current = phase;
	const finish = (0, import_react.useCallback)((passed) => {
		if (endedRef.current) return;
		endedRef.current = true;
		const finishedAt = Date.now();
		const cap = limitRef.current;
		const elapsedMs = Math.min(cap, finishedAt - startedAtRef.current);
		const state = snapshot();
		const p = planetAt(state.selectedPlanet);
		const result = applyMission({
			mode: "multiplication",
			rankId: p.rankId,
			startedAt: startedAtRef.current,
			finishedAt,
			elapsedMs,
			timeLimitMs: cap,
			correct: correctRef.current,
			wrong: wrongRef.current,
			passed,
			factsTried: triedRef.current,
			bestCombo: bestComboRef.current,
			planetIndex: state.selectedPlanet
		});
		setElapsed(elapsedMs);
		setPrizeReady(result.prizeReady);
		setDelta(result.progress);
		setDailyJustDone(result.dailyJustDone);
		setPhase(passed ? "won" : "lost");
		if (passed) {
			if (result.progress.leveledTo || result.progress.unlockedPlanet !== null) playPromote();
			else playWin();
		} else playFail();
		persistCloud();
	}, [applyMission, snapshot]);
	const finishRef = (0, import_react.useRef)(finish);
	finishRef.current = finish;
	(0, import_react.useEffect)(() => {
		if (phase !== "running") return;
		const t0 = performance.now();
		let raf = 0;
		const tick = (now) => {
			const left = Math.max(0, limitRef.current - (now - t0));
			setRemaining(left);
			if (left <= 0) {
				if (!winningRef.current) finishRef.current(false);
				return;
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [phase, runLimit]);
	const begin = () => {
		unlockAudio();
		winningRef.current = false;
		endedRef.current = false;
		triedRef.current = [];
		comboRef.current = 0;
		bestComboRef.current = 0;
		const state = snapshot();
		const p = planetAt(state.selectedPlanet);
		const r = rankById(p.rankId);
		const missionLimit = timeWithBoost(r, state.consecutiveFails, state.extraTimeSec * 1e3);
		limitRef.current = missionLimit;
		setRunLimit(missionLimit);
		const deck = pickMissionFacts({
			...state,
			rankId: p.rankId
		});
		const first = deck[0] ?? {
			a: 3,
			b: 4
		};
		queueRef.current = deck.slice(1);
		factRef.current = first;
		correctRef.current = 0;
		wrongRef.current = 0;
		setFact(first);
		setTyped("");
		setCorrect(0);
		setWrong(0);
		setCombo(0);
		setReveal(null);
		setRemaining(missionLimit);
		setPrizeReady(false);
		setDelta(null);
		setDailyJustDone(false);
		startedAtRef.current = Date.now();
		qStartRef.current = performance.now();
		setPhase("running");
	};
	const record = (ok) => {
		const ms = performance.now() - qStartRef.current;
		triedRef.current.push({
			fact: factRef.current,
			ok,
			ms
		});
	};
	const goNext = (ok, missed) => {
		qStartRef.current = performance.now();
		setTyped("");
		typedRef.current = "";
		setReveal(null);
		setFlash("none");
		if (!ok && missed) queueRef.current = recycleMiss(queueRef.current, missed);
		if (queueRef.current.length < 2) {
			const extra = pickMissionFacts({
				...snapshot(),
				rankId: planetAt(snapshot().selectedPlanet).rankId
			}).filter((f) => factKey(f) !== factKey(factRef.current));
			queueRef.current = [...queueRef.current, ...extra];
		}
		const drawn = drawNext(queueRef.current, factRef.current);
		queueRef.current = drawn.queue;
		factRef.current = drawn.fact;
		setFact(drawn.fact);
	};
	const submit = (raw) => {
		if (phaseRef.current !== "running" || revealRef.current !== null) return;
		const value = (raw ?? typedRef.current).trim();
		if (!value) return;
		const guess = Number(value);
		if (!Number.isFinite(guess)) return;
		const current = factRef.current;
		const answer = current.a * current.b;
		if (guess === answer) {
			record(true);
			playCorrect();
			setFlash("ok");
			setFlashKey((k) => k + 1);
			correctRef.current += 1;
			comboRef.current += 1;
			bestComboRef.current = Math.max(bestComboRef.current, comboRef.current);
			setCorrect(correctRef.current);
			setCombo(comboRef.current);
			if (correctRef.current >= 15) {
				winningRef.current = true;
				window.setTimeout(() => finishRef.current(true), 320);
			} else window.setTimeout(() => goNext(true), 220);
		} else {
			record(false);
			playWrong();
			wrongRef.current += 1;
			comboRef.current = 0;
			setWrong(wrongRef.current);
			setCombo(0);
			setFlash("bad");
			setFlashKey((k) => k + 1);
			setReveal(answer);
			if (revealTimer.current) window.clearTimeout(revealTimer.current);
			revealTimer.current = window.setTimeout(() => goNext(false, current), 900);
		}
	};
	const onDigit = (d) => {
		if (phaseRef.current !== "running" || revealRef.current !== null) return;
		playTap();
		setTyped((prev) => {
			if (prev.length >= 3) return prev;
			const next = prev + d;
			typedRef.current = next;
			if (Number(next) === factRef.current.a * factRef.current.b) window.setTimeout(() => submit(next), 40);
			return next;
		});
	};
	const onBack = () => {
		if (phaseRef.current !== "running" || revealRef.current !== null) return;
		setTyped((p) => {
			const next = p.slice(0, -1);
			typedRef.current = next;
			return next;
		});
	};
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if (phaseRef.current === "ready" && (e.key === "Enter" || e.key === " ")) {
				e.preventDefault();
				begin();
				return;
			}
			if (phaseRef.current !== "running") return;
			if (e.key >= "0" && e.key <= "9") {
				e.preventDefault();
				onDigit(e.key);
			} else if (e.key === "Backspace") {
				e.preventDefault();
				onBack();
			} else if (e.key === "Enter") {
				e.preventDefault();
				submit();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});
	const urgent = remaining < 1e4;
	const ratio = remaining / runLimit;
	const elapsedLive = Math.max(0, runLimit - remaining);
	const bestHere = planetBestMs[selectedPlanet] ?? 0;
	if (phase === "ready") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "paper-grid flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: planet.art,
				alt: "",
				className: "h-40 w-40 rounded-full object-cover shadow-soft",
				draggable: false
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 text-sm font-medium uppercase tracking-[0.14em] text-muted",
				children: [
					rank.name,
					" · Nível ",
					level
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 font-display text-title",
				children: planet.name
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 max-w-sm text-muted",
				children: [
					planet.blurb,
					" Quinze acertos com ",
					formatClock(defaultLimit),
					" no relógio. Cada acerto empurra a nave."
				]
			}),
			bestHere > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 font-display text-lg tabular-nums",
				children: ["Recorde: ", formatClock(bestHere)]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "xl",
				className: "mt-8 w-full max-w-sm",
				onClick: begin,
				children: "Decolar"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				className: "mt-4 text-sm font-medium text-muted no-underline hover:text-ink",
				children: "Voltar ao mapa"
			})
		]
	});
	if (phase === "won" || phase === "lost") {
		const need = xpToNext(level);
		const nextPlanet = delta?.unlockedPlanet !== null && delta?.unlockedPlanet !== void 0 ? planetAt(delta.unlockedPlanet) : null;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "paper-grid flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: phase === "won" ? ship.art : planet.art,
					alt: "",
					className: "h-36 w-36 object-contain",
					draggable: false
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-title",
					children: phase === "won" ? delta?.leveledTo ? `Nível ${delta.leveledTo}!` : "Planeta conquistado" : "Quase lá"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-sm text-muted",
					children: phase === "won" ? `Quinze acertos em ${formatClock(elapsed)}. +${delta?.xpGained ?? 0} XP.` : `${correct} acerto${correct === 1 ? "" : "s"} com ${formatClock(runLimit)} no relógio. Ainda ganhou +${delta?.xpGained ?? 0} XP.`
				}),
				phase === "won" && dailyJustDone ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-sm font-display text-accent",
					children: "Missão de hoje cumprida. A sequência continua."
				}) : null,
				phase === "won" && delta?.isRecord ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 font-display text-accent",
					children: "Novo recorde de tempo!"
				}) : null,
				phase === "won" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 space-y-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StarRow, { value: delta?.starsEarned ?? 0 }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							delta?.starsEarned ?? 0,
							" estrela",
							(delta?.starsEarned ?? 0) === 1 ? "" : "s",
							" neste planeta"
						]
					})]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "mt-5 w-full max-w-sm p-4 text-left",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm font-medium text-muted",
							children: ["Nível ", level]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
							className: "mt-2",
							value: xp,
							max: need
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-sm tabular-nums text-muted",
							children: [
								xp,
								" / ",
								need,
								" XP"
							]
						}),
						nextPlanet ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 font-display",
							children: ["Novo planeta: ", nextPlanet.name]
						}) : null,
						delta?.newShipName ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 font-display",
							children: ["Nova nave: ", delta.newShipName]
						}) : null
					]
				}),
				prizeReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "mt-4 max-w-sm border-accent/30 bg-wash p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display",
						children: "Dez missões no bolso."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted",
						children: "Chame quem prometeu o prêmio."
					})]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 flex w-full max-w-sm flex-col gap-3",
					children: [
						phase === "lost" || !prizeReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "lg",
							className: "w-full",
							onClick: () => {
								if (delta?.unlockedPlanet != null) setPlanet(delta.unlockedPlanet);
								begin();
							},
							children: nextPlanet ? `Decolar para ${nextPlanet.name}` : phase === "won" ? "De novo neste planeta" : "Tentar de novo"
						}) : null,
						prizeReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "lg",
							className: "w-full",
							onClick: () => navigate({ to: "/pais" }),
							children: "Ir ao espaço dos pais"
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "secondary",
							size: "lg",
							className: "w-full",
							onClick: () => navigate({ to: "/" }),
							children: "Mapa"
						})
					]
				})
			]
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "paper-grid min-h-dvh",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto mission-layout w-full max-w-5xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "safe-top flex flex-col px-4 pb-4 sm:px-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => navigate({ to: "/" }),
								className: "inline-flex size-11 items-center justify-center rounded-md border border-line bg-surface text-muted",
								"aria-label": "Sair da missão",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {
									className: "size-5",
									strokeWidth: 2
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col items-center",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: cn("inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-display text-lg tabular-nums", urgent ? "border-bad/30 bg-bad/10 text-bad" : "border-line bg-surface text-ink"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, {
										className: "size-4",
										strokeWidth: 2
									}), formatClock(remaining)]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 text-xs tabular-nums text-muted",
									children: ["Tempo ", formatClock(elapsedLive)]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "w-11 text-right font-display text-lg tabular-nums",
								children: [
									correct,
									"/",
									15
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlightTrack, {
						correct,
						combo,
						shipArt: ship.art,
						planetArt: planet.art
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 h-1.5 overflow-hidden rounded-full bg-line",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: cn("h-full rounded-full", urgent ? "bg-bad" : "bg-accent"),
							style: { width: `${Math.max(0, ratio * 100)}%` }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-1 flex-col items-center justify-center py-6",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mb-4 text-sm font-medium uppercase tracking-[0.16em] text-muted",
								children: ["Tabuada do ", fact.a]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: cn("font-display text-display tracking-tight tabular-nums", flash === "ok" && "anim-pop text-ok", flash === "bad" && "anim-shake text-bad"),
								children: [
									fact.a,
									" × ",
									fact.b
								]
							}, flashKey),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-8 flex min-h-16 items-center justify-center",
								children: reveal !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "font-display text-3xl text-muted",
									children: ["= ", reveal]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-display text-5xl tabular-nums tracking-tight",
									children: typed || /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-faint",
										children: "?"
									})
								})
							})
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "safe-bottom flex flex-col justify-end bg-surface/80 px-4 pt-4 sm:px-6 lg:border-l lg:border-line",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberPad, {
					onDigit,
					onBack,
					onSubmit: () => submit(),
					disabled: reveal !== null
				})
			})]
		})
	});
}
var SplitComponent = MissionPlay;
//#endregion
export { SplitComponent as component };
