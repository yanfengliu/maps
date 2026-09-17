/**
 * Which lane a capture run belongs to, and what that lane is allowed to write.
 *
 * `npm run visual` produces the 44-frame verdict set on the hardware renderer,
 * since the owner's 2026-09-16 instruction ("if you can use GPU, don't use CPU")
 * replaced the machine-independent software set. Each iteration lane is still a
 * different lane writing different pixels, and must be impossible to mistake for
 * the verdict. Four things enforce that here rather than in prose:
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
 * The renderer no longer separates the verdict from an iteration lane: every lane
 * is on the GPU now. What separates them is the run — the verdict is the one the
 * gate's own chain opened and certified, with the build, the served scene and the
 * harness pinned at `--begin`, and its frames are the appearance set the plan's
 * reviews are bound to. Everything else writes to a directory the certificate
 * never reads.
 *
 * The lane is named by `MAPS_VISUAL_LANE`, and the iteration lanes additionally
 * require `MAPS_VISUAL_GPU=hardware` — which is also the switch `orbit.ts`
 * already uses to refuse a silent software fallback, so a hardware run that
 * softwarises fails by renderer name rather than reporting a fast CPU frame.
 *
 * The three iteration lanes are not one lane with a flag, because they differ by
 * more than taste: the appearance sweep runs `?agents=`-free by design, so the
 * reviewed 44 frames contain no agent at all. `populated-iteration` captures the
 * population and is the only lane whose frames can show a pedestrian.
 */

export const LANES = ["verdict", "frame-budget", "populated-iteration", "flythrough-iteration"] as const;

export type Lane = (typeof LANES)[number];

/**
 * The lane whose frames carry the review and the certificate.
 *
 * It is no longer the lane that is comparable across machines — the 44 frames are
 * this GPU's pixels since 2026-09-16 — so what makes it the verdict is that the
 * gate's chain opened it and pinned the build, the served scene and the harness
 * around it, and the certificate names the GPU and driver those frames came from.
 *
 * Typed as the literal rather than as `Lane` so that `lane !== VERDICT_LANE`
 * narrows the union, which is what lets `assertCertifiable` look a refusal up
 * by lane without a cast.
 */
export const VERDICT_LANE = "verdict" as const;

/**
 * The environment `playwright.populated.config.ts` pins for its own run.
 *
 * A third lane, for the same reason the second one exists: the verdict set is
 * captured `?agents=`-free by design, so its 44 frames contain no pedestrian and
 * no vehicle, and a frame set of the *population* cannot inherit the review
 * written for an empty city. It carries scene state the reviewed set never had, so
 * it is kept apart by name rather than folded into another lane: a run that forgot
 * `?agents=1` would otherwise write an empty city into the populated lane's
 * directory and look like a capture of the population.
 */
export const POPULATED_ITERATION_ENV: Readonly<Record<string, string>> = Object.freeze({
  MAPS_VISUAL_LANE: "populated-iteration",
  // The population costs a fixed step of about 44 ms per tick with 3,000
  // pedestrians (measured 2026-09-15 under the verdict lane's load,
  // `artifacts/populated-capture/population-run-1800.json`), so a software
  // rasteriser would put a wall-clock ceiling on the simulated window this lane
  // exists to cover. It asks for the hardware renderer for that reason and not
  // only for comparability.
  MAPS_VISUAL_GPU: "hardware",
});

/**
 * The environment `playwright.flythrough.config.ts` pins for its own run.
 *
 * A fourth lane, because its subject is not a pose but a *sequence*: what
 * changes between adjacent frames. A still frame cannot contain flicker, crawl,
 * or a figure interpenetrating the one in front of it, so a flythrough cannot
 * inherit a review written about the populated lane's stills and those stills
 * cannot inherit a judgement written about motion. The directory is separate on
 * the same terms as the other two: a moving sequence written beside the reviewed
 * 44-frame set is indistinguishable from it to a later reader.
 *
 * Hardware, for the populated lane's reason and one more. A moving sequence is
 * judged between adjacent pairs, so the wall clock is not only a cost here, it
 * is a bound on the simulated window the frames cover: on SwiftShader these
 * frames would take an hour and would land on a different simulation.
 */
