/**
 * What the lane's frames are asked to prove, as a pure function.
 *
 * The specification captures frames and writes records; this file decides whether
 * a set of records is a flythrough. It is separated for one reason: the claims
 * here are the lane's whole point, and a check that lives inside a 20-minute
 * browser test cannot be made to go red cheaply. `test/flythrough-frames.test.ts`
 * runs the same function over synthetic records with the defect put back — no
 * camera travel, one digest written twelve times, a population that is not drawn,
 * a frame at the wrong size, a render loop that stopped — so each claim is
 * watched to fail rather than asserted to hold.
 *
 * Every claim below is about the *sequence*, not about a frame. A still frame can
 * be a correct photograph of a city and say nothing about whether the camera was
 * driven, whether it moved, or whether anything is moving under it.
 */

/** One frame's record, as far as the sequence checks are concerned. */
export interface SequenceFrame {
  leg: string;
  /** The file's path relative to the lane root, for messages. */
  file: string;
  /** SHA-256 of the PNG on disk. */
  sha256: string;
  /** The metres the camera itself travelled since the previous frame in the leg. */
  cameraTravelM: number | null;
  /** Frame counter before and after the capture, so a stalled loop is visible. */
  frameCountBefore: number;
  frameCountAfter: number;
  /** Population ticks before the capture. */
  ticksBefore: number;
  width: number;
  height: number;
  /** Drawn pedestrians and vehicles as the app reported them for this frame. */
  pedestriansDrawn: number;
  vehiclesDrawn: number;
  /** Fraction of the frame's pixels with a luminance deviation above 12. */
  structuredPixels: number;
  /** The controls' target height, which no input can move. */
  targetY: number;
}

export interface SequenceFloors {
  pedestriansDrawn: number;
  vehiclesDrawn: number;
  structuredPixels: number;
}

export interface SequenceExpectations {
  /** The capture size every frame must be at. */
  viewport: { width: number; height: number };
  /** The height the controls' target must hold, metres, and the tolerance. */
  targetY: number;
  targetToleranceM: number;
  /**
   * The least camera travel a pair of adjacent frames may show, metres.
   *
   * Not zero, and that is the point. The camera is under damped controls and a
   * leg that stops asking for movement still glides for a moment, so the pairs a
   * plan wrote as "no input" carry centimetres rather than nothing; a pair that
   * carries *nothing* is a pair where either the input path failed or the render
   * loop stopped, and both are reported by name rather than counted as a
   * flythrough. 1 mm over a 100 ms gap is 1 cm/s, which is a tenth of a walking
   * pace — below anything the controls do when they are being driven.
   */
  minimumTravelM: number;
  /** The least fraction of a leg's frames whose digests must differ. */
  minimumDistinctFraction: number;
  /** True when the driver was deliberately raising input that cannot move anything. */
  redControl: boolean;
}

/**
 * The failures a frame set has, in the set's own terms, or an empty list.
 *
 * Every message names the frame, the number and what would satisfy the check: a
 * reader of a failed gate should not have to open the specification to find out
 * what it wanted.
 */
