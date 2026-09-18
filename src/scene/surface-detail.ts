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
 * `createRng` with a fixed seed, so it is byte-identical on every load — the scene is
 * compared across runs and a texture that reshuffled itself would make the gate
 * measure the shuffle.
 *
 * ## What the first version of this tile got wrong
 *
 * The first version shipped and was measured as invisible: the eight-frame
 * re-inspection of the frames captured after it landed (`artifacts/inspection-gpu2/`,
 * certificate runId `fb07b11ea3b8296f`) found every ground and road crop unchanged
 * from the pre-tile capture beyond dither, and measured the cause at **0.36% of albedo
 * between neighbouring texels on the road** (0.40% on the ground). Two independent
 * mistakes produced that, and both are fixed here.
 *
 * **1. The octave amplitudes decayed faster than the lattices refined.** With
 * amplitudes (1, 0.62, 0.38, 0.22, 0.12, 0.06) over lattices of 4 to 128 cells, the
 * field was a smooth 8 m hill, not texture: neighbouring texels differed by 2.3% of
 * the tile's own range (0.36% of albedo at the shipped strength). A tile is visible at
 * a pixel only when its *local* step — not its global range — clears the frame's
 * quantisation, so the spectra below are chosen by measuring that step.
 *
 * **2. Every texel sampled a lattice cell midpoint.** With `u = (x + 0.5) / SIZE` and
 * 128 cells, a texel centre lands exactly on `fx = 0.5`, where smoothstep's slope is
 * zero: the finest octave came out as the *average of two neighbouring lattice values*,
 * halved and smoothed before it was written. Sampling the lattice corners instead
 * (`u = x / SIZE`) makes the finest octave one lattice value per texel, and nearly
 * doubles the neighbouring-texel step of the whole field for the same amplitudes.
 *
 * ## The arithmetic that says the shipped tile is visible
 *
 * The renderer is ACES filmic at the style's exposure and then sRGB. For a small
 * relative change `r` in a surface's scene-linear radiance, the display change is
 * about `0.36 · r(% of albedo)` levels over the luminance range these surfaces occupy:
 * a 6% neighbouring-texel step buys ~2 levels and a 15% step ~5, while anything under
 * ~3% buys less than one level and quantises away. The first version's 0.36% was 0.1 of
 * a level, which is exactly why the re-captured frames were pixel-indistinguishable
 * from the pre-tile ones.
 *
 * The road's 4 m tile resolves one texel every 3.13 cm, so at the hero crossing's
 * measured 0.0144–0.0886 m/px one pixel covers 0.35–2.8 texels: the grain is magnified
 * at the near end and sits at mip 1–2 at the far end, and the mip chain holds the
 * on-screen step roughly constant across that range. With the first-strength vector the
 * road's tile put a mean of **6.1% of albedo** between neighbouring texels (p95 14.4%)
 * at a strength of 0.45 — 17x the 0.36% the frames showed — and the ground's puts 3.0%
 * (p95 6.9%) at 0.3.
 *
 * **Why the road and the ground carry different spectra.** The road is photographed at
 * 0.01–0.09 m/px, where the subject is asphalt aggregate at the texel scale, so its
 * spectrum rises towards the fine octaves. The ground is mostly seen from 0.3–1.4 m/px
 * at the block and overhead framings, so it keeps more coarse content: its
 * 16x16-block spread is 0.21 of the tile's range against the road's 0.18, and the
 * coarse half is the part minification leaves behind.
 *
 * ## What the second version of the road got wrong
 *
 * The tile was present, structured and visible in tile space, and the road still read
 * as flat at 1:1 in the certified satellite plaza frame. Measured on the certificate's
 * own bytes (`artifacts/dusk-light/after-arm/`, runId `ebf66d041d14173b`), the road
 * rect's neighbouring-pixel step was **0.304 display levels, 3.580% of albedo, against
 * the pavement control's 1.604 levels and 5.891% in the same frame**, with 82.2% of
 * neighbouring pixel pairs bit-identical. Two facts from that measurement set this
 * change:
 *
 * **1. The road's own spectrum was the binding constraint, not a global gain.** The
 * frame's step rose sub-linearly with strength on a scratch sweep of this worktree:
 * 0.304 levels at 0.45, 0.444 at 0.75 (1.67x strength, 1.46x step) and 0.614 at 1.1
 * (1.47x again, 1.38x step), all on the old vector and the same pose
 * (`artifacts/grain/arms.md` carries the arms). Reaching the pavement's share by
 * amplitude alone therefore needs roughly 0.9–1.0, and at that strength the coarse
 * octaves of the old vector put visible 4 m blotches across the near field — the road
 * reads as oil-stained, which is the opposite of aggregate.
 *
 * **2. The old vector was dominated by its coarse octaves.** (0.35, 0.45, 0.6, 0.85,
 * 1.2, 1.7) puts most of its energy in the 1–4 m octaves, which at the hero crossing's
 * near field are blotches rather than grain. The shipped vector moves that weight into
 * the 64- and 128-cell octaves and leaves the coarse ones as modulation: it puts
 * **10.30% of albedo between neighbouring texels at mip 0 (p95 24.0%) and 5.43% at
 * mip 1** against the old vector's 6.35% and 3.97%, and in the frame it clears the
 * pavement's share at strength 0.72 where the old spectrum did not clear it at 0.75 or
 * 1.1. The alternative — the same vector with only the two finest octaves doubled —
 * reached 4.63% at mip 1 and 7.733% of albedo in the frame at strength 1.0, so the
 * finer reallocation is the cheaper lever *and* the one that keeps the near field from
 * reading as blotches.
 *
 * Neither is small enough to alias: the mip level is chosen from the world-space UV
 * derivatives, so the distance fade *is* the mip chain, and it fades the finest octave
 * first rather than fading everything to nothing at a fixed rate. Anisotropy is set on
 * the texture because these surfaces are seen at grazing angles, where an isotropic
 * footprint is chosen from the steeper of the two derivatives and blurs the grain
 * along the view direction as well as across it.
 */

import { DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping } from "three";

import { createRng, DEFAULT_SEED } from "../world/rng.js";

/** The surfaces this module textures. `sidewalk` keeps its own seam pattern. */
export type SurfaceDetailKind = "ground" | "road";

/** Power of two, so the mip chain is complete down to 1x1. */
export const DETAIL_SIZE = 128;

/** Lattice cells across the tile, coarsest first, pairing with `OCTAVE_AMPLITUDE`. */
const OCTAVE_CELLS: readonly number[] = [4, 8, 16, 32, 64, 128];

/**
 * How much each octave contributes, coarsest first, per surface.
 *
 * Chosen by measuring the neighbouring-texel step each spectrum produces rather than
 * by eye; the header carries the arithmetic. The road's rises towards the fine octaves
 * because a 3 cm texel is aggregate, and the ground's is flatter because most of what
 * anyone sees of it is minified. The road's 16 m and 8 m octaves are deliberately
 * small: they are the ones that read as blotches rather than grain at the hero
 * crossing's near field, and the display step they cost is worth less than the same
 * weight in the 64- and 128-cell octaves.
 */
const OCTAVE_AMPLITUDE: Readonly<Record<SurfaceDetailKind, readonly number[]>> = Object.freeze({
  ground: Object.freeze([0.6, 0.7, 0.85, 1, 1.2, 1.4]),
  road: Object.freeze([0.04, 0.075, 0.175, 0.5, 2, 5.2]),
});

/**
 * The road's octave weights, exported so the unit case can hold the *shape* of the
 * spectrum and not only the step it produces.
 *
 * A step floor alone cannot see the difference this change is about: the previous
 * spectrum cleared its own floor and the certified frames still drew the road flat,
 * because a spectrum can put its contrast in octaves a viewer integrates. The case in
 * `test/surface-detail.test.ts` asserts this vector rises towards the fine octaves and
 * that the fine half carries the coarse half's step.
 */
export const ROAD_OCTAVE_AMPLITUDE: readonly number[] = OCTAVE_AMPLITUDE.road!;

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
 * This is the number the first version got wrong in the other direction: at 0.16 the
 * road's tile moved 0.36% of albedo between neighbouring texels, which is a tenth of a
 * display level and invisible. 0.45 with the first spectrum put the road's mean step at
 * 6.1% of albedo, which the certified frames then measured as 3.580% in the frame
 * against the pavement's 5.891% — the tile was there and the road still looked flat.
 *
 * The road is 0.72 with the spectrum above, which puts 10.30% of albedo between
 * neighbouring texels at mip 0 (p95 24.0%) and 5.43% at mip 1, and the certified
 * re-capture at that setting measures **7.241% of albedo in the frame against the
 * pavement control's 6.257% in the same frame** (`artifacts/grain/`). The choice
 * between amplitude and spectrum is measured rather than argued: 0.45 × 1.6 = 0.72 of
 * strength would have put the *old* spectrum's 6.35% at 10.2% of mip-0 albedo for the
 * same frame step, and the frames at 1.1 on the old spectrum show the difference — the
 * coarse octaves turn into 4 m blotches where this spectrum leaves grain.
 *
 * The bound that matters is not the strength but the mean: the generator centres the
 * tile, so the surface's palette colour stays its mean and the tile only varies around
 * it. At 0.72 the tile swings the palette colour by at most ±36%, and the measured
 * distribution of the field's extremes is narrower than that. `test/surface-detail.test.ts`
 * holds the bounds and the step.
 */
