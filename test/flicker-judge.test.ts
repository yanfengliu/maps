/**
 * The flicker judge's own gate: every predicate, watched to fail.
 *
 * `tools/flicker/judge.ts` decides whether a captured sequence of consecutive
 * frames holds still, and this file is what makes that decision a check rather
 * than an opinion. Each case below is the defect the predicate exists for, put
 * back on purpose, and the failure message is matched by name so a case cannot
 * pass because a *different* check happened to fire.
 *
 * The frames come from `flicker-frames.ts` and are real PNGs decoded through
 * `tools/visual/png.ts`. What they are not is a rendering: a synthetic field has
 * no lens, no tone curve, no parallax and no population, so a number measured
 * here is a statement about the predicate and never about the scene. The last
 * case runs the same predicates over real captured bytes from the post-chain
 * lane, which is the only thing in this file that looks at a rendered frame, and
 * it says so when the archive is not on this machine rather than passing.
 *
 * **Bound on the whole file.** The synthetic controls bound the *indicator*, not
 * the scene: they show that a pure translation of a synthetic field measures far
 * below the bar and a collapsed-detail field far above it. Nothing here says
 * what a rendered Shibuya at dusk measures, and no threshold here should be read
 * as calibrated against one until a real run has produced the numbers.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  CRAWL_FRACTION_PER_FRAME,
  FLICKER_CADENCE,
  MINIMUM_FLICKER_FRAMES,
  judgeFlicker,
  type FlickerFrame,
  type FramePose,
} from "../tools/flicker/judge.js";
import { decodePng } from "../tools/visual/png.js";
import { FRAME_WIDTH, crawlingRecord, frameAt, frozenRecord, movingRecord, oscillatingRecord, windowFrame } from "./flicker-frames.js";

const has = (failures: string[], fragment: string): boolean => failures.some((line) => line.includes(fragment));

/** A record's own digest of a frame's pixels, so a deliberately stale record is still self-consistent. */
const digestOf = (rgba: Uint8Array): string => createHash("sha256").update(Buffer.from(rgba)).digest("hex");

