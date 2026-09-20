/**
 * Synthetic records for the flicker judge's unit cases.
 *
 * The judge is a pure function over decoded frames and their metadata, so every
 * predicate it has can be driven here in milliseconds - which is the reason the
 * judge is a separate module from the capture specification at all. A check that
 * lives inside a browser lane cannot be made to go red cheaply, and a check that
 * has never been made to go red is not a check.
 *
 * Whatever a case measures here is a statement about the predicate and never
 * about the scene: these fields have no lens, no tone curve, no parallax and no
 * population. The archived-frame case in `test/flicker-judge.test.ts` is what
 * puts the same predicates over real captured bytes.
 */

import { createHash } from "node:crypto";

import type { FlickerFrame, FramePose } from "../tools/flicker/judge.js";
import { decodePng, type DecodedPng } from "../tools/visual/png.js";
import { encodeGreyPng, sampleField, shiftedFrame } from "./flicker-synthetic.js";

/** The frame size every synthetic case uses. Small on purpose: these are predicates, not pictures. */
export const FRAME_WIDTH = 192;
export const FRAME_HEIGHT = 108;
export const FIELD_WIDTH = 260;
export const FIELD_HEIGHT = 160;

/** The shared picture the synthetic windows are cut from. */
const FIELD = sampleField(FIELD_WIDTH, FIELD_HEIGHT, 91_337);

/** A window of the shared field, round-tripped through a real PNG so the judge decodes bytes. */
export function windowFrame(offsetX: number, offsetY: number): DecodedPng {
  const luma = shiftedFrame(FRAME_WIDTH, FRAME_HEIGHT, FIELD, FIELD_WIDTH, FIELD_HEIGHT, offsetX, offsetY);
  const bytes = encodeGreyPng(FRAME_WIDTH, FRAME_HEIGHT, luminanceOf(luma));
  return decodePng(bytes);
}

/** One frame of a record: pixels from the field, metadata as the capture would write it. */
export function frameAt(
  index: number,
  parts: {
    /** Sample the picture from this window of the field; defaults to the index times 3 px right. */
    offset?: { x: number; y: number };
    /** Override the image outright, for the frozen-scene case. */
    image?: DecodedPng;
    /** Rendered frames before the shutter, defaulting to five frames a step. */
    frameCountBefore?: number;
    /** Rendered frames after the shutter, defaulting to the before count plus one. */
    frameCountAfter?: number;
    /** Fixed simulation steps, defaulting to six a step. */
    tick?: number;
    /** Metres the camera stands from the target, which sets how far it travels a step. */
    distanceM?: number;
  } = {},
): FlickerFrame {
  const offset = parts.offset ?? { x: index * 3, y: index };
  const image = parts.image ?? windowFrame(offset.x, offset.y);
  const shutterOpenedAtFrame = parts.frameCountBefore ?? 1_000 + index;
  const shutterClosedAtFrame = parts.frameCountAfter ?? shutterOpenedAtFrame;
  return {
    file: `syn-${String(index).padStart(2, "0")}.png`,
    sha256: createHash("sha256").update(Buffer.from(image.rgba)).digest("hex"),
    frameCountMid: (shutterOpenedAtFrame + shutterClosedAtFrame) / 2,
    shutterOpenedAtFrame,
    shutterClosedAtFrame,
    tick: parts.tick ?? 3_000 + index * 6,
    pose: poseAt(offset.x, offset.y, parts.distanceM ?? 45),
    image,
  };
}

/** A pose that orbits a little for every pixel the picture moved. */
export function poseAt(offsetX: number, offsetY: number, distanceM: number): FramePose {
  const azimuth = offsetX * 2e-4;
  const polar = 1.5 + offsetY * 1e-4;
  return {
    position: {
      x: Math.sin(azimuth) * distanceM,
      y: Math.cos(polar) * distanceM,
      z: Math.cos(azimuth) * distanceM,
    },
    target: { x: 0, y: 0, z: 0 },
    azimuth,
    polar,
    distance: distanceM,
  };
}

/** A record of `count` frames moving right three pixels and down one a step. */
export function movingRecord(count: number, parts: Parameters<typeof frameAt>[1] = {}): FlickerFrame[] {
  return Array.from({ length: count }, (_, index) => frameAt(index, parts));
}