export const SURFACE_DETAIL_STRENGTH: Readonly<Record<SurfaceDetailKind, number>> = Object.freeze({
  ground: 0.3,
  road: 0.72,
});

/**
 * The tile's texels: one grey value per pixel in RGB, opaque alpha.
 *
 * The value is centred on 128 so the shader can read it as a multiplier around 1.0,
 * which keeps the surface's palette colour as the mean rather than shifting it.
 *
 * Pure and seeded: the same kind gives the same bytes on every call, on every machine,
 * which is what `test/surface-detail.test.ts` checks.
 */
export function surfaceDetailBytes(kind: SurfaceDetailKind): Uint8Array {
  const rng = createRng((DEFAULT_SEED + KIND_SALT[kind]) >>> 0);
  const amplitudes = OCTAVE_AMPLITUDE[kind];
  // Drawn in a fixed order before any sampling, so the sequence does not depend on the
  // loop below.
  const lattices = OCTAVE_CELLS.map((cells) => {
    const values = new Float32Array(cells * cells);
    for (let index = 0; index < values.length; index += 1) values[index] = rng();
    return values;
  });
  const total = amplitudes.reduce((sum, amplitude) => sum + amplitude, 0);

  // Two passes: the octave sum first, then centred and scaled to fill the range.
  // Centring matters because the shader reads this as a multiplier around 1.0, so a
  // tile whose mean sat off 128 would tint the surface rather than texture it — the
  // palette colour is meant to stay the surface's mean.
  const values = new Float32Array(DETAIL_SIZE * DETAIL_SIZE);
  let sum = 0;
  for (let y = 0; y < DETAIL_SIZE; y += 1) {
    for (let x = 0; x < DETAIL_SIZE; x += 1) {
      let value = 0;
      for (let octave = 0; octave < OCTAVE_CELLS.length; octave += 1) {
        value += amplitudes[octave]! * samplePeriodic(lattices[octave]!, OCTAVE_CELLS[octave]!, x / DETAIL_SIZE, y / DETAIL_SIZE);
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
 * A lattice that did not wrap would leave a visible seam at every tile boundary, and at
 * 8 m per tile across a kilometre that is a grid of them.
 *
 * **Corner-aligned on purpose.** `u` is a texel's own fraction of the tile, not its
 * centre, so with 128 cells the finest octave reads one lattice value per texel. Under
 * a centre sampling every texel lands at `fx = 0.5`, where smoothstep's slope is zero,
 * and the finest octave is written as the average of its neighbouring lattice values —
 * halved, smoothed, and part of why the first version was invisible.
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

/** The anisotropy the renderer is asked for; three clamps it to the adapter's limit. */
export const DETAIL_ANISOTROPY = 8;

/**
 * The tile as a GPU texture, ready to be sampled in world space.
 *
 * Mipmaps and repeat wrapping are set explicitly rather than left to the defaults:
 * `DataTexture` arrives with mipmaps off and nearest filtering, and without the mip
 * chain the tile would alias at the overhead framing instead of fading the way the
 * header describes. The colour space is left alone because this is a multiplier and not
 * a colour; an sRGB decode would bend it away from 1.0 at the mean.
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
  // The ground and the road are both seen at grazing angles, where the screen-space
  // footprint is a long thin ellipse. Without anisotropy the mip level comes from the
  // steeper derivative alone, so the grain is averaged away along the view direction as
  // well as across it — which is the mip-fade shape of this defect. Set here and
  // clamped by three against `getMaxAnisotropy()` at upload, so no adapter is asked for
  // more than it has.
  texture.anisotropy = DETAIL_ANISOTROPY;
  texture.needsUpdate = true;
  return texture;
}
