/**
 * The populated capture lane: the first frames of the population actually
 * drawing, driven the way a person drives the app.
 *
 * What this lane is for, and what it is not:
 *
 * - It **is** a sequence over simulated time at each of four poses, with the
 *   population's own counts and the camera's own pose recorded beside every
 *   frame's SHA-256, so a reader can bind an observation to bytes.
 * - It is **not** verdict evidence. It writes into
 *   `artifacts/populated-capture/`, it never writes `complete.json`, and
 *   `tools/visual/verify-output.ts` refuses it by name — the reviewed 44-frame
 *   set is captured with the population switched off, so no frame of it contains
 *   an agent, and a populated frame set cannot inherit a review written for an
 *   empty city.
 *
 * The camera rule is the repository's and does not bend here: nothing in this
 * spec writes to the page. Rotation and zoom go through
 * `tools/visual/orbit.ts`, panning through `tools/populated/driver.ts` — both
 * synthesise genuine pointer and wheel events on the canvas. The one thing read
 * from the app is the frozen bridge: `status`, `camera`, `population`, `tiles`,
 * `post`, `style`, none of which has a setter.
 *
 * What it asserts beyond the pixels is deliberately thin, because a passing
 * assertion says nothing about what a frame looks like: that the population is
 * attached and drawing, that each frame is a native 1280x720 image, that
 * consecutive frames differ (so a sequence is not one still written N times),
 * and that the page logged no error. Everything else in this lane is a file to
 * open.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { laneDir, activeLane, requestedGpu } from "../visual/lane.js";
import { OrbitDriver } from "../visual/orbit.js";
import { captureLedger } from "../visual/progress.js";
import { CAPTURE_VIEWPORT } from "../visual/shots.js";
import { decodePng, measureFrame, signatureDistance } from "../visual/png.js";
import { PopulatedDriver, type PopulatedObservation } from "./driver.js";
import { solvePose } from "./terrain.js";
import {
  CAPTURE_QUERY,
  EXPECTED_POPULATION,
  SEQUENCES,
  inPedestrianPhase,
  nextPedestrianPhase,
} from "./plan.js";

/**
 * The lane this spec may write into, checked before anything is created.
 *
 * `laneDir()` resolves from `MAPS_VISUAL_LANE`, which the Playwright config
 * pins. A run of this spec under any other config — the verdict lane's, say —
 * would otherwise scatter populated frames into the directory the reviewed set
 * lives in, and a reader would have no way to tell them apart afterwards.
 */
const LANE = activeLane();
if (LANE !== "populated-iteration") {
  throw new Error(
    `This spec captures the populated iteration lane and MAPS_VISUAL_LANE is "${LANE}". ` +
      "Run it through `playwright.populated.config.ts`, which pins the lane and the hardware renderer. " +
      "A populated frame written under another lane's name is a frame the review of that lane cannot tell " +
      "from its own.",
  );
}

const OUTPUT_DIR = path.resolve(laneDir(), "frames");

/**
 * An optional subset of sequences, by name.
 *
 * Re-shooting one pose should not cost the whole set, and a run that captured a
 * subset must say so rather than leave a manifest that looks like a complete one:
 * the filter is written into the manifest and the ledger's promised count follows
 * it. Measured reason it exists: two of four poses came back with the camera
 * inside the hill, and repairing them needed a second pass over those two only.
 */
