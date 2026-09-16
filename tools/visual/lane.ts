/**
 * Which lane a capture run belongs to, and what that lane is allowed to write.
 *
 * `npm run visual` produces the 44-frame verdict set on SwiftShader. A pixel set
 * captured on one renderer cannot inherit a review written for another, so each
 * iteration lane is a different lane with different pixels and must be
 * impossible to mistake for the verdict. Four things enforce that here rather
 * than in prose:
 *
 * 1. Each lane resolves to its own output root. No iteration lane can write into
 *    `artifacts/visual/`, because its root is its own directory.
 * 2. `complete.json` is written only under the verdict root. There is no
 *    certificate file for an iteration lane to produce.
 * 3. `assertCertifiable()` throws by name for every lane but the verdict, so an
 *    attempt to certify one fails with a message that says why instead of
 *    writing an artifact a later reader would treat as evidence.
 * 4. Each lane's renderer is asserted positively, not recorded: the pixel lane
 *    through `pixelLaneRefusal()`, and the lifecycle lane through
 *    `HARDWARE_RENDERER_DENYLIST` in its own specification. A recorded string is
 *    a note; a refused string is a check.
 *
 * The lane is named by `MAPS_VISUAL_LANE`, and the iteration lanes additionally
 * require `MAPS_VISUAL_GPU=hardware` — which is also the switch `orbit.ts`
 * already uses to refuse a silent software fallback, so a hardware run that
 * softwarises fails by renderer name rather than reporting a fast CPU frame.
 *
 * The two iteration lanes are not one lane with a flag, because they differ by
 * more than taste: the appearance sweep runs `?agents=`-free by design, so the
 * reviewed 44 frames contain no agent at all. `populated-iteration` captures the
 * population and is the only lane whose frames can show a pedestrian.
 */

export const LANES = ["verdict", "hardware-iteration", "populated-iteration"] as const;

export type Lane = (typeof LANES)[number];

/**
 * The lane whose frames are comparable across machines and carry the review.
 *
 * Typed as the literal rather than as `Lane` so that `lane !== VERDICT_LANE`
 * narrows the union, which is what lets `assertCertifiable` look a refusal up
 * by lane without a cast.
 */
export const VERDICT_LANE = "verdict" as const;

/**
 * The environment `playwright.hardware.config.ts` pins for its own run.
 *
 * Exported rather than written into the config as string literals so the config
 * and this module cannot disagree about what the hardware lane is called, and so
 * the fact that it requests the GPU lives beside the check that refuses a
 * software fallback.
 */
export const HARDWARE_ITERATION_ENV: Readonly<Record<string, string>> = Object.freeze({
  MAPS_VISUAL_LANE: "hardware-iteration",
  MAPS_VISUAL_GPU: "hardware",
});

/**
 * The environment `playwright.populated.config.ts` pins for its own run.
 *
 * A third lane, for the same reason the second one exists: the verdict set is
 * captured `?agents=`-free by design, so its 44 frames contain no pedestrian and
 * no vehicle, and a frame set of the *population* cannot inherit the review
 * written for an empty city. On top of the renderer difference it carries scene
 * state the reviewed set never had, so it is kept apart by name rather than
 * folded into the hardware lane: a run that forgot `?agents=1` would otherwise
 * write an empty city into the populated lane's directory and look like a
 * capture of the population.
 */
export const POPULATED_ITERATION_ENV: Readonly<Record<string, string>> = Object.freeze({
  MAPS_VISUAL_LANE: "populated-iteration",
  // The population costs a fixed step of about 44 ms per tick with 3,000
  // pedestrians (measured 2026-09-15 under the verdict lane's load,
  // `artifacts/populated-capture/population-run-1800.json`), so a software
  // rasteriser would put a wall-clock ceiling on the simulated window this lane
  // exists to cover. It is a hardware lane for that reason and not only for
  // comparability.
  MAPS_VISUAL_GPU: "hardware",
});

/**
 * The ignored directory each lane writes into.
 *
 * Deliberately not a full path: all are resolved against the working directory
 * by `laneDir()`, and none may be nested inside another.
 */
const LANE_ROOT: Readonly<Record<Lane, string>> = Object.freeze({
  verdict: "artifacts/visual",
  "hardware-iteration": "artifacts/visual-hardware",
  "populated-iteration": "artifacts/populated-capture",
});

function isLane(value: string): value is Lane {
  return (LANES as readonly string[]).includes(value);
}

/**
 * The lane this process is running as.
 *
 * Unknown values throw rather than falling back to the verdict lane: a typo in
 * a script would otherwise write hardware frames into the verdict directory,
 * which is the one outcome this file exists to prevent.
 */
