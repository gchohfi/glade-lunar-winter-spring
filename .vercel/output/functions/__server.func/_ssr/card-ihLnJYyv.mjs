import { o as __toESM } from "../_runtime.mjs";
import { B as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/card-ihLnJYyv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,color,opacity,border-color] duration-150 ease-out select-none disabled:pointer-events-none disabled:opacity-45 active:not-disabled:scale-[0.96]", {
	variants: {
		variant: {
			primary: "bg-accent text-accent-fg shadow-soft hover:brightness-[1.04]",
			secondary: "bg-surface text-ink border border-line hover:bg-wash",
			ghost: "bg-transparent text-ink hover:bg-wash",
			danger: "bg-bad text-accent-fg hover:brightness-110"
		},
		size: {
			sm: "h-10 rounded-sm px-3.5 text-sm",
			md: "h-12 rounded-md px-5 text-base",
			lg: "h-14 rounded-lg px-6 text-lg",
			xl: "h-16 rounded-xl px-8 text-xl",
			pad: "h-16 min-w-16 rounded-md text-2xl font-display"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
var Button = (0, import_react.forwardRef)(({ className, variant, size, type = "button", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
	ref,
	type,
	className: cn(buttonVariants({
		variant,
		size
	}), className),
	...props
}));
Button.displayName = "Button";
function Card({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("rounded-xl border border-line bg-surface p-5 shadow-soft", className),
		...props
	});
}
//#endregion
export { Card as n, cn as r, Button as t };
