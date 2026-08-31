import { _ as Link, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as signIn } from "./client-B40BzJxt.mjs";
import { t as GROK_PROVIDERS } from "./server-1utkiyn2.mjs";
import { n as Card, t as Button } from "./card-ihLnJYyv.mjs";
import { t as Mascot } from "./mascot-BcROqonC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-BnzhwHUC.js
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "paper-grid grid min-h-dvh place-items-center px-4 py-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mascot, { className: "mx-auto h-40 w-40" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm font-medium uppercase tracking-[0.14em] text-muted",
					children: "Missão Tabuada"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-title",
					children: "Entrar para salvar o progresso"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-muted",
					children: "Pais entram aqui. Depois o cadete joga no iPad, no computador ou no celular — a mesma conta, o mesmo treino."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					className: "mt-8 space-y-3 p-5 text-left",
					children: GROK_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: p.idp === "google" ? "primary" : "secondary",
						size: "lg",
						className: "w-full",
						onClick: () => signIn(p.providerId, { callbackURL: "/" }),
						children: ["Continuar com ", p.label]
					}, p.providerId))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "mt-6 inline-block text-sm font-medium text-muted no-underline hover:text-ink",
					children: "Jogar neste aparelho, sem conta"
				})
			]
		})
	});
}
//#endregion
export { Login as component };