describe("the flicker judge", () => {
  it("carries the bars every other case is measured against", () => {
    // The contract is the load-bearing part of this instrument, and a bar moved
    // to make a run pass is the failure it exists to prevent. Pinned here so
    // that edit is a deliberate act with a red case beside it rather than a
    // quiet number change.
    expect(CRAWL_FRACTION_PER_FRAME).toBe(0.005);
    expect(FLICKER_CADENCE).toEqual({ cadenceFrames: 2, maxPairGapFrames: 18 });
    expect(MINIMUM_FLICKER_FRAMES).toBe(8);
  });

  it("passes a moving camera whose frames differ only by the expected shift", () => {
    const report = judgeFlicker(movingRecord(10));

    expect(report.failures, `a pure translation was refused:\n${report.failures.join("\n")}`).toEqual([]);
    expect(report.pairs).toBe(9);
    expect(report.cameraMoved).toBe(true);

    // Every predicate the criterion names, read off the report rather than
    // inferred from the empty failure list.
    for (const pair of report.pairs_) {
      expect(pair.digestDiffers, `${pair.to} repeats its predecessor's bytes`).toBe(true);
      expect(pair.changedFraction, `${pair.to} did not change at all`).toBeGreaterThan(0.5);
      expect(pair.frameGap, `${pair.to} spans more frames than the cadence allows`).toBeLessThanOrEqual(
        FLICKER_CADENCE.maxPairGapFrames,
      );
      expect(pair.cameraTravelM, `${pair.to} shows no camera travel`).toBeGreaterThan(0);
      // The strongest statement in this file: the estimator did not merely find
      // *a* minimum, it found the translation the frames were built with. Every
      // crawl figure below rests on that being true.
      expect(pair.estimatedShift, `${pair.to} was aligned at the wrong shift`).toEqual({ dx: 3, dy: 1 });
    }

    // The crawl indicator has to be far below the bar on a pure shift, or it is
    // measuring the camera rather than the picture.
    const worst = Math.max(...report.pairs_.map((pair) => pair.crawl));
    expect(worst, `a pure shift measured crawl at ${worst}`).toBeLessThan(CRAWL_FRACTION_PER_FRAME / 3);
  });

  it("fails a frozen scene by name", () => {
    // The record is the shape a capture that photographed a stale buffer
    // produces: one picture written under every name while the camera and the
    // render counter keep moving. It is also the control for the *other*
    // predicates - the camera travelled and the counter advanced everywhere, so
    // byte-identity is the only thing that can be wrong - and the failure count
    // is pinned to one for exactly that reason. A looser assertion here passes
    // when the check is deleted, because some other failure is still reported.
    const report = judgeFlicker(frozenRecord(10));

    // Nine pairs, nine reports: the count is pinned so that a case whose check
    // has been deleted cannot pass on some *other* failure it happens to
    // produce, which is exactly what happened to this case's first version.
    expect(report.failures, `a frozen scene produced:\n${report.failures.join("\n")}`).toHaveLength(9);
    expect(report.failures.every((line) => line.includes("byte-identical"))).toBe(true);
    expect(report.failures[0]).toMatch(/syn-01\.png is byte-identical to syn-00\.png/);
    // The crawl indicator must not be what caught this: identical bytes are
    // zero crawl by construction, and a case that passed because crawl fired
    // would be evidence for the wrong predicate.
    expect(report.pairs_.every((pair) => pair.crawl === 0)).toBe(true);
    expect(report.pairs_.every((pair) => pair.changedFraction === 0)).toBe(true);
  });

  it("fails a stalled render counter by name", () => {
    const frames = movingRecord(10).map((frame) => ({
      ...frame,
      frameCountBefore: 1_000,
      frameCountAfter: 1_000,
    }));
    const report = judgeFlicker(frames);

    expect(has(report.failures, "render counter did not advance")).toBe(true);
    expect(report.failures.join("\n")).toMatch(/\(1000 to 1000\)/);
  });

  it("flags a synthetic high-frequency change that a shift cannot explain, and not a pure shift", () => {
    const crawled = judgeFlicker(crawlingRecord(10));
    const shifted = judgeFlicker(movingRecord(10));

    const crawledWorst = Math.max(...crawled.pairs_.map((pair) => pair.crawl));
    const shiftedWorst = Math.max(...shifted.pairs_.map((pair) => pair.crawl));

    expect(has(crawled.failures, "the crawl indicator reads")).toBe(true);
    expect(crawledWorst, `the crawl case measured ${crawledWorst}`).toBeGreaterThan(CRAWL_FRACTION_PER_FRAME);
    expect(shiftedWorst, `the pure shift measured ${shiftedWorst}`).toBeLessThan(CRAWL_FRACTION_PER_FRAME / 3);

    // The two records differ by one thing - whether detail survives between the
    // frames - so this is a positive and a negative control rather than one
    // number against a bar, and the separation is asserted rather than reported.
    expect(crawledWorst / shiftedWorst).toBeGreaterThan(10);

    // The crawl the case put in is real detail change and not a size artifact:
    // every flagged pair still reports a camera that moved and a digest that
    // differs, so the indicator is the only thing that failed.
    for (const pair of crawled.pairs_) {
      expect(pair.digestDiffers).toBe(true);
      expect(pair.cameraTravelM).toBeGreaterThan(0);
    }
  });

  it("catches a stale buffer its own crawl indicator would have missed", () => {
    // The record oscillates, so a frame written twice - the render loop stopped
    // between two shots, or the capture photographed the same buffer again - is
    // byte-identical to its predecessor. Every pair still travels and every
    // digest that is not stale still differs, so this is the one case where the
    // strong predicate and the crawl indicator disagree, and the strong one is
    // the only thing that catches it.
    const report = judgeFlicker(oscillatingRecord(10));

    expect(report.failures, `an oscillating pure shift was refused:\n${report.failures.join("\n")}`).toEqual([]);
    const worst = Math.max(...report.pairs_.map((pair) => pair.crawl));
    expect(worst, `an oscillating pure shift measured crawl at ${worst}`).toBeLessThan(CRAWL_FRACTION_PER_FRAME / 3);

    const oscillated = oscillatingRecord(10);
    const stale = oscillated.map((frame, index) =>
      index === 5
        ? { ...frame, image: oscillated[4]!.image, sha256: digestOf(oscillated[4]!.image.rgba) }
        : frame,
    );
    const refused = judgeFlicker(stale);
    expect(has(refused.failures, "byte-identical")).toBe(true);
    expect(refused.failures.join("\n")).toMatch(/syn-05\.png is byte-identical to syn-04\.png/);
  });

  it("fails a camera that never moved, even when every frame is a distinct real picture", () => {
    // Distinct content, so the frozen-scene check cannot fire and this case
    // isolates the motion requirement: the scene changed and the camera did not,
    // which is a sequence of stills rather than the criterion's subject.
    const still = frameAt(0).pose;
    const frames = movingRecord(10).map((frame, index) => ({
      ...frame,
      pose: still,
      image: windowFrame(index * 4, 0),
    }));
    const report = judgeFlicker(frames);

    expect(has(report.failures, "never moved")).toBe(true);
    expect(report.cameraMoved).toBe(false);
    expect(report.pairs_.every((pair) => pair.cameraTravelM === 0)).toBe(true);
    // No frozen pair, so the failure is not the byte-identity check in disguise.
    expect(has(report.failures, "byte-identical")).toBe(false);
  });

  it("refuses a record too short to judge", () => {
    const report = judgeFlicker(movingRecord(MINIMUM_FLICKER_FRAMES - 1));

    expect(has(report.failures, "fewer than the")).toBe(true);
    // A short record that is otherwise sound must still be refused: the check
    // is not allowed to report "did not run" as "passed".
    expect(report.failures).toHaveLength(1);
  });

  it("refuses an empty record by name rather than reporting no failures", () => {
    const report = judgeFlicker([]);

    expect(report.failures).toHaveLength(1);
    expect(has(report.failures, "the record is empty")).toBe(true);
  });

  it("fails frames at two different sizes instead of comparing them", () => {
    const mismatched = movingRecord(8).map((frame, index) =>
      index === 4 ? { ...frame, image: { ...frame.image, width: FRAME_WIDTH - 8 } } : frame,
    );
    const report = judgeFlicker(mismatched);

    expect(has(report.failures, "cannot be compared pixel for pixel")).toBe(true);
    expect(report.failures.join("\n")).toMatch(/syn-04\.png: 184x108/);
  });

  it("binds the real frames the post-chain lane archived, when they are on this machine", () => {
    const archive = postChainArchive();
    const record = archive === null ? null : readMotionRecord(archive);

    if (archive === null || record === null) {
      // Named, not silent. This is the archive being absent, which is a
      // different statement from the predicate holding, and a case that returned
      // quietly here would be reporting "did not run" as "passed".
      expect(archive, "the post-chain archive is not on this machine, so no predicate was exercised over real frames").not.toBeNull();
      return;
    }

    const stills = availableStills(archive);
    expect(
      stills.length,
      `the archive at ${archive} holds no pair of real frames, so nothing here ran over a rendered frame`,
    ).toBeGreaterThanOrEqual(2);

    const frames = stills.map((still, index) => realFrame(record, still, index));

    // The instrument's digest of the bytes on disk is the record's own, which is
    // what "bound by digest" means and is the one thing this case can check
    // against the archive rather than against itself.
    for (const frame of frames) {
      const recorded = record.sha256[frame.file];
      if (recorded !== undefined) expect(frame.sha256, `${frame.file} digest`).toBe(recorded);
    }

    const report = judgeFlicker(frames);
    expect(report.pairs).toBe(frames.length - 1);
    for (const pair of report.pairs_) {
      expect(Number.isFinite(pair.crawl)).toBe(true);
      expect(Number.isFinite(pair.unexplainedFraction)).toBe(true);
      expect(pair.crawl).toBeGreaterThanOrEqual(0);
      expect(pair.changedFraction).toBeGreaterThanOrEqual(0);
      expect(pair.signatureDistance).toBeGreaterThanOrEqual(0);
      // The archive's real captures are 17 to 119 rendered frames apart and were
      // never taken for this lane, so what this case reports is that the
      // instrument runs over them - the numbers themselves are in the report the
      // lane writes, not asserted here.
      expect(pair.frameGap).toBeGreaterThan(0);
    }
    console.log(
      "post-chain archive:",
      report.pairs_.map((pair) => `${pair.from}->${pair.to} gap ${pair.frameGap} crawl ${pair.crawl.toExponential(2)}`).join("; "),
    );
  });
});

