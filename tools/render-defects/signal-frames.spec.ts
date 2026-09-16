/**
 * The render-defects capture: two things a unit test cannot see.
 *
 * 1. **Does a signal lens change between two phases.** `StreetDetails.updateSignals`
 *    was only ever called with `[]`, so every lens in the city held its "no group
 *    active" colour while the simulation ran. No unit test can see a rendered
 *    lens, and a lens is one or two pixels: the check is a sequence of frames at
 *    one pose across a phase boundary, with the phase recorded beside each frame
 *    from the same snapshot the lenses are coloured from.
 * 2. **When the population's clock starts.** The renderer's assets arrive about
 *    20 simulated seconds after the population is built, and the fixed step ran
 *    throughout, so the ticks that place all 200 vehicles on the AOI boundary
 *    were never drawn. This spec records the tick the renderer attached at,
 *    which is that number, before and after the start gate.
 *
 * It is the populated lane's machinery (its orbit and pan drivers, its terrain
 * pose solver) with its own pose and its own records, and it is not that lane:
 * it writes under `artifacts/render-defects/`, it is not registered as a lane,
 * and `verify-output.ts` never reads its output.
 *
 * The camera rule does not bend: rotation and zoom go through `OrbitDriver`'s
 * synthesised wheel and pointer events, and the only reads are the frozen
 * bridge. Nothing here writes to the page.
 *
 * Run: `MAPS_RENDER_DEFECTS_ARM=before|after npm run capture:render-defects`
 * (the arm names the output directory; it changes nothing about the capture).
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import type { CameraSnapshot, RenderStatus } from "../../src/harness/bridge.js";
import type { PopulationStatus } from "../../src/agents/population/status.js";
import type { SignalSnapshot } from "../../src/network/signals.js";
import { OrbitDriver } from "../visual/orbit.js";
import { CAPTURE_VIEWPORT } from "../visual/shots.js";
import { decodePng, measureFrame } from "../visual/png.js";
import { solvePose } from "../populated/terrain.js";

/**
 * The two poses this capture uses.
 *
 * - `hero` is the framing the populated lane photographs the crossing from: 45 m
 *   south-east at 3.2 m above the ground, with the controls' target left where
 *   the app starts it. Three vehicle signal heads of the scramble junction are
 *   in frame, projected at approximately (227, 287), (506, 294) and (1208, 273)
 *   in a 1280x720 frame — and all three present an edge or their back to this
 *   camera, so the only lens a viewer sees is the red one protruding past the
 *   head's edge. Measured 2026-09-16 from `control-hardware.json` and the
 *   network: the facing numbers are -0.14, -0.92 and 0.19 of a unit dot product.
 * - `face-on` stands 45 m east of the crossing at 6 m above the ground, where
 *   `scramble:vehicle:3`'s head is 16 m from the camera, faces it exactly
 *   (dot product 1.00) and projects to the middle of the frame, so all three
 *   lenses are visible and a 0.12 m lens is about five pixels across.
 *
 * Both run the same capture, so the two poses are two views of one behaviour
 * rather than two experiments.
 */
const POSES = Object.freeze({
  hero: { target: { x: 0, z: 0 }, azimuth: Math.PI / 4, distance: 45, standHeightM: 3.2 },
  "face-on": { target: { x: 0, z: 0 }, azimuth: Math.PI / 2, distance: 45, standHeightM: 6 },
});

/** Frames, and simulated ticks between them: 16 frames over 30 simulated seconds. */
const FRAMES = Number(process.env["MAPS_RENDER_DEFECTS_FRAMES"] ?? 16);
const INTERVAL_TICKS = Number(process.env["MAPS_RENDER_DEFECTS_INTERVAL"] ?? 120);

/** The query the populated lane captures from, so the two are the same world. */
const QUERY = process.env["MAPS_RENDER_DEFECTS_QUERY"] ?? "?agents=1&seed=9137&style=satellite&time=noon";

/**
 * Whether to wait for the agent renderer before posing.
 *
 * Off is the population-free appearance path — the one the reviewed 44-frame
 * set runs — which has no renderer to wait for and no population tick to
 * record. It is the regression arm for the frame path this change touches: a
 * `?agents=`-free run must still boot, still draw, and still show every lens in
 * its no-group colour.
 */
const WAIT_ATTACH = (process.env["MAPS_RENDER_DEFECTS_WAIT_ATTACH"] ?? "1") !== "0";

