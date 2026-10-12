/** Explicit prepared capture build; packet service/binding comes from normal. */
import { resolve } from "node:path";
import { defineConfig } from "vite";
import normal from "./vite.config.ts";

export default defineConfig({
  ...normal,
  cacheDir: resolve(import.meta.dirname, ".vite/local-walk"),
  build: { ...normal.build, outDir: "artifacts/local-walk/dist" },
});
