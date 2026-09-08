import { isMainModule } from "./with-app-env.mjs";

/** Validate names and shape only; never print environment values. */
export function deploymentProblems(env) {
  const target = env.VERCEL_ENV?.trim();
  if (!env.VERCEL && !target) return [];
  const problems = [];
  if (!["production", "preview", "development"].includes(target)) {
    problems.push("VERCEL_ENV must identify the deployment environment.");
  }
  if (!env.DATABASE_URL?.trim()) {
    problems.push("DATABASE_URL is required; hosted games cannot use temporary storage.");
  } else {
    try {
      const url = new URL(env.DATABASE_URL.trim());
      if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname) {
        problems.push("DATABASE_URL must be a Postgres connection string.");
      }
    } catch {
      problems.push("DATABASE_URL must be a valid connection string.");
    }
  }
  // Configure this alongside the dedicated database, not across all environments.
  // This explicit guard catches accidental Production variables linked to Preview.
  if (!target || env.DATABASE_ENVIRONMENT?.trim() !== target) {
    problems.push("DATABASE_ENVIRONMENT must match VERCEL_ENV; use a separate preview database.");
  }
  if ((env.BETTER_AUTH_SECRET?.trim().length ?? 0) < 32) {
    problems.push("BETTER_AUTH_SECRET must be a stable server secret of at least 32 characters.");
  }
  try {
    const origin = new URL(env.BETTER_AUTH_URL?.trim() ?? "");
    if (origin.protocol !== "https:" || origin.username || origin.password ||
        origin.pathname !== "/" || origin.search || origin.hash) {
      problems.push("BETTER_AUTH_URL must be the HTTPS origin of this environment.");
    }
  } catch {
    problems.push("BETTER_AUTH_URL must be the HTTPS origin of this environment.");
  }
  if (env.VITE_AUTH_ENABLED?.trim() === "false") {
    problems.push("VITE_AUTH_ENABLED cannot disable sign-in for a hosted game.");
  }
  return problems;
}

export function assertDeploymentEnvironment(env = process.env) {
  const problems = deploymentProblems(env);
  if (problems.length) throw new Error(`[deployment] Configuration required:\n${problems.join("\n")}`);
}

if (isMainModule(import.meta.url)) {
  try {
    assertDeploymentEnvironment();
    console.log("[deployment] Environment check passed.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
