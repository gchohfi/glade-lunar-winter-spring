import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { twMerge } from "tailwind-merge";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const component = readFileSync(new URL("../src/components/mission-play.tsx", import.meta.url), "utf8");

test("stacked mission reserves natural question height before placing the keyboard", () => {
  const layout = css.match(/\.mission-layout\s*\{([^}]+)\}/)?.[1];
  assert.match(layout, /grid-template-rows:\s*minmax\(min-content,\s*1fr\) auto/);
  assert.doesNotMatch(css, /grid-template-rows:\s*minmax\(0,\s*1fr\) auto/);
  assert.match(css, /\.mission-question\s*\{\s*flex:\s*1 0 auto;/);
});

test("equation stays large when its success or error color changes", () => {
  const classes = component.match(/"(mission-equation [^"]+)"/)?.[1];
  assert.ok(classes, "Question must use the dedicated equation size class");
  assert.match(css, /\.mission-equation\s*\{\s*font-size:\s*var\(--text-display\)/);
  for (const feedback of ["", "anim-pop text-ok", "anim-shake text-bad"]) {
    assert.ok(twMerge(classes, feedback).split(" ").includes("mission-equation"));
  }
});

test("compact layouts retain touch-friendly 48px answer keys", () => {
  assert.match(css, /@media \(max-width: 1023px\) and \(max-height: 820px\)/);
  assert.match(css, /\.mission-keyboard button\s*\{\s*height:\s*3rem;/);
  assert.match(component, /data-equation/);
  assert.match(component, /data-answer/);
});
