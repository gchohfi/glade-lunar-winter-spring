import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Exercise the actual handler with a simulated effect starting on the server reply.
// The browser playtest separately verifies RAF time advancing after a timed-out retry.
const source = readFileSync(new URL("../src/components/mission-play.tsx", import.meta.url), "utf8");
const handler = source.slice(
  source.indexOf("  const startOrResume = async () => {"),
  source.indexOf("  const kick = async"),
);
const createHandler = new Function(
  "unlockAudio",
  "consumeTime",
  "setLocalPaused",
  "act",
  "attempt",
  "owned",
  "match",
  `${handler}\nreturn startOrResume;`,
);

test("retry resets the old timer before the new attempt reply starts its answering segment", async () => {
  const events = [];
  let timerRunning = false;
  const run = createHandler(
    () => {},
    () => {
      events.push("reset");
      timerRunning = false;
    },
    (value) => events.push(value ? "paused" : "playing"),
    async (command) => {
      assert.deepEqual(command, { type: "start", matchId: "cidade-1" });
      await Promise.resolve();
      events.push("reply");
      timerRunning = true;
      return { status: "applied" };
    },
    null,
    false,
    { id: "cidade-1" },
  );
  await run();
  assert.deepEqual(events, ["reset", "paused", "reply", "playing"]);
  assert.equal(timerRunning, true, "a retry must not cancel the newly mounted timer");
});

test("a rejected takeover stays locally paused instead of starting an unconfirmed attempt", async () => {
  const pauses = [];
  const run = createHandler(
    () => {},
    () => {},
    (value) => pauses.push(value),
    async (command) => {
      assert.deepEqual(command, { type: "resume", attemptId: "active-1", takeover: true });
      return { status: "conflict" };
    },
    { id: "active-1" },
    false,
    { id: "cidade-1" },
  );
  await run();
  assert.deepEqual(pauses, [true]);
});
