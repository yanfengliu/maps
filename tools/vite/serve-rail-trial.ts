/** A finite manifest whitelist. No artifact directory is ever mounted. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import type { Connect, Plugin } from "vite";
import { RAIL_DATA_PREPARATION, trialAssets, validateRailTrial, type RailTrialManifest } from "../../src/world/rail-trial.ts";

export function railTrialServer(manifestFile: string, expectedManifest?: string): { plugin: Plugin; binding: { url: string; sha256: string } } {
  const read = (file: string): Buffer => { try { return readFileSync(file); } catch (error) { throw new Error(`Rail data ${file} is unavailable: ${String(error)}. ${RAIL_DATA_PREPARATION}`); } };
  const manifestBytes = read(manifestFile);
  const digest = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
  if (expectedManifest && digest(manifestBytes) !== expectedManifest) throw new Error(`Rail data ${manifestFile} differs from admitted SHA-256 ${expectedManifest}. ${RAIL_DATA_PREPARATION}`);
  const manifest = JSON.parse(manifestBytes.toString()) as RailTrialManifest;
  validateRailTrial(manifest);
  // Read, verify and serve these same byte buffers. A later disk change cannot
  // pass a hash-then-open gap; the capture also binds disk before and after.
  const files = new Map<string, Buffer>([["/rail-trial/manifest.json", manifestBytes]]);
  for (const pin of trialAssets(manifest)) {
    const bytes = read(resolve(dirname(manifestFile), pin.file));
    if (bytes.length !== pin.bytes || digest(bytes) !== pin.sha256) throw new Error(`Rail asset ${pin.file} differs from its manifest; no partial packet may be served. ${RAIL_DATA_PREPARATION}`);
    files.set(`/rail-trial/${pin.file}`, bytes);
  }
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = (req.url ?? "").split("?")[0]!;
    if (!url.startsWith("/rail-trial/")) { next(); return; }
    const bytes = files.get(url);
    res.setHeader("cache-control", "no-store");
    if (!bytes) { res.statusCode = 404; res.end(`Rail trial route ${url} is not in the frozen manifest.`); return; }
    res.setHeader("content-type", url.endsWith(".json") ? "application/json" : "application/octet-stream");
    res.setHeader("content-length", bytes.length); res.end(bytes);
  };
  return {
    binding: { url: "/rail-trial/manifest.json", sha256: digest(manifestBytes) },
    plugin: { name: "maps:rail-trial", configureServer(s) { s.middlewares.use(middleware); }, configurePreviewServer(s) { s.middlewares.use(middleware); } },
  };
}
