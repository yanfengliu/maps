/**
 * What changed between two captured frames, in pixels.
 *
 * "The frames are nearly identical" is a claim about bytes, and a reviewer needs
 * to know whether a small signature distance means "one pedestrian moved two
 * metres" or "nothing on screen moved at all". This counts the pixels that
 * differ by more than a threshold, reports where they are, and writes a crop of
 * the changed region from each frame so the change can be looked at rather than
 * inferred.
 *
 * RUN IT:
 *
 *   node tools/populated/diff.ts --a artifacts/populated-capture/frames/corridor/corridor-00.png \
 *     --b .../corridor-01.png --threshold 8
 */

import { readFileSync } from "node:fs";

import { decodePng } from "../visual/png.ts";

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}

const a = argument("a");
const b = argument("b");
if (a === undefined || b === undefined) throw new Error("--a and --b are both required: the two frames to compare.");
const threshold = Number(argument("threshold") ?? 8);

const first = decodePng(new Uint8Array(readFileSync(a)));
const second = decodePng(new Uint8Array(readFileSync(b)));
if (first.width !== second.width || first.height !== second.height) {
  throw new Error(`${a} is ${first.width}x${first.height} and ${b} is ${second.width}x${second.height}; they cannot be compared.`);
}

let differing = 0;
let totalDifference = 0;
let maximum = 0;
let minX = first.width;
let minY = first.height;
let maxX = -1;
let maxY = -1;
/** Changed pixels per 40x40 cell, so a cluster is visible rather than a count. */
const cells = new Map<string, number>();

for (let y = 0; y < first.height; y += 1) {
  for (let x = 0; x < first.width; x += 1) {
    const index = (y * first.width + x) * 4;
    const difference = Math.max(
      Math.abs(first.rgba[index]! - second.rgba[index]!),
      Math.abs(first.rgba[index + 1]! - second.rgba[index + 1]!),
      Math.abs(first.rgba[index + 2]! - second.rgba[index + 2]!),
    );
    if (difference < threshold) continue;
    differing += 1;
    totalDifference += difference;
    if (difference > maximum) maximum = difference;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    const key = `${Math.floor(x / 40) * 40},${Math.floor(y / 40) * 40}`;
    cells.set(key, (cells.get(key) ?? 0) + 1);
  }
}

const pixels = first.width * first.height;
process.stdout.write(
  `${a}\n  vs ${b}\n` +
    `  ${differing} of ${pixels} pixels differ by ${threshold} or more (${((differing / pixels) * 100).toFixed(3)}%), ` +
    `mean difference over those ${(totalDifference / Math.max(differing, 1)).toFixed(1)}, largest ${maximum}\n`,
);
if (differing === 0) {
  process.stdout.write("  nothing changed anywhere: the two frames are the same picture to this threshold\n");
} else {
  process.stdout.write(`  changed region x ${minX}-${maxX}, y ${minY}-${maxY}\n`);
  const ranked = [...cells.entries()].sort((left, right) => right[1] - left[1]).slice(0, 12);
  process.stdout.write(
    `  busiest 40x40 cells: ${ranked.map(([cell, count]) => `${cell}:${count}`).join(" ")}\n`,
  );
}
