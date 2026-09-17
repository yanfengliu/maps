/**
 * The hero frame, and the same view in daylight.
 *
 * The plan's acceptance criterion for Phases 4 and 5 is not a number: *"a dusk
 * frame of the crossing reads as Shibuya rather than as a generic Japanese city,
 * because the emissive signage and neon are there."* That is judged by opening
 * the file, so this test's job is to produce the file from the same input path a
 * person uses — the `?time=` query parameter and real pointer input — and to
 * check the things around it that a picture cannot show.
 *
 * It captures the same two poses at two times of day. A post chain tuned only for
 * dusk falls apart in sun, and a chain tuned only for sun leaves dusk black; the
 * pair is the check, and both are written at capture resolution for review.
 *
 * What it asserts beyond the pixels:
 *
 * - the preset the page actually rendered, and the sun's real azimuth and
 *   elevation at that instant — a screenshot cannot say which hour it is, and a
 *   sweep captured at the wrong preset is a different sweep;
 * - that the post chain is live rather than silently fallen back;
 * - that the facade pass de-lit the albedo, and by how much;
 * - that the two times of day are different pictures.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { HERO_CAPTURE_COUNT, HERO_TEST_BUDGET_MS } from "./budget.js";
import { laneDir, pixelLaneRefusal } from "./lane.js";
import { OrbitDriver } from "./orbit.js";
import { collectPageErrors } from "./page-errors.js";
import { decodePng, measureFrame, signatureDistance } from "./png.js";
import { captureLedger } from "./progress.js";
import { CAPTURE_VIEWPORT, HERO_AZIMUTH, HERO_POSES, HERO_TIMES } from "./shots.js";
import { styleOption, styleOptionRows } from "./style-control.js";

const OUTPUT_DIR = path.resolve(laneDir(), "hero");
const STYLE_RETURN_DIR = path.resolve(laneDir(), "style-return");

/**
 * The two directions of the style criterion, each driven by one input path.
 *
 * Why the paths are named here rather than left to the body: the control commits a
 * selection as the active option moves while it is *closed* (`move()` in
 * `src/ui/style-picker.ts`), so `click()` followed by `Home`/`End` and `Enter`
 * could not tell "the pointer opened the listbox" from "the pointer did nothing" —
 * the arrow key commits on its own, so deleting the pointer path left both
 * assertions green. Round 31's review, finding B3. Each direction below is a real
 * change of style from the one before it, and the pointer one is completed by a
 * press on the option row itself.
 */
const STYLE_SWITCHES = [
  { style: "cartographic", via: "pointer" },
  { style: "satellite", via: "keyboard" },
] as const;