export function judgeSequence(
  frames: readonly SequenceFrame[],
  legs: readonly { name: string; frames: number }[],
  floors: SequenceFloors,
  expectations: SequenceExpectations,
): string[] {
  const failures: string[] = [];

  if (frames.length === 0) {
    return [
      "No frames were captured at all. A lane that writes no frame has not run, and reporting it as a pass is the one " +
        "outcome this check exists to prevent.",
    ];
  }

  const wanted = legs.reduce((total, leg) => total + leg.frames, 0);
  if (frames.length !== wanted) {
    failures.push(
      `The plan asked for ${wanted} frames across ${legs.length} legs and the capture produced ${frames.length}, so ` +
        "the sequence is short and every claim below is a claim about a part of it.",
    );
  }

  const travel = frames.filter((frame) => frame.cameraTravelM !== null);
  const still = travel.filter((frame) => (frame.cameraTravelM ?? 0) < expectations.minimumTravelM);
  if (expectations.redControl) {
    if (still.length !== travel.length) {
      failures.push(
        `MAPS_FLYTHROUGH_INPUT is set to a mode that raises pointer and wheel events with zero deltas, which is the ` +
          `lane's red control, and ${travel.length - still.length} of ${travel.length} frame pairs still moved the ` +
          "camera. Input that cannot move the camera moved it, so the mode is not doing what it says and the red " +
          "control proves nothing about the lane.",
      );
    }
    return failures;
  }

  if (still.length > 0) {
    failures.push(
      `${still.length} of ${travel.length} frame pairs moved the camera less than ${(expectations.minimumTravelM * 1000).toFixed(0)} mm ` +
        `(${still.slice(0, 4).map((frame) => frame.file).join(", ")}${still.length > 4 ? ", ..." : ""}). The camera is ` +
        "driven by synthesised pointer, wheel and key input, and a pair of frames taken from two poses is the only " +
        "evidence that the input path reaches the controls at all: identical frames from a moving route mean the " +
        "route was not flown, whatever the manifest says.",
    );
  }

  const digests = new Map<string, number>();
  for (const frame of frames) digests.set(frame.sha256, (digests.get(frame.sha256) ?? 0) + 1);
  const distinctFraction = digests.size / frames.length;
  if (distinctFraction < expectations.minimumDistinctFraction) {
    const worst = [...digests.entries()].sort((a, b) => b[1] - a[1])[0]!;
    failures.push(
      `${digests.size} distinct digests across ${frames.length} frames (${(distinctFraction * 100).toFixed(1)}%), and the ` +
        `most repeated one appears ${worst[1]} times. The frames are the same bytes written more than once, so at least ` +
        `${frames.length - digests.size} of them are a copy of another and none of them is a frame of a moving city.`,
    );
  }

  for (const leg of legs) {
    const legFrames = frames.filter((frame) => frame.leg === leg.name);
    if (legFrames.length === 0) {
      failures.push(`The ${leg.name} leg captured no frames, so that part of the route was not flown.`);
      continue;
    }
    const first = legFrames[0]!;
    const last = legFrames[legFrames.length - 1]!;
    if (last.frameCountAfter <= first.frameCountBefore) {
      failures.push(
        `The render loop stopped during ${leg.name}: the frame counter went from ${first.frameCountBefore} to ` +
          `${last.frameCountAfter} across ${legFrames.length} captures, so every frame after the first is a stale buffer ` +
          "being photographed again.",
      );
    }
    if (last.ticksBefore <= first.ticksBefore) {
      failures.push(
        `${leg.name} did not advance the simulation between its first and last frame (tick ${first.ticksBefore} to ` +
          `${last.ticksBefore}), so nothing in the leg was moving and the frames cannot judge motion.`,
      );
    }
    const atRest = legFrames.filter((frame) => frame.pedestriansDrawn >= floors.pedestriansDrawn).length;
    if (atRest === 0) {
      failures.push(
        `No frame of ${leg.name} has ${floors.pedestriansDrawn} pedestrians drawn; the most any of them reports is ` +
          `${Math.max(...legFrames.map((frame) => frame.pedestriansDrawn))}. A flight through a city with no crowd in ` +
          "it answers nothing about the population criteria, and the route was aimed at a measured knot.",
      );
    }
    const empty = legFrames.filter((frame) => frame.structuredPixels < floors.structuredPixels).length;
    if (empty > 0) {
      failures.push(
        `${empty} of ${legFrames.length} frames in ${leg.name} have under ${(floors.structuredPixels * 100).toFixed(0)}% ` +
          `of their pixels showing structure (${legFrames.filter((frame) => frame.structuredPixels < floors.structuredPixels).slice(0, 3).map((frame) => frame.file).join(", ")}), ` +
          "which is a frame filled by one surface: a wall, a roof or the sky. Those frames were captured but they judged " +
          "nothing, and a leg that is mostly such frames is a leg aimed at the inside of a building.",
      );
    }
  }

  const drawnVehicles = frames.filter((frame) => frame.vehiclesDrawn >= floors.vehiclesDrawn).length;
  if (drawnVehicles === 0) {
    failures.push(
      `No frame has ${floors.vehiclesDrawn} vehicle drawn, so the flight judged no traffic. The fleet thins with time ` +
        "and the route has to be aimed at where the vehicles are at the ticks it captures.",
    );
  }

  const wrongTarget = frames.filter((frame) => Math.abs(frame.targetY - expectations.targetY) > expectations.targetToleranceM);
  if (wrongTarget.length > 0) {
    failures.push(
      `${wrongTarget.length} frames report the controls' target at a height other than ${expectations.targetY} m ` +
        `(${wrongTarget.slice(0, 3).map((frame) => `${frame.file}: ${frame.targetY.toFixed(4)} m`).join(", ")}). No input ` +
        "can move that height — both axes of a pan are horizontal — so a frame where it moved is a frame where the " +
        "camera was set rather than driven, which is the one thing this lane must never do.",
    );
  }

  const wrongSize = frames.filter(
    (frame) => frame.width !== expectations.viewport.width || frame.height !== expectations.viewport.height,
  );
  if (wrongSize.length > 0) {
    failures.push(
      `${wrongSize.length} frames are not at ${expectations.viewport.width}x${expectations.viewport.height} ` +
        `(${wrongSize.slice(0, 3).map((frame) => `${frame.file}: ${frame.width}x${frame.height}`).join(", ")}), so they ` +
        "are not comparable with the frames beside them.",
    );
  }

  return failures;
}
