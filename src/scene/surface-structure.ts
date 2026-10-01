/** Authored material structure. The seed atlas is finite and clamped over this
 * AOI; it is never a repeating colour tile or a classification of unknown land.
 * Fine aggregate remains owned by surface-detail.ts.
 */
import { ClampToEdgeWrapping, DataTexture, NearestFilter, NoColorSpace } from "three";
import { createRng, DEFAULT_SEED } from "../world/rng.js";

export const STRUCTURE_SEED_SIZE = 64;
export const STRUCTURE_CELL_METRES = 24;
/** RGBA8, no mips: 16,384 bytes per material, including all uploaded levels. */
export const STRUCTURE_TEXTURE_BYTES = STRUCTURE_SEED_SIZE * STRUCTURE_SEED_SIZE * 4;
export function structureSeedBytes(kind: "road" | "sidewalk" | "ground"): Uint8Array {
  const salt = { road: 0x7195f210, sidewalk: 0x529b7a35, ground: 0x27f9d312 }[kind];
  const rng = createRng((DEFAULT_SEED + salt) >>> 0);
  return Uint8Array.from({ length: STRUCTURE_TEXTURE_BYTES }, () => Math.floor(rng() * 256));
}
export function createStructureSeedTexture(kind: "road" | "sidewalk" | "ground"): DataTexture {
  const texture = new DataTexture(structureSeedBytes(kind), STRUCTURE_SEED_SIZE, STRUCTURE_SEED_SIZE);
  texture.name = `surface-structure:${kind}`;
  texture.colorSpace = NoColorSpace;
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
export const STRUCTURE_GLSL = /* glsl */ `
uniform sampler2D mapsStructureSeeds;
uniform float mapsStructureStrength;
vec4 mapsStructureSeed(vec2 cell) {
  return texture2D(mapsStructureSeeds, (clamp(cell + vec2(32.0), vec2(0.0), vec2(63.0)) + 0.5) / 64.0);
}
float mapsStructureRegion(vec2 metres) {
  vec2 p = metres / 24.0;
  vec2 cell = floor(p);
  vec2 phase = fract(p); phase = phase * phase * (3.0 - 2.0 * phase);
  return mix(mix(mapsStructureSeed(cell).r, mapsStructureSeed(cell + vec2(1.0, 0.0)).r, phase.x),
    mix(mapsStructureSeed(cell + vec2(0.0, 1.0)).r, mapsStructureSeed(cell + vec2(1.0, 1.0)).r, phase.x), phase.y);
}
// A sparse nonperiodic resurfacing/paving region inside each 24 m cell.
// Its size, location, turn and presence are seeded independently in each cell.
vec2 mapsStructurePanel(vec2 metres) {
  vec2 cell = floor(metres / 24.0);
  vec4 seed = mapsStructureSeed(cell);
  vec2 local = metres - (cell + 0.5) * 24.0 - (seed.gb - 0.5) * 5.0;
  float angle = seed.r * 6.28318530718;
  vec2 turned = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * local;
  vec2 halfSize = vec2(2.0 + seed.b * 3.0, 3.0 + seed.g * 5.0);
  vec2 q = abs(turned) - halfSize;
  float signedEdge = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0);
  float aa = max(length(fwidth(metres)), 0.015);
  float present = step(0.58, seed.a);
  float panelCoverage = (1.0 - smoothstep(-aa, aa, signedEdge)) * present;
  float seam = (1.0 - smoothstep(max(0.0, 0.12 - aa), 0.12 + aa, abs(signedEdge)))
    * min(1.0, 0.12 / aa) * present;
  return vec2(panelCoverage, seam);
}
`;
