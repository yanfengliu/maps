/**
 * A small PNG reader and the frame statistics the visual gate is built on.
 *
 * Why decode the file rather than ask the page how the frame looked: a check
 * built from the same symbol as the thing it checks proves only that the code
 * agrees with itself. Reading the framebuffer back through the app's own canvas
 * would report on the app's belief about what it drew. These numbers come from
 * the bytes on disk, which is the artifact a person opens.
 *
 * Bounds: 8-bit non-interlaced greyscale, greyscale+alpha, RGB and RGBA. That is
 * what Chromium writes for `page.screenshot()`. Anything else throws by name
 * rather than being decoded wrongly and quietly.
 */

import { inflateSync } from "node:zlib";

export interface DecodedPng {
  width: number;
  height: number;
  /** Row-major RGBA, 4 bytes a pixel, alpha 255 when the source had none. */
  rgba: Uint8Array;
}

const SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CHANNELS_BY_COLOUR_TYPE: Record<number, number> = {
  0: 1, // greyscale
  2: 3, // rgb
  4: 2, // greyscale + alpha
  6: 4, // rgba
};

export function decodePng(bytes: Uint8Array): DecodedPng {
  for (let index = 0; index < SIGNATURE.length; index += 1) {
    if (bytes[index] !== SIGNATURE[index]) {
      throw new Error(
        "The file is not a PNG: its first eight bytes are not the PNG signature. " +
          `Got ${[...bytes.slice(0, 8)].join(",")}.`,
      );
    }
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = SIGNATURE.length;

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colourType = 0;
  let interlace = 0;
  let sawHeader = false;
  const idatParts: Uint8Array[] = [];

  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(
      bytes[offset + 4]!,
      bytes[offset + 5]!,
      bytes[offset + 6]!,
      bytes[offset + 7]!,
    );
    const body = bytes.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      bitDepth = bytes[offset + 16]!;
      colourType = bytes[offset + 17]!;
      interlace = bytes[offset + 20]!;
      sawHeader = true;
    } else if (type === "IDAT") {
      idatParts.push(body);
    } else if (type === "IEND") {
      break;
    }

    // 4 length + 4 type + body + 4 CRC.
    offset += 12 + length;
  }

  if (!sawHeader) {
    throw new Error("The PNG has no IHDR chunk, so its size and format are unknown.");
  }
  if (bitDepth !== 8) {
    throw new Error(
      `This reader handles 8-bit PNGs only; this one is ${bitDepth}-bit. ` +
        "Chromium screenshots are 8-bit, so a different depth means the file came from elsewhere.",
    );
  }
  if (interlace !== 0) {
    throw new Error("This reader does not handle interlaced PNGs; this one is Adam7 interlaced.");
  }
  const channels = CHANNELS_BY_COLOUR_TYPE[colourType];
  if (channels === undefined) {
    throw new Error(
      `Unsupported PNG colour type ${colourType}. ` +
        "Supported: 0 greyscale, 2 RGB, 4 greyscale+alpha, 6 RGBA.",
    );
  }
  if (idatParts.length === 0) {
    throw new Error("The PNG has no IDAT chunk, so it carries no image data at all.");
  }

  const raw = new Uint8Array(inflateSync(Buffer.concat(idatParts.map((part) => Buffer.from(part)))));
  const stride = width * channels;
  const expected = (stride + 1) * height;
  if (raw.length < expected) {
    throw new Error(
      `The PNG's image data is short: ${raw.length} bytes inflated, ${expected} expected for ` +
        `${width}x${height} with ${channels} channels. The file is truncated.`,
    );
  }

  const unfiltered = unfilter(raw, width, height, channels);
  return { width, height, rgba: toRgba(unfiltered, width, height, channels) };
}

function unfilter(raw: Uint8Array, width: number, height: number, channels: number): Uint8Array {
  const stride = width * channels;
  const out = new Uint8Array(stride * height);
  let source = 0;

  for (let row = 0; row < height; row += 1) {
    const filter = raw[source]!;
    source += 1;
    const target = row * stride;
    const above = target - stride;

    for (let index = 0; index < stride; index += 1) {
      const value = raw[source + index]!;
      const left = index >= channels ? out[target + index - channels]! : 0;
      const up = row > 0 ? out[above + index]! : 0;
      const upLeft = row > 0 && index >= channels ? out[above + index - channels]! : 0;

      let restored: number;
      switch (filter) {
        case 0:
          restored = value;
          break;
        case 1:
          restored = value + left;
          break;
        case 2:
          restored = value + up;
          break;
        case 3:
          restored = value + ((left + up) >> 1);
          break;
        case 4:
          restored = value + paeth(left, up, upLeft);
          break;
        default:
          throw new Error(
            `PNG row ${row} uses filter type ${filter}, which is not one of the five defined ` +
              "types (0 None, 1 Sub, 2 Up, 3 Average, 4 Paeth). The file is corrupt.",
          );
      }
      out[target + index] = restored & 0xff;
    }
    source += stride;
  }

  return out;
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);
  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left;
  if (distanceUp <= distanceUpLeft) return up;
  return upLeft;
}

