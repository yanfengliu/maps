/** Authored finish for mapped continuous tactile paths. The source routes and
 * support remain authoritative; this is not a surveyed tile or warning layout.
 */
import { DataTexture, LinearFilter, LinearMipmapLinearFilter, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from "three";
import { createRng } from "../world/rng.js";
import type { WorldStyle } from "../world/styles.js";
import type { SurfaceMaterial } from "./surface-materials.js";

export const TACTILE_FINISH = Object.freeze({ tileM: .3, variants: 4, liftM: .02, reliefM: .005, texels: 128 });

/** A four-tile run avoids identical neighbouring wear. Mips and anisotropy
 * integrate the small ribs at block distance rather than drawing dark lines.
 */
export function createTactileFinish(style: WorldStyle): SurfaceMaterial {
  const width = TACTILE_FINISH.texels, height = width * TACTILE_FINISH.variants;
  const colour = new Uint8Array(width * height * 4), relief = new Uint8Array(colour.length), roughness = new Uint8Array(colour.length);
  const rng = createRng(0x74616374), tones = Array.from({ length: TACTILE_FINISH.variants }, () => .96 + rng() * .08);
  const smooth = (a: number, b: number, value: number): number => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = (x + .5) / width, v = ((y % width) + .5) / width, tile = Math.floor(y / width);
    const edge = Math.min(u, 1 - u, v, 1 - v);
    const tileTop = smooth(.004, .014, edge); // 2.4mm joint, gently bevelled tile edge.
    const ribAcross = 1 - smooth(.085, .16, Math.abs(((u * 4) % 1) - .5));
    const ribEnd = smooth(.045, .075, v) * (1 - smooth(.925, .955, v));
    const rib = ribAcross * ribEnd, grain = (rng() - .5) * .035;
    const tone = (tileTop * (.97 + .025 * rib) + (1 - tileTop) * .79) * tones[tile]! + grain;
    const offset = (y * width + x) * 4;
    for (let c = 0; c < 3; c++) colour[offset + c] = Math.round([203, 184, 104][c]! * tone);
    colour[offset + 3] = 255;
    const bump = Math.round(255 * (tileTop * .12 + rib * .8));
    const matt = Math.round(220 - rib * 14 + (rng() - .5) * 8);
    for (let c = 0; c < 3; c++) { relief[offset + c] = bump; roughness[offset + c] = matt; }
    relief[offset + 3] = 255; roughness[offset + 3] = 255;
  }
  const texture = (bytes: Uint8Array): DataTexture => {
    const map = new DataTexture(bytes, width, height);
    map.wrapS = map.wrapT = RepeatWrapping; map.magFilter = LinearFilter; map.minFilter = LinearMipmapLinearFilter;
    map.generateMipmaps = true; map.anisotropy = 8; map.needsUpdate = true;
    return map;
  };
  const map = texture(colour), bumpMap = texture(relief), roughnessMap = texture(roughness);
  map.colorSpace = SRGBColorSpace;
  // Match crossing paint's ordering above the sidewalk's (-2,-4) depth bias.
  // Physical millimetres alone cannot outrank that slope-dependent GPU offset.
  const material = new MeshStandardMaterial({ map, bumpMap, bumpScale: TACTILE_FINISH.reliefM, roughnessMap, roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  let disposed = false;
  const apply = (next: WorldStyle): void => { if (!disposed) material.color.setHex(next.facade === "photographic" ? 0xffffff : 0xe8ebdf); };
  apply(style);
  return { material, apply, dispose(): void { if (disposed) return; disposed = true; map.dispose(); bumpMap.dispose(); roughnessMap.dispose(); material.dispose(); } };
}
