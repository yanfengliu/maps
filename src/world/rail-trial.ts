/** Admitted static rail packet. Generated/source bytes stay outside the bundle. */
export const RAIL_MANIFEST_SHA256 = "e8e41c2944601c5d574fb1596c89a4ee4bb2b6bbb8bac54d240863ffdb3ff707";
export const RAIL_DATA_PREPARATION = "Restore the admitted external 34-file rail packet, then run `npm run data:rail -- --from <path/to/manifest.json>`. `npm run data:setup` does not recreate that packet.";
export interface RailAssetPin { file: string; bytes: number; sha256: string }
export interface RailTrialManifest {
  version: "rail-trial-v1";
  layers: (RailAssetPin & { kind: "rails" | "sleepers" | "supports" | "ballast" | "shaft" | "truss" })[];
  replacements: (RailAssetPin & { id: string; uri: string })[];
  tiles: (RailAssetPin & { uri: string })[];
  provenance: RailAssetPin;
  recipe: RailAssetPin;
  materials: RailAssetPin;
}
export interface RailSourceFace {
  index: number; uri: string; node: number; primitive: number; face: number;
  gmlId: string; batchId: number; material: number;
  p: number[][]; n: number[][]; uv: number[][] | null;
}
export interface RailReplacementTriangle {
  source: number; sourceIdentity: Omit<RailSourceFace, "index" | "material" | "p" | "n" | "uv"> | null;
  material: number; positions: number[]; normals: number[]; uv: number[] | null; weights: number[][];
}
export interface RailReplacement { id: string; sourceIdentity: RailSourceFace[]; triangles: RailReplacementTriangle[] }
export const RAIL_TRIAL_IDS = [
  "bldg_20234796-412f-494e-b712-f3f7d6e3197b", "bldg_5db01781-54dc-4dbb-b392-cae3696fe8e2",
  "bldg_d7fb4726-719f-47a1-a94f-4d0a1e89a2e0", "bldg_1e7ccbe9-00e9-4756-bb12-bb123c5c3c1e",
  "bldg_5e342582-90bd-4497-b851-648330ac5704", "bldg_140d14bc-f7bd-45fa-a429-c296f4082805",
  "bldg_c8c721d8-46ef-4fe1-bc43-b7501a4427cf", "bldg_bc689157-d681-4005-a108-daa2827fd93c",
  "bldg_feb33dea-41a8-4487-bdeb-b85cef69d436", "bldg_780bc11d-0c0c-440d-9546-a2f86e8295c6",
] as const;
declare const __MAPS_RAIL_TRIAL__: { url: string; sha256: string } | null;
export const RAIL_TRIAL_BINDING = typeof __MAPS_RAIL_TRIAL__ === "undefined" ? null : __MAPS_RAIL_TRIAL__;
export function trialAssets(m: RailTrialManifest): RailAssetPin[] {
  return [...m.layers, ...m.replacements, m.provenance, m.recipe, m.materials];
}
export function validateRailTrial(m: RailTrialManifest): void {
  const fail = (detail: string): never => { throw new Error(`Rail manifest ${detail}. ${RAIL_DATA_PREPARATION}`); };
  if (m.version !== "rail-trial-v1" || m.layers.length !== 20 || m.replacements.length !== 10) fail("needs version rail-trial-v1, twenty layers/structures and ten replacements");
  if (JSON.stringify(m.replacements.map(r => r.id).sort()) !== JSON.stringify([...RAIL_TRIAL_IDS].sort())) fail("has a different building roster");
  for (const kind of ["rails", "sleepers", "supports", "ballast", "shaft", "truss"] as const) {
    if (m.layers.filter(r => r.kind === kind).length !== (kind === "shaft" || kind === "truss" ? 8 : 1)) fail(`has the wrong ${kind} count`);
  }
  const assets = trialAssets(m);
  if (new Set(assets.map(r => r.file)).size !== assets.length) fail("contains duplicate files");
  for (const pin of [...assets, ...m.tiles]) if (!/^[a-zA-Z0-9_.-]+$/.test(pin.file) || !/^[0-9a-f]{64}$/.test(pin.sha256) || !Number.isSafeInteger(pin.bytes) || pin.bytes <= 0) fail(`has an invalid pin for ${pin.file}`);
  if (new Set(m.tiles.map(t => t.uri)).size !== m.tiles.length || m.tiles.some(t => !/^data\/data\d+\.b3dm$/.test(t.uri))) fail("has invalid source tile bindings");
  for (const row of m.replacements) if (!m.tiles.some(t => t.uri === row.uri)) fail(`does not bind the source tile for ${row.id}`);
}