/**
 * A record whose picture oscillates: each frame stands 10 px right of the one
 * before it and 10 px left of the one after, while the camera moves the whole
 * time.
 *
 * This is the case the one-sided record above cannot reach. There, frames that
 * failed to redraw at all would still differ from their neighbours, so a
 * non-zero `changedFraction` would be evidence of nothing; here a stale buffer
 * reproduces its predecessor's bytes exactly, which is the defect the criterion
 * is about.
 */
export function oscillatingRecord(count: number): FlickerFrame[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = (index % 2 === 0 ? 0 : 10) + index;
    return frameAt(index, { offset: { x: offset, y: 0 } });
  });
}

/**
 * The same record with the picture frozen: one image written under every name,
 * while the camera and the render counter keep moving.
 *
 * This is the shape a capture that photographed a stale buffer produces, and the
 * shape a moved-but-identical pair has in any real record.
 */
export function frozenRecord(count: number): FlickerFrame[] {
  const still = windowFrame(0, 0);
  return Array.from({ length: count }, (_, index) => frameAt(index, { image: still }));
}

/**
 * A record whose scene crawls: every other frame has the detail pixels the
 * estimator must keep, but their values are replaced with flat mid-grey.
 *
 * Nothing moved between the two frames except which pixels carry detail, so no
 * rigid shift can explain the change - which is exactly what the crawl indicator
 * is for. It is the picture-level shape of a bloom, SSAO or LOD threshold
 * flipping between two frames.
 *
 * The flattened image is computed once from the first frame and written under
 * every odd name, so the odd frames differ from each other only by the camera
 * moving: the only crawl in the record is the one this case is about.
 *
 * **The walk is slower than the other records', and it has to be.** This case is
 * about the crawl indicator, and a pair the *estimator* cannot model is refused
 * before the crawl bar is read, so a ten-frame walk at 3 px a step accumulates a
 * 27 px span against a 24 px search radius and the last pair of it stops being
 * about crawl at all. 2 px a step keeps every frame of the record inside what the
 * estimator searches.
 */
export function crawlingRecord(count: number): FlickerFrame[] {
  const slow = Array.from({ length: count }, (_, index) => frameAt(index, { offset: { x: index * 2, y: 0 } }));
  const flattened = flattenDetail(slow[0]!.image);
  return slow.map((frame, index) => (index % 2 === 1 ? { ...frame, image: flattened } : frame));
}

/**
 * The frame with every hard local feature replaced by flat mid-grey.
 *
 * A feature is a pixel more than 24 of 255 from its own 3x3 mean - the judge's
 * own bar, restated here rather than imported, so a case that agrees with the
 * judge agrees about the picture and not about a shared symbol.
 */
function flattenDetail(image: DecodedPng): DecodedPng {
  const rgba = Uint8Array.from(image.rgba);
  for (let pixel = 0; pixel < image.width * image.height; pixel += 1) {
    const at = pixel * 4;
    if (Math.abs(image.rgba[at]! - neighbourMean(image, pixel)) > 24) {
      rgba[at] = 128;
      rgba[at + 1] = 128;
      rgba[at + 2] = 128;
    }
  }
  return { width: image.width, height: image.height, rgba };
}

function neighbourMean(image: DecodedPng, pixel: number): number {
  const x = pixel % image.width;
  const y = (pixel - x) / image.width;
  let sum = 0;
  let count = 0;
  for (let ny = Math.max(0, y - 1); ny <= Math.min(image.height - 1, y + 1); ny += 1) {
    for (let nx = Math.max(0, x - 1); nx <= Math.min(image.width - 1, x + 1); nx += 1) {
      if (nx === x && ny === y) continue;
      sum += image.rgba[(ny * image.width + nx) * 4]!;
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count;
}

function luminanceOf(image: DecodedPng): Float32Array {
  const out = new Float32Array(image.width * image.height);
  for (let pixel = 0; pixel < out.length; pixel += 1) {
    const at = pixel * 4;
    out[pixel] = 0.2126 * image.rgba[at]! + 0.7152 * image.rgba[at + 1]! + 0.0722 * image.rgba[at + 2]!;
  }
  return out;
}
