import { o as __toESM } from "../_runtime.mjs";
import { B as require_react, _ as Link, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as signOut } from "./client-B40BzJxt.mjs";
import { f as formatClock, i as TIMEZONE, n as PLANETS, t as EXTRA_TIME_OPTIONS, v as todayKey } from "./progress-CTrhxREx.mjs";
import { n as Card, r as cn, t as Button } from "./card-ihLnJYyv.mjs";
import { d as Bell, f as BellOff } from "../_libs/lucide-react.mjs";
import { C as loadProgress, S as timeWithBoost, T as useCurrentUserState, a as fireParentNotify, b as RANKS, i as enableDeviceNotify, m as currentStreak, n as persistCloud, o as notificationPermission, r as usePlayer, v as weakestFacts, w as useCurrentUser, x as rankById, y as unreadAlerts } from "./router-DSOyIJNs.mjs";
import { a as missionsToPrize, n as Badge, r as Input, s as prizeLabel, t as AppShell } from "./input-BTiXZO5m.mjs";
import { t as Progress } from "./progress-Ch61xvnJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/pais-DNjStbWB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Render children only when a user is present (real session, or the disabled-auth dev user). */
function SignedIn({ children }) {
	const { user } = useCurrentUserState();
	return user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children }) : null;
}
/**
* Render children only once we KNOW the visitor is signed out (`isPending` has
* cleared and there is no user). Hidden while the session is still loading.
*/
function SignedOut({ children }) {
	const { user, isPending } = useCurrentUserState();
	if (isPending || user) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of).
