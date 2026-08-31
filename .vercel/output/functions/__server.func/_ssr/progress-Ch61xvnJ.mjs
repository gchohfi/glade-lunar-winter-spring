import { b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as cn } from "./card-ihLnJYyv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/progress-Ch61xvnJ.js
var import_jsx_runtime = require_jsx_runtime();
function Progress({ value, max = 100, className }) {
	const pct = Math.max(0, Math.min(100, max === 0 ? 0 : value / max * 100));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("h-2.5 w-full overflow-hidden rounded-full bg-line", className),
		role: "progressbar",
		"aria-valuenow": Math.round(pct),
		"aria-valuemin": 0,
		"aria-valuemax": 100,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "h-full rounded-full bg-accent transition-[width] duration-200 ease-out",
			style: { width: `${pct}%` }
		})
	});
}
//#endregion
export { Progress as t };
