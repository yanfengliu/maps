/** Bound: the exact cached packet contract. This is not actor/contact acceptance. */
import { readFileSync, lstatSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

export const LOCAL_WALK_PACKET_DIRECTORY = "data/scene/local-walk/packet";
export const LOCAL_WALK_FILES = [
  ["manifest.json", 4722, "c9d3157b8a0fc2017269e64468a6003b6715de7be4b6d79622972ba357995676"],
  ["context.json", 1177564, "f04db2a02cdf9e8369028d96c3706fd50e220c3afb5e49a8b75237e45d172d7c"],
  ["rig-near.json", 6165732, "88247600d41eab2d0ee83f6646a821dae72c8525345965e0836a73f54ff0a243"],
  ["rig-medium.json", 1325664, "aade34bf9005af3c3e530ab5b23d1bfd0c1df280c2b1d6520848daf084f0118f"],
  ["rig-far.json", 762110, "235019d2592f9564eaf2945878426b447c30a77a8cecfc6433f2918532a62cf2"],
] as const;

// Produced by the existing fresh1695 factory, preserving the original tuple above.
export const FRESH_LOCAL_WALK_FILES = [
  ["manifest.json", 4722, "801ce9a8f1b8400e3abe7aa0af779a0b30353467e7a5aa89a1aca98e5ff4dc98"],
  ["context.json", 1177684, "20865faca606a2e410d3f8fe10e1afea3e7e96bddebd36464e0ce4e1013d5a13"],
  ...LOCAL_WALK_FILES.slice(2),
] as const;

export function readLocalWalkPacket(directory: string, expectedManifest?: string): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  const manifestFile = resolve(directory, "manifest.json");
  let manifest: Buffer;
  try {
    const info = lstatSync(manifestFile);
    if (!info.isFile() || info.isSymbolicLink()) throw Error("expected a real packet file");
    manifest = readFileSync(manifestFile);
  } catch (error) {
    throw Error(`Local walker packet ${manifestFile} is unavailable: ${String(error)}. Restore its reviewed cached prerequisites and run npm run data:local-walk; see README.md.`);
  }
  const manifestSha = createHash("sha256").update(manifest).digest("hex");
  const pins = manifestSha === LOCAL_WALK_FILES[0][2] ? LOCAL_WALK_FILES : manifestSha === FRESH_LOCAL_WALK_FILES[0][2] ? FRESH_LOCAL_WALK_FILES : null;
  if (!pins || (expectedManifest !== undefined && manifestSha !== expectedManifest)) {
    throw Error(`Local walker packet ${manifestFile} has SHA-256 ${manifestSha}; it requires ${expectedManifest ?? "one of the exact retained776 or fresh1695 packet tuples"}. Preserve the different packet and run npm run data:local-walk after restoring this profile's prerequisites.`);
  }
  for (const [name, length, digest] of pins) {
    const file = resolve(directory, name);
    let bytes: Buffer;
    try {
      const info = lstatSync(file);
      if (!info.isFile() || info.isSymbolicLink()) throw Error("expected a real packet file");
      bytes = name === "manifest.json" ? manifest : readFileSync(file);
    } catch (error) {
      throw Error(`Local walker packet ${file} is unavailable: ${String(error)}. Restore its reviewed cached prerequisites and run npm run data:local-walk; see README.md.`);
    }
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== length || actual !== digest) {
      throw Error(`Local walker packet ${file} has ${bytes.length} bytes / SHA-256 ${actual}; it requires ${length} / ${digest}. Preserve the different packet, restore reviewed cached prerequisites and run npm run data:local-walk; see README.md.`);
    }
    files.set(name, bytes);
  }
  return files;
}