test.describe("hero frames", () => {
  // Ten captures — eight hero views and the two style returns. The budget is
  // derived from that count rather than rounded: `tools/visual/budget.ts` carries
  // the derivation and the measurements, and the number it produces is the
  // per-capture allowance times ten plus setup and margin.
  //
  // The 60-minute ceiling this replaces was the measurement, not a budget. On
  // 2026-09-15 the same ten captures took 50.4 minutes (first frame 20:28:02,
  // last 21:18:26) and the ceiling fired at 21:18:18, eight seconds before the
  // run finished; the run before it took 49.3 minutes. A wall-clock round number
  // was deciding whether a complete capture set counted.
  //
  // The ceiling is now a backstop rather than the deciding vote: every capture
  // appends to `captures.json` in the lane's own directory as it lands, so a run
  // that is cut off names the capture it died in and the pace it was running at.
  test.setTimeout(HERO_TEST_BUDGET_MS);

  test("captures the crossing at dusk and in daylight through the real controls", async ({
    page,
  }) => {
    await rm(OUTPUT_DIR, { recursive: true, force: true });
    await mkdir(OUTPUT_DIR, { recursive: true });
    await rm(STYLE_RETURN_DIR, { recursive: true, force: true });
    await mkdir(STYLE_RETURN_DIR, { recursive: true });

    const consoleErrors = collectPageErrors(page);

    const captured: {
      time: string;
      style: string;
      pose: string;
      file: string;
      stats: ReturnType<typeof measureFrame>;
      sha256: string;
    }[] = [];
    const report: Record<string, unknown>[] = [];
    const styleReturns: Record<string, unknown>[] = [];
    // The spec's own progress, on disk after every capture. See `progress.ts`.
    const ledger = captureLedger(OUTPUT_DIR, HERO_CAPTURE_COUNT);

    for (const time of HERO_TIMES) {
      // The query parameter is the input path a person has. Nothing here sets a
      // preset on the app.
      await page.goto(`/?time=${time.id}&seed=9137&style=satellite`, { timeout: 60_000 });

      const driver = new OrbitDriver(page);
      await driver.waitForFirstFrame();

      // The renderer is asserted, not recorded. `playwright.config.ts` pins
      // `--use-angle=swiftshader` and the eight hero frames are part of the one
      // reviewed set, so a Chromium that accepted the flag and drew somewhere else
      // would move that set silently. Checked here, before the first capture, so a
      // wrong renderer fails in seconds instead of after ten of them.
      const status = await driver.readStatus();
      const rendererRefusal = pixelLaneRefusal(
        status.glRenderer,
        `the hero block's first frame at ?time=${time.id}`,
      );
      if (rendererRefusal !== null) throw new Error(rendererRefusal);

      const lighting = await page.evaluate(() => window.__mapsHarness?.lighting() ?? null);
      const post = await page.evaluate(() => window.__mapsHarness?.post() ?? null);
      expect(lighting, "the harness published no lighting state").not.toBeNull();
      expect(post, "the harness published no post-chain state").not.toBeNull();
      if (lighting === null || post === null) return;

      // The page rendered the hour that was asked for. Without this the review is
      // of an unknown time of day.
      expect(
        lighting.preset,
        `?time=${time.id} rendered the "${lighting.preset}" preset instead`,
      ).toBe(time.id);
      expect(
        lighting.sunElevationDegrees,
        `at ${lighting.tokyoClock} the sun should be ${time.elevationRange[0]} to ` +
          `${time.elevationRange[1]} degrees above the horizon at 35.66 N, and the scene put it ` +
          `at ${lighting.sunElevationDegrees}`,
      ).toBeGreaterThan(time.elevationRange[0]);
      expect(lighting.sunElevationDegrees).toBeLessThan(time.elevationRange[1]);
      expect(
        lighting.sunAzimuthDegrees,
        `the sun's azimuth at ${lighting.tokyoClock} should be ${time.azimuthRange[0]} to ` +
          `${time.azimuthRange[1]} degrees clockwise from north`,
      ).toBeGreaterThan(time.azimuthRange[0]);
      expect(lighting.sunAzimuthDegrees).toBeLessThan(time.azimuthRange[1]);

      // The post chain is doing the output stage, not the fallback.
      expect(
        post.active,
        `the post chain fell back to a direct render, so this frame has no bloom, no ambient ` +
          `occlusion and no temporal anti-aliasing: ${String(post.error)}`,
      ).toBe(true);
      expect(post.passes).toEqual([
        "TAARenderPass",
        "GTAOPass",
        "UnrealBloomPass",
        "OutputPass",
      ]);

      const styleSelect = page.getByRole("combobox", { name: "World style" });
      // The control is a button plus an in-page listbox, not a native `<select>`.
      // The reason is this harness: a native select's popup is drawn by the
      // browser process, outside the renderer's hit testing, so no synthesised
      // pointer input can reach one of its options and the pointer half of the
      // criterion could not be exercised at all. These options are elements in
      // this document, so they can be read and clicked. `[role="option"]` is a
      // CSS selector rather than `getByRole` because a closed listbox is hidden
      // and stays out of the accessibility tree, and the rows are scoped to the
      // listbox this control names through `aria-controls` rather than matched
      // page-wide — see `style-control.ts`.
      const styleRows = await styleOptionRows(page, styleSelect);
      // Joined before matching, because `allTextContents` returns one string per
      // row and a row carries its label and its description together. `toContain`
      // on the array would ask whether some row is exactly "Cartographic", which
      // no row is.
      const styleOptionText = (await styleRows.allTextContents()).join("\n");
      expect(styleOptionText).toContain("Cartographic");
      expect(styleOptionText).toContain("Satellite");
      for (const { style, via } of STYLE_SWITCHES) {
      await driver.settle("preservation");
      const before = await page.evaluate(() => ({ camera: window.__mapsHarness!.camera(), frames: window.__mapsHarness!.status().frameCount }));
      if (via === "pointer") {
        // A real press on the control and then a real press on the row, with the
        // control's own report that the press opened the list asserted between
        // them. That middle assertion is the one that fails when the pointer path
        // is dead: without it a dead press and a live one are indistinguishable
        // until the commit, and the commit is what the keyboard path does too.
        await styleSelect.click();
        await expect(
          styleSelect,
          "a pointer press on the World style control must open its listbox",
        ).toHaveAttribute("aria-expanded", "true");
        await (await styleOption(page, styleSelect, style)).click();
      } else {
        // The keyboard path on its own: Enter opens, the arrow keys walk the list
        // while it is open, and Enter commits the highlighted row. Not the same
        // gesture the criterion's pointer half asks for, and deliberately asserted
        // separately from it.
        await styleSelect.press("Enter");
        await expect(
          styleSelect,
          "Enter on the World style control must open its listbox",
        ).toHaveAttribute("aria-expanded", "true");
        await styleSelect.press(style === "satellite" ? "End" : "Home");
        await styleSelect.press("Enter");
      }
      await expect(styleSelect).toHaveAttribute("data-style-id", style);
      await expect(styleSelect, "a completed switch must leave the listbox closed").toHaveAttribute("aria-expanded", "false");
      await page.waitForFunction((id) => window.__mapsHarness?.style().id === id, style);
      const after = await page.evaluate(() => ({ camera: window.__mapsHarness!.camera(), frames: window.__mapsHarness!.status().frameCount, search: location.search }));
      expect(after.frames).toBeGreaterThanOrEqual(before.frames);
      expect(after.camera.distance).toBeCloseTo(before.camera.distance, 2);
      expect(after.camera.azimuth).toBeCloseTo(before.camera.azimuth, 2);
      expect(after.camera.polar).toBeCloseTo(before.camera.polar, 2);
      for (const axis of ["x", "y", "z"] as const) {
        expect(after.camera.position[axis]).toBeCloseTo(before.camera.position[axis], 2);
        expect(after.camera.target[axis]).toBeCloseTo(before.camera.target[axis], 2);
      }
      expect(after.search).toContain(`time=${time.id}`);
      expect(after.search).toContain("seed=9137");
      // The switch reached the URL as well as the control: `src/main.ts` writes the
      // selected id there, so a control that recoloured itself without telling the
      // app would not satisfy this.
      expect(after.search).toContain(`style=${style}`);
      for (const pose of HERO_POSES) {
        await driver.zoomTo(pose.distance);
        await driver.orbitTo(HERO_AZIMUTH, pose.polar);
        const tiles = await driver.waitForTilesIdle();
        const observed = await page.evaluate(() => ({ lighting: window.__mapsHarness!.lighting(), post: window.__mapsHarness!.post(), style: window.__mapsHarness!.style(), camera: window.__mapsHarness!.camera(), facadeSamples: window.__mapsHarness!.facadeSamples(), paint: window.__mapsHarness!.paint(), paintSeams: window.__mapsHarness!.paintSeams() }));
        if (pose.name === "crossing") {
          expect(observed.facadeSamples.length, "No actual crossing facade atlas was observed").toBeGreaterThanOrEqual(2);
          for (const sample of observed.facadeSamples) {
            expect(sample.limit, `Hero facade at ${sample.position.x},${sample.position.z} used ${sample.tileUri} without native frontage priority`).toBe(4096);
            expect(Math.max(sample.width, sample.height), `Observed atlas ${sample.tileUri} stayed below its bounded priority dimensions`).toBe(Math.min(4096, Math.max(sample.sourceWidth, sample.sourceHeight)));
          }
        }
        const lighting = observed.lighting;
        const post = observed.post;
        expect(observed.style.id).toBe(style);

        const file = path.join(OUTPUT_DIR, `hero-${style}-${time.id}-${pose.name}.png`);
        await page.screenshot({ path: file, animations: "disabled" });
        const bytes = new Uint8Array(await readFile(file));
        const stats = measureFrame(decodePng(bytes));
        // Recorded straight after the bytes land, so the ledger counts frames on
        // disk rather than steps the spec believes it took.
        await ledger.record(`hero-${style}-${time.id}-${pose.name}`);
        captured.push({
          time: time.id,
          style,
          pose: pose.name,
          file,
          stats,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });

        report.push({
          facadeSamples: observed.facadeSamples,
          paint: observed.paint,
          paintSeams: observed.paintSeams,
          file: path.basename(file),
          time: time.id,
          style,
          camera: observed.camera,
          tokyoClock: lighting.tokyoClock,
          pose: pose.name,
          sunAzimuthDegrees: lighting.sunAzimuthDegrees,
          sunElevationDegrees: lighting.sunElevationDegrees,
          keyIntensity: lighting.keyIntensity,
          keyColour: lighting.keyColour,
          shadowsEnabled: lighting.shadowsEnabled,
          twilightStandIn: lighting.twilightStandIn,
          exposure: lighting.exposure,
          signageIntensity: lighting.signageIntensity,
          authoredBoards: lighting.authoredBoards,
          authoredLights: lighting.authoredLights,
          bloom: post.bloom,
          ambientOcclusion: post.ambientOcclusion,
          postBufferBytes: post.bufferBytes,
          postObservation: "before screenshot; not a convergence assertion",
          taaAccumulating: post.taaAccumulating,
          taaSamples: post.taaSamples,
          facade: tiles.facade,
          tileMemory: { cachedBytes: tiles.cachedBytes, estimatedGpuBytes: tiles.gpuBytes },
          requestedGpu: process.env["MAPS_VISUAL_GPU"] ?? "software",
          glRenderer: (await driver.readStatus()).glRenderer,
          albedoBefore: tiles.albedoBefore,
          albedoAfter: tiles.albedoAfter,
          meanLuminance: Number(stats.meanLuminance.toFixed(2)),
          luminanceSpread: Number(stats.luminanceSpread.toFixed(2)),
          distinctColours: stats.distinctColours,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });
      }
      }

      // Return through the real dropdown in the same document. A fresh page
      // would hide a disposed texture/cache or a camera reset on this direction.
      // Actor identity is outside this static-city gate until population exists.
      // The direction follows the captures above, so this is a real change back
      // rather than a re-selection: Cartographic leaves and Cartographic returns.
      // Driven by the keyboard here, which is the path the criterion names beside
      // the pointer: Enter opens, End walks to the last row, Enter commits it.
      await driver.waitForTilesIdle();
      await driver.settle("preservation");
      const beforeReturn = await page.evaluate(() => ({
        camera: window.__mapsHarness!.camera(), status: window.__mapsHarness!.status(),
        tiles: window.__mapsHarness!.tiles(), style: window.__mapsHarness!.style(),
        href: location.href, timeOrigin: performance.timeOrigin,
      }));
      expect(beforeReturn.style.id).toBe("satellite");
      await styleSelect.press("Enter");
      await expect(
        styleSelect,
        "Enter on the World style control must open its listbox for the return switch",
      ).toHaveAttribute("aria-expanded", "true");
      await styleSelect.press("End");
      await styleSelect.press("Enter");
      await expect(styleSelect).toHaveAttribute("data-style-id", "cartographic");
      await page.waitForFunction((frames) => window.__mapsHarness?.style().id === "cartographic" && window.__mapsHarness.status().frameCount > frames, beforeReturn.status.frameCount);
      await driver.waitForTilesIdle();
      const afterReturn = await page.evaluate(() => ({
        camera: window.__mapsHarness!.camera(), status: window.__mapsHarness!.status(),
        tiles: window.__mapsHarness!.tiles(), style: window.__mapsHarness!.style(),
        href: location.href, timeOrigin: performance.timeOrigin,
      }));
      expect(afterReturn.timeOrigin, "Style return reloaded the document").toBe(beforeReturn.timeOrigin);
      expect(afterReturn.style.id).toBe("cartographic");
      expect(afterReturn.status.frameCount).toBeGreaterThan(beforeReturn.status.frameCount);
      expect(afterReturn.status.ready).toBe(true);
      expect(afterReturn.status.error).toBeNull();
      expect(afterReturn.status.contextLost).toBe(false);
      for (const component of ["distance", "azimuth", "polar"] as const) expect(afterReturn.camera[component]).toBeCloseTo(beforeReturn.camera[component], 2);
      for (const axis of ["x", "y", "z"] as const) {
        expect(afterReturn.camera.position[axis]).toBeCloseTo(beforeReturn.camera.position[axis], 2);
        expect(afterReturn.camera.target[axis]).toBeCloseTo(beforeReturn.camera.target[axis], 2);
      }
      const expectedUrl = new URL(beforeReturn.href);
      expectedUrl.searchParams.set("style", "cartographic");
      expect(afterReturn.href).toBe(expectedUrl.href);
      expect(afterReturn.tiles.error).toBeNull();
      expect(afterReturn.tiles.failed).toBe(0);
      expect(afterReturn.tiles.drawnMeshes).toBeGreaterThan(0);
      expect(afterReturn.tiles.drawnTriangles).toBeGreaterThan(10_000);
      expect(afterReturn.tiles.drawnTriangles).toBe(beforeReturn.tiles.drawnTriangles);
      expect(afterReturn.tiles.drawnBounds).toEqual(beforeReturn.tiles.drawnBounds);
      expect(afterReturn.tiles.cachedBytes).toBeGreaterThan(0);
      // Extra flow evidence stays outside the formal eight hero/44 total frames.
      // Live geometry alone cannot prove that the designed materials returned.
      const returnFile = path.join(STYLE_RETURN_DIR, `return-cartographic-${time.id}.png`);
      await page.screenshot({ path: returnFile, animations: "disabled" });
      const returnBytes = new Uint8Array(await readFile(returnFile));
      const returnStats = measureFrame(decodePng(returnBytes));
      await ledger.record(`return-cartographic-${time.id}`);
      expect(returnStats.width).toBe(CAPTURE_VIEWPORT.width);
      expect(returnStats.height).toBe(CAPTURE_VIEWPORT.height);
      styleReturns.push({
        time: time.id, before: beforeReturn, after: afterReturn,
        file: path.relative(path.resolve(laneDir()), returnFile),
        sha256: createHash("sha256").update(returnBytes).digest("hex"), stats: returnStats,
      });
    }

    // Dusk and daylight are different pictures. If they are not, `?time=` did
    // nothing and both frames are the same review.
    for (const pose of HERO_POSES) {
      for (const style of ["satellite", "cartographic"] as const) {
      const atPose = captured.filter((frame) => frame.pose === pose.name && frame.style === style);
      expect(atPose, `pose ${pose.name} was not captured at every time of day`).toHaveLength(
        HERO_TIMES.length,
      );
      const distance = signatureDistance(atPose[0]!.stats, atPose[1]!.stats);
      expect(
        distance,
        `the dusk and daylight frames at ${pose.name} are the same picture (signature distance ` +
          `${distance.toFixed(2)}), so the time of day changed nothing`,
      ).toBeGreaterThan(8);
      }
    }

    for (const frame of captured) {
      expect(frame.stats.width).toBe(CAPTURE_VIEWPORT.width);
      expect(frame.stats.height).toBe(CAPTURE_VIEWPORT.height);
    }
    for (const time of HERO_TIMES) for (const pose of HERO_POSES) {
      const pair = captured.filter((frame) => frame.time === time.id && frame.pose === pose.name);
      expect(pair).toHaveLength(2);
      expect(signatureDistance(pair[0]!.stats, pair[1]!.stats), `The dropdown produced the same ${pose.name} picture for both world styles at ${time.id}.`).toBeGreaterThan(5);
    }

    expect(consoleErrors, `the page logged errors:\n${consoleErrors.join("\n")}`).toEqual([]);

    // Every capture the ledger promised, in the report as well as on disk. The
    // manifest is the artifact a reviewer reads, so a partial run must not be
    // able to leave a manifest that looks complete.
    expect(
      ledger.entries().length,
      `only ${ledger.entries().length} of ${HERO_CAPTURE_COUNT} captures reached disk; see ${ledger.file()}`,
    ).toBe(HERO_CAPTURE_COUNT);

    await writeFile(
      path.join(OUTPUT_DIR, "hero.json"),
      `${JSON.stringify({
        capturedAt: new Date().toISOString(),
        requestedGpu: process.env["MAPS_VISUAL_GPU"] ?? "software",
        lane: process.env["MAPS_VISUAL_LANE"] ?? "verdict",
        budgetMs: HERO_TEST_BUDGET_MS,
        captures: ledger.entries(),
        frames: report,
        styleReturns,
      }, null, 2)}\n`,
      "utf8",
    );

    // eslint-disable-next-line no-console -- the list a reviewer opens.
    console.log(
      [
        "",
        `${captured.length} hero frames written to ${OUTPUT_DIR}`,
        ...report.map(
          (frame) =>
            `  ${String(frame.file).padEnd(30)} ${String(frame.tokyoClock).padEnd(22)} ` +
            `sun az ${String(frame.sunAzimuthDegrees).padStart(7)} el ` +
            `${String(frame.sunElevationDegrees).padStart(6)}  ` +
            `mean ${String(frame.meanLuminance).padStart(6)} spread ` +
            `${String(frame.luminanceSpread).padStart(6)} colours ` +
            `${String(frame.distinctColours).padStart(6)}`,
        ),
        "",
      ].join("\n"),
    );
  });
});