export function activeLane(): Lane {
  const name = process.env["MAPS_VISUAL_LANE"] ?? VERDICT_LANE;
  if (!isLane(name)) {
    throw new Error(
      `MAPS_VISUAL_LANE is "${name}", which is not a lane. Use ${LANES.map((lane) => `"${lane}"`).join(", ")}. ` +
        "It is not defaulted here on purpose: an unrecognised value would otherwise capture into " +
        "the verdict directory and be reviewed as if the renderer matched.",
    );
  }
  if (name !== VERDICT_LANE && process.env["MAPS_VISUAL_GPU"] !== "hardware") {
    throw new Error(
      `The ${name} lane requires MAPS_VISUAL_GPU=hardware. Without it the run would ` +
        "use whatever renderer Chromium picks and record frames under the iteration lane's name, " +
        "which is a lie about the renderer and the one thing these lanes must never do.",
    );
  }
  return name;
}

/** The directory, relative to the working directory, that this lane writes. */
export function laneDir(lane: Lane = activeLane()): string {
  return LANE_ROOT[lane];
}

/**
 * Why a lane's frames cannot be the verdict, in that lane's own terms.
 *
 * Kept per lane rather than as one sentence, because the reasons genuinely
 * differ: the hardware lane differs by renderer, and the populated lane differs
 * by renderer *and* by scene — no frame of the reviewed set contains an agent.
 */
const LANE_REFUSAL: Readonly<Record<Exclude<Lane, typeof VERDICT_LANE>, string>> = Object.freeze({
  "hardware-iteration":
    "its frames come from a different renderer than the reviewed 44-frame set",
  "populated-iteration":
    "its frames come from a different renderer than the reviewed 44-frame set and from a " +
    "populated scene the reviewed 44-frame set never contained, since the appearance sweep " +
    "runs with the population switched off by design",
});

/**
 * Refuse to certify anything but the verdict lane.
 *
 * `complete.json` is the artifact the plan and the reviews read. An iteration run
 * reaching this point would produce a certificate for a pixel set that no review
 * covers, and the reader of that file cannot tell the two apart afterwards —
 * which is exactly the mistake the lane split exists to make impossible.
 */
export function assertCertifiable(lane: Lane = activeLane()): void {
  if (lane !== VERDICT_LANE) {
    throw new Error(
      `Refusing to certify the "${lane}" lane: ${LANE_REFUSAL[lane]}, and a pixel set captured ` +
        `on one renderer cannot inherit a review written for another. Only the "${VERDICT_LANE}" ` +
        "lane produces complete.json. Run `npm run visual` for the verdict, and use the iteration " +
        "lanes for iteration only.",
    );
  }
}

/**
 * Software rasterisers, by the strings Chromium reports for them.
 *
 * A denylist rather than an allowlist, because the lifecycle lane's question is
 * "is this the hardware renderer rather than a fallback" and an allowlist would
 * also refuse hardware this repository has never measured. The pixel lane's
 * question is the opposite one and has its own positive predicate below.
 */
export const HARDWARE_RENDERER_DENYLIST =
  /swiftshader|llvmpipe|softpipe|software|basic render driver|\bwarp\b/i;

/**
 * The renderer the pixel lane's frames must come from, positively.
 *
 * `playwright.config.ts` pins `--use-angle=swiftshader`, and the whole premise of
 * splitting the lanes by renderer is that the 44 reviewed frames come from one
 * known renderer. Recording that string is not a check: a Chromium that accepted
 * the flag and drew somewhere else would move the reviewed frame set silently.
 */
export const PIXEL_LANE_RENDERER = /swiftshader/i;

/**
 * Why this renderer string cannot be the pixel lane's, or null when it can.
 *
 * Shared by the two capture specifications, which fail within seconds of the
 * first frame, and by `verify-output.ts`, which refuses to certify a frame set
 * whose manifests name anything else — so the refusal names the offending string
 * wherever it fires instead of only in the spec that happened to run.
 */
export function pixelLaneRefusal(renderer: unknown, where: string): string | null {
  if (typeof renderer !== "string" || renderer.trim() === "") {
    return (
      `${where} reported no glRenderer, so this run cannot show which renderer produced its frames. ` +
      "The pixel lane's frames are comparable across machines only while every one of them comes from " +
      "the SwiftShader that lane pins (playwright.config.ts, --use-angle=swiftshader); a frame set with " +
      "no renderer identity cannot be reviewed as this lane's."
    );
  }
  if (!PIXEL_LANE_RENDERER.test(renderer)) {
    return (
      `${where} reports the renderer "${renderer}", which is not SwiftShader. The 44-frame pixel set is ` +
      "comparable across machines only while every frame comes from the software lane the config pins " +
      "(--use-angle=swiftshader); a set captured on another renderer cannot inherit a review written " +
      "for this one, and there is deliberately no switch that moves this lane."
    );
  }
  return null;
}
