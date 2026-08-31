import { b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as cn } from "./card-ihLnJYyv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mascot-BcROqonC.js
var import_jsx_runtime = require_jsx_runtime();
var SRC = {
	idle: "/mascot.jpg",
	win: "/mascot-win.jpg",
	try: "/mascot-try.jpg"
};
function Mascot({ mood = "idle", className, alt = "Nico, o cadete onça da Missão Tabuada" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: SRC[mood],
		alt,
		className: cn("pointer-events-none select-none object-contain", className),
		draggable: false
	});
}
//#endregion
export { Mascot as t };
