import { o as __toESM } from "../_runtime.mjs";
import { B as require_react, _ as Link, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { _ as shipForLevel, f as formatClock, g as planetAt, n as PLANETS, s as displayName, v as todayKey } from "./progress-CTrhxREx.mjs";
import { n as Card, r as cn, t as Button } from "./card-ihLnJYyv.mjs";
import { t as Mascot } from "./mascot-BcROqonC.mjs";
import { a as Rocket, l as Clock, n as Trophy, o as Lock, u as Check } from "../_libs/lucide-react.mjs";
import { S as timeWithBoost, m as currentStreak, n as persistCloud, p as unlockAudio, r as usePlayer, x as rankById, y as unreadAlerts } from "./router-DSOyIJNs.mjs";
import { a as missionsToPrize, c as todayDone, i as dayMet, l as weekStrip, n as Badge, o as nicoCheer, r as Input, s as prizeLabel, t as AppShell } from "./input-BTiXZO5m.mjs";
import { t as Progress } from "./progress-Ch61xvnJ.mjs";
import { t as StarRow } from "./star-row-CMZ6pwJF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DVyYqOyx.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function GalaxyMap({ selected, furthest, stars, bestMs, onSelect }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "relative",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "galaxy-scroll flex gap-3 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory",
			children: PLANETS.map((planet, index) => {
				const locked = index > furthest;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					disabled: locked,
					onClick: () => onSelect(index),
					className: cn("snap-center shrink-0 w-36 rounded-xl border bg-surface p-3 text-left transition-transform duration-(--motion-fast) ease-(--ease-out)", index === selected ? "border-accent shadow-soft" : "border-line", locked && "opacity-55"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: planet.art,
								alt: "",
								className: "aspect-square w-full rounded-lg object-cover",
								draggable: false
							}), locked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "absolute inset-0 flex items-center justify-center rounded-lg bg-ink/25",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, {
									className: "size-6 text-surface",
									strokeWidth: 2
								})
							}) : null]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 font-display text-sm leading-tight",
							children: planet.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-0.5 text-xs text-muted",
							children: [
								index + 1,
								"/",
								PLANETS.length
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StarRow, {
								value: stars[index] ?? 0,
								size: "sm"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs tabular-nums text-muted",
							children: (bestMs[index] ?? 0) > 0 ? formatClock(bestMs[index]) : "—"
						})
					]
				}, planet.id);
			})
		})
	});
}
function WeekStrip({ days }) {
	const week = weekStrip();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-7 gap-1.5",
		"aria-label": "Semana de treino",
		children: week.map((day) => {
			const met = dayMet(days[day.key]);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: cn("text-xs", day.isToday ? "font-medium text-ink" : "text-faint"),
					children: day.label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("mx-auto mt-1 size-7 rounded-full border", met ? "border-accent bg-accent" : day.isToday ? "border-accent/40 bg-wash" : "border-line bg-surface") })]
			}, day.key);
		})
	});
}
function HomeDashboard() {
	const player = usePlayer();
	const setPlanet = usePlayer((s) => s.setPlanet);
	const planet = planetAt(player.selectedPlanet);
	const rank = rankById(planet.rankId);
	const ship = shipForLevel(player.level);
	const today = player.days[todayKey()] ?? {
		answered: 0,
		correct: 0,
		missions: 0
	};
	const streak = currentStreak(player);
	const doneToday = todayDone(player);
	const prizeReady = player.prizeCycle >= 10;
	const limitMs = timeWithBoost(rank, player.consecutiveFails, (player.extraTimeSec ?? 15) * 1e3);
	const name = displayName(player);
	const unread = unreadAlerts(player).length;
	const cheer = nicoCheer(player);
	const left = missionsToPrize(player);
	const prize = prizeLabel(player.prizeName);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		compact: true,
		right: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/pais",
			className: "text-sm font-medium text-muted no-underline hover:text-ink",
			children: ["Pais", unread > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-accent-fg",
				children: unread
			}) : null]
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "anim-rise space-y-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-end justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm font-medium text-muted",
							children: ["Olá, ", name]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-1 font-display text-title",
							children: "Rota das Estrelas"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									className: "border-accent/20 bg-wash text-accent",
									children: ["Nível ", player.level]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: rank.name }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, {
									className: "mr-1 size-3.5",
									strokeWidth: 2
								}), formatClock(limitMs)] }),
								streak > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, { children: [
									streak,
									" dia",
									streak > 1 ? "s" : "",
									" seguido",
									streak > 1 ? "s" : ""
								] }) : null
							]
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: ship.art,
						alt: ship.name,
						className: "hidden h-28 w-28 object-contain sm:block",
						draggable: false
					})]
				}),
				prizeReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "border-accent/30 bg-wash",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-display text-lg",
							children: [
								"Hora de ",
								prize,
								"."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: "Dez missões no bolso. Chame quem prometeu."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/pais",
							className: "mt-3 inline-flex",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, { children: "Abrir o espaço dos pais" })
						})
					]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: doneToday ? "border-accent/30 bg-wash p-5" : "p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mascot, {
									mood: cheer.mood,
									className: "h-16 w-16 shrink-0 sm:h-20 sm:w-20"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm font-medium text-muted",
											children: "Missão de hoje"
										}),
										doneToday ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 font-display text-2xl",
											children: "Feito."
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 font-display text-2xl",
											children: "Uma decolagem"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-sm text-muted",
											children: cheer.text
										})
									]
								}),
								doneToday ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, {
										className: "size-5",
										strokeWidth: 2.5
									})
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "shrink-0 font-display text-3xl tabular-nums",
									children: [Math.min(today.correct, 15), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-xl text-muted",
										children: ["/", 15]
									})]
								})
							]
						}),
						doneToday ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
							className: "mt-4",
							value: today.correct,
							max: 15
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WeekStrip, { days: player.days })
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/play",
					className: "block no-underline",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "xl",
						variant: doneToday ? "secondary" : "primary",
						className: "w-full gap-3 rounded-2xl text-xl",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rocket, {
							className: "size-6",
							strokeWidth: 2
						}), doneToday ? "Jogar mais um pouco" : `Missão de hoje · ${planet.name}`]
					})
				}),
				doneToday ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-center text-sm text-muted",
					children: "Pode encerrar. Até amanhã."
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-2 flex items-end justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-lg",
						children: "Mapa da frota"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: planet.blurb
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm tabular-nums text-muted",
						children: [
							player.selectedPlanet + 1,
							"/",
							PLANETS.length
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GalaxyMap, {
					selected: player.selectedPlanet,
					furthest: player.furthestPlanet,
					stars: player.planetStars,
					bestMs: player.planetBestMs ?? [],
					onSelect: setPlanet
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-lg",
						children: prizeReady ? `Prêmio: ${prize}` : `Faltam ${left} para ${prize}`
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-sm tabular-nums text-muted",
						children: [
							Math.min(player.prizeCycle, 10),
							"/",
							10
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-10 gap-1.5",
					children: Array.from({ length: 10 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: i < player.prizeCycle ? "flex aspect-square items-center justify-center rounded-sm border border-accent bg-accent text-accent-fg" : "flex aspect-square items-center justify-center rounded-sm border border-line bg-surface text-faint",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, {
							className: "size-3.5",
							strokeWidth: 2
						})
					}, i))
				})] })
			]
		})
	});
}
function Onboarding() {
	const finish = usePlayer((s) => s.finishOnboarding);
	const [step, setStep] = (0, import_react.useState)(0);
	const [name, setName] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex max-w-md flex-col items-center text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mascot, { className: "h-52 w-52" }), step === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "anim-rise mt-2 space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium uppercase tracking-[0.14em] text-muted",
					children: "Academia de voo"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-title",
					children: "Olá, cadete."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: "Eu sou o Nico. Um pouquinho por dia: uma missão, quinze acertos, uns três minutos. Doze planetas, tabuadas do 2 ao 9, e a cada dia a sequência cresce."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "lg",
					className: "mt-2 w-full",
					onClick: () => {
						unlockAudio();
						setStep(1);
					},
					children: "Quero entrar na missão"
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "anim-rise mt-2 w-full space-y-4",
			onSubmit: (e) => {
				e.preventDefault();
				unlockAudio();
				finish(name || "Cadete");
				persistCloud();
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-title",
					children: "Como te chamamos?"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: "Pode ser só o primeiro nome."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					autoFocus: true,
					value: name,
					onChange: (e) => setName(e.target.value),
					placeholder: "Seu nome",
					maxLength: 24,
					"aria-label": "Nome do cadete"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "lg",
					className: "w-full",
					type: "submit",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rocket, {
						className: "size-5",
						strokeWidth: 2
					}), "Começar"]
				})
			]
		})]
	});
}
function Skeleton({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("animate-pulse rounded-md bg-line", className) });
}
function Home() {
	const hydrated = usePlayer((s) => s.hydrated);
	const onboarded = usePlayer((s) => s.onboarded);
	if (!hydrated) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-8 w-40" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-12 w-64" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-32 w-full rounded-xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 w-full rounded-xl" })
		]
	}) });
	if (!onboarded) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "paper-grid min-h-dvh px-4 py-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Onboarding, {})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomeDashboard, {});
}
//#endregion
export { Home as component };
