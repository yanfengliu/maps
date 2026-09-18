/**
 * The flythrough's aim scorer: a body is scored where it stands, against the ray
 * the renderer uses, and a pose without a legible crowd is not the anchor.
 *
 * This case exists for the defect in `artifacts/quality-audit/register.md` §2.2.
 * The tool that chose the crowd leg's anchor scored every visible pedestrian at
 * `TARGET_Y_M + bodyHeightM` — a constant 16.1 m in world Y, whatever the terrain
 * under the body said — so it could not tell a knot on the pavement from a knot on
 * the margin ring, and it ranked the margin-ring knot first. The flight carried
 * that pose, and its crowd leg pointed 34.7 degrees down at pavement.
 *
 * The fixture below is synthetic and is the whole bound of this case. It is two
 * plateaus 13.2 m apart, one camera on each, and one knot of walking bodies per
 * camera, arranged so the two rules disagree about which camera is better:
 *
 * - the **high** camera stands on 27.5 m ground, so its axis to the app's pinned
 *   15.2 m target points 28.4 degrees down. Bodies far away are the ones the old
 *   constant-height ray passes through — at 100 m the old ray has descended to
 *   16.9 m and a body held at 16.1 m is inside the frame's vertical half-extent —
 *   so the old rule counts its distant knot and ranks this camera first.
 * - the **low** camera stands on 14.3 m ground: 4.6 degrees down, with its own
 *   knot 8 to 12 m out where a 1.7 m figure is tens of pixels tall.
 *
 * The old arithmetic is written out in `oldScorer` below rather than imported,
 * because the point of the case is to be the *old* rule: the constant body height,
 * the constant-height ray, no standability question and no near range. It ranks
 * the high camera first, and this case's headline assertion fails on that
 * disagreement. The second case holds the other half of the same fix, that a
 * candidate has to be standable at all.
 *
 * What this case cannot prove is anything about the real scene: it does not read
 * `data/scene/terrain.mesh`, it does not know which knots the population forms,
 * and it says nothing about what any frame looks like. `node
 * tools/flythrough/aim.ts --dump <probe dump>` is the measurement for that, and its
 * own bound is that it is an offline aid rather than evidence.
 */

import { describe, expect, it } from "vitest";

import {
  bestPerCell,
  distinctPositions,
  groundGrid,
  poseScore,
  scoreDump,
  TARGET_Y_M,
  type AimOptions,
  type Candidate,
  type GroundQuery,
} from "../tools/flythrough/aim-score.js";

/** The capture's field of view, `src/render/camera.ts`. */
const FOV_Y_DEG = 55;
const ASPECT = 1280 / 720;

/** The ground of each plateau, metres. */
const HIGH_GROUND_M = 27.5;
const LOW_GROUND_M = 14.3;

/**
 * Two plateaus, as an explicit ground reader.
 *
 * This is a plain function and not `groundGrid` on purpose. A grid answers with
 * the highest vertex in a cell, so a synthetic grid trades one fragile thing for
 * another: where the cell boundaries fall decides whether a query on the low side
 * reads the low plateau or the cliff above it, and a fixture whose two plateaus are
 * 13.2 m apart is exactly where that matters. Writing the regions out makes the
 * fixture's terrain the thing the case says it is, and NaN outside the plateaus is
 * what the real tool reads off the built mesh.
 *
 * The plateaus are wide in z as well as x because the controls' target is 26 m from
 * each camera along the camera's own view direction, and a target off the terrain
 * would be refused before the rule under test ever ran.
 */
function plateauGround(x: number, z: number): number {
  if (x < -16) return x >= -80 && Math.abs(z) <= 120 ? LOW_GROUND_M : Number.NaN;
  return x <= 120 && Math.abs(z) <= 120 ? HIGH_GROUND_M : Number.NaN;
}

const ground: GroundQuery = plateauGround;

/** One walking knot: `spread` x `spread` bodies at 1 m spacing. */
function knot(cx: number, cz: number, groundM: number, spread: number, line = 1): number[][] {
  const actors: number[][] = [];
  const half = Math.floor(spread / 2);
  for (let dx = -half; dx <= half; dx += 1) {
    for (let dz = -half; dz <= half; dz += 1) {
      actors.push([cx + dx, groundM, cz + dz * line, 1.2]);
    }
  }
  return actors;
}

/**
 * The dump: a 5x5 knot 10 to 20 m in front of the low camera, and a 21x21 knot 85
 * to 115 m in front of the high one.
 *
 * Each camera has its own knot in frame and none of the other's: the high camera
 * looks north and the low one looks south, so the two crowds are in opposite
 * directions. Both knots stand on the low plateau. What differs is the ground each
 * *camera* stands on — 27.5 m for one, 14.3 m for the other — and how far away its
 * crowd is.
 */
