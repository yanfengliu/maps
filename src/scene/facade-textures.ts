/**
 * The one pass over every facade atlas. Plan items 35, 16 and the cap from
 * Phase 3.
 *
 * Three things have to happen to a PLATEAU atlas between the glTF parser and the
 * scene, and all three touch every pixel:
 *
 * 1. **Cap its size** to the fixed geographic policy in texture-budget.ts:
 *    one observed frontage leaf at native 4096px, 2048px near the crossing,
 *    and 1024px elsewhere.
 * 2. **Store a colour candidate mask** in the alpha channel. It modulates only
 *    explicitly admitted source-panel polygons; it cannot select a surface.
 * 3. **De-light the albedo** — item 35, which compresses the baked daylight out
 *    of it.
 *
 * Doing them as three passes would read and write the same 63 megapixels three
 * times, so they are one pass, in that order. The order is load-bearing: the mask
 * keys on the contrast that de-lighting removes, so it has to be taken first.
 *
 * ## Why the pixels are touched on the CPU at all
 *
 * The de-lighting is per-pixel arithmetic with no spatial support, so it could
 * equally run in the material's fragment shader for nothing. It does not, for two
 * reasons. It would be a **second implementation** of the operator, in another
 * language, checked by nothing — and the repository has already been told what
 * that costs. And the statistics this item is judged on would then have to be
 * measured by a different code path from the one that renders, which is exactly
 * the instrument problem: you would be measuring the copy, not the thing.
 *
 * The cost is paid at load: about 63 megapixels of read-modify-write across 65
 * atlases, spread over the tiles as they arrive. It is not paid per frame.
 *
 * ## The texture that comes out
 *
 * A `DataTexture`, not a canvas. A 2D canvas stores premultiplied alpha, so the
 * moment the sign mask goes into the alpha channel every pixel whose mask is zero
 * — which is most of the atlas — would have its colour multiplied away on upload.
 * `DataTexture` hands the bytes to WebGL untouched. The sampler state is copied
 * off the original so the glTF's wrapping and filtering survive.
 */

import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  type Material,
  type Object3D,
  type Texture,
} from "three";

import { AlbedoAccumulator, delightInPlace, PLATEAU_DELIGHT, type DelightSettings } from "./delight.js";
import {
  PLATEAU_SIGN_MASK,
  SignMaskDistribution,
  writeSignMask,
  type SignMaskSettings,
} from "./signage.js";
import { MAX_TEXTURE_SIZE, textureLimitForTile } from "./texture-budget.js";
import { patchTileMaterials, type SignageUniform, type FacadeStyleUniforms } from "./tile-materials.js";
import { prepareProceduralFacades } from "./procedural-facades.js";
import { emissionSourceForUrl, prepareEmissionEligibility } from "./facade-emission.js";

/** Every material property that can hold a texture we care about. */
const TEXTURE_SLOTS = ["map", "emissiveMap"] as const;

export interface FacadeTextureOptions {
  signageIntensity: SignageUniform;
  style: FacadeStyleUniforms;
  /**
   * De-lighting settings, or `null` to leave the albedo exactly as PLATEAU
   * shipped it.
   *
   * `null` is what the gate proof for item 35 uses: it reintroduces the defect by
   * putting the baked daylight back, and the albedo statistics the sweep records
   * go straight back to the photograph's.
   */
  delight: DelightSettings | null;
  /** Sign-mask thresholds, or `null` to derive no signage from the albedo. */
  signMask: SignMaskSettings | null;
  /** Patch the tile materials for roughness, reflection and the emissive term. */
  patchMaterials: boolean;
}

export const DEFAULT_FACADE_OPTIONS: Omit<FacadeTextureOptions, "signageIntensity" | "style"> = Object.freeze({
  delight: PLATEAU_DELIGHT,
  signMask: PLATEAU_SIGN_MASK,
  patchMaterials: true,
});

export interface FacadeTextureStats {
  /** Atlases this session has been through the pass. */
  processed: number;
  /** Atlases shrunk to the size cap. */
  shrunk: number;
  /** Largest processed atlas actually observed, longest side in pixels. */
  maxTextureSize: number;
  priorityAtlases: number;
  cappedTextureBytes: number;
  /** Source pixels the cap saved. */
  savedPixels: number;
  /** Was the albedo actually de-lit, or left as the photograph? */
  delit: boolean;
  /** Mean colour-candidate mask before spatial eligibility; not emitted area. */
  signMaskMean: number;
  /** Atlas colour-candidate fraction above a half; not admitted sign coverage. */
  signMaskCoverage: number;
  /**
   * Parts per million of atlas pixels at or above each saturation and brightness
   * pair, over every atlas in the scene. Rows are `COVERAGE_SATURATIONS`, columns
   * are `COVERAGE_VALUES`. This is the evidence the mask thresholds were set
   * from, and it is published so the choice can be audited rather than believed.
   */
  signMaskCoverageTable: number[][];
  /** Materials patched for roughness, reflection and the emissive term. */
  materialsPatched: number;
  proceduralFeatures: number;
  /** Reported fetch/readback failure, or null. Eligibility errors reject processing. */
  error: string | null;
}

