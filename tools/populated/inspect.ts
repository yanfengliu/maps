/**
 * Crop a captured frame to a region at its own resolution, so a detail can be
 * inspected at 1:1 or enlarged with nearest neighbours rather than through a
 * downscaled preview.
 *
 * The repository's rule is that a frame is reviewed at the artifact's own size,
 * and that a contact sheet answers "is there one of each" and never "is each one
 * right". A full 1280x720 frame rendered into a chat preview is downscaled, so a
 * foot, a wheel contact or a lane edge cannot be judged from it. This tool
 * produces the crop the reviewer needs and nothing else: no resampling beyond an
 * integer nearest-neighbour zoom, so every output pixel is a captured pixel.
 *
 * RUN IT:
 *
 *   node tools/populated/inspect.ts --file artifacts/populated-capture/frames/crowd/crowd-00.png \
 *     --rect 400,300,320,240 --zoom 2
 *
 * Writes `<file>.<x>-<y>-<w>-<h>[x<zoom>].png` beside the source and prints the
 * region's luminance statistics.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

import { decodePng } from "../visual/png.ts";

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

const file = argument("file");
if (file === undefined) throw new Error("--file is required: the frame to crop.");

const rect = (argument("rect") ?? "0,0,1280,720").split(",").map(Number);
if (rect.length !== 4 || rect.some((value) => !Number.isFinite(value))) {
  throw new Error(`--rect takes four numbers, x,y,width,height; received "${argument("rect")}".`);
}
const [x, y, width, height] = rect as [number, number, number, number];
const zoom = Number(argument("zoom") ?? 1);
if (!Number.isInteger(zoom) || zoom < 1 || zoom > 8) throw new Error(`--zoom takes an integer 1-8; received "${argument("zoom")}".`);

const source = decodePng(new Uint8Array(readFileSync(file)));
if (x < 0 || y < 0 || x + width > source.width || y + height > source.height) {
  throw new Error(
    `--rect ${x},${y},${width},${height} does not fit inside ${source.width}x${source.height}; a crop that reads past the frame would be padded with something this tool invented.`,
  );
}

const outWidth = width * zoom;
const outHeight = height * zoom;
const rgba = new Uint8Array(outWidth * outHeight * 4);
for (let row = 0; row < outHeight; row += 1) {
  for (let column = 0; column < outWidth; column += 1) {
    const sourceX = x + Math.floor(column / zoom);
    const sourceY = y + Math.floor(row / zoom);
    const from = (sourceY * source.width + sourceX) * 4;
    const to = (row * outWidth + column) * 4;
    rgba[to] = source.rgba[from]!;
    rgba[to + 1] = source.rgba[from + 1]!;
    rgba[to + 2] = source.rgba[from + 2]!;
    rgba[to + 3] = source.rgba[from + 3]!;
  }
}

/** zlib + CRC32, which is all a PNG needs around the raw scanlines. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const typeBytes = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, Buffer.from(body)])));
  return Buffer.concat([length, typeBytes, Buffer.from(body), crc]);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(outWidth, 0);
header.writeUInt32BE(outHeight, 4);
header[8] = 8;
header[9] = 6;
const raw = Buffer.alloc((outWidth * 4 + 1) * outHeight);
for (let row = 0; row < outHeight; row += 1) {
  raw[row * (outWidth * 4 + 1)] = 0;
  Buffer.from(rgba.buffer, rgba.byteOffset + row * outWidth * 4, outWidth * 4).copy(raw, row * (outWidth * 4 + 1) + 1);
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", header),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", new Uint8Array(0)),
]);

const suffix = zoom === 1 ? "" : `x${zoom}`;
const out = file.replace(/\.png$/i, "") + `.${x}-${y}-${width}-${height}${suffix}.png`;
writeFileSync(out, png);

// Luminance statistics of the crop, from the captured pixels only.
let sum = 0;
let sumSquares = 0;
const colours = new Set<number>();
for (let index = 0; index < rgba.length; index += 4) {
  const luminance = 0.2126 * rgba[index]! + 0.7152 * rgba[index + 1]! + 0.0722 * rgba[index + 2]!;
  sum += luminance;
  sumSquares += luminance * luminance;
  colours.add(((rgba[index]! >> 3) << 10) | ((rgba[index + 1]! >> 3) << 5) | (rgba[index + 2]! >> 3));
}
const mean = sum / (rgba.length / 4);
process.stdout.write(
  `${out}\n  ${width}x${height} at (${x},${y}) from ${source.width}x${source.height}, zoom ${zoom}\n` +
    `  mean luminance ${mean.toFixed(2)}, spread ${Math.sqrt(Math.max(0, sumSquares / (rgba.length / 4) - mean * mean)).toFixed(2)}, distinct colours ${colours.size}\n`,
);
