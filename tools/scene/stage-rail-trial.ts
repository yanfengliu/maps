/** Copy admitted bytes into a new owned overlay. Never builds or writes source data. */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { RAIL_TRIAL_IDS, validateRailTrial, type RailAssetPin, type RailTrialManifest, type RailReplacement } from "../../src/world/rail-trial.ts";

const root = process.cwd();
const run = path.resolve(root, "artifacts/rail-aoi-prototype-20260927/run-12");
const output = path.resolve(root, "artifacts/rail-runtime-trial-20260927/overlay");
const digest = (b: Buffer): string => createHash("sha256").update(b).digest("hex");
const seal = path.resolve(root, "artifacts/rail-aoi-prototype-20260927/freeze-145-150.json");
if (digest(fs.readFileSync(seal)) !== "692de553f6d69b95cb953caa83eea384a5d4a751c9a735724bb8ce62a8236dbb") throw Error("Rail run12 seal changed; restore the admitted source before staging.");
const frozen = JSON.parse(fs.readFileSync(seal, "utf8")) as { files: (RailAssetPin & { file: string })[] };
for (const pin of frozen.files) {
  const bytes = fs.readFileSync(path.resolve(root, pin.file));
  if (bytes.length !== pin.bytes || digest(bytes) !== pin.sha256) throw Error(`Rail run12 input ${pin.file} changed; preserve that change separately before staging.`);
}
if (fs.existsSync(output)) throw Error(`Rail overlay ${output} already exists; preserve the trial instead of overwriting it.`);
fs.mkdirSync(output, { recursive: true });
function write(file: string, bytes: Buffer): RailAssetPin { fs.writeFileSync(path.join(output, file), bytes, { flag: "wx" }); return { file, bytes: bytes.length, sha256: digest(bytes) }; }
const copy = (file: string): RailAssetPin => write(file, fs.readFileSync(path.join(run, file)));
const structures = JSON.parse(fs.readFileSync(path.join(run, "structures.json"), "utf8")) as { structures: { kind: "shaft" | "truss"; asset: { name: string } }[] };
const layers: RailTrialManifest["layers"] = ["rails", "sleepers", "supports", "ballast"].map(kind => ({ ...copy(`${kind}.mesh`), kind: kind as "rails" | "sleepers" | "supports" | "ballast" }));
for (const s of structures.structures) layers.push({ ...copy(`${s.asset.name}.mesh`), kind: s.kind });
const replacements = RAIL_TRIAL_IDS.map(id => {
  const file = `building-${id}.json`, bytes = fs.readFileSync(path.join(run, file));
  const data = JSON.parse(bytes.toString()) as RailReplacement;
  const uris = [...new Set(data.sourceIdentity.map(s => s.uri))];
  if (uris.length !== 1 || data.id !== id) throw Error(`Rail replacement ${id} has inconsistent source identity.`);
  return { ...write(file, bytes), id, uri: uris[0]! };
});
const pins = JSON.parse(fs.readFileSync(path.join(run, "input-pins.json"), "utf8")) as RailAssetPin[];
const tiles = [...new Set(replacements.map(r => r.uri))].map(uri => {
  const file = `data/scene/buildings/${uri}`, pin = pins.find(p => p.file === file);
  if (!pin || digest(fs.readFileSync(path.resolve(root, file))) !== pin.sha256) throw Error(`Rail source ${file} differs from admitted run12.`);
  return { ...pin, file: path.basename(file), uri };
});
const materials = write("authored-materials.json", Buffer.from(JSON.stringify({
  bound: "Authored trial finishes; not source texture or measured material. Frozen before reserved H0/H1 appearance review.",
  satellite: { rails: [0x7b7b76, .42, .65], sleepers: [0x8c8980, .94, 0], supports: [0x85847b, .96, 0], ballast: [0x645f53, 1, 0], shaft: [0x85847b, .96, 0], truss: [0x606b66, .65, .35] },
  cartographic: { rails: [0x667277, .6, .25], sleepers: [0xb3b1a6, .94, 0], supports: [0xa9ada9, .96, 0], ballast: [0x8a8a7d, 1, 0], shaft: [0xa9ada9, .96, 0], truss: [0x708487, .72, .2] },
  returns: "Existing building section palette × 0.58, roughness0.95; no source atlas/emission on authored cut faces.",
})));
const manifest: RailTrialManifest = { version: "rail-trial-v1", layers, replacements, tiles, provenance: copy("source-centrelines.json"), recipe: copy("authored-recipe.json"), materials };
validateRailTrial(manifest);
const pin = write("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
console.log(JSON.stringify({ output, manifest: pin, layers: layers.length, replacements: replacements.length, sourceTiles: tiles.length }));
