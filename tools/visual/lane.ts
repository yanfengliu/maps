/**
 * Which lane a capture run belongs to, and what that lane is allowed to write.
 *
 * `npm run visual` produces the 44-frame verdict set on SwiftShader. A pixel set
 * captured on one renderer cannot inherit a review written for another, so the
 * hardware iteration lane is a different lane with different pixels and must be
 * impossible to mistake for the verdict. Three things enforce that here rather
 * than in prose:
 *
 * 1. Each lane resolves to its own output root. The hardware lane cannot write
 *    into `artifacts/visual/`, because its root is `artifacts/visual-hardware/`.
 * 2. `complete.json` is written only under the verdict root. There is no
 *    certificate file for the hardware lane to produce.
 * 3. `assertCertifiable()` throws by name for the hardware lane, so an attempt
 *    to certify one fails with a message that says why instead of writing an
 *    artifact a later reader would treat as evidence.
 *
 * The lane is named by `MAPS_VISUAL_LANE`, and the hardware lane additionally
 * requires `MAPS_VISUAL_GPU=hardware` — which is also the switch `orbit.ts`
 * already uses to refuse a silent software fallback, so a hardware run that
 * softwarises fails by renderer name rather than reporting a fast CPU frame.
 */

export const LANES = ["verdict", "hardware-iteration"] as const;

export type Lane = (typeof LANES)[number];

/** The lane whose frames are comparable across machines and carry the review. */
export const VERDICT_LANE: Lane = "verdict";

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
 * The ignored directory each lane writes into.
 *
 * Deliberately not a full path: both are resolved against the working directory
 * by `laneDir()`, and neither may be nested inside the other.
 */
const LANE_ROOT: Readonly<Record<Lane, string>> = Object.freeze({
  verdict: "artifacts/visual",
  "hardware-iteration": "artifacts/visual-hardware",
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
      `MAPS_VISUAL_LANE is "${name}", which is not a lane. Use ${LANES.map((lane) => `"${lane}"`).join(" or ")}. ` +
        "It is not defaulted here on purpose: an unrecognised value would otherwise capture into " +
        "the verdict directory and be reviewed as if the renderer matched.",
    );
  }
  if (name === "hardware-iteration" && process.env["MAPS_VISUAL_GPU"] !== "hardware") {
    throw new Error(
      "The hardware iteration lane requires MAPS_VISUAL_GPU=hardware. Without it the run would " +
        "use whatever renderer Chromium picks and record frames under the hardware lane's name, " +
        "which is a lie about the renderer and the one thing this lane must never do.",
    );
  }
  return name;
}

/** The directory, relative to the working directory, that this lane writes. */
export function laneDir(lane: Lane = activeLane()): string {
  return LANE_ROOT[lane];
}

/**
 * Refuse to certify anything but the verdict lane.
 *
 * `complete.json` is the artifact the plan and the reviews read. A hardware run
 * reaching this point would produce a certificate for a pixel set that no review
 * covers, and the reader of that file cannot tell the two apart afterwards —
 * which is exactly the mistake the two-lane split exists to make impossible.
 */
export function assertCertifiable(lane: Lane = activeLane()): void {
  if (lane !== VERDICT_LANE) {
    throw new Error(
      `Refusing to certify the "${lane}" lane: its frames come from a different renderer than the ` +
        `reviewed 44-frame set, and a pixel set captured on one renderer cannot inherit a review ` +
        `written for another. Only the "${VERDICT_LANE}" lane produces complete.json. Run ` +
        "`npm run visual` for the verdict, and use the hardware lane for iteration only.",
    );
  }
}
