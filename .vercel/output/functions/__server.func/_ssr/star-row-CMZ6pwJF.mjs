import { b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as cn } from "./card-ihLnJYyv.mjs";
import { i as Star } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/star-row-CMZ6pwJF.js
var import_jsx_runtime = require_jsx_runtime();
function StarRow({ value, max = 3, size = "md" }) {
	const dim = size === "sm" ? "size-3.5" : "size-5";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex items-center justify-center gap-1",
		"aria-label": `${value} de ${max} estrelas`,
		children: Array.from({ length: max }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, {
			className: cn(dim, i < value ? "fill-accent text-accent" : "text-faint"),
			strokeWidth: 2
		}, i))
	});
}
//#endregion
export { StarRow as t };
