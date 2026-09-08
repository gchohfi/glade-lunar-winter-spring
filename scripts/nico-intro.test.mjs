import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const source = (path) => readFileSync(new URL(path, root), "utf8");
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const module = { exports: {} };
  const output = ts.transpileModule(source(`src/lib/game/${name}.ts`), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "module", "exports", output)(
    (id) => {
      assert.ok(id.startsWith("./"), "Presentation must not import a progress service");
      return load(id.slice(2));
    },
    module,
    module.exports,
  );
  cache.set(name, module.exports);
  return module.exports;
}
const { createIntroHistory, INTRO_STORAGE_PREFIX, NICO_INTRO_VIDEO, NICO_INTRO_POSTER } =
  load("intro");
const now = new Date("2026-09-08T12:00:00Z");
function storage() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("intro appears once per account and day, including after reload or another tab", () => {
  const disk = storage();
  const history = createIntroHistory();
  assert.equal(history.claim("parent-a", now, disk), true);
  assert.equal(history.claim("parent-a", now, disk), false);
  assert.equal(createIntroHistory().claim("parent-a", now, disk), false);
  assert.equal(disk.values.get(INTRO_STORAGE_PREFIX + "parent-a"), "2026-09-08");
});

test("the intro day changes at midnight in Sao Paulo, not midnight UTC", () => {
  const disk = storage();
  assert.equal(createIntroHistory().claim("a", new Date("2026-09-09T02:59:59Z"), disk), true);
  assert.equal(createIntroHistory().claim("a", new Date("2026-09-09T03:00:00Z"), disk), true);
  assert.equal(createIntroHistory().claim("a", new Date("2026-09-09T03:00:01Z"), disk), false);
});

test("accounts never inherit each other's daily intro mark", () => {
  const disk = storage();
  const history = createIntroHistory();
  assert.equal(history.claim("a", now, disk), true);
  assert.equal(history.claim("b", now, disk), true);
  assert.equal(history.claim("a", now, disk), false);
  assert.equal(history.claim("", now, disk), false);
  assert.equal(disk.values.size, 2);
});

test("claiming before playback suppresses repeat intros even when skipped or interrupted", () => {
  const disk = storage();
  createIntroHistory().claim("a", now, disk);
  // No match start or media-ended event is necessary to remember the introduction.
  assert.equal(createIntroHistory().claim("a", now, disk), false);
});

test("unavailable or full storage does not block entry or repeat within the tab", () => {
  for (const disk of [
    undefined,
    {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("quota");
      },
    },
    {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error("quota");
      },
    },
  ]) {
    const history = createIntroHistory();
    assert.equal(history.claim("a", now, disk), true);
    assert.equal(history.claim("a", now, disk), false);
  }
});

test("only the versioned presentation key is written, preserving all progress", () => {
  const disk = storage();
  disk.values.set("missao-tabuada-v1", "existing career");
  disk.values.set("missao-course-v3:a:pending", "unconfirmed original operation");
  createIntroHistory().claim("a:/b", now, disk);
  assert.equal(disk.values.size, 3);
  assert.equal(disk.values.get("missao-tabuada-v1"), "existing career");
  assert.equal(disk.values.get("missao-course-v3:a:pending"), "unconfirmed original operation");
  assert.equal(disk.values.get(INTRO_STORAGE_PREFIX + "a%3A%2Fb"), "2026-09-08");
});

test("an unknown presentation mark fails open without altering unrelated records", () => {
  const disk = storage();
  disk.values.set(INTRO_STORAGE_PREFIX + "a", "corrupted");
  assert.equal(createIntroHistory().claim("a", now, disk), true);
  assert.equal(createIntroHistory().claim("a", now, disk), false);
});

test("the shipped movie and static poster are real local assets", () => {
  const video = new URL("public" + NICO_INTRO_VIDEO, root);
  const poster = new URL("public" + NICO_INTRO_POSTER, root);
  assert.ok(statSync(video).size > 1_000_000);
  assert.equal(readFileSync(video).subarray(4, 8).toString(), "ftyp");
  assert.ok(statSync(poster).size > 10_000);
  assert.equal(readFileSync(poster).subarray(0, 2).toString("hex"), "ffd8");
  assert.ok(resolve(video.pathname).includes("public/mascots/nico-leao"));
});

test("integration remains Home-only and never starts or rewards a match", () => {
  const intro = source("src/components/nico-intro.tsx");
  const home = source("src/components/home-dashboard.tsx");
  assert.match(home, /<NicoIntro/);
  assert.doesNotMatch(source("src/components/mission-play.tsx"), /NicoIntro/);
  assert.doesNotMatch(intro, /saveProgress|persistCloud|useNavigate|useCourseSync|\.send\(/);
  assert.match(intro, /onEnded=\{onFinish\}/);
  assert.match(intro, /homeActionRef\.current\?\.focus\(\)/);
});

test("playback has reduced-motion, muted autoplay, failure and accessible skip guards", () => {
  const intro = source("src/components/nico-intro.tsx");
  assert.match(intro, /prefers-reduced-motion: reduce/);
  assert.match(intro, /const staticView = reducedMotion !== false \|\| still \|\| failed/);
  assert.match(intro, /const \[soundOn, setSoundOn\] = useState\(false\)/);
  assert.match(intro, /muted=\{!soundEnabled \|\| !soundOn\}/);
  assert.match(intro, /playsInline/);
  assert.match(intro, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.match(intro, /Entrar no jogo/);
  assert.match(intro, /visibilitychange/);
  assert.match(source("src/components/nico-intro.css"), /object-fit: contain/);
});
