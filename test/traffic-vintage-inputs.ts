/** Exact ignored historical inputs; no runtime-cache fallback, fetch or skipped case. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { NetworkData } from "../src/world/network-data.ts";
import type { VehicleAssetManifest } from "../src/world/agent-assets.ts";
import type { ControlHardwareData } from "../src/world/control-hardware.ts";
export function pinnedTrafficInput<T>(relative: string, pins: readonly (readonly [number, string])[]): T {
  const file = new URL("../" + relative, import.meta.url);
  let bytes: Buffer;
  try { bytes = readFileSync(file, { flag: "r" }); } catch (cause) { throw Error(`Traffic regression requires reviewed ${relative}; restore its exact retained source copy before testing. No download, skip or runtime-cache fallback is allowed.`, { cause }); }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (!pins.some(([size, digest]) => bytes.length === size && sha256 === digest)) throw Error(`Traffic regression requires reviewed ${relative}; got ${bytes.length} bytes / ${sha256}. Restore its exact retained source copy; no download, skip or runtime-cache fallback is allowed.`);
  return JSON.parse(bytes.toString()) as T;
}
export function historicalTrafficInputs(): { network: NetworkData; fleet: VehicleAssetManifest } {
  try { return {
    network: pinnedTrafficInput<NetworkData>("artifacts/local-walk-historical-source/data/network/network.json", [[10239410, "314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677"]]),
    fleet: pinnedTrafficInput<VehicleAssetManifest>("artifacts/local-walk-historical-source/data/scene/agents/vehicles.json", [[4128, "5b29efc7977949db1611273c8fb294b3ab23a1a55c8f42316cad9b5309c94a01"]]),
  }; } catch (cause) { throw Error("Restore exact reviewed OLD network.json and agents/vehicles.json under artifacts/local-walk-historical-source/data/ before traffic regression tests; fresh runtime sources cannot replace these historical fixtures.", { cause }); }
}
export function currentTrafficHardware(): ControlHardwareData {
  return pinnedTrafficInput<ControlHardwareData>("data/scene/control-hardware.json", [[100180, "6b8afb406d339cb8bed7926ef8ec800711f4f309ef69c4794203aa0603248b3b"], [100769, "c5c93afbe2cbc4634018a2b0848bfbad19572157374b4bc42a9602406a767c6c"]]);
}
