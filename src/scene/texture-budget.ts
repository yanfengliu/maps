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
 * Phase 4 owns facades — item 15 rebuilds them and item 35 de-lights them — and
 * Phase 9 owns the memory budget. Either may raise `MAX_TEXTURE_SIZE`; the table
 * above says what it will cost.
 */

import type { Object3D, Texture } from "three";

/**
 * The longest side any tile texture may have, in pixels.
 *
 * 1024 puts the whole area of interest at leaf detail inside 335 MB. A desktop
 * GPU could afford 2048 and 1,199 MB; the visual gate runs on SwiftShader, where
 * that is system memory and the sweep is already minutes long.
 */
export const MAX_TEXTURE_SIZE = 1024;

interface TileLike {
  [key: string]: unknown;
}

/**
 * A `3d-tiles-renderer` plugin that shrinks oversized textures before the tile is used.
 *
 * `processTileModel` is the hook that runs after the glTF is parsed and **before**
 * the library measures the tile's memory, so the LRU cache's byte accounting sees
 * the capped size rather than the published one. Doing this in the `load-model`
 * event instead would leave the cache budgeting for textures that are no longer
 * there, and the budget is the thing keeping the scene inside memory.
 */
export class TextureBudgetPlugin {
  readonly name = "MAPS_TEXTURE_BUDGET";

  /** Textures shrunk this session, and the pixels that saved. */
  shrunk = 0;
  savedPixels = 0;

  async processTileModel(scene: Object3D, _tile: TileLike): Promise<void> {
    const textures = new Set<Texture>();
    scene.traverse((object) => {
      const material = (object as { material?: unknown }).material;
      for (const entry of Array.isArray(material) ? material : [material]) {
        if (entry === undefined || entry === null) continue;
        for (const value of Object.values(entry as Record<string, unknown>)) {
          const texture = value as Texture | null;
          if (texture !== null && typeof texture === "object" && "isTexture" in texture) {
            textures.add(texture);
          }
        }
      }
    });

    for (const texture of textures) await this.shrink(texture);
  }

  private async shrink(texture: Texture): Promise<void> {
    const image = texture.image as
      | (ImageBitmap | HTMLImageElement | HTMLCanvasElement) & { width?: number; height?: number }
      | undefined;
    if (image === undefined || image === null) return;
    const width = image.width ?? 0;
    const height = image.height ?? 0;
    if (width === 0 || height === 0) return;

    const longest = Math.max(width, height);
    if (longest <= MAX_TEXTURE_SIZE) return;

    const scale = MAX_TEXTURE_SIZE / longest;
    const target = {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };

    let resized: ImageBitmap;
    try {
      resized = await createImageBitmap(image as ImageBitmapSource, {
        resizeWidth: target.width,
        resizeHeight: target.height,
        resizeQuality: "high",
      });
    } catch (cause) {
      // A failure here is not fatal — the tile still draws at full resolution —
      // but it is exactly the kind of thing that silently blows the memory budget
      // later, so it is said out loud rather than swallowed.
      console.warn(
        `Could not shrink a ${width}x${height} tile texture to ${target.width}x${target.height}; ` +
          `it stays at full size and the memory budget is that much tighter. ${String(cause)}`,
      );
      return;
    }

    texture.image = resized;
    texture.needsUpdate = true;
    this.shrunk += 1;
    this.savedPixels += width * height - target.width * target.height;

    // The source bitmap is a separate copy of the decoded pixels and holding on
    // to it would double the saving away.
    if (typeof (image as ImageBitmap).close === "function") (image as ImageBitmap).close();
  }
}
