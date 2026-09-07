/**
 * Tests for the reader the visual gate measures its frames with.
 *
 * Verify the instrument before trusting the measurement. If this decoder is
 * wrong, every "the frame is not blank" and "these two frames differ" the gate
 * reports is a claim about a bug rather than about a picture.
 *
 * Bound worth naming: the PNGs below are assembled here rather than produced by
 * an encoder somewhere else, so this cannot catch a misreading of a real-world
 * PNG feature no test file uses. What it does break is the round-trip symmetry
 * that would let an encoder bug and a decoder bug cancel: the filtered bytes for
 * filter types 1 to 4 are written out as literal numbers, worked from the PNG
 * spec by hand, not produced by code that shares anything with the decoder.
 */

import { deflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { decodePng, measureFrame, signatureDistance } from "../tools/visual/png.js";

// The 3x2 RGB image every filter case below encodes, row-major.
const PIXELS = [
  [10, 20, 30, 40, 50, 60, 70, 80, 90],
  [15, 25, 35, 45, 55, 65, 75, 85, 95],
];

/**
 * The same image under each of the five filter types.
 *
 * Each row is `[filterType, ...filteredBytes]`, computed by hand from the
 * definitions in the PNG specification, section 9.
 */
const FILTERED_ROWS: Record<string, number[][]> = {
  none: [
    [0, 10, 20, 30, 40, 50, 60, 70, 80, 90],
    [0, 15, 25, 35, 45, 55, 65, 75, 85, 95],
  ],
  sub: [
    [1, 10, 20, 30, 30, 30, 30, 30, 30, 30],
    [1, 15, 25, 35, 30, 30, 30, 30, 30, 30],
  ],
  up: [
    [2, 10, 20, 30, 40, 50, 60, 70, 80, 90],
    [2, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  ],
  average: [
    [3, 10, 20, 30, 35, 40, 45, 50, 55, 60],
    [3, 10, 15, 20, 18, 18, 18, 18, 18, 18],
  ],
  paeth: [
    [4, 10, 20, 30, 30, 30, 30, 30, 30, 30],
    [4, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  ],
};

describe("decodePng", () => {
  it.each(Object.keys(FILTERED_ROWS))("inverts the %s row filter", (filter) => {
    const png = buildPng({ width: 3, height: 2, colourType: 2, rows: FILTERED_ROWS[filter]! });
    const decoded = decodePng(png);

    expect(decoded.width).toBe(3);
    expect(decoded.height).toBe(2);
    for (let row = 0; row < 2; row += 1) {
      for (let pixel = 0; pixel < 3; pixel += 1) {
        const at = (row * 3 + pixel) * 4;
        expect([decoded.rgba[at], decoded.rgba[at + 1], decoded.rgba[at + 2]]).toEqual([
          PIXELS[row]![pixel * 3],
          PIXELS[row]![pixel * 3 + 1],
          PIXELS[row]![pixel * 3 + 2],
        ]);
        expect(decoded.rgba[at + 3]).toBe(255);
      }
    }
  });

  it("keeps the alpha channel of an RGBA image", () => {
    const png = buildPng({
      width: 2,
      height: 1,
      colourType: 6,
      rows: [[0, 1, 2, 3, 4, 250, 251, 252, 253]],
    });
    expect([...decodePng(png).rgba]).toEqual([1, 2, 3, 4, 250, 251, 252, 253]);
  });

  it("widens greyscale to RGB", () => {
    const png = buildPng({ width: 3, height: 1, colourType: 0, rows: [[0, 0, 128, 255]] });
    const { rgba } = decodePng(png);
    expect([...rgba.slice(0, 4)]).toEqual([0, 0, 0, 255]);
    expect([...rgba.slice(4, 8)]).toEqual([128, 128, 128, 255]);
    expect([...rgba.slice(8, 12)]).toEqual([255, 255, 255, 255]);
  });

  it("names the problem when the file is not a PNG", () => {
    expect(() => decodePng(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9]))).toThrow(/not a PNG/);
  });

  it("names the problem when the depth is one it cannot read", () => {
    const png = buildPng({ width: 1, height: 1, colourType: 2, rows: [[0, 1, 2, 3]], bitDepth: 16 });
    expect(() => decodePng(png)).toThrow(/8-bit PNGs only/);
  });

  it("names the problem when the file is interlaced", () => {
    const png = buildPng({
      width: 1,
      height: 1,
      colourType: 2,
      rows: [[0, 1, 2, 3]],
      interlace: 1,
    });
    expect(() => decodePng(png)).toThrow(/interlaced/);
  });

  it("names the problem for a palette image rather than reading it wrongly", () => {
    const png = buildPng({ width: 1, height: 1, colourType: 3, rows: [[0, 0]] });
    expect(() => decodePng(png)).toThrow(/colour type 3/);
  });

  it("names the problem when a row uses an undefined filter type", () => {
    const png = buildPng({ width: 1, height: 1, colourType: 2, rows: [[9, 1, 2, 3]] });
    expect(() => decodePng(png)).toThrow(/filter type 9/);
  });
});

describe("measureFrame", () => {
  it("scores a flat fill as blank, which is the case the gate exists to catch", () => {
    const stats = measureFrame(flat(64, 64, [90, 90, 90]));
    expect(stats.luminanceSpread).toBe(0);
    expect(stats.distinctColours).toBe(1);
    expect(stats.meanLuminance).toBeCloseTo(90, 6);
  });

  it("scores a black frame as blank too", () => {
    const stats = measureFrame(flat(64, 64, [0, 0, 0]));
    expect(stats.luminanceSpread).toBe(0);
    expect(stats.distinctColours).toBe(1);
  });

  it("scores a detailed frame well above the gate's floors", () => {
    const stats = measureFrame(noisy(96, 96));
    expect(stats.luminanceSpread).toBeGreaterThan(30);
    expect(stats.distinctColours).toBeGreaterThan(500);
  });
});

describe("signatureDistance", () => {
  it("is zero for a frame against itself", () => {
    const stats = measureFrame(noisy(64, 64));
    expect(signatureDistance(stats, stats)).toBe(0);
  });

  it("is zero for two identical frames, which is how a repeated capture reads", () => {
    expect(signatureDistance(measureFrame(noisy(64, 64)), measureFrame(noisy(64, 64)))).toBe(0);
  });

  it("is large for a black frame against a white one", () => {
    const black = measureFrame(flat(64, 64, [0, 0, 0]));
    const white = measureFrame(flat(64, 64, [255, 255, 255]));
    expect(signatureDistance(black, white)).toBeCloseTo(255, 3);
  });

  it("sees a change confined to one part of the frame", () => {
    const plain = flat(64, 64, [128, 128, 128]);
    const patched = flat(64, 64, [128, 128, 128]);
    // A 16x16 block in one corner: about 6% of the frame.
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const at = (y * 64 + x) * 4;
        patched.rgba[at] = 255;
        patched.rgba[at + 1] = 255;
        patched.rgba[at + 2] = 255;
      }
    }
    expect(signatureDistance(measureFrame(plain), measureFrame(patched))).toBeGreaterThan(5);
  });
});