function toRgba(
  unfiltered: Uint8Array,
  width: number,
  height: number,
  channels: number,
): Uint8Array {
  if (channels === 4) return unfiltered;

  const rgba = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const from = pixel * channels;
    const to = pixel * 4;
    if (channels === 1 || channels === 2) {
      const grey = unfiltered[from]!;
      rgba[to] = grey;
      rgba[to + 1] = grey;
      rgba[to + 2] = grey;
      rgba[to + 3] = channels === 2 ? unfiltered[from + 1]! : 255;
    } else {
      rgba[to] = unfiltered[from]!;
      rgba[to + 1] = unfiltered[from + 1]!;
      rgba[to + 2] = unfiltered[from + 2]!;
      rgba[to + 3] = 255;
    }
  }
  return rgba;
}

export interface FrameStats {
  width: number;
  height: number;
  /** Mean luminance, 0-255. */
  meanLuminance: number;
  /** Standard deviation of luminance, 0-255. Zero means every pixel is identical. */
  luminanceSpread: number;
  /** Distinct colours after quantising each channel to 5 bits. */
  distinctColours: number;
  /** A 32x32 mean-luminance signature, for comparing one frame against another. */
  signature: Float64Array;
}

const SIGNATURE_SIZE = 32;

export function measureFrame(png: DecodedPng): FrameStats {
  const { width, height, rgba } = png;
  const pixels = width * height;

  let sum = 0;
  let sumOfSquares = 0;
  const seen = new Set<number>();
  const cellTotals = new Float64Array(SIGNATURE_SIZE * SIGNATURE_SIZE);
  const cellCounts = new Float64Array(SIGNATURE_SIZE * SIGNATURE_SIZE);

  for (let index = 0; index < pixels; index += 1) {
    const at = index * 4;
    const red = rgba[at]!;
    const green = rgba[at + 1]!;
    const blue = rgba[at + 2]!;
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

    sum += luminance;
    sumOfSquares += luminance * luminance;
    // 5 bits a channel: enough to tell a gradient from a flat fill, coarse
    // enough that dithering noise does not read as detail.
    seen.add(((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3));

    const x = index % width;
    const y = (index - x) / width;
    const cell =
      Math.min(SIGNATURE_SIZE - 1, Math.floor((y / height) * SIGNATURE_SIZE)) * SIGNATURE_SIZE +
      Math.min(SIGNATURE_SIZE - 1, Math.floor((x / width) * SIGNATURE_SIZE));
    cellTotals[cell] = cellTotals[cell]! + luminance;
    cellCounts[cell] = cellCounts[cell]! + 1;
  }

  const mean = sum / pixels;
  const variance = Math.max(0, sumOfSquares / pixels - mean * mean);

  const signature = new Float64Array(SIGNATURE_SIZE * SIGNATURE_SIZE);
  for (let cell = 0; cell < signature.length; cell += 1) {
    const count = cellCounts[cell]!;
    signature[cell] = count === 0 ? 0 : cellTotals[cell]! / count;
  }

  return {
    width,
    height,
    meanLuminance: mean,
    luminanceSpread: Math.sqrt(variance),
    distinctColours: seen.size,
    signature,
  };
}

/**
 * Mean absolute difference between two frame signatures, 0-255.
 *
 * Two frames of the same scene from different camera angles score high. The same
 * frame written twice scores zero, which is the failure this exists to catch.
 */
export function signatureDistance(left: FrameStats, right: FrameStats): number {
  if (left.signature.length !== right.signature.length) {
    throw new Error(
      `Signatures have different lengths (${left.signature.length} and ${right.signature.length}), ` +
        "so they were produced by different versions of measureFrame and cannot be compared.",
    );
  }
  let total = 0;
  for (let index = 0; index < left.signature.length; index += 1) {
    total += Math.abs(left.signature[index]! - right.signature[index]!);
  }
  return total / left.signature.length;
}