const ARM = process.env["MAPS_RENDER_DEFECTS_ARM"] ?? "unarmed";
const POSE_ID = process.env["MAPS_RENDER_DEFECTS_POSE"] ?? "hero";
const POSE = POSES[POSE_ID as keyof typeof POSES];
if (!POSE) throw new Error(`MAPS_RENDER_DEFECTS_POSE is "${POSE_ID}"; use ${Object.keys(POSES).join(" or ")}.`);

/**
 * Wait for this signal group to be the active one before the first frame.
 *
 * A sequence that started in the wrong phase would photograph a head that is
 * red because its turn has not come, and a reviewer could read that as a lens
 * that never changes. Empty means start as soon as the pose is reached.
 */
const WAIT_GROUP = process.env["MAPS_RENDER_DEFECTS_WAIT_GROUP"] ?? "";
const ROOT = path.resolve("artifacts/render-defects", ARM);

interface Observation {
  frameCount: number;
  camera: CameraSnapshot;
  population: PopulationStatus;
  signals: SignalSnapshot[];
  glRenderer: string;
}

test.describe("render defects", () => {
  test.setTimeout(30 * 60_000);

  test("records the attach tick and a signal crossing a phase boundary", async ({ page }) => {
    await mkdir(path.join(ROOT, "frames"), { recursive: true });
    const errors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(`uncaught: ${error.message}`));

    const observe = async (): Promise<Observation> => {
      const value = await page.evaluate(() => {
        const harness = window.__mapsHarness;
        if (!harness) return null;
        const status = harness.status();
        return {
          frameCount: status.frameCount,
          glRenderer: status.glRenderer,
          camera: harness.camera(),
          population: harness.population(),
          signals: harness.signals(),
        };
      });
      if (value === null) throw new Error("The bridge vanished from window mid-run; the page was replaced.");
      return value as Observation;
    };

    await page.goto(`/${QUERY}`, { timeout: 90_000 });
    const orbit = new OrbitDriver(page);

    // When the population's own clock started, and when its renderer attached.
    // The difference is the span simulated before anything could draw it. The
    // poll starts before `waitForFirstFrame`, because `rendered.attached` goes
    // true just before `ready` does and a poll that started after it would
    // report the first tick it looked at rather than the tick it happened on.
    const started = Date.now();
    let attached: Observation | null = null;
    if (WAIT_ATTACH) {
      while (Date.now() - started < 10 * 60_000) {
        const observation = await observe();
        if (observation.population.rendered.attached) { attached = observation; break; }
        await page.waitForTimeout(100);
      }
      expect(attached, "the agent renderer never attached; the population is stepping without being drawn").not.toBeNull();
    }
    const status: RenderStatus = await orbit.waitForFirstFrame(180_000);
    console.log(`renderer: ${status.glRenderer}`);
    const attachRecord = attached === null ? null : {
      wallSeconds: (Date.now() - started) / 1000,
      ticks: attached.population.ticks,
      simulatedSeconds: attached.population.simulatedSeconds,
      pedestriansDrawn: attached.population.rendered.pedestrians,
      vehiclesDrawn: attached.population.rendered.vehicles,
      pedestriansActive: attached.population.pedestrians.active,
      vehiclesActive: attached.population.vehicles.active,
      frameCount: attached.frameCount,
      expectedWithoutAGate: "1,189-1,238 ticks measured on 2026-09-16 (artifacts/populated-capture/REPORT.md 5.4)",
    };
    if (attachRecord !== null) console.log(`renderer attached at tick ${attachRecord.ticks} (${attachRecord.simulatedSeconds.toFixed(1)} s simulated, ${attachRecord.wallSeconds.toFixed(1)} s wall), drawing ${attachRecord.pedestriansDrawn}p/${attachRecord.vehiclesDrawn}v`);

    // The pose, through the real controls: the target is already the crossing,
    // so this is a zoom and an orbit and no pan.
    const before = await orbit.readCamera();
    const solution = solvePose({ ...POSE, targetY: before.target.y });
    await orbit.zoomTo(POSE.distance);
    await orbit.orbitTo(POSE.azimuth, solution.polar);
    await orbit.waitForTilesIdle();
    await orbit.settle();

    const aimed = await observe();
    console.log(`aimed: reached (${aimed.camera.target.x.toFixed(1)}, ${aimed.camera.target.z.toFixed(1)}) from azimuth ${((aimed.camera.azimuth * 180) / Math.PI).toFixed(1)} deg at ${aimed.camera.distance.toFixed(1)} m, tick ${aimed.population.ticks}`);

    // Wait for the phase this sequence is about, if one was asked for. The wait
    // is bounded by one scramble cycle and is recorded, so a sequence that
    // started in the wrong phase is visible in the record rather than assumed.
    const phaseWaitedFromTick = (await observe()).population.ticks;
    if (WAIT_GROUP !== "") {
      for (;;) {
        const observation = await observe();
        const junction = WAIT_GROUP.split(":")[0];
        const active = observation.signals.find((state) => state.junctionId === junction);
        if (active?.stage === "vehicle" && active.activeGroup === WAIT_GROUP) break;
        if (observation.population.ticks - phaseWaitedFromTick > 12_000) {
          throw new Error(
            `Waited 200 simulated seconds for ${WAIT_GROUP} to hold its green and the scramble reports ` +
              `${active?.stage}/${active?.activeGroup}. A group that never becomes active means the phase this ` +
              "sequence exists to photograph is not in this run.",
          );
        }
        await page.waitForTimeout(20);
      }
      console.log(`  ${WAIT_GROUP} green at tick ${(await observe()).population.ticks}`);
    }

    const frames = [];
    const startedAtTick = (await observe()).population.ticks;
    for (let index = 0; index < FRAMES; index += 1) {
      const wanted = startedAtTick + index * INTERVAL_TICKS;
      let observation = await observe();
      // Without a population there is no tick to wait on: the clock this plan is
      // written in does not exist, and the frames are spaced on the wall clock so
      // that a population-free run still writes more than one picture.
      if (WAIT_ATTACH) {
        while (observation.population.ticks < wanted) {
          await page.waitForTimeout(30);
          observation = await observe();
        }
      } else if (index > 0) {
        await page.waitForTimeout(250);
        observation = await observe();
      }
      const file = path.join(ROOT, "frames", `signal-${String(index).padStart(2, "0")}.png`);
      await page.screenshot({ path: file, animations: "disabled" });
      const after = await observe();
      const bytes = new Uint8Array(await readFile(file));
      const stats = measureFrame(decodePng(bytes));
      expect(stats.width, `${file} is not at the capture width`).toBe(CAPTURE_VIEWPORT.width);
      expect(stats.height, `${file} is not at the capture height`).toBe(CAPTURE_VIEWPORT.height);
      frames.push({
        index,
        file: path.relative(ROOT, file).replaceAll("\\", "/"),
        sha256: createHash("sha256").update(bytes).digest("hex"),
        wantedTick: wanted,
        ticksBefore: observation.population.ticks,
        ticksAfter: after.population.ticks,
        simulatedSeconds: observation.population.simulatedSeconds,
        camera: observation.camera,
        drawnPedestrians: observation.population.rendered.pedestrians,
        drawnVehicles: observation.population.rendered.vehicles,
        drawnNear: observation.population.rendered.near,
        drawnMedium: observation.population.rendered.medium,
        drawnFar: observation.population.rendered.far,
        pedestriansActive: observation.population.pedestrians.active,
        vehiclesActive: observation.population.vehicles.active,
        // The scramble's own junction and every other one the frame's heads could
        // belong to, recorded from the same snapshot the lenses read.
        signals: observation.signals.map((state) => ({
          junctionId: state.junctionId,
          stage: state.stage,
          activeGroup: state.activeGroup,
          amberGroup: state.amberGroup,
          remainingSeconds: Number(state.remainingSeconds.toFixed(2)),
        })),
        stats,
      });
      console.log(`  signal-${String(index).padStart(2, "0")} at tick ${observation.population.ticks} (${observation.population.simulatedSeconds.toFixed(1)} s)`);
    }

    await writeFile(path.join(ROOT, "attach.json"), `${JSON.stringify(attachRecord, null, 2)}\n`, "utf8");
    await writeFile(path.join(ROOT, "frames.json"), `${JSON.stringify({
      arm: ARM,
      capturedAt: new Date().toISOString(),
      query: QUERY,
      poseId: POSE_ID,
      waitGroup: WAIT_GROUP === "" ? null : WAIT_GROUP,
      pose: { ...POSE, polar: solution.polar, clearanceM: solution.clearanceM, reached: frames[0]!.camera },
      viewport: CAPTURE_VIEWPORT,
      renderer: status.glRenderer,
      armNote:
        "`before` is the tree with the lens wiring and the start gate reverted; `after` is the fix. The capture " +
        "itself is identical in both arms, so the two frame sets differ only by the change under test.",
      attach: attachRecord,
      frames,
      consoleErrors: errors,
    }, null, 2)}\n`, "utf8");

    expect(errors, `the page logged errors:\n${errors.join("\n")}`).toEqual([]);
    const distinct = new Set(frames.map((frame) => frame.sha256));
    console.log(`${frames.length} frames, ${distinct.size} distinct digests, written to ${path.join(ROOT, "frames")}`);
  });
});