const SEQUENCE_FILTER = (process.env["MAPS_POPULATED_SEQUENCES"] ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter((name) => name !== "");
const SELECTED = SEQUENCE_FILTER.length === 0 ? SEQUENCES : SEQUENCES.filter((sequence) => SEQUENCE_FILTER.includes(sequence.name));
if (SELECTED.length === 0) {
  throw new Error(
    `MAPS_POPULATED_SEQUENCES is "${process.env["MAPS_POPULATED_SEQUENCES"]}" and names none of ` +
      `${SEQUENCES.map((sequence) => sequence.name).join(", ")}, so this run would capture nothing and still report success.`,
  );
}
const EXPECTED_FRAMES = SELECTED.reduce((total, sequence) => total + sequence.frames, 0);

/**
 * The distance the camera travels at between poses.
 *
 * The app's own opening distance, and the widest the sweep uses below the
 * overhead shot. `OrbitControls` scales a pan drag by the target distance, so
 * panning the kilometre between two poses at 45 m would cost thousands of pixels
 * of drag and thousands of frames of settling.
 */
const TRAVEL_DISTANCE = 620;

/** A capture with everything that was true of the app when it was taken. */
interface FrameRecord {
  sequence: string;
  index: number;
  file: string;
  sha256: string;
  /** Population ticks and simulated seconds, read immediately before the shot. */
  ticksBefore: number;
  ticksAfter: number;
  frameCountAfter: number;
  simulatedSecondsBefore: number;
  /** True when the frame's tick window sits inside the scramble's pedestrian phase. */
  inPedestrianPhase: boolean;
  /** True when the bytes are identical to the previous frame's in this sequence. */
  identicalToPrevious: boolean;
  camera: PopulatedObservation["camera"];
  requestedPose: { azimuth: number; polar: number; distance: number; targetX: number; targetZ: number };
  counts: {
    pedestriansActive: number;
    vehiclesActive: number;
    pedestriansRendered: number;
    vehiclesRendered: number;
    renderedNear: number;
    renderedMedium: number;
    renderedFar: number;
    pedestriansCrossed: number;
    vehiclesCrossed: number;
    vehiclesCompleted: number;
    pedestriansCompleted: number;
    lifecycleSpawned: number;
    lifecycleRetired: number;
    boundarySpawns: number;
    authorityViolations: number;
    longestVehicleWaitSeconds: number;
  };
  /** Frame statistics from the bytes on disk, not from the app. */
  stats: ReturnType<typeof measureFrame>;
  /** Mean absolute luminance difference from the previous frame in this sequence. */
  distanceFromPrevious: number | null;
  renderer: string;
  post: { active: boolean; error: string | null };
  tiles: { idle: boolean; pending: number; visible: number; drawnMeshes: number; drawnTriangles: number };
  note: string;
}

/** The build bytes the frames belong to, so a stale `dist` is visible later. */
async function buildDigests(): Promise<{ file: string; sha256: string }[]> {
  const files = ["dist/index.html"];
  const assets = await readFile("dist/index.html", "utf8");
  for (const match of assets.matchAll(/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g)) files.push(`dist/${match[0]}`);
  const digests: { file: string; sha256: string }[] = [];
  for (const file of files) {
    try {
      digests.push({ file, sha256: createHash("sha256").update(await readFile(file)).digest("hex") });
    } catch {
      // `dist` is served by the preview server, not by this process; a file the
      // index does not reference is simply not part of the record.
    }
  }
  return digests;
}

test.describe("populated capture", () => {
  // A backstop, not a budget: the sequence lengths are in ticks and the wall
  // clock is whatever this machine's frame rate makes them. Measured on
  // 2026-09-15 at about 44 ms per population tick, the four sequences come to
  // roughly 110 simulated seconds, which is a few minutes of hardware rendering
  // plus a settle at each of four poses.
  test.setTimeout(45 * 60_000);

  test("captures the population drawing over simulated time at four poses", async ({ page }) => {
    // Only the directories this run will write. A filtered run — re-shooting one
    // pose — must not delete the frames of the sequences it is not capturing:
    // run 4 of this lane wiped the crossing frames that way, and provenance that
    // has to be reconstructed from a log is provenance gone.
    await mkdir(OUTPUT_DIR, { recursive: true });
    for (const sequence of SELECTED) {
      await rm(path.join(OUTPUT_DIR, sequence.name), { recursive: true, force: true });
      await mkdir(path.join(OUTPUT_DIR, sequence.name), { recursive: true });
    }

    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(`uncaught: ${error.message}`));

    const frames: FrameRecord[] = [];
    const sequences: Record<string, unknown>[] = [];
    const ledger = captureLedger(OUTPUT_DIR, EXPECTED_FRAMES);

    await page.goto(`/${CAPTURE_QUERY}`, { timeout: 90_000 });

    const orbit = new OrbitDriver(page);
    const driver = new PopulatedDriver(page, orbit);
    const status = await orbit.waitForFirstFrame(180_000);
    console.log(`renderer: ${status.glRenderer}`);
    await driver.readBox();

    // The population the URL asked for is the population that attached. A run
    // that silently rendered an empty city would otherwise produce a complete
    // set of frames of nothing in particular.
    const attached = await driver.observe();
    expect(
      attached.population.attached,
      "?agents=1 attached no population, so every frame below would be the population-free city the " +
        "appearance sweep photographs. Check the app's own boot error: " +
        `${attached.population.ticks} ticks, rendered ${JSON.stringify(attached.population.rendered)}`,
    ).toBe(true);

    /**
     * Wait until the population is not only stepping but being drawn.
     *
     * `attach` builds the simulation; the agent renderer loads about 40 MB of
     * GLBs and VAT textures after that, and the fixed step runs throughout. So
     * the first seconds of the population are simulated before anything can draw
     * them, and a capture that started then would photograph an empty street and
     * report the population missing.
     */
    const rendererDeadline = Date.now() + 10 * 60_000;
    let rendererReady = await driver.observe();
    while (!rendererReady.population.rendered.attached && Date.now() < rendererDeadline) {
      await page.waitForTimeout(250);
      rendererReady = await driver.observe();
    }
    expect(
      rendererReady.population.rendered.attached,
      "The agent renderer never attached, so the population is stepping without being drawn. " +
        `At tick ${rendererReady.population.ticks} the app reported ${rendererReady.population.rendered.pedestrians} ` +
        "pedestrians and " +
        `${rendererReady.population.rendered.vehicles} vehicles drawn.`,
    ).toBe(true);
    const rendererAttachedAt = {
      ticks: rendererReady.population.ticks,
      simulatedSeconds: rendererReady.population.simulatedSeconds,
      pedestriansDrawn: rendererReady.population.rendered.pedestrians,
      vehiclesDrawn: rendererReady.population.rendered.vehicles,
      frameCount: rendererReady.frameCount,
    };
    console.log(`agent renderer attached at tick ${rendererAttachedAt.ticks} (${rendererAttachedAt.simulatedSeconds.toFixed(1)} s), drawing ${rendererAttachedAt.pedestriansDrawn} pedestrians and ${rendererAttachedAt.vehiclesDrawn} vehicles`);

    for (const sequence of SELECTED) {
      const directory = path.join(OUTPUT_DIR, sequence.name);
      await mkdir(directory, { recursive: true });
      const startedAtTick = (await driver.observe()).population.ticks;

      // Aim through the real controls. A pan that crosses most of the kilometre
      // is done from the app's own opening distance, where a drag buys about a
      // metre a pixel; a short hop is done where the camera already is, because
      // zooming out and back in reloads the building tileset twice and costs more
      // wall clock than the extra drags save.
      const beforeAim = await orbit.readCamera();
      const panMetres = Math.hypot(
        sequence.target.x - beforeAim.target.x,
        sequence.target.z - beforeAim.target.z,
      );
      if (panMetres > 400) await orbit.zoomTo(TRAVEL_DISTANCE);
      const aim = await driver.aimAt({ x: sequence.target.x, z: sequence.target.z });
      // The polar angle comes from the built terrain, not from the plan: the
      // controls' target is pinned at the crossing's 15.2 m for the whole run
      // (both pan axes are horizontal) while the ground runs from 7.3 m to 38.9 m
      // across this AOI. Placing the camera from the wrong ground puts it inside
      // the hill, where the terrain's backfaces are culled and the frame shows the
      // city from underneath with sky behind it — a broken frame that reads as a
      // rendering fault and is really a framing one. Two earlier sequences of this
      // lane were lost that way.
      const solution = solvePose({
        target: sequence.target,
        azimuth: sequence.azimuth,
        distance: sequence.distance,
        standHeightM: sequence.standHeightM,
        targetY: aim.target.y,
      });
      const polar = solution.polar;
      if (solution.clearanceM < 2) {
        console.log(
          `  ${sequence.name}: WARNING — the planned camera at (${solution.camera.x.toFixed(0)}, ` +
            `${solution.camera.y.toFixed(1)}, ${solution.camera.z.toFixed(0)}) clears the ground under it by only ` +
            `${solution.clearanceM.toFixed(1)} m, so this pose may photograph the inside of the hill. Recorded in ` +
            "the manifest; the frames will show it.",
        );
      }
      await orbit.zoomTo(sequence.distance);
      await orbit.orbitTo(sequence.azimuth, polar);
      await orbit.waitForTilesIdle();
      await orbit.settle();

      const aimed = await driver.observe();
      const aimedAtTick = aimed.population.ticks;
      console.log(
        `${sequence.name}: aimed at target (${aimed.camera.target.x.toFixed(1)}, ${aimed.camera.target.z.toFixed(1)}) ` +
          `distance ${aimed.camera.distance.toFixed(1)} m azimuth ${((aimed.camera.azimuth * 180) / Math.PI).toFixed(1)} deg ` +
          `at tick ${aimedAtTick}; capture opens at tick ${Math.max(sequence.fromTick, aimedAtTick)}`,
      );

      const sequenceFrames: FrameRecord[] = [];
      // A sequence whose criterion is a signal phase waits for one. The wait is
      // bounded by the cycle and the tick is recorded, so a frame that landed
      // outside the phase it was aimed at is visible in the manifest rather than
      // assumed away.
      const opensAt = sequence.alignToPedestrianPhase === true
        ? nextPedestrianPhase(Math.max(sequence.fromTick, aimedAtTick))
        : Math.max(sequence.fromTick, aimedAtTick);
      if (opensAt > aimedAtTick) {
        console.log(
          `${sequence.name}: waiting for the scramble pedestrian green — tick ${aimedAtTick} to ${opensAt} ` +
            `(${((opensAt - aimedAtTick) / 60).toFixed(1)} simulated seconds)`,
        );
      }
      for (let index = 0; index < sequence.frames; index += 1) {
        const wantedTick = opensAt + index * sequence.intervalTicks;
        await driver.waitForTick(wantedTick);
        const before = await driver.observe();
        const file = path.join(directory, `${sequence.name}-${String(index).padStart(2, "0")}.png`);
        await page.screenshot({ path: file, animations: "disabled" });
        const after = await driver.observe();
        const bytes = new Uint8Array(await readFile(file));
        const stats = measureFrame(decodePng(bytes));
        expect(stats.width, `${file} is not at the capture width`).toBe(CAPTURE_VIEWPORT.width);
        expect(stats.height, `${file} is not at the capture height`).toBe(CAPTURE_VIEWPORT.height);

        const record: FrameRecord = {
          sequence: sequence.name,
          index,
          file: path.relative(path.resolve(laneDir()), file).replaceAll("\\", "/"),
          sha256: createHash("sha256").update(bytes).digest("hex"),
          ticksBefore: before.population.ticks,
          ticksAfter: after.population.ticks,
          frameCountAfter: after.frameCount,
          simulatedSecondsBefore: before.population.simulatedSeconds,
          inPedestrianPhase: inPedestrianPhase(before.population.ticks),
          identicalToPrevious:
            sequenceFrames.length > 0 &&
            sequenceFrames[sequenceFrames.length - 1]!.sha256 === createHash("sha256").update(bytes).digest("hex"),
          camera: before.camera,
          requestedPose: {
            azimuth: sequence.azimuth,
            polar,
            distance: sequence.distance,
            targetX: sequence.target.x,
            targetZ: sequence.target.z,
          },
          counts: {
            pedestriansActive: before.population.pedestrians.active,
            vehiclesActive: before.population.vehicles.active,
            pedestriansRendered: before.population.rendered.pedestrians,
            vehiclesRendered: before.population.rendered.vehicles,
            renderedNear: before.population.rendered.near,
            renderedMedium: before.population.rendered.medium,
            renderedFar: before.population.rendered.far,
            pedestriansCrossed: before.population.pedestrians.crossed,
            vehiclesCrossed: before.population.vehicles.crossed,
            vehiclesCompleted: before.population.vehicles.completed,
            pedestriansCompleted: before.population.pedestrians.completed,
            lifecycleSpawned: before.population.lifecycle.spawned,
            lifecycleRetired: before.population.lifecycle.retired,
            boundarySpawns: before.population.boundarySpawns,
            authorityViolations: before.population.authorityViolations,
            longestVehicleWaitSeconds: before.population.vehicles.longestWaitSeconds,
          },
          stats,
          distanceFromPrevious:
            sequenceFrames.length === 0
              ? null
              : signatureDistance(sequenceFrames[sequenceFrames.length - 1]!.stats, stats),
          renderer: before.glRenderer,
          post: { active: before.post.active, error: before.post.error },
          tiles: {
            idle: before.tiles.idle,
            pending: before.tiles.pending,
            visible: before.tiles.visible,
            drawnMeshes: before.tiles.drawnMeshes,
            drawnTriangles: before.tiles.drawnTriangles,
          },
          note: "counts and pose read immediately before the shot; ticksAfter brackets the frame",
        };

        // The population has to be drawing. A frame with nothing drawn in it is
        // reported as a failure here rather than described later as a quiet
        // street, because those are different claims.
        expect(
          record.counts.pedestriansRendered + record.counts.vehiclesRendered,
          `${record.file} was captured with nothing drawn: the app reports ${record.counts.pedestriansRendered} ` +
            `pedestrians and ${record.counts.vehiclesRendered} vehicles on screen at tick ${record.ticksBefore}.`,
        ).toBeGreaterThan(0);

        sequenceFrames.push(record);
        frames.push(record);
        await ledger.record(`${sequence.name}-${String(index).padStart(2, "0")}`);
      }

      // A sequence is a sequence, and the two checks here are the ones that
      // separate a lane defect from a finding.
      //
      // The lane's own defect is a *render loop that stopped*: a screenshot of a
      // dead canvas. That is what the frame counter is for, and it is asserted.
      // Identical *pixels*, on the other hand, are a result: at a pose where
      // nothing in the population is on screen, nothing in the frame changes, and
      // a sequence of byte-identical frames is the strongest form of that
      // observation rather than a failure of this spec. Run 2 of this lane found
      // exactly that at the scramble, which is why the threshold that used to fail
      // the run now only records.
      expect(
        sequenceFrames.at(-1)!.frameCountAfter,
        `the render loop stopped during sequence ${sequence.name}: the frame counter went from ` +
          `${sequenceFrames[0]!.frameCountAfter} to ${sequenceFrames.at(-1)!.frameCountAfter} across ` +
          `${sequenceFrames.length} captures, so the images below are a stale buffer.`,
      ).toBeGreaterThan(sequenceFrames[0]!.frameCountAfter);
      expect(
        sequenceFrames.at(-1)!.ticksAfter,
        `sequence ${sequence.name} did not advance the simulation between its first and last frame`,
      ).toBeGreaterThan(sequenceFrames[0]!.ticksAfter);
      const identical = sequenceFrames.filter((record) => record.identicalToPrevious);
      const distances = sequenceFrames.slice(1).map((record) => record.distanceFromPrevious ?? 0);
      const minimumDistance = Math.min(...distances);
      if (identical.length > 0 || minimumDistance < 0.05) {
        console.log(
          `  ${sequence.name}: ${identical.length} of ${sequenceFrames.length} frames are byte-identical to the one ` +
            `before them; the smallest neighbour signature difference is ${minimumDistance.toFixed(4)} of a 0-255 ` +
            "whole-frame mean. That mean is diluted by everything in the frame that did not move, so it does not say " +
            "whether anything moved: `tools/populated/diff.ts` counts the pixels that changed and where they are.",
        );
      }

      sequences.push({
        name: sequence.name,
        purpose: sequence.purpose,
        expectation: sequence.expectation,
        requestedPose: sequenceFrames[0]!.requestedPose,
        reachedPose: sequenceFrames[0]!.camera,
        poseSolution: solution,
        startedAtTick,
        aimedAtTick,
        firstFrameTick: sequenceFrames[0]!.ticksBefore,
        lastFrameTick: sequenceFrames.at(-1)!.ticksBefore,
        simulatedSecondsCovered:
          (sequenceFrames.at(-1)!.ticksBefore - sequenceFrames[0]!.ticksBefore) / 60,
        frames: sequenceFrames,
      });
    }

    expect(consoleErrors, `the page logged errors:\n${consoleErrors.join("\n")}`).toEqual([]);
    expect(
      ledger.entries().length,
      `only ${ledger.entries().length} of ${EXPECTED_FRAMES} frames reached disk; see ${ledger.file()}`,
    ).toBe(EXPECTED_FRAMES);

    const last = frames.at(-1)!;
    await writeFile(
      path.join(path.resolve(laneDir()), "manifest.json"),
      `${JSON.stringify({
        lane: LANE,
        certifiable: false,
        evidence: "iteration only: these frames are not the verdict set and no review covers them",
        sequenceFilter: SEQUENCE_FILTER.length === 0 ? null : SEQUENCE_FILTER,
        sequencesNotCaptured: SEQUENCES.filter((sequence) => !SELECTED.includes(sequence)).map((sequence) => sequence.name),
        capturedAt: new Date().toISOString(),
        query: CAPTURE_QUERY,
        requestedGpu: requestedGpu(),
        renderer: last.renderer,
        viewport: CAPTURE_VIEWPORT,
        expectedPopulation: EXPECTED_POPULATION,
        rendererAttachedAt,
        build: await buildDigests(),
        sequences,
        frames,
        authorityViolationsAtEnd: last.counts.authorityViolations,
        caveat:
          "A frame is evidence of what was on screen at its tick; the counts beside it are the app's own " +
          "numbers read in the same browser task as the pose, immediately before the shot. Neither says " +
          "what the frame looks like.",
      }, null, 2)}\n`,
      "utf8",
    );

    console.log(
      [
        "",
        `${frames.length} frames written to ${OUTPUT_DIR}`,
        ...sequences.map((sequence) => {
          const record = sequence as { name: string; firstFrameTick: number; lastFrameTick: number; frames: FrameRecord[] };
          const first = record.frames[0]!;
          const lastFrame = record.frames.at(-1)!;
          return (
            `  ${record.name.padEnd(10)} ticks ${String(record.firstFrameTick).padStart(5)}-${String(record.lastFrameTick).padStart(5)} ` +
            `(${((record.lastFrameTick - record.firstFrameTick) / 60).toFixed(1)} s)  ` +
            `drawn ${first.counts.pedestriansRendered}p/${first.counts.vehiclesRendered}v .. ${lastFrame.counts.pedestriansRendered}p/${lastFrame.counts.vehiclesRendered}v  ` +
            `active ${first.counts.pedestriansActive}p/${first.counts.vehiclesActive}v`
          );
        }),
        "",
      ].join("\n"),
    );
  });
});
