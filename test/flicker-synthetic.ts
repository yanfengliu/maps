/**
 * Synthetic frames for the flicker judge's unit cases, and nothing else.
 *
 * The judge reads pixels, so its cases need pictures. These are built here
 * rather than captured, for the reason `test/png.test.ts` gives about the PNG
 * reader: a case that needs a browser to go red is not a case this repository
 * can afford to run, and the judge's predicates are the whole point of the lane.
 *
 * The frames are real PNGs written by `node:zlib` and read back through
 * `tools/visual/png.ts`, so a case exercises the same decode path a captured
 * frame goes through. What they are *not* is a rendering: a synthetic field has
 * no lens, no tone curve and no parallax, so a number measured here is a
 * statement about the predicate and never about the scene. The archived-frame
 * case in `test/flicker-judge.test.ts` is what puts the same predicates over
 * real captured bytes.
 *
 * **The field is built to be locatable.** A picture the shift estimator can only
 * align by accident makes every case below meaningless, and the first version of
 * this helper was exactly that: a smooth ramp with a level of noise, from which a
 * 6 px shift looked as good as the true 3 px one and the "pure shift" case
 * measured a frame where every pixel had changed. The field now carries structure
 * at three scales - 16 px patches, 4 px blocks and single-pixel grain - plus hard
 * vertical and horizontal features, so the only shift that minimises the cell
 * cost is the one that actually happened. That is what a facade with windows,
 * signage and mullions gives a real frame, and it is the property these cases
 * depend on.
 */

import { deflateSync } from "node:zlib";

import type { DecodedPng } from "../tools/visual/png.js";

/**
 * The picture the synthetic frames are cut from, as a luminance field.
 *
 * Three scales of value noise from one integer hash, then two kinds of hard
 * edge. Everything is a function of the pixel's own coordinates, so a window
 * sampled at two offsets is the same picture shifted, exactly.
 */
export function sampleField(width: number, height: number, seed: number): Float32Array {
  const field = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const patches = hash(x >> 4, y >> 4, seed);
      const blocks = hash(x >> 2, y >> 2, seed + 7_919);
      const grain = hash(x, y, seed + 1_049);
      let value = 50 + patches * 110 + blocks * 40 + grain * 9;

      // Hard features, the shape of a sign edge or a window mullion: a bright
      // vertical band every 23 px and a dark horizontal band every 31 px. They
      // are deliberately far above any dither - 90 and 70 of 255 against a
      // grain of 9 - because the crawl indicator classifies a pixel as a feature
      // by how far it sits from its own neighbourhood, and a feature that is
      // only just over that bar flips its classification when a one-pixel
      // misalignment moves the neighbourhood mean. A field whose features are
      // marginal would make the indicator's own noise floor the thing the cases
      // measure.
      if (x % 23 < 3) value += 90;
      if (y % 31 < 2) value -= 70;

      field[y * width + x] = Math.max(0, Math.min(255, value));
    }
  }
  return field;
}

/** A deterministic 0..1 value for one coordinate pair. Integer arithmetic only. */
function hash(x: number, y: number, seed: number): number {
  let value = (x * 374_761_393 + y * 668_265_263 + seed * 1_442_695_040) >>> 0;
  value = (value ^ (value >>> 13)) >>> 0;
  value = Math.imul(value, 1_274_126_177) >>> 0;
  value = (value ^ (value >>> 16)) >>> 0;
  return (value % 4_096) / 4_096;
}

/** A frame's luminance as a PNG byte string: 8-bit greyscale, one row filter 0. */
export function encodeGreyPng(width: number, height: number, luma: Float32Array): Uint8Array {
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width + 1)] = 0;
    for (let x = 0; x < width; x += 1) {
      const value = Math.max(0, Math.min(255, Math.round(luma[y * width + x]!)));
      raw[y * (width + 1) + 1 + x] = value;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8);
  header.writeUInt8(0, 9);
  header.writeUInt8(0, 10);
  header.writeUInt8(0, 11);
  header.writeUInt8(0, 12);

  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

/**
 * A frame of `width`x`height`, window-shifted by whole pixels out of a larger
 * field.
 *
 * Sampling a window rather than rolling the frame means a shifted pair shares a
 * genuine region of one picture, which is what a camera translation produces: no
 * wrap-around seam, and no pixel at the edge invented by the helper.
 */
export function shiftedFrame(
  width: number,
  height: number,
  field: Float32Array,
  fieldWidth: number,
  fieldHeight: number,
  offsetX: number,
  offsetY: number,
): DecodedPng {
  const luma = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = Math.max(0, Math.min(fieldWidth - 1, x + offsetX));
      const sy = Math.max(0, Math.min(fieldHeight - 1, y + offsetY));
      luma[y * width + x] = field[sy * fieldWidth + sx]!;
    }
  }
  return { width, height, rgba: rgbaOf(luma) };
}

function rgbaOf(luma: Float32Array): Uint8Array {
  const rgba = new Uint8Array(luma.length * 4);
  for (let pixel = 0; pixel < luma.length; pixel += 1) {
    const value = Math.max(0, Math.min(255, Math.round(luma[pixel]!)));
    rgba[pixel * 4] = value;
    rgba[pixel * 4 + 1] = value;
    rgba[pixel * 4 + 2] = value;
    rgba[pixel * 4 + 3] = 255;
  }
  return rgba;
}

function chunk(type: string, body: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length, 0);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);
  return Buffer.concat([length, typed, crc]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