/**
 * A `3d-tiles-renderer` plugin that runs the pass in `processTileModel`.
 *
 * `processTileModel` is the hook that runs after the glTF is parsed and **before**
 * the library measures the tile's memory, so the LRU cache's byte accounting sees
 * the capped texture rather than the published one. Doing this in `load-model`
 * instead would leave the cache budgeting for pixels that are no longer there,
 * and the budget is the only thing keeping the scene inside memory.
 */
export class FacadeTexturePlugin {
  readonly name = "MAPS_FACADE_TEXTURES";

  /** Statistics over the atlas as PLATEAU shipped it. */
  readonly before = new AlbedoAccumulator();
  /** Statistics over the same pixels after the operator ran. */
  readonly after = new AlbedoAccumulator();
  /** The saturation-by-brightness distribution the sign mask is keyed off. */
  readonly distribution = new SignMaskDistribution();

  private processed = 0;
  private shrunk = 0;
  private savedPixels = 0;
  private maskSum = 0;
  private maskCoverageSum = 0;
  private maskPixels = 0;
  private materialsPatched = 0;
  private proceduralFeatures = 0;
  private priorityAtlases = 0;
  private cappedTextureBytes = 0;
  private observedMaxTextureSize = 0;
  private error: string | null = null;
  private readonly verifiedEmissionTiles = new Map<string, string>();

  constructor(private readonly options: FacadeTextureOptions) {}