interface PngParts {
  width: number;
  height: number;
  colourType: number;
  rows: number[][];
  bitDepth?: number;
  interlace?: number;
}

function buildPng(parts: PngParts): Uint8Array {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(parts.width, 0);
  header.writeUInt32BE(parts.height, 4);
  header.writeUInt8(parts.bitDepth ?? 8, 8);
  header.writeUInt8(parts.colourType, 9);
  header.writeUInt8(0, 10); // compression: deflate
  header.writeUInt8(0, 11); // filter method: adaptive
  header.writeUInt8(parts.interlace ?? 0, 12);

  const body = deflateSync(Buffer.from(parts.rows.flat()));

  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", body),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
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

function flat(width: number, height: number, colour: [number, number, number]) {
  const rgba = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    rgba[pixel * 4] = colour[0];
    rgba[pixel * 4 + 1] = colour[1];
    rgba[pixel * 4 + 2] = colour[2];
    rgba[pixel * 4 + 3] = 255;
  }
  return { width, height, rgba };
}

function noisy(width: number, height: number) {
  const rgba = new Uint8Array(width * height * 4);
  let state = 12345;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    state = (state * 1103515245 + 12345) >>> 0;
    rgba[pixel * 4] = state & 0xff;
    rgba[pixel * 4 + 1] = (state >>> 8) & 0xff;
    rgba[pixel * 4 + 2] = (state >>> 16) & 0xff;
    rgba[pixel * 4 + 3] = 255;
  }
  return { width, height, rgba };
}
