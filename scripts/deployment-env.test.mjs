import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { assertDeploymentEnvironment, deploymentProblems } from "./deployment-env.mjs";

const configured = (target) => ({
  VERCEL: "1", VERCEL_ENV: target, DATABASE_ENVIRONMENT: target,
  DATABASE_URL: "postgresql://fixture:fixture@database.invalid/fixture",
  BETTER_AUTH_URL: "https://game.example.test",
  BETTER_AUTH_SECRET: "fixture-only-not-a-real-secret-32-characters",
});

test("local validation does not require hosted secrets", () => {
  assert.deepEqual(deploymentProblems({}), []);
});
test("hosted production rejects missing persistence and stable authentication", () => {
  const problems = deploymentProblems({ VERCEL: "1", VERCEL_ENV: "production" });
  for (const name of ["DATABASE_URL", "DATABASE_ENVIRONMENT", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"]) {
    assert.ok(problems.some((p) => p.includes(name)));
  }
});
test("production and isolated preview configurations are accepted", () => {
  for (const target of ["production", "preview"]) assert.deepEqual(deploymentProblems(configured(target)), []);
});
test("preview refuses an explicitly production-scoped database", () => {
  assert.throws(() => assertDeploymentEnvironment({ ...configured("preview"), DATABASE_ENVIRONMENT: "production" }), /DATABASE_ENVIRONMENT/);
});
test("malformed connection strings and errors never disclose values", () => {
  const secret = "private-value-do-not-print";
  const problems = deploymentProblems({ ...configured("production"), DATABASE_URL: secret });
  assert.ok(problems.some((p) => p.includes("DATABASE_URL")));
  assert.ok(!problems.join().includes(secret));
});
test("hosted auth cannot be disabled or use an insecure or credential-bearing origin", () => {
  assert.ok(deploymentProblems({ ...configured("production"), VITE_AUTH_ENABLED: "false" }).length);
  for (const url of ["http://game.example.test", "https://user:pass@game.example.test", "https://game.example.test/path"]) {
    assert.ok(deploymentProblems({ ...configured("production"), BETTER_AUTH_URL: url }).some((p) => p.includes("BETTER_AUTH_URL")));
  }
});
test("build and direct migrations both enforce the deployment guard", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts.prebuild, "node scripts/deployment-env.mjs");
  const migrate = readFileSync(new URL("./migrate.mjs", import.meta.url), "utf8");
  assert.ok(migrate.indexOf("assertDeploymentEnvironment();") < migrate.indexOf("new pg.Pool"));
  const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.equal(vercel.buildCommand, "npm run build");
});