  /** Reuse the normal tile request; retain only two digests, never tile buffers. */
  fetchData(url: string, options: RequestInit): Promise<ArrayBuffer> | null {
    const source = emissionSourceForUrl(url);
    if (!source) return null;
    return (async () => {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`Facade sign source ${source.tileUri} could not load (HTTP ${response.status}). Run npm run data:scene and recheck the served tile.`);
      const bytes = await response.arrayBuffer();
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
      if (digest !== source.tileSha256) throw new Error(`Facade sign source ${source.tileUri} has SHA-256 ${digest}; expected ${source.tileSha256}. Re-audit the source GML/UV emission regions for this tile before enabling them.`);
      this.verifiedEmissionTiles.set(source.tileUri, digest);
      return bytes;
    })().catch(cause => { this.error = String(cause); throw cause; });
  }

  stats(): FacadeTextureStats {
    return {
      processed: this.processed,
      shrunk: this.shrunk,
      maxTextureSize: this.observedMaxTextureSize,
      priorityAtlases: this.priorityAtlases,
      cappedTextureBytes: this.cappedTextureBytes,
      savedPixels: this.savedPixels,
      delit: this.options.delight !== null,
      signMaskMean: this.maskPixels === 0 ? 0 : this.maskSum / this.maskPixels,
      signMaskCoverage: this.maskPixels === 0 ? 0 : this.maskCoverageSum / this.maskPixels,
      signMaskCoverageTable: this.distribution.coverageTable(),
      materialsPatched: this.materialsPatched,
      proceduralFeatures: this.proceduralFeatures,
      error: this.error,
    };
  }

  async processTileModel(scene: Object3D, tile: unknown): Promise<void> {
    // Validate the parser's original UV channel/orientation/transform before
    // rebuilding replaces the map with a DataTexture carrying default state.
    if (this.options.patchMaterials) {
      const sourceTile = tile as { content?: { uri?: string; url?: string } };
      const tileUri = sourceTile.content?.uri ?? sourceTile.content?.url ?? "unknown";
      prepareEmissionEligibility(scene, tileUri, this.verifiedEmissionTiles.get(tileUri));
    }
    const replacements = new Map<Texture, Texture>();
    const materials = collectMaterials(scene);

    for (const material of materials) {
      for (const slot of TEXTURE_SLOTS) {
        const texture = (material as unknown as Record<string, unknown>)[slot] as Texture | null;
        if (texture === null || texture === undefined || !texture.isTexture) continue;
        if (slot !== "map") continue;
        if (!replacements.has(texture)) {
          const replacement = await this.rebuild(texture, textureLimitForTile(tile));
          if (replacement) {
            const sourceTile = tile as { content?: { uri?: string; url?: string }; boundingVolume?: { box?: number[] } };
            replacement.userData.mapsAtlas = { ...(replacement.userData.mapsAtlas as object), tileUri: sourceTile.content?.uri ?? sourceTile.content?.url ?? "unknown", tileBounds: sourceTile.boundingVolume?.box?.slice() ?? null };
          }
          if (replacement !== null) replacements.set(texture, replacement);
        }
        const replacement = replacements.get(texture);
        if (replacement !== undefined) {
          (material as unknown as Record<string, unknown>)[slot] = replacement;
          material.needsUpdate = true;
        }
      }
    }

    // The originals are on nothing now, and the tiles renderer only disposes what
    // it can find on a material.
    for (const original of replacements.keys()) original.dispose();

    if (this.options.patchMaterials) {
      this.proceduralFeatures += prepareProceduralFacades(scene);
      this.materialsPatched += patchTileMaterials(scene, {
        signageIntensity: this.options.signageIntensity,
        style: this.options.style,
        enabled: true,
      });
    }
  }

  /**
   * Resize, mask and de-light one atlas.
   *
   * Returns `null` and says why, rather than throwing, when anything in the
   * browser side of this refuses: a tile that draws its published texture is a
   * worse frame, and a tile that does not draw at all is a broken scene.
   */
  private async rebuild(texture: Texture, limit: number): Promise<DataTexture | null> {
    const image = texture.image as { width?: number; height?: number } | null | undefined;
    if (image === null || image === undefined) return null;
    const sourceWidth = image.width ?? 0;
    const sourceHeight = image.height ?? 0;
    if (sourceWidth === 0 || sourceHeight === 0) return null;

    const longest = Math.max(sourceWidth, sourceHeight);
    const scale = longest > limit ? limit / longest : 1;
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    let pixels: ImageData;
    try {
      pixels = await readPixels(image as ImageBitmapSource, width, height, scale < 1);
    } catch (cause) {
      const message =
        `Could not read a ${sourceWidth}x${sourceHeight} facade atlas back for de-lighting, ` +
        `so it stays as PLATEAU shipped it — daylight and all — and the memory budget is ` +
        `that much tighter. ${String(cause)}`;
      if (this.error === null) this.error = message;
      console.warn(message);
      return null;
    }

    const data = pixels.data;
    this.before.add(data);
    this.distribution.add(data);
    if (this.options.signMask !== null) {
      const mask = writeSignMask(data, this.options.signMask);
      this.maskSum += mask.meanMask * mask.pixels;
      this.maskCoverageSum += mask.coverage * mask.pixels;
      this.maskPixels += mask.pixels;
    } else {
      for (let offset = 3; offset < data.length; offset += 4) data[offset] = 0;
    }
    if (this.options.delight !== null) delightInPlace(data, this.options.delight);
    this.after.add(data);

    const replacement = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
    replacement.colorSpace = SRGBColorSpace;
    replacement.wrapS = texture.wrapS;
    replacement.wrapT = texture.wrapT;
    replacement.magFilter = texture.magFilter ?? LinearFilter;
    replacement.minFilter = LinearMipmapLinearFilter;
    replacement.generateMipmaps = true;
    replacement.anisotropy = Math.max(texture.anisotropy, 8);
    replacement.flipY = false;
    replacement.premultiplyAlpha = false;
    replacement.name = texture.name;
    replacement.userData.mapsAtlas = { limit, sourceWidth, sourceHeight };
    replacement.needsUpdate = true;

    this.processed += 1;
    this.observedMaxTextureSize = Math.max(this.observedMaxTextureSize, width, height);
    if (limit > MAX_TEXTURE_SIZE) this.priorityAtlases += 1;
    this.cappedTextureBytes += Math.ceil(width * height * 4 * 4 / 3);
    if (scale < 1) {
      this.shrunk += 1;
      this.savedPixels += sourceWidth * sourceHeight - width * height;
    }
    if (typeof (image as ImageBitmap).close === "function") (image as ImageBitmap).close();

    return replacement;
  }
}

/**
 * Decode an image source into RGBA bytes at the target size.
 *
 * The context asks for `willReadFrequently`, which keeps the canvas on the CPU.
 * Without it Chromium backs the canvas on the GPU and every `getImageData` is a
 * readback across the bus — which on the software rasteriser the visual gate runs
 * is the same memory twice with a stall in between.
 */
async function readPixels(
  source: ImageBitmapSource,
  width: number,
  height: number,
  resize: boolean,
): Promise<ImageData> {
  const drawable = resize
    ? await createImageBitmap(source, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: "high",
      })
    : source;

  const canvas =
    typeof OffscreenCanvas === "function"
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement("canvas"), { width, height });
  const context = (canvas as OffscreenCanvas).getContext("2d", {
    willReadFrequently: true,
  }) as OffscreenCanvasRenderingContext2D | null;
  if (context === null) {
    throw new Error("a 2D canvas context was refused");
  }
  context.drawImage(drawable as CanvasImageSource, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  if (resize && typeof (drawable as ImageBitmap).close === "function") {
    (drawable as ImageBitmap).close();
  }
  return pixels;
}

function collectMaterials(scene: Object3D): Set<Material> {
  const materials = new Set<Material>();
  scene.traverse((object) => {
    const material = (object as { material?: Material | Material[] }).material;
    if (material === undefined || material === null) return;
    for (const entry of Array.isArray(material) ? material : [material]) {
      if (entry !== undefined && entry !== null) materials.add(entry);
    }
  });
  return materials;
}