function dump() {
  return {
    tick: 3000,
    pedestrians: [...knot(0, 60, LOW_GROUND_M + 0.9, 21, 1), ...knot(-50, -10, LOW_GROUND_M + 0.9, 5, 1)],
    vehicles: [],
  };
}

/** The camera on the high plateau: 27.5 m of ground, its crowd 30 to 70 m away. */
const HIGH_CAMERA: Candidate = { camera: { x: 0, z: 0 }, way: "fixture:high", azimuth: 0, distance: 26 };
/** The camera on the low plateau: 14.3 m of ground, its crowd 8 to 12 m away. */
const LOW_CAMERA: Candidate = { camera: { x: -50, z: 0 }, way: "fixture:low", azimuth: Math.PI, distance: 26 };

const OPTIONS: AimOptions = {
  standM: 3,
  minClearanceM: 2,
  bodyHeightM: 0.9,
  fovYDegrees: FOV_Y_DEG,
  aspect: ASPECT,
  frameHeightPx: 720,
  minDepthM: 4,
  maxDepthM: 220,
  maxSightings: 12,
  centreBandTop: 1 / 6,
  centreBandBottom: 5 / 6,
  maxPitchDegrees: 20,
  nearRangeM: 45,
  minNearMoving: 10,
  movingSpeedMps: 0.2,
};

const AZIMUTHS = [0, Math.PI];
const DISTANCES = [26];

/**
 * The scorer as it was, kept here as the red control.
 *
 * `constantBodyY` is `TARGET_Y_M + bodyHeightM` for every body whatever the terrain
 * under it says; the ray is drawn to that same constant height; there is no near
 * range, so a body 100 m away weighs what a body 10 m away weighs; and the
 * candidate's own standability is not asked about at all. That is the whole of
 * `tools/flythrough/aim.ts` at revision `368f92c`, `scorePose`'s ancestor, and it
 * is the rule that chose the leg's anchor.
 */
function oldScorer(
  candidate: Candidate,
  moving: readonly { x: number; z: number; bodies: number }[],
  constantBodyY: number,
  groundGate: GroundQuery,
): number {
  const target = {
    x: candidate.camera.x + Math.sin(candidate.azimuth) * candidate.distance,
    z: candidate.camera.z + Math.cos(candidate.azimuth) * candidate.distance,
  };
  if (Number.isNaN(groundGate(target.x, target.z))) return 0;
  const cameraY = groundGate(candidate.camera.x, candidate.camera.z) + OPTIONS.standM;
  // The view direction is from the camera **to** its target, which is the
  // negative of the bearing the candidate carries: the bearing runs from the
  // target to the camera.
  const length = Math.hypot(target.x - candidate.camera.x, target.z - candidate.camera.z);
  const forward = { x: (target.x - candidate.camera.x) / length, z: (target.z - candidate.camera.z) / length };
  const right = { x: forward.z, z: -forward.x };
  const vertical = Math.tan((FOV_Y_DEG * Math.PI) / 360);
  const lateral = Math.tan(Math.atan(vertical * ASPECT));
  let seen = 0;
  for (const entry of moving) {
    const dx = entry.x - candidate.camera.x;
    const dz = entry.z - candidate.camera.z;
    const depth = dx * forward.x + dz * forward.z;
    if (depth < OPTIONS.minDepthM || depth > OPTIONS.maxDepthM) continue;
    if (Math.abs(dx * right.x + dz * right.z) > depth * lateral) continue;
    const rayY = cameraY + ((TARGET_Y_M - cameraY) * depth) / candidate.distance;
    if (Math.abs(constantBodyY - rayY) > depth * vertical) continue;
    seen += entry.bodies;
  }
  return seen;
}

/** What the old scorer ranks first over this fixture's two candidates. */
function oldRanking(): { way: string; score: number }[] {
  const moving = distinctPositions(dump().pedestrians).filter((entry) => entry.speed > OPTIONS.movingSpeedMps);
  const constantBodyY = TARGET_Y_M + OPTIONS.bodyHeightM;
  return [HIGH_CAMERA, LOW_CAMERA]
    .map((candidate) => ({ way: candidate.way, score: oldScorer(candidate, moving, constantBodyY, ground) }))
    .sort((a, b) => b.score - a.score);
}

