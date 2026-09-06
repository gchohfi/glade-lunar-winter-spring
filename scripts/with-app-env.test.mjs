import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import {
  APP_ENV_REL_PATH,
  mergeAppEnv,
  parseAppEnv,
  projectRoot,
  readAppEnv,
} from "./with-app-env.mjs";
import { temporaryWorkspace } from "./test-support/workspace.mjs";

const execFileAsync = promisify(execFile);
const WRAPPER = join(projectRoot(), "scripts/with-app-env.mjs");
const PRINT_FLAG = "process.stdout.write(String(process.env.VITE_AUTH_ENABLED));";

function makeWorkspace(appEnvJson) {
  // Copy the real CLI so projectRoot() resolves to the fixture, not the game.
  return temporaryWorkspace({
    "scripts/with-app-env.mjs": readFileSync(WRAPPER),
    ...(appEnvJson === undefined ? {} : { [APP_ENV_REL_PATH]: appEnvJson }),
  });
}

function commandEnv(overrides = {}) {
  const env = { ...process.env };
  delete env.VITE_AUTH_ENABLED;
  return { ...env, ...overrides };
}

function fixtureWrapper(appEnvJson = '{"VITE_AUTH_ENABLED":"false"}') {
  return join(makeWorkspace(appEnvJson), "scripts/with-app-env.mjs");
}

test("keeps VITE_-prefixed string entries", () => {
  assert.deepEqual(parseAppEnv('{"VITE_AUTH_ENABLED":"false"}'), {
    VITE_AUTH_ENABLED: "false",
  });
});

test("drops non-VITE keys, non-string values and malformed documents", () => {
  assert.deepEqual(parseAppEnv('{"DATABASE_URL":"postgres://x","VITE_N":1,"VITE_OK":"y"}'), {
    VITE_OK: "y",
  });
  assert.deepEqual(parseAppEnv("not json"), {});
  assert.deepEqual(parseAppEnv('["VITE_AUTH_ENABLED"]'), {});
  assert.deepEqual(parseAppEnv("null"), {});
});

test("a missing app-env.json is a clean no-op", () => {
  assert.deepEqual(readAppEnv(makeWorkspace()), {});
});

test("reads the app env from a workspace", () => {
  const root = makeWorkspace('{"VITE_AUTH_ENABLED":"false"}');
  assert.deepEqual(readAppEnv(root), { VITE_AUTH_ENABLED: "false" });
});

test("an explicit process-env override wins over the file", () => {
  const merged = mergeAppEnv(
    { VITE_AUTH_ENABLED: "false" },
    { VITE_AUTH_ENABLED: "true", PATH: "/usr/bin" },
  );
  assert.equal(merged.VITE_AUTH_ENABLED, "true");
  assert.equal(merged.PATH, "/usr/bin");
});

test("an auth-off fixture resolves its explicit flag", () => {
  assert.deepEqual(readAppEnv(makeWorkspace('{"VITE_AUTH_ENABLED":"false"}')), {
    VITE_AUTH_ENABLED: "false",
  });
});

test("vite loadEnv resolves the wrapped value", () => {
  // What `import.meta.env.VITE_AUTH_ENABLED` becomes: loadEnv prefix-matches
  // process.env, so the wrapper's merge has to land before Vite starts.
  // Do not `import { loadEnv } from "vite"` here — Vite 8 loads rolldown
  // native bindings that SIGSEGV the test worker under qemu-user.
  const root = makeWorkspace('{"VITE_AUTH_ENABLED":"false"}');
  const merged = mergeAppEnv(readAppEnv(root), { PATH: "/usr/bin" });
  assert.equal(merged.VITE_AUTH_ENABLED, "false");
});

test("the wrapped command runs with the app env applied", async () => {
  const { stdout } = await execFileAsync(
    process.execPath,
    [fixtureWrapper(), process.execPath, "-e", PRINT_FLAG],
    { env: commandEnv() },
  );
  assert.equal(stdout, "false");
});

test("the wrapped command preserves absence when the workspace has no config", async () => {
  const wrapper = join(makeWorkspace(), "scripts/with-app-env.mjs");
  const { stdout } = await execFileAsync(
    process.execPath,
    [wrapper, process.execPath, "-e", PRINT_FLAG],
    { env: commandEnv() },
  );
  assert.equal(stdout, "undefined");
});

test("the wrapped command applies an explicit auth-on file", async () => {
  const { stdout } = await execFileAsync(
    process.execPath,
    [fixtureWrapper('{"VITE_AUTH_ENABLED":"true"}'), process.execPath, "-e", PRINT_FLAG],
    { env: commandEnv() },
  );
  assert.equal(stdout, "true");
});

test("the wrapped command sees an explicit override, not the file value", async () => {
  const { stdout } = await execFileAsync(
    process.execPath,
    [fixtureWrapper(), process.execPath, "-e", PRINT_FLAG],
    { env: commandEnv({ VITE_AUTH_ENABLED: "true" }) },
  );
  assert.equal(stdout, "true");
});

test("the wrapper propagates the command's exit code", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [WRAPPER, process.execPath, "-e", "process.exit(3)"]),
    (err) => err.code === 3,
  );
});

test("a signal-killed command is never reported as success", async () => {
  // The wrapper's own SIGTERM handler must not swallow the re-raised signal:
  // a cancelled build reporting exit 0 is a silently passing gate.
  await assert.rejects(
    execFileAsync(process.execPath, [
      WRAPPER,
      process.execPath,
      "-e",
      "process.kill(process.pid, 'SIGTERM');setTimeout(() => {}, 1000);",
    ]),
    (err) => err.signal === "SIGTERM" || err.code !== 0,
  );
});

test("the CLI still runs when invoked through a symlinked path", async () => {
  // node realpaths import.meta.url but not process.argv[1], so a raw comparison
  // turns the wrapper into a no-op that exits 0 without starting anything.
  const root = makeWorkspace('{"VITE_AUTH_ENABLED":"false"}');
  const link = join(temporaryWorkspace(), "scripts");
  symlinkSync(join(root, "scripts"), link);
  const { stdout } = await execFileAsync(
    process.execPath,
    [join(link, "with-app-env.mjs"), process.execPath, "-e", PRINT_FLAG],
    { env: commandEnv(), cwd: temporaryWorkspace() },
  );
  assert.equal(stdout, "false");
});
