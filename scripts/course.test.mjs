import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const module = { exports: {} };
  cache.set(name, module);
  const source = readFileSync(new URL(`../src/lib/game/${name}.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function("require", "module", "exports", compiled)(
    (id) => (id.startsWith("./") ? load(id.slice(2)) : require(id)),
    module,
    module.exports,
  );
  return module.exports;
}
const { emptyState, factAnswer, factKey, factOp, todayKey } = load("types");
const {
  CHAMPIONSHIPS,
  COURSE_MATCHES,
  normalizeCourse,
  nextCourseMatch,
  courseMatch,
  courseMatchUnlocked,
  courseFacts,
  completedCup,
} = load("course");
const { migrateState } = load("progress");
const { applyCourseCommand } = load("course-engine");
const { cosmeticItem, cosmeticUnlocked } = load("wardrobe");
const NOW = Date.parse("2026-09-08T15:00:00Z");
let operationNumber = 0;
function game(initial = emptyState(), now = NOW) {
  let state = migrateState(initial),
    attempt = null;
  return {
    get state() {
      return state;
    },
    get attempt() {
      return attempt;
    },
    command(command, overrides = {}) {
      const outcome = applyCourseCommand(state, attempt, command, {
        now,
        deviceId: "ipad",
        operationId: `test-op-${++operationNumber}`,
        ...overrides,
      });
      if (outcome.ok) {
        state = outcome.state;
        attempt = outcome.activeAttempt;
      }
      return outcome;
    },
    start(id = nextCourseMatch(state).id) {
      return this.command({ type: "start", matchId: id });
    },
    answer(ok = true, elapsedMs = 1000) {
      return this.command({
        type: "answer",
        attemptId: attempt.id,
        guess: factAnswer(attempt.fact) + (ok ? 0 : 1),
        elapsedMs,
      });
    },
    advance() {
      if (attempt.phase === "feedback")
        return this.command({ type: "continue", attemptId: attempt.id });
      if (attempt.phase === "shot")
        return this.command({ type: "shoot", attemptId: attempt.id, direction: "right" });
      throw new Error(`Cannot advance ${attempt.phase}`);
    },
    win(id = nextCourseMatch(state).id) {
      assert.equal(this.start(id).ok, true);
      while (attempt) {
        assert.equal((attempt.phase === "answer" ? this.answer() : this.advance()).ok, true);
      }
      return state;
    },
    reload() {
      state = migrateState(JSON.parse(JSON.stringify(state)));
      attempt = attempt && JSON.parse(JSON.stringify(attempt));
    },
  };
}

test("course has four cups with five ordered matches and exact public curriculum", () => {
  assert.deepEqual(
    CHAMPIONSHIPS.map((cup) => cup.id),
    ["bairro", "cidade", "craques", "nico"],
  );
  assert.equal(COURSE_MATCHES.length, 20);
  COURSE_MATCHES.forEach((match, index) => {
    assert.equal(match.index, index);
    assert.equal(match.id, `${CHAMPIONSHIPS[Math.floor(index / 5)].id}-${(index % 5) + 1}`);
    assert.equal(courseMatch(match.id), match);
  });
  assert.equal(courseMatch("missing"), undefined);
  assert.match(courseMatch("bairro-1").theme, /3/);
  assert.match(courseMatch("bairro-2").theme, /4/);
  assert.match(courseMatch("craques-4").theme, /vírgula/);
  assert.deepEqual(courseFacts(emptyState(), "missing"), []);
});

test("legacy migration starts new course at bairro-1 while retaining all legacy progress and purchases", () => {
  const state = emptyState();
  state.xp = 742;
  state.level = 19;
  state.planetStars = Array.from({ length: 12 }, () => 3);
  state.planetBestMs = Array.from({ length: 12 }, (_, index) => 20000 + index);
  state.furthestPlanet = 11;
  state.totalMissionsPassed = 100;
  state.club = {
    balance: 35,
    ownedItemIds: ["ball-gold"],
    goalItemId: "field-night",
    rewardDays: {},
  };
  state.cosmetics = { ballId: "ball-gold", fieldId: "field-sunset" };
  const original = structuredClone(state),
    migrated = migrateState(state);
  assert.deepEqual(state, original);
  for (const key of [
    "xp",
    "level",
    "planetStars",
    "planetBestMs",
    "totalMissionsPassed",
    "club",
    "cosmetics",
  ])
    assert.deepEqual(migrated[key], state[key]);
  assert.deepEqual(migrated.course.completedMatches, []);
  assert.equal(migrated.course.selectedMatchId, "bairro-1");
  assert.equal(courseMatchUnlocked(migrated, "bairro-2"), false);
});

test("migration preserves actual 10/20/30 daily credits and treats any claimed day as consumed", () => {
  for (const [mission, focus, expected] of [
    [true, false, 20],
    [false, true, 10],
    [true, true, 30],
  ]) {
    const state = emptyState();
    state.club.balance = expected;
    state.club.rewardDays["2026-09-08"] = { mission, focus };
    const session = game(state);
    assert.equal(session.state.course.rewardDays["2026-09-08"], expected);
    session.win();
    assert.equal(session.state.course.lastResult.coinsGained, 0);
    assert.equal(session.state.club.balance, expected);
    assert.equal(session.state.course.rewardDays["2026-09-08"], expected);
  }
});

test("course normalization removes holes, unknown IDs, invalid selections and dates without minting", () => {
  const state = emptyState();
  state.course = {
    completedMatches: ["bairro-1", "bairro-3", "alien"],
    selectedMatchId: "nico-5",
    durationSec: 1,
    rewardDays: { "2026-02-30": 30, "2026-09-08": 20, "2026-09-09": 0, "2026-09-10": "claimed" },
  };
  const normalized = normalizeCourse(state);
  assert.deepEqual(normalized.completedMatches, ["bairro-1"]);
  assert.equal(normalized.selectedMatchId, "bairro-2");
  assert.equal(normalized.durationSec, 180);
  assert.deepEqual(normalized.rewardDays, { "2026-09-08": 20, "2026-09-10": 30 });
  assert.equal(completedCup(state, "bairro"), false);
  assert.equal(completedCup(state, "alien"), false);
});

test("eligible decks follow exact table/division boundaries regardless of advanced legacy history", () => {
  const state = emptyState();
  state.rankId = "lenda";
  state.facts["99d2"] = { attempts: 10, correct: 0, wrong: 10, totalMs: 100, lastSeen: 0 };
  const limits = [[3], [3, 4], [3, 4, 5], [3, 4, 5, 10], [3, 4, 5, 10]];
  limits.forEach((tables, index) => {
    const deck = courseFacts(state, `bairro-${index + 1}`);
    assert.equal(deck.length, 30);
    assert.ok(
      deck.every(
        (fact) => factOp(fact) === "mul" && tables.includes(fact.a) && fact.b >= 3 && fact.b <= 10,
      ),
    );
  });
  for (const id of ["cidade-1", "cidade-2", "cidade-3", "cidade-4", "cidade-5"])
    assert.ok(courseFacts(state, id).every((fact) => factOp(fact) === "mul"));
  for (const [id, divisors] of [
    ["craques-1", [3, 4]],
    ["craques-2", [3, 4, 5, 6]],
    ["craques-3", [3, 4, 5, 6, 7, 8, 9]],
  ]) {
    const divisions = courseFacts(state, id).filter((fact) => factOp(fact) === "div");
    assert.ok(divisions.length >= 8);
    assert.ok(
      divisions.every((fact) => divisors.includes(fact.b) && Number.isInteger(factAnswer(fact))),
    );
  }
  assert.ok(
    courseFacts(state, "craques-4").some(
      (fact) => factOp(fact) === "div" && !Number.isInteger(factAnswer(fact)),
    ),
  );
  assert.ok(
    courseFacts(state, "nico-1").every(
      (fact) => factOp(fact) === "mul" && [3, 4, 5, 10].includes(fact.a),
    ),
  );
  assert.ok(
    courseFacts(state, "nico-2").every(
      (fact) => factOp(fact) === "mul" && [6, 7, 8, 9].includes(fact.a),
    ),
  );
  assert.ok(
    courseFacts(state, "nico-3").every(
      (fact) => factOp(fact) === "mul" && [11, 12, 13].includes(fact.a),
    ),
  );
  assert.ok(courseFacts(state, "nico-4").every((fact) => factOp(fact) === "div"));
});

test("decks are deterministic and avoid immediate or recent repetition even in a one-table lesson", () => {
  for (const match of COURSE_MATCHES) {
    const state = emptyState();
    const deck = courseFacts(state, match.id);
    assert.deepEqual(deck, courseFacts(state, match.id));
    deck.forEach((fact, index) =>
      assert.ok(
        !deck
          .slice(Math.max(0, index - 3), index)
          .some((previous) => factKey(previous) === factKey(fact)),
        match.id,
      ),
    );
  }
});

test("personalized final revisits old successful facts after absence and prioritizes current difficulties", () => {
  const state = emptyState();
  state.facts["13x12"] = {
    attempts: 2,
    correct: 2,
    wrong: 0,
    totalMs: 1000,
    lastSeen: NOW - 7 * 86400000,
  };
  state.facts["63d7"] = { attempts: 4, correct: 0, wrong: 4, totalMs: 1000, lastSeen: NOW };
  const deck = courseFacts(state, "nico-5", NOW);
  assert.ok(deck.slice(0, 8).some((fact) => ["13x12", "12x13"].includes(factKey(fact))));
  assert.ok(deck.slice(0, 3).some((fact) => factKey(fact) === "63d7"));
  assert.deepEqual(deck, courseFacts(state, "nico-5", NOW));
  assert.notDeepEqual(
    courseFacts(emptyState(), "bairro-1", NOW),
    courseFacts(emptyState(), "bairro-1", NOW + 86400000),
  );
});

test("start is unlocked-only, deterministic and cannot replace an active attempt", () => {
  const session = game();
  assert.equal(session.start("bairro-2").ok, false);
  const started = session.command(
    { type: "start", matchId: "bairro-1" },
    { operationId: "start-fixed" },
  );
  assert.equal(started.activeAttempt.id, "start-fixed");
  assert.equal(started.activeAttempt.phase, "answer");
  assert.equal(session.start().ok, false);
  assert.equal(session.command({ type: "select", matchId: "bairro-1" }).ok, false);
});

test("fifteen correct answers prepare five explicit shots; only final shot advances and rewards", () => {
  const session = game();
  session.start();
  const attemptId = session.attempt.id;
  for (let goal = 0; goal < 5; goal++) {
    assert.equal(session.command({ type: "shoot", attemptId, direction: "left" }).ok, false);
    for (let answer = 0; answer < 3; answer++) {
      assert.equal(session.answer().ok, true);
      assert.equal(session.attempt.phase, "feedback");
      assert.equal(session.advance().ok, true);
    }
    assert.equal(session.attempt.phase, "shot");
    assert.equal(session.attempt.goals, goal);
    assert.equal(session.state.club.balance, 0);
    assert.equal(session.advance().ok, true);
  }
  assert.equal(session.attempt, null);
  assert.equal(session.state.course.lastResult.correct, 15);
  assert.equal(session.state.course.lastResult.goals, 5);
  assert.equal(session.state.course.lastResult.coinsGained, 30);
  assert.equal(session.state.club.balance, 30);
  assert.equal(session.state.course.selectedMatchId, "bairro-2");
  assert.equal(session.state.totalMissionsPassed, 1);
  assert.equal(session.state.xp, 0);
  assert.deepEqual(session.state.planetStars, Array(12).fill(0));
  assert.equal(session.state.days["2026-09-08"].missions, 1);
  assert.equal(session.command({ type: "shoot", attemptId, direction: "left" }).ok, false);
});

test("daily reward is once per Sao Paulo conclusion day, including same-day replay and long pause", () => {
  const session = game(emptyState(), Date.parse("2026-09-09T02:59:00Z"));
  session.win();
  session.reload();
  session.win("bairro-1");
  assert.equal(session.state.club.balance, 30);
  assert.equal(session.state.course.lastResult.coinsGained, 0);
  const tomorrow = game(session.state, Date.parse("2026-09-09T03:01:00Z"));
  tomorrow.win();
  assert.equal(tomorrow.state.club.balance, 60);
  assert.deepEqual(tomorrow.state.course.rewardDays, { "2026-09-08": 30, "2026-09-09": 30 });
  assert.equal(todayKey(new Date(NOW)), "2026-09-08");
});

test("help returns to the same question and assisted success never becomes independent evidence", () => {
  const session = game();
  session.start();
  const fact = session.attempt.fact,
    key = factKey(fact);
  assert.equal(
    session.command({ type: "help", attemptId: session.attempt.id, elapsedMs: 400 }).ok,
    true,
  );
  assert.equal(session.attempt.feedback, "help");
  session.advance();
  assert.deepEqual(session.attempt.fact, fact);
  session.answer();
  assert.equal(session.attempt.responses[0].assisted, true);
  assert.equal(session.state.facts[key], undefined);
  assert.equal(session.state.days["2026-09-08"].correct, 1);
  assert.equal(session.attempt.correct, 1);
});

test("wrong answers requeue after three other questions without removing goals; repeats are assisted", () => {
  const session = game();
  session.start();
  const key = factKey(session.attempt.fact);
  session.answer(false);
  assert.equal(session.attempt.goals, 0);
  assert.equal(factKey(session.attempt.queue[3]), key);
  assert.equal(session.state.facts[key].attempts, 1);
  assert.equal(session.state.facts[key].wrong, 1);
  session.advance();
  for (let index = 0; index < 3; index++) {
    assert.notEqual(factKey(session.attempt.fact), key);
    session.answer();
    session.advance();
    if (session.attempt.phase === "shot") session.advance();
  }
  assert.equal(factKey(session.attempt.fact), key);
  session.answer();
  assert.equal(session.attempt.responses.at(-1).assisted, true);
  assert.equal(session.state.facts[key].correct, 0);
  assert.deepEqual(session.state.facts[key].independentDays, []);
});

test("each independent fact contributes at most once per attempt and one evidence day per calendar day", () => {
  const session = game();
  session.win();
  const firstStats = structuredClone(session.state.facts);
  assert.equal(Object.keys(firstStats).length, 8);
  assert.ok(
    Object.values(firstStats).every(
      (stat) => stat.attempts === 1 && stat.independentDays.length === 1,
    ),
  );
  session.win("bairro-1");
  assert.ok(
    Object.values(session.state.facts).every(
      (stat) => stat.attempts === 2 && stat.independentDays.length === 1,
    ),
  );
  const tomorrow = game(session.state, NOW + 86400000);
  tomorrow.win("bairro-1");
  assert.ok(Object.values(tomorrow.state.facts).every((stat) => stat.independentDays.length === 2));
});

test("checkpoint charges only thinking, full question time reaches evidence, and feedback/shot charge zero", () => {
  const session = game();
  session.start();
  const key = factKey(session.attempt.fact),
    attemptId = session.attempt.id;
  session.command({ type: "checkpoint", attemptId, elapsedMs: 2000 });
  session.command({ type: "checkpoint", attemptId, elapsedMs: 2000 });
  session.answer(true, 500);
  assert.equal(session.attempt.mathElapsedMs, 4500);
  assert.equal(session.state.facts[key].totalMs, 4500);
  assert.equal(session.attempt.responses[0].ms, 4500);
  assert.equal(session.command({ type: "checkpoint", attemptId, elapsedMs: 100 }).ok, false);
  session.command({ type: "pause", attemptId, elapsedMs: 0 });
  assert.equal(session.attempt.resumePhase, "feedback");
  assert.equal(session.attempt.mathElapsedMs, 4500);
  session.command({ type: "resume", attemptId });
  session.advance();
  assert.equal(session.attempt.mathElapsedMs, 4500);
});

test("invalid elapsed values and premature expiration reject without any state or clock mutation", () => {
  const session = game();
  session.start();
  for (const elapsedMs of [-1, NaN, Infinity, 180001, "1"]) {
    const before = structuredClone(session.attempt);
    const outcome = session.command({
      type: "answer",
      attemptId: session.attempt.id,
      guess: 1,
      elapsedMs,
    });
    assert.equal(outcome.ok, false);
    assert.deepEqual(session.attempt, before);
  }
  const before = structuredClone(session.attempt);
  assert.equal(
    session.command({ type: "expire", attemptId: session.attempt.id, elapsedMs: 100 }).ok,
    false,
  );
  assert.deepEqual(session.attempt, before);
  assert.equal(
    session.command({ type: "expire", attemptId: session.attempt.id, elapsedMs: 180000 }).ok,
    true,
  );
  assert.equal(session.attempt, null);
  assert.equal(session.state.course.lastResult.passed, false);
  assert.equal(session.state.club.balance, 0);
  assert.equal(session.state.totalMissionsPassed, 0);
  assert.deepEqual(session.state.course.completedMatches, []);
});

test("checkpoint at exact limit expires; pausing never resets accumulated thinking time", () => {
  const session = game();
  session.start();
  const attemptId = session.attempt.id;
  session.command({ type: "pause", attemptId, elapsedMs: 10000 });
  session.reload();
  session.command({ type: "resume", attemptId }, { now: NOW + 86400000 });
  assert.equal(session.attempt.mathElapsedMs, 10000);
  session.command({ type: "checkpoint", attemptId, elapsedMs: 170000 }, { now: NOW + 86400000 });
  assert.equal(session.attempt, null);
  assert.equal(session.state.course.lastResult.mathElapsedMs, 180000);
});

test("answer and help at the exact deadline expire before accepting work; approximate guesses are wrong", () => {
  for (const type of ["answer", "help"]) {
    const session = game();
    session.start();
    const command = { type, attemptId: session.attempt.id, elapsedMs: 180000 };
    if (type === "answer") command.guess = factAnswer(session.attempt.fact);
    assert.equal(session.command(command).ok, true);
    assert.equal(session.attempt, null);
    assert.equal(session.state.course.lastResult.passed, false);
    assert.equal(session.state.course.lastResult.correct, 0);
    assert.equal(session.state.club.balance, 0);
  }
  const session = game();
  session.start();
  assert.equal(
    session.command({
      type: "answer",
      attemptId: session.attempt.id,
      elapsedMs: 100,
      guess: factAnswer(session.attempt.fact) + 0.05,
    }).ok,
    true,
  );
  assert.equal(session.attempt.feedback, "incorrect");
  assert.equal(session.attempt.correct, 0);
});

test("every attempt command checks ownership; explicit takeover preserves question, queue, timing and phase", () => {
  const session = game();
  session.start();
  session.answer();
  const before = structuredClone(session.attempt),
    attemptId = session.attempt.id;
  for (const command of [
    { type: "answer", guess: 12, elapsedMs: 0 },
    { type: "help", elapsedMs: 0 },
    { type: "pause", elapsedMs: 0 },
    { type: "checkpoint", elapsedMs: 0 },
    { type: "expire", elapsedMs: 0 },
    { type: "continue" },
    { type: "shoot", direction: "left" },
    { type: "resume" },
  ])
    assert.equal(session.command({ ...command, attemptId }, { deviceId: "phone" }).ok, false);
  assert.deepEqual(session.attempt, before);
  assert.equal(
    session.command({ type: "resume", attemptId, takeover: true }, { deviceId: "phone" }).ok,
    true,
  );
  assert.deepEqual({ ...session.attempt, ownerDeviceId: before.ownerDeviceId }, before);
  assert.equal(session.command({ type: "continue", attemptId }).ok, false);
  assert.equal(session.command({ type: "continue", attemptId }, { deviceId: "phone" }).ok, true);
});

test("twenty wins finish four cups, unlock cosmetic milestones and leave nico-5 available for review", () => {
  const session = game();
  for (const match of COURSE_MATCHES) {
    assert.equal(courseMatchUnlocked(session.state, match.id), true);
    assert.equal(completedCup(session.state, match.championshipId), false);
    session.win();
    if (match.index % 5 === 4)
      assert.equal(completedCup(session.state, match.championshipId), true);
  }
  assert.equal(nextCourseMatch(session.state).id, "nico-5");
  assert.equal(session.state.course.completedMatches.length, 20);
  assert.equal(session.state.club.balance, 30);
  assert.equal(cosmeticUnlocked(cosmeticItem("ball-training"), session.state), true);
  assert.equal(cosmeticUnlocked(cosmeticItem("field-sunset"), session.state), true);
  const completed = [...session.state.course.completedMatches];
  session.win();
  assert.deepEqual(session.state.course.completedMatches, completed);
  assert.equal(session.state.course.lastResult.coinsGained, 0);
  assert.equal(session.state.prizeCycle, 10);
  assert.equal(session.state.prizesEarned, 1);
});

test("course milestone cosmetics survive migration and legacy-earned cosmetics remain available", () => {
  const session = game();
  session.win();
  assert.equal(session.command({ type: "equip", itemId: "ball-training" }).ok, true);
  session.reload();
  assert.equal(session.state.cosmetics.ballId, "ball-training");
  const legacy = emptyState();
  legacy.planetStars[5] = 1;
  assert.equal(cosmeticUnlocked(cosmeticItem("field-sunset"), migrateState(legacy)), true);
  assert.equal(cosmeticUnlocked(cosmeticItem("field-sunset"), session.state), false);
});

test("purchases use catalog balance, never auto-equip, and engine rejects equipment not owned", () => {
  const session = game();
  assert.equal(session.command({ type: "equip", itemId: "ball-gold" }).ok, false);
  assert.equal(session.command({ type: "buy", itemId: "ball-gold" }).ok, false);
  session.win();
  assert.equal(session.command({ type: "goal", itemId: "ball-gold" }).ok, true);
  assert.equal(session.command({ type: "buy", itemId: "ball-gold" }).ok, true);
  assert.equal(session.state.club.balance, 0);
  assert.equal(session.state.cosmetics.ballId, "ball-classic");
  assert.equal(session.state.club.goalItemId, null);
  assert.equal(session.command({ type: "equip", itemId: "ball-gold" }).ok, true);
  assert.equal(session.command({ type: "buy", itemId: "ball-gold" }).ok, false);
  assert.equal(session.state.xp, 0);
});

test("settings validate durations and do not rewrite the limit of an active attempt", () => {
  const session = game();
  for (const durationSec of [0, 1, 121, NaN, Infinity, "180"])
    assert.equal(session.command({ type: "settings", durationSec }).ok, false);
  assert.equal(
    session.command({ type: "settings", durationSec: 120, childName: "  Guga  ", sound: false }).ok,
    true,
  );
  assert.equal(session.state.childName, "Guga");
  assert.equal(session.state.sound, false);
  session.start();
  assert.equal(session.attempt.timeLimitMs, 120000);
  session.command({ type: "settings", durationSec: 300 });
  assert.equal(session.attempt.timeLimitMs, 120000);
  assert.equal(session.state.course.durationSec, 300);
  assert.equal(session.command({ type: "settings", childName: "a".repeat(41) }).ok, false);
});

test("result is persisted on reload and cleared only by explicit selection or next start", () => {
  const session = game();
  session.win();
  const result = structuredClone(session.state.course.lastResult);
  session.reload();
  assert.deepEqual(session.state.course.lastResult, result);
  session.command({ type: "select", matchId: "bairro-2" });
  assert.equal(session.state.course.lastResult, null);
  session.win();
  assert.ok(session.state.course.lastResult);
  session.start();
  assert.equal(session.state.course.lastResult, null);
});

test("prize claims are explicit, once per ready cycle, and do not remove course or purchases", () => {
  const state = emptyState();
  state.prizeCycle = 9;
  const session = game(state);
  session.win();
  assert.equal(session.state.prizesEarned, 1);
  assert.equal(session.state.parentAlerts[0].kind, "prize");
  const course = structuredClone(session.state.course),
    club = structuredClone(session.state.club);
  assert.equal(session.command({ type: "claim-prize" }).ok, true);
  assert.equal(session.state.prizeCycle, 0);
  assert.equal(session.state.prizesClaimed, 1);
  assert.equal(session.command({ type: "claim-prize" }).ok, false);
  assert.deepEqual(session.state.course, course);
  assert.deepEqual(session.state.club, club);
});
