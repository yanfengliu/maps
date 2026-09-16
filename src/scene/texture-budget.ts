/**
 * Cap the size of a tile's texture atlases as it loads.
 *
 * MLIT's tiles are generous with texture: 25 of the 67 over the area of interest
 * carry a 4096x4096 WebP atlas, and one of those is 89 MB once it is decoded to
 * RGBA with mipmaps. **All 67 tiles resident at their published size is 2,943 MB**,
 * measured tile by tile from the WebP headers. No browser tab will hold that, and
 * a 3D Tiles cache that cannot hold what the traversal asks for does not degrade
 * — it deadlocks. That is not a guess: with a 48 MB budget this scene downloaded
 * all 67 tiles, produced seven models, and displayed the root tile's seventeen
 * decimated buildings over the whole ward while reporting itself loaded and idle.
 *
 * The alternative to capping is to let the level-of-detail hierarchy stop higher
 * up at wide framings, which is what a hierarchy is for — except that MLIT's
 * coarse levels are aggressively decimated. Depth 4 over this box is **255
 * buildings of 1,740**, so an overhead frame would show the towers standing in an
 * empty valley. That fails the plan's own acceptance criterion, which asks for
 * the area of interest to render end to end at several zoom levels.
 *
 * So the cap. Measured totals for every tile resident at once:
 *
 * | longest side | all 67 tiles | the 44 leaves |
 * |---|---|---|
 * | 4096, as published | 2,943 MB | 2,668 MB |
 * | 2048 | 1,199 MB | 923 MB |
 * | 1536 | 695 MB | 521 MB |
 * | 1024 | 335 MB | 235 MB |
 *
 * **What this costs.** PLATEAU's own facade JPEGs for mesh 53393596 hold 184.4
 * megapixels and MLIT's atlases over the same cell hold 314.6, so the published
 * atlas is 1.7 times the source pixel budget. Capping at 1024 takes a 4096 atlas
 * to about a ninth of the source resolution, which is a real loss at street
 * level and is visible in the plaza frames of the visual sweep. It buys a scene
 * where every one of the 1,740 buildings is present from every framing on a
 * software rasteriser, which is what Phases 2 and 3 are for.
 *
 * The fixed Phase 4 priority policy retains 2048px atlases for tile bounds within
 * 160m of the crossing and 1024px elsewhere, with one geographically selected
 * final-detail frontage leaf at its native 4096px. The 67-input audit selects
 * 17 priority tiles including that leaf: 561,075,583 decoded texture bytes with
 * mipmaps plus 73,324,734 geometry bytes. These are allocation estimates.
 * This is geographic priority, not a camera-dependent upgrade. Original source
 * ImageBitmaps are released after capping; style toggles reuse the capped atlas.
 *
 * The pass that applies this cap lives in `src/scene/facade-textures.ts`, because
 * capping, de-lighting (item 35) and deriving the sign mask (item 16) all touch
 * every pixel of the same atlas and reading it three times would be three times
 * the cost. This file is the cap and its evidence; that file is the work.
 */

/**
 * The longest side for a tile outside the crossing priority area, in pixels.
 *
 * 1024 puts the whole area of interest at leaf detail inside 335 MB. A desktop
 * GPU could afford 2048 and 1,199 MB; the visual gate runs on SwiftShader, where
 * that is system memory and the sweep is already minutes long.
 */
export const MAX_TEXTURE_SIZE = 1024;

/** Fixed geographic priority, independent of camera and world style. The capped
 * atlas remains cached across toggles; this does not promise reversible dynamic
 * resolution after an original ImageBitmap has been released.
 */
export const PRIORITY_TEXTURE_SIZE = 2048;
export const PRIORITY_TEXTURE_RADIUS_M = 160;
/** The observed source facade facing the crossing. Geographic metadata chooses
 * its final-detail leaf; tools/visual/texture-budget.ts requires exactly one.
 */
export const HERO_FRONTAGE_M = Object.freeze({ x: -38.58, z: 21.58 });
export const HERO_TEXTURE_SIZE = 4096;

export function textureLimitForTile(tile: unknown): number {
  const box = (tile as { boundingVolume?: { box?: number[] } } | null)?.boundingVolume?.box;
  if (!box || box.length !== 12 || box.some((value) => !Number.isFinite(value))) return MAX_TEXTURE_SIZE;
  const halfX = Math.abs(box[3]!) + Math.abs(box[6]!) + Math.abs(box[9]!);
  const halfZ = Math.abs(box[5]!) + Math.abs(box[8]!) + Math.abs(box[11]!);
  const detail = tile as { geometricError?: number; children?: unknown[] };
  if (detail.geometricError === 0 && !detail.children?.length && Math.abs(box[0]! - HERO_FRONTAGE_M.x) <= halfX && Math.abs(box[2]! - HERO_FRONTAGE_M.z) <= halfZ) return HERO_TEXTURE_SIZE;
  const dx = Math.max(0, Math.abs(box[0]!) - halfX);
  const dz = Math.max(0, Math.abs(box[2]!) - halfZ);
  return Math.hypot(dx, dz) <= PRIORITY_TEXTURE_RADIUS_M ? PRIORITY_TEXTURE_SIZE : MAX_TEXTURE_SIZE;
}
