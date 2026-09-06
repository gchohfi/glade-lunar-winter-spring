import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const pitch = read("src/components/flight-track.tsx");
const css = read("src/styles.css");

test("all new field props are real WebP assets, not emoji placeholders", () => {
  for (const name of ["pitch-v2", "ball-v2"]) {
    const bytes = readFileSync(new URL(`../public/game/football/${name}.webp`, import.meta.url));
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
    assert.ok(bytes.length < 350_000);
  }
  for (const path of ["field-scene", "mascot-scene"]) {
    const component = read(`src/components/${path}.tsx`);
    assert.match(component, /<FootballBall/);
    assert.doesNotMatch(component, /⚽/);
  }
});

test("perspective, contact shadows and reduced motion are explicit presentation contracts", () => {
  assert.match(css, /\.football-pitch\s*\{[^}]*aspect-ratio: 3 \/ 1/s);
  assert.match(css, /\.football-ball::before/);
  assert.match(css, /\.pitch-nico-shadow/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.pitch-ball-position,\s*\.mission-question\s*\{\s*transition: none/s);
  assert.doesNotMatch(pitch, /onTransitionEnd|onAnimationEnd/);
});

test("match progression has text and accessible current-step feedback, not color alone", () => {
  assert.match(pitch, /footballState\(correct, feedback\)/);
  assert.match(pitch, /aria-current=/);
  assert.match(pitch, /role="status"/);
  assert.match(pitch, /!practicing \? \(/);
  assert.match(pitch, /"Primeiro passe", "Segundo passe", "Chute a gol"/);
});

test("keypad uses the shared control and preserves explicit submit and decimal input", () => {
  const keypad = read("src/components/number-pad.tsx");
  assert.match(keypad, /import \{ Button \}/);
  assert.match(keypad, /aria-label="Teclado de resposta"/);
  assert.match(keypad, /onClick=\{onSubmit\}/);
  assert.match(keypad, /"Vírgula"/);
  assert.match(css, /@media \(min-width: 768px\)/);
});
