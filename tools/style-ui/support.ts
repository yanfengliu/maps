/**
 * Support for the World style lane.
 *
 * The control is driven the way a person drives it: `page.mouse` presses at
 * coordinates read from the control's own box, and `page.keyboard` presses keys
 * at whatever currently holds focus. Nothing in this directory writes to the
 * page's state — the reads are the frozen `window.__mapsHarness`
 * (`src/harness/bridge.ts`, no setter), the control's own DOM, and the PNG bytes
 * on disk.
 *
 * `harness:` line for whoever reaches for a probe next: this lane is the
 * instrument. It drives the real dropdown in the production build through
 * Chromium's own input path, and it is what `npm run style-ui` runs. A scratch
 * probe is not needed to answer a question about style switching; add a case
 * here instead, so the answer is reproducible and its digests are recorded.
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { expect, type Locator, type Page } from "@playwright/test";

import type { CameraSnapshot, RenderStatus, TileStatus } from "../../src/harness/bridge.js";
import type { PopulationStatus } from "../../src/agents/population/status.js";
import { decodePng, measureFrame, type DecodedPng, type FrameStats } from "../visual/png.js";
import { cameraMovement } from "../visual/settling.js";
import { CAPTURE_VIEWPORT } from "../visual/shots.js";

/** Where this lane writes. Ignored, like every task run's evidence. */
export const LANE_ROOT = "artifacts/style-ui";

/**
 * The accessible name the control answers to. It is the visible label text, so a
 * check that finds the control by it is checking what a person reads.
 */
export const CONTROL_NAME = "World style";

/** The style ids this criterion names, in the order the dropdown offers them. */
export const CRITERION_STYLES = ["cartographic", "satellite"] as const;

export function lanePath(...parts: readonly string[]): string {
  return join(LANE_ROOT, ...parts);
}

export async function writeLaneFile(relative: string, contents: string): Promise<string> {
  const path = lanePath(relative);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
  return path;
}

/**
 * The control, located by role and accessible name.
 *
 * A press on this locator goes through Chromium's input path at the element's
 * own coordinates, so a control that only responds to a synthetic DOM event
 * cannot satisfy this lane.
 */
export function control(page: Page): Locator {
  return page.getByRole("combobox", { name: new RegExp(CONTROL_NAME, "i") });
}

/**
 * The control's own option list, as the running build renders it.
 *
 * Read from the DOM the control built, never from the registry module: the claim
 * is that the dropdown in the browser offers these options, and reading
 * `src/world/styles.ts` from Node would prove only that the file exists.
 */
export async function offeredOptions(page: Page): Promise<{ id: string; label: string; description: string }[]> {
  return page.evaluate(() => {
    const listbox = document.querySelector('[role="listbox"]');
    if (listbox === null) return [];
    return [...listbox.querySelectorAll('[role="option"]')].map((option) => ({
      id: option.getAttribute("data-style-id") ?? "",
      label: option.querySelector(".world-style-picker__option-label")?.textContent ?? "",
      description: option.querySelector(".world-style-picker__option-description")?.textContent ?? "",
    }));
  });
}

/** What the control itself says is selected, from its own DOM. */
export async function controlValue(page: Page): Promise<string> {
  const value = await control(page).getAttribute("data-style-id");
  if (value === null) throw new Error("The World style control carries no data-style-id, so it cannot say what it holds.");
  return value;
}

/**
 * Open the list with a real pointer press and return where each row is.
 *
 * The press is `page.mouse`, at the control's own centre, and the rows are found
 * by their `[role="option"]` boxes afterwards — so a list that is painted rather
 * than laid out, or drawn outside the renderer, has no boxes to return and the
 * caller finds out immediately.
 */
export async function openByPointer(page: Page): Promise<void> {
  const box = await control(page).boundingBox();
  if (box === null) throw new Error("The World style control has no box, so there is nothing to press.");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(control(page), "the press did not open the option list").toHaveAttribute("aria-expanded", "true");
}

export function optionRow(page: Page, id: string): Locator {
  return page.locator(`[role="option"][data-style-id="${id}"]`);
}

