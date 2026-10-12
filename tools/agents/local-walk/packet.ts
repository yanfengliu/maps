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

export function readLocalWalkPacket(directory: string): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  for (const [name, length, digest] of LOCAL_WALK_FILES) {
    const file = resolve(directory, name);
    let bytes: Buffer;
    try {
      const info = lstatSync(file);
      if (!info.isFile() || info.isSymbolicLink()) throw Error("expected a real packet file");
      bytes = readFileSync(file);
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