/** What the fixed scorer ranks first over the same fixture. */
function newRanking() {
  const scored = scoreDump(
    dump(),
    [
      { x: HIGH_CAMERA.camera.x, z: HIGH_CAMERA.camera.z, id: HIGH_CAMERA.way },
      { x: LOW_CAMERA.camera.x, z: LOW_CAMERA.camera.z, id: LOW_CAMERA.way },
    ],
    ground,
    OPTIONS,
    AZIMUTHS,
    DISTANCES,
  );
  return {
    scored,
    ranking: [...bestPerCell(scored.results)]
      .filter((pose) => pose.standable)
      .sort((a, b) => poseScore(b) - poseScore(a)),
  };
}

describe("the flythrough's aim scorer", () => {
  it("does not rank the high-ground camera first, where the old scorer would have", () => {
    const old = oldRanking();
    const { ranking, scored } = newRanking();
    // The high camera has no pose in the ranking at all; the poses it does have are
    // the ones the case is about. The low camera's own pose is the one the ranking
    // kept for it.
    const highPoses = scored.results.filter((pose) => pose.way === HIGH_CAMERA.way);
    const lowPose = ranking.find((pose) => pose.way === LOW_CAMERA.way)!;

    // The control: the old rule saw a crowd at the high-ground camera. It had no
    // near range, so bodies up to 220 m away weighed the same as bodies at arm's
    // length, and it never asked whether the camera's axis was a usable one.
    expect(
      old.find((entry) => entry.way === HIGH_CAMERA.way)!.score,
      "the control for this case: the old rule has to have seen a crowd at the high-ground camera",
    ).toBeGreaterThan(0);
    expect(old.length, "both cameras are candidates").toBe(2);

    expect(highPoses.length, "the high camera on the high plateau has to have been scored").toBeGreaterThan(0);
    expect(
      highPoses.every((pose) => !pose.standable),
      `the high-ground camera was accepted. It stands on ${HIGH_GROUND_M} m of ground and the app pins its target at ` +
        `${TARGET_Y_M} m, so its axis is far below the leg's ${OPTIONS.maxPitchDegrees} degrees however far away the ` +
        "crowd is: a frame from it is a frame of pavement. Its refusals were: " +
        highPoses.map((pose) => `"${pose.rejected}"`).join(" / "),
    ).toBe(true);
    expect(
      highPoses.map((pose) => pose.rejected).join(" "),
      "the refusal has to name the steep axis rather than a missing crowd: this case is about the axis, and a " +
        "fixture whose refusal came from the near-range rule would pass this file while the steep-axis rule was deleted",
    ).toMatch(/degrees down/);
    expect(
      ranking.some((pose) => pose.way === HIGH_CAMERA.way),
      "the high-ground camera has to be absent from the ranking, not merely beaten",
    ).toBe(false);

    // And what the fixed rule keeps is the pose whose crowd it can resolve: the low
    // camera's knot is 8 to 12 m away, where a figure is tens of pixels tall.
    expect(lowPose.standable, `the low-ground camera's pose has to survive: ${lowPose.rejected}`).toBe(true);
    expect(lowPose.nearMoving, "the low-ground crowd has to be inside the legible range").toBeGreaterThanOrEqual(
      OPTIONS.minNearMoving,
    );
    expect(ranking.length, "something has to be left in the ranking").toBeGreaterThan(0);
    expect(ranking[0]!.way, "the ranking has to open on the low-ground camera").toBe(LOW_CAMERA.way);
  });

  it("refuses a camera that cannot stand where the candidate says, instead of scoring its bodies", () => {
    // A valley camera: 7.5 m of ground against the app's pinned 15.2 m target, so
    // the 3 m stand height puts the camera 4.7 m below the target and the polar
    // ratio is negative. `standAt` cannot express that angle, so no frame is ever
    // taken from this pose and any count against it is a count of nothing.
    const valleyTerrain = new Float32Array([-40, 7.5, 0, -36, 7.5, 0, -32, 7.5, 0, -62, 7.5, 0]);
    const valleyGround = groundGrid(valleyTerrain, valleyTerrain.length / 3, 4);
    const valley: Candidate = { camera: { x: -36, z: 0 }, way: "fixture:valley", azimuth: -Math.PI / 2, distance: 26 };
    const pose = scoreDump(
      { tick: 3000, pedestrians: knot(-36, 0, 7.5, 10), vehicles: [] },
      [{ x: valley.camera.x, z: valley.camera.z, id: valley.way }],
      valleyGround,
      OPTIONS,
      [-Math.PI / 2],
      [26],
    ).results[0]!;

    expect(pose.standable, "a camera below the pinned target height has to be refused rather than scored").toBe(false);
    expect(pose.rejected).toContain("polar angle");
    expect(poseScore(pose)).toBe(Number.NEGATIVE_INFINITY);
  });
});