/** Where the post-chain lane's archived frames are, or null. */function postChainArchive(): string | null {
  // This lane runs in a worktree under `artifacts/`, and the captures an earlier
  // lane left behind live in the primary checkout's `artifacts/post-chain/motion`.
  // So the search walks up from the repository root of whichever checkout this
  // test is running in rather than assuming which of the two this is.
  const candidates: string[] = [];
  let root = path.resolve(import.meta.dirname, "..");
  for (let up = 0; up < 4; up += 1) {
    candidates.push(path.join(root, "artifacts", "post-chain", "motion"));
    candidates.push(path.join(root, "artifacts", "flicker", "wt", "artifacts", "post-chain", "motion"));
    root = path.resolve(root, "..");
  }
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

interface MotionRecord {
  /** Real frames still on disk, by name, with the pose their capture recorded. */
  real: Map<string, { sha256: string; frameCount: number; camera: FramePose }>;
  sha256: Record<string, string>;
}

/**
 * The post-chain lane's own record of what it captured.
 *
 * Read rather than remembered: `motion.json` carries each captured frame's
 * sha256, render counter and camera pose, so a case that used this lane's own
 * poses would be inventing the very numbers it is checking. The archive on this
 * machine holds two of the PNGs that record names - `rest-b.png` is absent from
 * disk while the record has its digest, which is the archive being pruned and
 * not a disagreement about bytes.
 */
function readMotionRecord(archive: string): MotionRecord | null {
  const file = path.join(archive, "motion.json");
  if (!existsSync(file)) return null;
  const parsed = JSON.parse(readFileSync(file, "utf8")) as {
    atRest: { a: MotionFrameRecord; b: MotionFrameRecord };
    motion: { frames: MotionFrameRecord[] };
    stop: { frames: MotionFrameRecord[] };
  };

  const real = new Map<string, { sha256: string; frameCount: number; camera: FramePose }>();
  const sha256: Record<string, string> = {};
  const note = (entry: MotionFrameRecord): void => {
    sha256[entry.file] = entry.sha256;
    if (existsSync(path.join(archive, entry.file))) {
      real.set(entry.file, { sha256: entry.sha256, frameCount: entry.frameCount, camera: entry.camera });
    }
  };
  note(parsed.atRest.a);
  note(parsed.atRest.b);
  for (const entry of parsed.motion.frames) note(entry);
  for (const entry of parsed.stop.frames) note(entry);
  return { real, sha256 };
}

interface MotionFrameRecord {
  file: string;
  sha256: string;
  frameCount: number;
  camera: FramePose;
}

/** The archived frames whose bytes and recorded pose are both present, in record order. */
function availableStills(archive: string): string[] {
  return ["rest-a.png", "motion-07.png", "stop-00.png"].filter((name) => existsSync(path.join(archive, name)));
}

/**
 * One archived frame as the judge wants it.
 *
 * The pose and the render counter are the capture's own recorded values, read
 * out of `motion.json` rather than invented here. The step index is derived from
 * the render counter at the fixed 60 Hz step the simulation runs at, because the
 * archive did not record ticks; it is named as derived for that reason and the
 * judge is never asked about the derived gap.
 */
function realFrame(record: MotionRecord, name: string, index: number): FlickerFrame {
  const archive = postChainArchive()!;
  const bytes = new Uint8Array(readFileSync(path.join(archive, name)));
  const known = record.real.get(name);
  const frameCount = known?.frameCount ?? 1_000 + index;
  return {
    file: name,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    frameCountBefore: frameCount,
    frameCountAfter: frameCount + 1,
    tick: frameCount,
    pose: known?.camera ?? frameAt(0).pose,
    image: decodePng(bytes),
  };
}
