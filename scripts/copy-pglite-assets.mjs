import { copyFile, mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { isMainModule, projectRoot } from "./with-app-env.mjs";

const require = createRequire(import.meta.url);

/** Nitro bundles the JS into _libs; PGLite resolves its WASM/data beside it. */
export async function copyPgliteAssets(root = projectRoot()) {
  const source = dirname(require.resolve("@electric-sql/pglite"));
  const target = join(root, ".vercel/output/functions/__server.func/_libs");
  // Do not create a convincing output tree when Vite did not build this preset.
  await stat(target);
  await mkdir(target, { recursive: true });
  for (const file of ["pglite.data", "pglite.wasm", "initdb.wasm"]) {
    await copyFile(join(source, file), join(target, file));
  }
  console.log("PGLite runtime assets packaged for the local/server preview.");
}
if (isMainModule(import.meta.url)) await copyPgliteAssets();
