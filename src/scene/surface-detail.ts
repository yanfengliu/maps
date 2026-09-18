/**
 * The detail texture the ground and road surfaces are tiled with, in world metres.
 *
 * The audit's finding was that these two surfaces carry no map at all: the ground's
 * only albedo variation was a ±3% sinusoid at about 20 m, and the road's grain faded
 * out above 0.015–0.08 m/px, so at mid and far distance both surfaces were flat —
 * and the same bare materials are what washed out the certified plaza frames'
 * near field. This module is the structure that replaces "flat".
 *
 * **Why a texture and not more sine waves.** A sum of sinusoids is periodic in every
 * direction at a handful of scales, so a tiled one reads as a grid at the scale the
 * gate photographs; noise has no such lattice. The texture is generated once from
 * `createRng` with a fixed seed, so it is byte-identical on every load — the scene
 * is compared across runs and a texture that reshuffled itself would make the gate
 * measure the shuffle.
 *
 * **Octaves, and why the coarse ones are the point.** The texture is six octaves of
 * periodic value noise, from 4 lattice cells across the tile up to 128, with the
 * amplitude falling about 0.6 per octave. The coarse half is what survives distance:
 * a hardware mip chain averages the fine octaves away first, and if the texture were
 * only fine grain then minification would converge it to flat grey — which is exactly
 * the failure the road's old `smoothstep(0.015, 0.08, fwidth)` fade produced. Because
 * the tile's own period (8 m on the ground) is several screen pixels even at the
 * overhead framing, one or two coarse octaves are still resolved there.
 *
 * **The scale, and the arithmetic behind it.** The camera is 55° vertical at
 * 1280x720, so the ground plane at distance `d` covers `2·d·tan(27.5°)` vertically —
 * 1.374 m per pixel at the overhead sweep's 950 m, 0.318 at the block's 220 m, 0.065
 * at the plaza's 45 m. A tile is worth choosing by how many pixels it spans there:
 *
 * - ground, **8 m per tile**: 5.8 px at the overhead framing, so mip levels 0–2 are
 *   in play and the 8 m and 4 m octaves land at 5.8 px and 2.9 px. A 2 m tile would
 *   be 1.5 px there and would mip to nothing, which is the defect.
 * - road, **4 m per tile**: 2.9 px overhead, still resolved, and finer than the
 *   ground so asphalt reads as asphalt rather than as the same surface again. The
 *   road is photographed closest of the two — 0.065 m/px at the plaza — so the
 *   coarse octaves are 30 px across from eye level and read as patching, not grain.
 *
 * Neither is small enough to alias, because the hardware picks the mip level from the
 * world-space UV derivatives: the distance fade *is* the mip chain, and it fades the
 * finest octave first rather than fading everything to nothing at a fixed rate.
 */

import { DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping } from "three";

import { createRng, DEFAULT_SEED } from "../world/rng.js";

/** The surfaces this module textures. `sidewalk` keeps its own seam pattern. */
export type SurfaceDetailKind = "ground" | "road";

/** Power of two, so the mip chain is complete down to 1x1. */
export const DETAIL_SIZE = 128;

/** Lattice cells across the tile, coarsest first, pairing with `OCTAVE_AMPLITUDE`. */
const OCTAVE_CELLS: readonly number[] = [4, 8, 16, 32, 64, 128];

/** How much each octave contributes, coarsest first. Coarse dominates on purpose. */
const OCTAVE_AMPLITUDE: readonly number[] = [1, 0.62, 0.38, 0.22, 0.12, 0.06];

/** A different stream per surface, so the two do not share a pattern. */
const KIND_SALT: Readonly<Record<SurfaceDetailKind, number>> = { ground: 0x9e3779b1, road: 0x85ebca6b };

/**
 * Metres per tile, per surface. See the header for how these two numbers were chosen
 * and what breaks if either shrinks.
 */
export const SURFACE_DETAIL_METRES: Readonly<Record<SurfaceDetailKind, number>> = Object.freeze({
  ground: 8,
  road: 4,
});

/**
 * How strongly the tile modulates the surface's own colour, per surface.
 *
 * Deliberately modest: this is structure that has to survive a satellite style whose
 * ground is a dark olive and a cartographic one whose ground is nearly white, and a
 * strong multiplier would swing one of them into mud or into blow-out. The near-field
 * wash-out the plaza frames show is a *missing* variation, so a little contrast goes a
 * long way and too much is its own defect.
 */
