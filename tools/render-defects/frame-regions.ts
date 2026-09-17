/**
 * Frame-region measurements the render-defect captures are read through.
 *
 * A capture's own record says where the camera was and what the scene reported;
 * these functions say what the pixels did. They read the decoded PNG and share
 * nothing with the app, because a check built from the same symbol as the thing
 * it checks proves only that the code agrees with itself.
 *
 * Both measurements are deliberately shape-agnostic: a large flat dark surface
 * has no texture and no edges to match on, so what is measured is the set of
 * near-black pixels and its largest four-connected region.
 */

import { decodePng, type DecodedPng } from "../visual/png.js";

/** Luminance 0-255 in the same weights `measureFrame` uses. */
export function luminanceAt(png: DecodedPng, x: number, y: number): number {
  const offset = (y * png.width + x) * 4;
  return 0.2126 * png.rgba[offset]! + 0.7152 * png.rgba[offset + 1]! + 0.0722 * png.rgba[offset + 2]!;
}

export interface RegionBox {
  count: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * The largest four-connected region of pixels below a luminance.
 *
 * `luminance` is 12 by default: the surface this lane exists to attribute reads
 * rgb(6,8,12), and no shadowed asphalt or unlit facade in the delivered scene
 * reaches it — the road in the same frame measures 31-171.
 */
export function largestDarkRegion(png: DecodedPng, luminance = 12): RegionBox | null {
  const { width, height } = png;
  const dark = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    const luma = 0.2126 * png.rgba[offset]! + 0.7152 * png.rgba[offset + 1]! + 0.0722 * png.rgba[offset + 2]!;
    dark[index] = luma < luminance ? 1 : 0;
  }
  const seen = new Uint8Array(width * height);
  const stack: number[] = [];
  let best: RegionBox | null = null;
  for (let start = 0; start < width * height; start += 1) {
    if (!dark[start] || seen[start]) continue;
    const region: RegionBox = { count: 0, minX: width, maxX: -1, minY: height, maxY: -1 };
    stack.push(start);
    seen[start] = 1;
    while (stack.length > 0) {
      const index = stack.pop()!;
      const x = index % width;
      const y = (index - x) / width;
      region.count += 1;
      if (x < region.minX) region.minX = x;
      if (x > region.maxX) region.maxX = x;
      if (y < region.minY) region.minY = y;
      if (y > region.maxY) region.maxY = y;
      if (x > 0 && dark[index - 1] && !seen[index - 1]) { seen[index - 1] = 1; stack.push(index - 1); }
      if (x < width - 1 && dark[index + 1] && !seen[index + 1]) { seen[index + 1] = 1; stack.push(index + 1); }
      if (y > 0 && dark[index - width] && !seen[index - width]) { seen[index - width] = 1; stack.push(index - width); }
      if (y < height - 1 && dark[index + width] && !seen[index + width]) { seen[index + width] = 1; stack.push(index + width); }
    }
    if (best === null || region.count > best.count) best = region;
  }
  return best;
}

/** The fraction of pixels below a luminance inside a screen box, clamped to the frame. */
export function darkFraction(png: DecodedPng, box: { minX: number; minY: number; maxX: number; maxY: number }, luminance = 12): number {
  const minX = Math.max(0, box.minX);
  const minY = Math.max(0, box.minY);
  const maxX = Math.min(png.width - 1, box.maxX);
  const maxY = Math.min(png.height - 1, box.maxY);
  if (maxX < minX || maxY < minY) throw new Error("The box is empty after clamping to the frame.");
  let dark = 0;
  let total = 0;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const offset = (y * png.width + x) * 4;
      const luma = 0.2126 * png.rgba[offset]! + 0.7152 * png.rgba[offset + 1]! + 0.0722 * png.rgba[offset + 2]!;
      if (luma < luminance) dark += 1;
      total += 1;
    }
  }
  return dark / total;
}

export interface PixelChange {
  /** Pixels whose channel difference exceeds the threshold. */
  changed: number;
  /** Changed pixels as a fraction of the frame. */
  fraction: number;
  /** Mean absolute difference per channel over every pixel, 0-255. */
  meanAbsoluteDifference: number;
  /** The bounding box of everything that changed, or null when nothing did. */
  box: { minX: number; minY: number; maxX: number; maxY: number } | null;
}

/**
 * What moved between two frames, and where.
 *
 * A threshold rather than `!==` on purpose: two frames of a still seeded scene
 * are not byte-identical under a temporal pass, and a check that called that
 * movement would read the renderer's own dither as a pedestrian.
 */
export function pixelChange(left: DecodedPng, right: DecodedPng, threshold = 8): PixelChange {
  if (left.width !== right.width || left.height !== right.height) {
    throw new Error(`Frames of different sizes cannot be compared: ${left.width}x${left.height} and ${right.width}x${right.height}.`);
  }
  let changed = 0;
  let total = 0;
  let box: PixelChange["box"] = null;
  for (let y = 0; y < left.height; y += 1) {
    for (let x = 0; x < left.width; x += 1) {
      const offset = (y * left.width + x) * 4;
      const delta = Math.max(
        Math.abs(left.rgba[offset]! - right.rgba[offset]!),
        Math.abs(left.rgba[offset + 1]! - right.rgba[offset + 1]!),
        Math.abs(left.rgba[offset + 2]! - right.rgba[offset + 2]!),
      );
      total += delta;
      if (delta <= threshold) continue;
      changed += 1;
      if (box === null) box = { minX: x, minY: y, maxX: x, maxY: y };
      else {
        if (x < box.minX) box.minX = x;
        if (x > box.maxX) box.maxX = x;
        if (y < box.minY) box.minY = y;
        if (y > box.maxY) box.maxY = y;
      }
    }
  }
  return {
    changed,
    fraction: changed / (left.width * left.height),
    meanAbsoluteDifference: total / (left.width * left.height),
    box,
  };
}

export function readFrame(bytes: Uint8Array): DecodedPng {
  return decodePng(bytes);
}