/** One press on an option row, at the row's own coordinates. */
export async function clickRow(page: Page, id: string): Promise<void> {
  const row = optionRow(page, id);
  const box = await row.boundingBox();
  if (box === null) {
    throw new Error(
      `The option row for "${id}" has no box, so a pointer cannot press it. ` +
        "The list may be closed, or the row may not be laid out in the page.",
    );
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/**
 * Switch through the real control by pointer, both directions allowed.
 *
 * Returns the press it made, so the record can name the gesture rather than the
 * conclusion.
 */
export async function switchByPointer(page: Page, id: string): Promise<string> {
  await openByPointer(page);
  await clickRow(page, id);
  await expect(control(page), `the pointer press did not close the list after choosing ${id}`).toHaveAttribute("aria-expanded", "false");
  return `pointer: press the control, then press the ${id} row`;
}

/**
 * Put the keyboard on the control with Tab and nothing else.
 *
 * A `.focus()` call would reach the same element without exercising the tab
 * order, and a dropdown a keyboard cannot reach is the defect this criterion is
 * about. The visual lane used `.focus()` for a while; this one does not.
 */
export async function tabToControl(page: Page, limit = 12): Promise<string> {
  if (await control(page).evaluate((element) => element === document.activeElement)) return "already focused";
  for (let presses = 1; presses <= limit; presses += 1) {
    await page.keyboard.press("Tab");
    if (await control(page).evaluate((element) => element === document.activeElement)) return `Tab x${presses}`;
  }
  const where = await page.evaluate(() => {
    const active = document.activeElement;
    return active === null ? "nothing" : `${active.tagName}${active.id === "" ? "" : `#${active.id}`}`;
  });
  throw new Error(
    `Twelve Tabs never reached the World style control, so it is not in the keyboard tab order. ` +
      `Focus ended on ${where}.`,
  );
}

/**
 * Switch with the keyboard alone, walking to the wanted end of the list.
 *
 * The control commits on Arrow keys while its list is closed — the shape a
 * native select has — so this is End/Home plus the arrows, and it proves the
 * documented keyboard path rather than a value assignment.
 */
export async function switchByKeyboard(page: Page, id: string): Promise<string> {
  const how = await tabToControl(page);
  const options = await offeredOptions(page);
  const index = options.findIndex((option) => option.id === id);
  if (index < 0) throw new Error(`The dropdown offers no "${id}", so the keyboard cannot reach it.`);
  const held = await controlValue(page);
  const from = options.findIndex((option) => option.id === held);
  if (from === index) throw new Error(`The control already holds "${id}", so this would not be a switch.`);
  const walk = index < from ? "Home" : "End";
  const arrows = Math.min(index, options.length - 1 - index);
  await page.keyboard.press(walk);
  for (let press = 0; press < arrows; press += 1) {
    await page.keyboard.press(index < from ? "ArrowUp" : "ArrowDown");
  }
  return `keyboard: ${how} from ${held}, ${walk}, Arrow${index < from ? "Up" : "Down"} x${arrows}`;
}

export interface AppObservation {
  camera: CameraSnapshot;
  population: PopulationStatus;
  style: { id: string; label: string };
  status: RenderStatus;
  tiles: TileStatus;
  post: { active: boolean; error: string | null; taaAccumulating: boolean };
  href: string;
  /** The control's own value, read in the same task as the app's. */
  controlValue: string | null;
}

/**
 * One browser task, so the pose, the counters and the frame number describe the
 * same moment. Two evaluates would let the camera and the population be read
 * either side of a frame.
 */
export async function observe(page: Page): Promise<AppObservation> {
  const observation = await page.evaluate(() => {
    const harness = window.__mapsHarness;
    if (harness === undefined) return null;
    const element = document.querySelector('[role="combobox"]');
    return {
      camera: harness.camera(),
      population: harness.population(),
      style: harness.style(),
      status: harness.status(),
      tiles: harness.tiles(),
      post: harness.post(),
      href: window.location.href,
      controlValue: element === null ? null : element.getAttribute("data-style-id"),
    };
  });
  if (observation === null) {
    throw new Error("The harness bridge vanished from window mid-run; the page was replaced.");
  }
  return observation as AppObservation;
}

/** Wait until the app reports the wanted style *and* has drawn a later frame. */
export async function awaitStyle(page: Page, styleId: string, afterFrameCount: number, timeoutMs = 300_000): Promise<void> {
  await page.waitForFunction(
    (wanted: { styleId: string; frames: number }) => {
      const harness = window.__mapsHarness;
      return (
        harness !== undefined &&
        harness.style().id === wanted.styleId &&
        harness.status().frameCount > wanted.frames
      );
    },
    { styleId, frames: afterFrameCount },
    { timeout: timeoutMs },
  );
}

export interface CameraDelta {
  targetM: number;
  positionM: number;
  radiusM: number;
  azimuthRad: number;
  polarRad: number;
  worldM: number;
  maxAxisM: number;
}

export function cameraDelta(before: CameraSnapshot, after: CameraSnapshot): CameraDelta {
  const movement = cameraMovement(before, after);
  const axis = [
    after.position.x - before.position.x,
    after.position.y - before.position.y,
    after.position.z - before.position.z,
    after.target.x - before.target.x,
    after.target.y - before.target.y,
    after.target.z - before.target.z,
  ];
  return {
    targetM: movement.targetM,
    positionM: movement.positionM,
    radiusM: Math.abs(after.distance - before.distance),
    azimuthRad: Math.abs(after.azimuth - before.azimuth),
    polarRad: Math.abs(after.polar - before.polar),
    worldM: movement.worldM,
    maxAxisM: Math.max(...axis.map(Math.abs)),
  };
}

export function describeCamera(camera: CameraSnapshot): string {
  return (
    `position (${camera.position.x.toFixed(5)}, ${camera.position.y.toFixed(5)}, ${camera.position.z.toFixed(5)}) ` +
    `target (${camera.target.x.toFixed(5)}, ${camera.target.y.toFixed(5)}, ${camera.target.z.toFixed(5)}) ` +
    `distance ${camera.distance.toFixed(5)} azimuth ${camera.azimuth.toFixed(8)} polar ${camera.polar.toFixed(8)}`
  );
}

/**
 * Every counter that must not go backwards across a style switch.
 *
 * The network contract already says it in prose — "Style changes have no signal
 * or network state" — and this is the same claim as a check. A switch that reset
 * or rebuilt the simulation shows up as ticks back at zero, a spawn counter back
 * near zero, a slot generation that restarted or a boundary spawn count that
 * fell. A counter alone cannot say the *bodies* are still there; that is what the
 * drawn counts and the frames beside this record are for.
 */
export function populationFailures(before: PopulationStatus, after: PopulationStatus): string[] {
  const failures: string[] = [];
  if (!after.attached) failures.push("the population detached");
  if (after.ticks <= before.ticks) failures.push(`ticks did not advance across the switch: ${before.ticks} -> ${after.ticks}`);
  if (after.simulatedSeconds < before.simulatedSeconds) {
    failures.push(`the simulated clock went backwards: ${before.simulatedSeconds} -> ${after.simulatedSeconds}`);
  }
  for (const key of ["spawned", "retired", "generations"] as const) {
    if (after.lifecycle[key] < before.lifecycle[key]) {
      failures.push(`lifecycle.${key} went backwards: ${before.lifecycle[key]} -> ${after.lifecycle[key]}`);
    }
  }
  for (const key of ["completed", "crossed"] as const) {
    if (after.pedestrians[key] < before.pedestrians[key]) {
      failures.push(`pedestrians.${key} went backwards: ${before.pedestrians[key]} -> ${after.pedestrians[key]}`);
    }
    if (after.vehicles[key] < before.vehicles[key]) {
      failures.push(`vehicles.${key} went backwards: ${before.vehicles[key]} -> ${after.vehicles[key]}`);
    }
  }
  if (after.grants < before.grants) failures.push(`grants went backwards: ${before.grants} -> ${after.grants}`);
  if (after.boundarySpawns < before.boundarySpawns) {
    failures.push(`boundarySpawns went backwards: ${before.boundarySpawns} -> ${after.boundarySpawns}`);
  }
  return failures;
}

export interface CapturedFrame {
  file: string;
  sha256: string;
  stats: FrameStats;
  png: DecodedPng;
}

/**
 * A native-resolution screenshot, decoded from its own bytes.
 *
 * Native means the artifact's own size and one device pixel per framebuffer
 * pixel: `deviceScaleFactor: 1` in the config and a check of every frame's
 * header here, so a frame that came back downscaled fails instead of being
 * reviewed as if it were the artifact.
 */
export async function capture(page: Page, file: string, label = file): Promise<CapturedFrame> {
  await mkdir(dirname(file), { recursive: true });
  await page.screenshot({ path: file, animations: "disabled" });
  const bytes = new Uint8Array(await readFile(file));
  const png = decodePng(bytes);
  const stats = measureFrame(png);
  expect(stats.width, `${label} is not at the capture width`).toBe(CAPTURE_VIEWPORT.width);
  expect(stats.height, `${label} is not at the capture height`).toBe(CAPTURE_VIEWPORT.height);
  return { file, sha256: createHash("sha256").update(bytes).digest("hex"), stats, png };
}

/**
 * A screenshot of the whole viewport, decoded, for a frame that is not kept on
 * disk.
 *
 * Used by the in-flight check, which samples frames but keeps only their
 * measurements: 1280x720 PNGs are about 1 MB each and a burst of them is not
 * evidence a reader needs. The decoded bytes come back all the same, because the
 * one comparison that matters — is the frame after the switch the frame from
 * before it — is a pixel comparison.
 */
export async function sampleFrame(page: Page): Promise<{ stats: FrameStats; sha256: string; png: DecodedPng }> {
  const bytes = new Uint8Array(await page.screenshot({ animations: "disabled" }));
  const png = decodePng(bytes);
  const stats = measureFrame(png);
  return { stats, sha256: createHash("sha256").update(bytes).digest("hex"), png };
}

/**
 * The fraction of pixels whose largest channel moved by more than `threshold`.
 *
 * A signature distance averages over a 32x32 grid, so a frame that changed only
 * where a few pedestrians stand scores near zero and two frames of a blank sky
 * score near zero as well. This counts pixels, which is what separates "the
 * whole scene re-coloured" from "nothing changed at all".
 */
export function changedFraction(left: DecodedPng, right: DecodedPng, threshold = 8): number {
  if (left.width !== right.width || left.height !== right.height) {
    throw new Error(`Cannot compare a ${left.width}x${left.height} frame with a ${right.width}x${right.height} one.`);
  }
  const pixels = left.width * left.height;
  let changed = 0;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const at = pixel * 4;
    const delta = Math.max(
      Math.abs(left.rgba[at]! - right.rgba[at]!),
      Math.abs(left.rgba[at + 1]! - right.rgba[at + 1]!),
      Math.abs(left.rgba[at + 2]! - right.rgba[at + 2]!),
    );
    if (delta > threshold) changed += 1;
  }
  return changed / pixels;
}

/**
 * What the preview server actually served, as a name for the build under test.
 *
 * The bundle bytes are read from `dist/` rather than from the network, because
 * the served entry is the file on disk and its digest is what binds this lane's
 * frames to a revision. Bound, and it says so rather than implying more: this is
 * the JavaScript entry alone. It does not cover `data/scene/**`, so two runs of
 * this lane with the same bundle hash and different scene bytes would produce
 * different pixels; the appearance verdict belongs to the sweep lane, whose
 * certificate carries the scene digest for exactly that reason.
 */
export async function servedBuildDigest(page: Page): Promise<{ script: string; sha256: string }> {
  const html = await (await page.request.get("/")).text();
  const match = /<script[^>]+src="([^"]+\.js)"/.exec(html);
  if (match === null) throw new Error("The served page names no JavaScript entry, so the build under test cannot be identified.");
  const url = match[1]!;
  const path = join("dist", url.replace(/^\//, ""));
  const bytes = await readFile(path);
  return { script: url, sha256: createHash("sha256").update(bytes).digest("hex") };
}