export const SURFACE_DETAIL_STRENGTH: Readonly<Record<SurfaceDetailKind, number>> = Object.freeze({
  ground: 0.2,
  road: 0.16,
});

/**
 * The tile's texels: one grey value per pixel in RGB, opaque alpha.
 *
 * The value is centred on 128 so the shader can read it as a multiplier around 1.0,
 * which keeps the surface's palette colour as the mean rather than shifting it.
 *
 * Pure and seeded: the same kind gives the same bytes on every call, on every
 * machine, which is what `test/surface-detail.test.ts` checks.
 */
export function surfaceDetailBytes(kind: SurfaceDetailKind): Uint8Array {
  const rng = createRng((DEFAULT_SEED + KIND_SALT[kind]) >>> 0);
  // Drawn in a fixed order before any sampling, so the sequence does not depend on
  // the loop below.
  const lattices = OCTAVE_CELLS.map((cells) => {
    const values = new Float32Array(cells * cells);
    for (let index = 0; index < values.length; index += 1) values[index] = rng();
    return values;
  });
  const total = OCTAVE_AMPLITUDE.reduce((sum, amplitude) => sum + amplitude, 0);

  // Two passes: the octave sum first, then centred and scaled to fill the range.
  // Centring matters because the shader reads this as a multiplier around 1.0, so a
  // tile whose mean sat off 128 would tint the surface rather than texture it — the
  // palette colour is meant to stay the surface's mean. Filling the range matters
  // because it makes `SURFACE_DETAIL_STRENGTH` the only thing that sets contrast.
  const values = new Float32Array(DETAIL_SIZE * DETAIL_SIZE);
  let sum = 0;
  for (let y = 0; y < DETAIL_SIZE; y += 1) {
    for (let x = 0; x < DETAIL_SIZE; x += 1) {
      let value = 0;
      for (let octave = 0; octave < OCTAVE_CELLS.length; octave += 1) {
        value +=
          OCTAVE_AMPLITUDE[octave]! *
          samplePeriodic(lattices[octave]!, OCTAVE_CELLS[octave]!, (x + 0.5) / DETAIL_SIZE, (y + 0.5) / DETAIL_SIZE);
      }
      values[y * DETAIL_SIZE + x] = value / total;
      sum += value / total;
    }
  }
  const mean = sum / values.length;
  let reach = 0;
  for (const value of values) reach = Math.max(reach, Math.abs(value - mean));
  const scale = reach === 0 ? 0 : 1 / (2 * reach);

  const texels = new Uint8Array(DETAIL_SIZE * DETAIL_SIZE * 4);
  for (let index = 0; index < values.length; index += 1) {
    const grey = Math.max(0, Math.min(255, Math.round((0.5 + (values[index]! - mean) * scale) * 255)));
    const texel = index * 4;
    texels[texel] = grey;
    texels[texel + 1] = grey;
    texels[texel + 2] = grey;
    texels[texel + 3] = 255;
  }
  return texels;
}

/**
 * Bilinear value noise on a lattice that wraps, which is what makes the tile seamless.
 *
 * A lattice that did not wrap would leave a visible seam at every tile boundary, and
 * at 8 m per tile across a kilometre that is a grid of them.
 */
function samplePeriodic(lattice: Float32Array, cells: number, u: number, v: number): number {
  const x = u * cells;
  const y = v * cells;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  // Smoothstep, so the lattice's corners are not visible as creases.
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const at = (ix: number, iy: number): number =>
    lattice[(((iy % cells) + cells) % cells) * cells + (((ix % cells) + cells) % cells)]!;
  const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
  const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}

/**
 * The tile as a GPU texture, ready to be sampled in world space.
 *
 * Mipmaps and repeat wrapping are set explicitly rather than left to the defaults:
 * `DataTexture` arrives with mipmaps off and nearest filtering, and without the mip
 * chain the tile would alias at the overhead framing instead of fading the way the
 * header describes. The colour space is left alone because this is a multiplier and
 * not a colour; an sRGB decode would bend it away from 1.0 at the mean.
 */
export function createSurfaceDetailTexture(kind: SurfaceDetailKind): DataTexture {
  const texture = new DataTexture(surfaceDetailBytes(kind), DETAIL_SIZE, DETAIL_SIZE);
  texture.name = `surface-detail:${kind}`;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}
