import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
function gameModules(storage) {
  const cache = new Map();
  const simulatedWindow = storage ? { localStorage: storage } : undefined;
  function load(name) {
    if (cache.has(name)) return cache.get(name).exports;
    if (name === "audio") return { setSoundEnabled() {} };
    if (name === "notify") return { fireParentNotify() {} };
    const module = { exports: {} };
    cache.set(name, module);
    const source = readFileSync(new URL(`../src/lib/game/${name}.ts`, import.meta.url), "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText;
    new Function("require", "module", "exports", "window", output)(
      (id) => (id.startsWith("./") ? load(id.slice(2)) : require(id)),
      module,
      module.exports,
      simulatedWindow,
    );
    return module.exports;
  }
  return load;
}
const load = gameModules();
const { emptyState } = load("types");
const { migrateState, applyRunProgress } = load("progress");
const {
  COSMETICS,
  DEFAULT_COSMETICS,
  cosmeticItem,
  cosmeticUnlocked,
  normalizeCosmetics,
  equipCosmetic,
  nextCosmetic,
  newCosmetics,
  cosmeticStatus,
} = load("wardrobe");
const earned = () => ({ ...emptyState(), planetStars: [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0] });

test("catalog contains only valid real assets and two cosmetic milestone rewards", () => {
  assert.equal(COSMETICS.length, 4);
  assert.equal(new Set(COSMETICS.map((i) => i.id)).size, 4);
  for (const item of COSMETICS) {
    const data = readFileSync(new URL("../public" + item.art, import.meta.url));
    assert.equal(data.toString("ascii", 8, 12), "WEBP");
    assert.ok(data.length < 350_000);
    assert.ok(!("cost" in item));
  }
});
test("old saves get defaults without changing career, questions, rewards or existing fields", () => {
  const old = earned();
  delete old.cosmetics;
  const next = migrateState(structuredClone(old));
  assert.deepEqual(next.cosmetics, DEFAULT_COSMETICS);
  delete next.cosmetics;
  assert.deepEqual(next, old);
});
test("unlock requires completed stage, never XP, level, selected rank or furthest alone", () => {
  const high = { ...emptyState(), xp: 10000, level: 30, furthestPlanet: 11, selectedPlanet: 11 };
  assert.equal(cosmeticUnlocked(cosmeticItem("ball-training"), high), false);
  assert.equal(cosmeticUnlocked(cosmeticItem("field-sunset"), high), false);
  assert.equal(cosmeticUnlocked(cosmeticItem("ball-training"), earned()), true);
  for (const value of [-1, 4, Infinity, NaN, "3", 0.5])
    assert.equal(cosmeticUnlocked(cosmeticItem("ball-training"), { planetStars: [value] }), false);
});
test("invalid, mismatched, future and locked saved items normalize safely", () => {
  for (const raw of [
    null,
    8,
    [],
    { ballId: "bad", fieldId: "field-missing" },
    { ballId: "field-club", fieldId: "ball-classic" },
    { ballId: "ball-training", fieldId: "field-sunset" },
  ]) {
    assert.deepEqual(normalizeCosmetics(raw, emptyState()), DEFAULT_COSMETICS);
  }
});
test("equipping is idempotent and changes only cosmetic selection; reverting stays free", () => {
  const start = earned(),
    before = structuredClone(start);
  const next = equipCosmetic(start, "ball-training");
  assert.deepEqual(start, before);
  assert.deepEqual({ ...next, cosmetics: start.cosmetics }, start);
  assert.equal(cosmeticStatus(cosmeticItem("ball-training"), next), "equipped");
  assert.equal(equipCosmetic(next, "ball-training"), next);
  assert.deepEqual(equipCosmetic(next, "ball-classic"), start);
  assert.equal(equipCosmetic(start, "unknown"), start);
  const fresh = emptyState();
  assert.equal(equipCosmetic(fresh, "ball-training"), fresh);
});
test("completed or replayed stages reveal only genuinely new items, without auto-equip", () => {
  const start = emptyState();
  const run = {
    passed: true,
    correct: 15,
    wrong: 0,
    bestCombo: 3,
    elapsedMs: 60000,
    timeLimitMs: 150000,
    planetIndex: 0,
  };
  const first = applyRunProgress(start, run).state;
  assert.deepEqual(
    newCosmetics(start, first).map((i) => i.id),
    ["ball-training"],
  );
  assert.deepEqual(first.cosmetics, DEFAULT_COSMETICS);
  const again = applyRunProgress(first, run).state;
  assert.deepEqual(newCosmetics(first, again), []);
  assert.equal(nextCosmetic(first).id, "field-sunset");
  assert.equal(nextCosmetic(earned()), undefined);
  assert.deepEqual(
    newCosmetics(start, applyRunProgress(start, { ...run, passed: false }).state),
    [],
  );
});
test("real store persists selection and restores it after reload without touching XP", () => {
  let raw = JSON.stringify(earned());
  const storage = {
    getItem: () => raw,
    setItem: (_key, value) => {
      raw = value;
    },
  };
  const store = gameModules(storage)("store").usePlayer;
  const before = store.getState().snapshot();
  assert.equal(store.getState().equipCosmetic("ball-training"), "equipped");
  assert.equal(JSON.parse(raw).cosmetics.ballId, "ball-training");
  const reloaded = gameModules(storage)("store").usePlayer.getState().snapshot();
  assert.equal(reloaded.cosmetics.ballId, "ball-training");
  assert.deepEqual({ ...reloaded, cosmetics: before.cosmetics }, before);
  assert.equal(store.getState().equipCosmetic("ball-training"), "unavailable");
});
test("real store refuses unearned equipment and reports failed storage without false success", () => {
  const storage = {
    getItem: () => JSON.stringify(earned()),
    setItem: () => {
      throw new Error("quota");
    },
  };
  const store = gameModules(storage)("store").usePlayer;
  assert.equal(store.getState().equipCosmetic("ball-training"), "storage-error");
  assert.deepEqual(store.getState().cosmetics, DEFAULT_COSMETICS);
  store.setState({ planetStars: Array(12).fill(0) });
  assert.equal(store.getState().equipCosmetic("ball-training"), "unavailable");
});
test("reset/profile replacement carries only the incoming career's own equipment", () => {
  let raw = JSON.stringify(equipCosmetic(earned(), "ball-training"));
  const store = gameModules({
    getItem: () => raw,
    setItem: (_k, v) => {
      raw = v;
    },
  })("store").usePlayer;
  store.getState().replaceState(emptyState());
  assert.deepEqual(store.getState().snapshot().cosmetics, DEFAULT_COSMETICS);
  assert.equal(JSON.parse(raw).cosmetics.ballId, "ball-classic");
});