*/
function UserButton() {
	const user = useCurrentUser();
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: signingOut,
				onClick: () => {
					setSigningOut(true);
					signOut().catch(() => setSigningOut(false));
				},
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline",
				children: signingOut ? "Signing out…" : "Sign out"
			})
		]
	});
}
function whenLabel(at) {
	return new Intl.DateTimeFormat("pt-BR", {
		timeZone: TIMEZONE,
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit"
	}).format(new Date(at));
}
function ParentAlerts() {
	const player = usePlayer();
	const setNotifyParents = usePlayer((s) => s.setNotifyParents);
	const markAlertsRead = usePlayer((s) => s.markAlertsRead);
	const unread = unreadAlerts(player);
	const [perm, setPerm] = (0, import_react.useState)(notificationPermission);
	(0, import_react.useEffect)(() => {
		setPerm(notificationPermission());
	}, []);
	const turnOn = async () => {
		const granted = await enableDeviceNotify();
		setPerm(notificationPermission());
		setNotifyParents(true);
		persistCloud();
		if (granted) {}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: unread.length > 0 ? "border-accent/30 bg-wash" : void 0,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg",
					children: "Avisos de nível"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted",
					children: "Você fica sabendo nos níveis 5, 10, 15, 20, 25 e 30, em cada patente nova e quando chega a hora do prêmio."
				})] }), player.notifyParents && perm === "granted" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, {
					className: "size-5 shrink-0 text-accent",
					strokeWidth: 2
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BellOff, {
					className: "size-5 shrink-0 text-faint",
					strokeWidth: 2
				})]
			}),
			perm === "granted" && player.notifyParents ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: "Avisos ligados neste aparelho. No celular, entre com a mesma conta e deixe esta página aberta — ou olhe aqui quando puder."
			}) : perm === "denied" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: "O aparelho bloqueou pop-ups. Os avisos continuam nesta página. Para o sino do sistema, libere notificações nas Ajustes do Safari."
			}) : perm === "unsupported" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: "Este navegador não mostra sino. Os marcos ficam registrados aqui."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "mt-4",
				onClick: () => void turnOn(),
				children: "Ativar avisos neste aparelho"
			}),
			!player.notifyParents && perm === "granted" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "mt-3",
				variant: "secondary",
				onClick: () => void turnOn(),
				children: "Quero receber os marcos"
			}) : null,
			unread.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 space-y-3",
				children: [unread.slice(0, 6).map((alert) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md border border-accent/20 bg-surface p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display",
							children: alert.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: alert.body
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-faint",
							children: whenLabel(alert.at)
						})
					]
				}, alert.id)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "secondary",
					onClick: () => {
						markAlertsRead();
						persistCloud();
					},
					children: "Marcar como lidos"
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm text-muted",
				children: "Nenhum marco novo por agora."
			})
		]
	});
}
function lastDays(n) {
	const keys = [];
	const start = /* @__PURE__ */ new Date();
	for (let i = n - 1; i >= 0; i -= 1) {
		const d = new Date(start);
		d.setDate(start.getDate() - i);
		keys.push(todayKey(d));
	}
	return keys;
}
function ParentPanel() {
	const player = usePlayer();
	const { user } = useCurrentUserState();
	const replaceState = usePlayer((s) => s.replaceState);
	const snapshot = usePlayer((s) => s.snapshot);
	const setChildName = usePlayer((s) => s.setChildName);
	const setPrizeName = usePlayer((s) => s.setPrizeName);
	const setRank = usePlayer((s) => s.setRank);
	const setSound = usePlayer((s) => s.setSound);
	const setExtraTime = usePlayer((s) => s.setExtraTime);
	const claimPrize = usePlayer((s) => s.claimPrize);
	const rank = rankById(player.rankId);
	const clockMs = timeWithBoost(rank, player.consecutiveFails, player.extraTimeSec * 1e3);
	const today = player.days[todayKey()] ?? {
		answered: 0,
		correct: 0,
		missions: 0
	};
	const weak = weakestFacts(player);
	const streak = currentStreak(player);
	const days = lastDays(14);
	const prizeReady = player.prizeCycle >= 10;
	const save = () => persistCloud();
	(0, import_react.useEffect)(() => {
		if (!user) return;
		const tick = () => {
			loadProgress().then((remote) => {
				if (!remote) return;
				const local = snapshot();
				const remoteUnread = unreadAlerts(remote).length;
				const localUnread = unreadAlerts(local).length;
				if (!(remote.totalMissionsPassed > local.totalMissionsPassed || remoteUnread > localUnread)) return;
				replaceState(remote);
				const fresh = unreadAlerts(remote)[0];
				if (fresh && remote.notifyParents && remoteUnread > localUnread) fireParentNotify(fresh);
			}).catch(() => void 0);
		};
		const id = window.setInterval(tick, 15e3);
		return () => window.clearInterval(id);
	}, [
		user,
		replaceState,
		snapshot
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		right: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedIn, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedOut, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/login",
				className: "text-sm font-medium text-muted no-underline hover:text-ink",
				children: "Entrar"
			}) })]
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "anim-rise space-y-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium uppercase tracking-[0.14em] text-muted",
						children: "Espaço dos pais"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-1 font-display text-title",
						children: "Progresso do cadete"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 max-w-xl text-muted",
						children: "Um menino de 10 anos costuma levar cerca de 3 segundos por conta quando a tabuada já está automática. Começamos com 9 segundos e apertamos o relógio conforme ele acerta missões seguidas."
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ParentAlerts, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedOut, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "border-accent/20 bg-wash",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-lg",
							children: "Salvar no iPad e no computador"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: "Entre com a sua conta. O progresso dele acompanha qualquer aparelho — e os avisos de nível aparecem aqui no celular também."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/login",
							className: "mt-3 inline-flex",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, { children: "Entrar para sincronizar" })
						})
					]
				}) }),
				prizeReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "border-accent/30 bg-wash",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-display text-lg",
							children: ["Hora de ", prizeLabel(player.prizeName)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-muted",
							children: [
								"Ele completou ",
								10,
								" missões. Entregue e toque abaixo para recomeçar a contagem."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "mt-4",
							onClick: () => {
								claimPrize();
								save();
							},
							children: "Marcar prêmio entregue"
						})
					]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-medium text-muted",
								children: "Nome do cadete"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								className: "mt-2",
								value: player.childName,
								onChange: (e) => setChildName(e.target.value),
								onBlur: save,
								maxLength: 24
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-medium text-muted",
									children: "Prêmio das 10 missões"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "mt-2",
									value: player.prizeName,
									onChange: (e) => setPrizeName(e.target.value),
									onBlur: save,
									maxLength: 40,
									placeholder: "Sorvete, cinema, parque…"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-2 flex flex-wrap gap-2",
									children: [
										"Sorvete",
										"Cinema",
										"Parque",
										"30 min de jogo",
										"Escolher o jantar"
									].map((idea) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setPrizeName(idea);
											save();
										},
										className: cn("rounded-full border px-3 py-1.5 text-xs font-medium", player.prizeName === idea ? "border-accent bg-wash text-accent" : "border-line bg-surface text-muted"),
										children: idea
									}, idea))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-2 text-sm text-faint",
									children: [
										"Ele vê na tela. Faltam ",
										missionsToPrize(player),
										" missões."
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium text-muted",
								children: "Som"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-faint",
								children: "Bipes curtos em cada acerto"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: player.sound ? "primary" : "secondary",
								size: "sm",
								onClick: () => {
									setSound(!player.sound);
									save();
								},
								children: player.sound ? "Ligado" : "Mudo"
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-lg",
						children: "Tempo extra"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-muted",
						children: [
							"Soma segundos no relógio de cada missão. Agora ele tem",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-medium text-ink",
								children: formatClock(clockMs)
							}),
							" ",
							"para 15 acertos."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: EXTRA_TIME_OPTIONS.map((sec) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setExtraTime(sec);
								save();
							},
							className: cn("rounded-full border px-3 py-1.5 text-sm font-medium tabular-nums", player.extraTimeSec === sec ? "border-accent bg-wash text-accent" : "border-line bg-surface text-muted"),
							children: sec === 0 ? "Sem extra" : `+${sec}s`
						}, sec))
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "Hoje"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-display text-2xl",
								children: today.correct >= 15 ? "Feito" : "Ainda não"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: [
									today.correct,
									"/",
									15,
									" acertos"
								]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "Nível"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-display text-2xl tabular-nums",
								children: player.level
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-sm text-muted",
								children: [player.xp, " XP nesta barra"]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "Missões ganhas"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-display text-2xl tabular-nums",
								children: player.totalMissionsPassed
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "no total"
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "Sequência"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 font-display text-2xl tabular-nums",
								children: streak
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: "dias com a meta"
							})
						] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-lg",
							children: "Patente"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							className: "border-accent/20 bg-wash text-accent",
							children: rank.name
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: rank.blurb
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-muted",
						children: [
							formatClock(clockMs),
							" para 15 acertos",
							player.extraTimeSec > 0 ? ` (inclui +${player.extraTimeSec}s)` : ""
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
						className: "mt-4",
						value: RANKS.findIndex((r) => r.id === player.rankId) + 1,
						max: RANKS.length
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: RANKS.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setRank(r.id);
								save();
							},
							className: cn("rounded-full border px-3 py-1.5 text-xs font-medium", r.id === player.rankId ? "border-accent bg-wash text-accent" : "border-line bg-surface text-muted"),
							children: r.name
						}, r.id))
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg",
					children: "Melhor tempo por planeta"
				}), PLANETS.every((_, i) => !(player.planetBestMs[i] > 0)) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Depois da primeira missão completa, o recorde aparece aqui."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 divide-y divide-line",
					children: PLANETS.map((planet, i) => {
						const best = player.planetBestMs[i] ?? 0;
						if (best <= 0) return null;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "flex items-center justify-between py-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display",
								children: planet.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm tabular-nums text-muted",
								children: formatClock(best)
							})]
						}, planet.id);
					})
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg",
					children: "Últimos 14 dias"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 grid grid-cols-7 gap-2",
					children: days.map((key) => {
						const d = player.days[key];
						const met = (d?.correct ?? 0) >= 15;
						const some = (d?.correct ?? 0) > 0;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: cn("mx-auto h-8 w-8 rounded-sm border", met ? "border-accent bg-accent" : some ? "border-accent/30 bg-wash" : "border-line bg-surface"),
								title: `${key}: ${d?.correct ?? 0} acertos`
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-[10px] text-faint",
								children: key.slice(8)
							})]
						}, key);
					})
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg",
					children: "Contas que pedem treino"
				}), weak.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Ainda não há histórico suficiente. Depois de algumas missões, as contas mais teimosas aparecem aqui."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-3 divide-y divide-line",
					children: weak.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center justify-between py-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-display text-lg tabular-nums",
							children: [
								row.fact.a,
								" × ",
								row.fact.b
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-sm tabular-nums text-muted",
							children: [
								Math.round(row.accuracy * 100),
								"% · ",
								Math.round(row.avgMs / 100) / 10,
								"s"
							]
						})]
					}, `${row.fact.a}x${row.fact.b}`))
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-lg",
					children: "Como o desafio cresce"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "mt-3 space-y-2 text-sm text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Doze planetas. Completar uma missão destrava o próximo e acende 1 a 3 estrelas." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "XP sobe a cada missão. O nível muda a nave (papel, Asa Teal, Nau-Coroa)." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Níveis 5, 10, 15, 20, 25 e 30, patente nova e prêmio: aviso no espaço dos pais." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Tempo extra no painel: +15s por padrão. Dá para subir até +60s." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Um pouco por dia: uma missão (15 acertos). A sequência conta dias seguidos." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "A patente no painel abaixo força o planeta daquela patente, se precisar." })
					]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "inline-flex",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "secondary",
						children: "Voltar para o cadete"
					})
				})
			]
		})
	});
}
var SplitComponent = ParentPanel;
//#endregion
export { SplitComponent as component };