export const FLYTHROUGH_ITERATION_ENV: Readonly<Record<string, string>> = Object.freeze({
  MAPS_VISUAL_LANE: "flythrough-iteration",
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
  "frame-budget": "artifacts/frame-budget",
  "populated-iteration": "artifacts/populated-capture",
  "flythrough-iteration": "artifacts/flythrough2",
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
 * The renderer this process's lane asks Chromium for, for the record.
 *
 * The capture specifications and `progress.ts` run inside Playwright, under a
 * config that declares `MAPS_VISUAL_GPU` itself, so there the environment is the
 * whole answer. The wrapper does not: `node tools/visual/verify-output.ts --begin`
 * is its own process, started before any lane, and the `?? "software"` it used to
 * carry filed the first promoted run's own `run.json` as a software request beside
 * a 4090 renderer in the very same certificate — measured 2026-09-17. The verdict
 * lane asks for the GPU by construction, which is what its config pins and what
 * `pixelLaneRefusal` enforces at the first frame of either capture spec.
 */
export function requestedGpu(): "hardware" | "software" {
  const declared = process.env["MAPS_VISUAL_GPU"];
  if (declared === "hardware" || declared === "software") return declared;
  return activeLane() === VERDICT_LANE ? "hardware" : "software";
}

/**
 * Why a lane's frames cannot be the verdict, in that lane's own terms.
 *
 * Kept per lane rather than as one sentence, because the reasons genuinely
 * differ: the frame-budget lane measures intervals rather than appearance, and
 * the populated lane differs by scene as well — no frame of the reviewed set
 * contains an agent.
 */
const LANE_REFUSAL: Readonly<Record<Exclude<Lane, typeof VERDICT_LANE>, string>> = Object.freeze({
  "frame-budget":
    "its subject is the frame interval at 1920x1080, not the appearance of the 1280x720 frames the " +
    "reviews are bound to, and it keeps no frame set to review",
  "populated-iteration":
    "its frames come from a populated scene the reviewed 44-frame set never contained, since the " +
    "appearance sweep runs with the population switched off by design",
  "flythrough-iteration":
    "its frames are a moving sequence from a populated scene the reviewed set never contained, and its " +
    "subject is what changes between adjacent frames, which no still frame of the reviewed set can show",
});

/**
 * Refuse to certify anything but the verdict lane.
 *
 * `complete.json` is the artifact the plan and the reviews read. An iteration run
 * reaching this point would produce a certificate for a pixel set that no review
 * covers, and the reader of that file cannot tell the two apart afterwards —
 * which is exactly the mistake the lane split exists to make impossible. The
 * renderer is no longer what makes an iteration frame different, so the refusal
 * is about the run rather than the GPU.
 */
export function assertCertifiable(lane: Lane = activeLane()): void {
  if (lane !== VERDICT_LANE) {
    throw new Error(
      `Refusing to certify the "${lane}" lane: ${LANE_REFUSAL[lane]}. Only the "${VERDICT_LANE}" lane ` +
        "produces complete.json, because the certificate binds the run's own build, served scene and " +
        "harness, which only the gate's chain pins. Run `npm run visual` for the verdict, and use the " +
        "iteration lanes for iteration only.",
    );
  }
}

/**
 * Software rasterisers, by the strings Chromium reports for them.
 *
 * Both halves of the gate refuse these now. The pixel lane's frames are the
 * appearance set and are drawn on the GPU, and the lifecycle lane's question was
 * always "is this the hardware renderer rather than a fallback", since a software
 * rasteriser spends about 28-30 s inside Chromium's own teardown.
 *
 * A denylist rather than an allowlist, because an allowlist would also refuse
 * hardware this repository has never measured. What *requires* hardware rather
 * than merely excluding software is the second layer: the certificate compares
 * the renderer Chromium reports against the GPU and driver version read from the
 * machine (`tools/visual/gpu-identity.ts`), so a frame set is bound to the
 * hardware it was drawn on instead of to a string some other machine could
 * report.
 */
export const HARDWARE_RENDERER_DENYLIST =
  /swiftshader|llvmpipe|softpipe|software|basic render driver|\bwarp\b/i;

/**
 * Why this renderer string cannot be the pixel lane's, or null when it can.
 *
 * Shared by the two capture specifications, which fail within seconds of the
 * first frame, and by `verify-output.ts`, which refuses to certify a frame set
 * whose manifests name anything else — so the refusal names the offending string
 * wherever it fires instead of only in the spec that happened to run.
 *
 * This is the fast half of the requirement. It fires on a Chromium that fell back
 * to a CPU rasteriser; the certificate's GPU-identity check is the half that
 * fires on a Chromium drawing on some *other* GPU, which is a slower comparison
 * because it needs the machine's own answer.
 */
export function pixelLaneRefusal(renderer: unknown, where: string): string | null {
  if (typeof renderer !== "string" || renderer.trim() === "") {
    return (
      `${where} reported no glRenderer, so this run cannot show which renderer produced its frames. ` +
      "The 44-frame appearance set is captured on the hardware renderer the gate pins " +
      "(playwright.config.ts, --use-angle=d3d11), and the certificate names the GPU and driver version " +
      "beside it; a frame set with no renderer identity cannot be reviewed as this lane's."
    );
  }
  if (HARDWARE_RENDERER_DENYLIST.test(renderer)) {
    return (
      `${where} reports the renderer "${renderer}", which names a software rasteriser. The 44-frame ` +
      "appearance set is drawn on the GPU since the owner's 2026-09-16 instruction, not on the CPU: a " +
      "software frame costs seconds where the hardware frame costs milliseconds, and it is a different " +
      "picture from the one the reviews are of (playwright.config.ts, --use-angle=d3d11). Check that the " +
      "GPU is usable and that no software fallback flag was passed; a machine with no usable GPU reports " +
      "this gate unavailable rather than passing it."
    );
  }
  return null;
}
