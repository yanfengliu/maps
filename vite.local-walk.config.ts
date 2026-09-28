/** Explicit prepared opt-in build. Ordinary vite.config.ts never loads this packet. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { defineConfig, type Connect, type Plugin } from "vite";
import normal from "./vite.config.ts";

const packetDirectory = resolve(import.meta.dirname, "artifacts/pedestrian-native253-20260928/packet");
// The same finite packet admitted by the native253 private configuration.
const pins = [
  ["manifest.json", "a41f57b8eba8840ffecb5e3faf87a5cec0997ddf0fa320200820f3223405e36e"],
  ["context.json", "0339db04b4f700655bdb9b89912e06a6143bc748cc3792fed041865c8f9aadce"],
  ["rig-near.json", "88247600d41eab2d0ee83f6646a821dae72c8525345965e0836a73f54ff0a243"],
  ["rig-medium.json", "aade34bf9005af3c3e530ab5b23d1bfd0c1df280c2b1d6520848daf084f0118f"],
  ["rig-far.json", "235019d2592f9564eaf2945878426b447c30a77a8cecfc6433f2918532a62cf2"],
] as const;
const files = new Map<string, Buffer>();
for (const [name, sha256] of pins) {
  const path = resolve(packetDirectory, name);
  let bytes: Buffer;
  try { bytes = readFileSync(path); }
  catch (error) { throw new Error(`Local walker packet ${path} is unavailable: ${String(error)}. Restore the retained native253 packet before selecting vite.local-walk.config.ts.`); }
  if (createHash("sha256").update(bytes).digest("hex") !== sha256) {
    throw new Error(`Local walker packet ${path} differs from pinned SHA-256 ${sha256}. Restore the retained native253 packet before selecting vite.local-walk.config.ts.`);
  }
  files.set(`/local-walk/${name}`, bytes);
}
// Serve the verified buffers, as the existing rail whitelist does, so later
// disk changes cannot pass a hash-then-open gap. No artifact tree is mounted.
const middleware: Connect.NextHandleFunction = (request, response, next) => {
  const path = (request.url ?? "").split("?")[0]!;
  if (!path.startsWith("/local-walk/")) { next(); return; }
  const bytes = files.get(path);
  response.setHeader("Cache-Control", "no-store");
  if (!bytes) { response.statusCode = 404; response.end(`Local walker route ${path} is not one of the five prepared packet files.`); return; }
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Content-Length", bytes.length);
  response.end(bytes);
};
const packetPlugin: Plugin = {
  name: "maps:prepared-local-walk",
  configureServer(server) { server.middlewares.use(middleware); },
  configurePreviewServer(server) { server.middlewares.use(middleware); },
};
export default defineConfig({
  ...normal,
  cacheDir: resolve(import.meta.dirname, ".vite/local-walk"),
  plugins: [...(normal.plugins ?? []), packetPlugin],
  define: { ...normal.define, __MAPS_LOCAL_WALK__: JSON.stringify({ url: "/local-walk/manifest.json", sha256: pins[0][1] }) },
  build: { ...normal.build, outDir: "artifacts/local-walk/dist" },
});