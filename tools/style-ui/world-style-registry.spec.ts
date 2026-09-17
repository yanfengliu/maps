/**
 * The registry claim, `docs/work/0_shibuya-1km/plan.md:160`, last clause: the
 * dropdown "takes its options from a registry that can accept later styles".
 *
 * Two checks, and the second is the one that matters:
 *
 * 1. The options the running build's control offers are the registry's entries,
 *    in the registry's order - compared against `WORLD_STYLES` imported from the
 *    module the app reads, so a control that hardcoded a pair fails here.
 * 2. A third style added to that one module, and nothing else, appears in the
 *    real dropdown of a real build, selects through the real control, and changes
 *    the pixels. The build happens in an isolated git worktree under
 *    `artifacts/style-ui/`, because a check inside the tree under test cannot
 *    edit that tree's own source and still be measuring the tree under test.
 *
 * Bound, stated rather than implied: the probe tree is this lane's revision with
 * this lane's own working files, on the hardware renderer, and it is removed at
 * the end of the run. It proves the dropdown's options come from the registry; it
 * says nothing about the appearance verdict, which is the software lane's. The
 * probe needs `git` and a build, and when either fails this check fails by name
 * rather than reporting the registry unproven - a check that cannot tell "passed"
 * from "did not run" reports the second as the first.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

import { chromium, expect, test } from "@playwright/test";

import { WORLD_STYLES } from "../../src/world/styles.js";
import { addProbeStyle, PROBE_STYLE_ID, PROBE_STYLE_LABEL } from "./registry-probe.js";
import {
  awaitStyle,
  capture,
  changedFraction,
  controlValue,
  offeredOptions,
  observe,
  switchByPointer,
  tabToControl,
  writeLaneFile,
} from "./support.js";

const run = promisify(execFile);

const RUN_URL = "/?agents=1&seed=9137";
/** The probe's own port, so it can never attach to this lane's server on 4324. */
const PROBE_PORT = 4325;
const PROBE_URL = `http://127.0.0.1:${PROBE_PORT}`;
/** Isolated from the tree under test, and inside the ignored artifacts root. */
const PROBE_TREE = "artifacts/style-ui/registry-probe";
const PROBE_BRANCH = "probe/style-registry";

test("the dropdown's options are the registry's, in the registry's order", async ({ page }) => {
  test.setTimeout(20 * 60_000);
  await page.goto(RUN_URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__mapsHarness?.status().ready === true, null, { timeout: 180_000 });

  const offered = await offeredOptions(page);
  const registry = WORLD_STYLES.map((style) => ({ id: style.id, label: style.label, description: style.description }));
  expect(
    offered,
    "the running dropdown's options are not the registry's entries, so the control is restating its own pair " +
      "instead of offering the registry (`src/world/styles.ts`, passed in by `src/main.ts`).",
  ).toEqual(registry);
  expect(offered.length, "the registry offered fewer than the two styles this criterion names").toBeGreaterThanOrEqual(2);
});

test("a third style added to the registry alone reaches the real dropdown and switches", async () => {
  test.setTimeout(40 * 60_000);
  await rm(PROBE_TREE, { recursive: true, force: true });
  let server: ChildProcess | null = null;
  let second: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  let treeAdded = false;

  try {
    // A worktree of the exact revision under test, so the only difference
    // between the two builds is the registry entry this probe writes.
    await run("git", ["worktree", "add", PROBE_TREE, "-b", PROBE_BRANCH, "HEAD"], { cwd: process.cwd() });
    treeAdded = true;
    for (const link of ["node_modules", "data"]) {
      await symlink(join(process.cwd(), link), join(PROBE_TREE, link), "junction");
    }
    const patched = await addProbeStyle(PROBE_TREE);

    // The build is a precondition this check asserts rather than assumes: a
    // failed build here would otherwise be read as a registry that did not grow.
    await run("npm", ["run", "build"], { cwd: PROBE_TREE, shell: true });

    server = await startPreview(PROBE_TREE, PROBE_PORT);

    second = await chromium.launch({
      args: ["--use-gl=angle", "--use-angle=d3d11", "--disable-lcd-text"],
    });
    const probePage = await second.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const errors: string[] = [];
    probePage.on("pageerror", (error) => errors.push(String(error)));
    await probePage.goto(`${PROBE_URL}${RUN_URL}`, { waitUntil: "domcontentloaded" });
    await probePage.waitForFunction(() => window.__mapsHarness?.status().ready === true, null, { timeout: 180_000 });
    await probePage.waitForFunction(() => window.__mapsHarness!.tiles().idle, null, { timeout: 300_000 });

    // The real dropdown, in the real build, offers the third entry.
    const offered = await offeredOptions(probePage);
    expect(
      offered.map((option) => option.id),
      "adding an entry to src/world/styles.ts did not reach the dropdown, so the dropdown's options are not the registry's",
    ).toEqual([...WORLD_STYLES.map((style) => style.id), PROBE_STYLE_ID]);
    expect(offered[offered.length - 1]!.label).toBe(PROBE_STYLE_LABEL);

    // And it is selectable through both paths a person has, pointer and keyboard.
    const before = await observe(probePage);
    const gesture = await switchByPointer(probePage, PROBE_STYLE_ID);
    await awaitStyle(probePage, PROBE_STYLE_ID, before.status.frameCount);
    expect(await controlValue(probePage)).toBe(PROBE_STYLE_ID);
    const probeFrame = await capture(probePage, "artifacts/style-ui/registry/probe-style.png", "probe style");

    const keyboardPath = await tabToControl(probePage);
    await probePage.keyboard.press("Home");
    await probePage.keyboard.press("End");
    expect(await controlValue(probePage), `the keyboard could not walk the grown list (${keyboardPath})`).toBe(PROBE_STYLE_ID);

    // The third style renders: not the same picture as the style it replaced,
    // and not a change confined to where the pedestrians stand.
    const base = await capture(probePage, "artifacts/style-ui/registry/replaced-style.png", "the style the probe replaced");
    const replaced = await observe(probePage);
    await switchByPointer(probePage, "satellite");
    await awaitStyle(probePage, "satellite", replaced.status.frameCount);
    const satellite = await capture(probePage, "artifacts/style-ui/registry/satellite.png", "satellite");
    const fraction = changedFraction(satellite.png, base.png);
    expect(fraction, `the probe style changed only ${(fraction * 100).toFixed(2)}% of the frame, so it is not rendering as its own style`).toBeGreaterThan(0.2);
    expect(errors, "the probe build reported a page error").toEqual([]);

    await writeLaneFile(
      "registry/probe.json",
      `${JSON.stringify({ registryFile: "src/world/styles.ts", patched, offered, gesture, keyboardPath, changedFraction: fraction, probeFrame: probeFrame.sha256, renderer: before.status.glRenderer }, null, 2)}\n`,
    );
  } finally {
    if (second !== null) await second.close();
    if (server !== null) {
      server.kill();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (treeAdded) {
      // The isolated tree goes, and the branch with it. Nothing in the tree
      // under test was touched, which is what the worktree is for.
      await run("git", ["worktree", "remove", "--force", PROBE_TREE], { cwd: process.cwd() }).catch(() => undefined);
      await run("git", ["branch", "-D", PROBE_BRANCH], { cwd: process.cwd() }).catch(() => undefined);
    }
  }
});

/** A preview server for the probe tree, on its own port. The caller kills it. */
async function startPreview(tree: string, port: number): Promise<ChildProcess> {
  const child = spawn(
    process.platform === "win32" ? "cmd" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", "vite", "preview", "--port", String(port), "--strictPort", "--host", "127.0.0.1"]
      : ["vite", "preview", "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
    { cwd: tree, stdio: "ignore" },
  );
  const deadline = Date.now() + 120_000;
  for (;;) {
    if (child.exitCode !== null) {
      throw new Error(`The probe's preview server exited with code ${child.exitCode} before answering on ${PROBE_URL}.`);
    }
    if (Date.now() > deadline) {
      child.kill();
      throw new Error(`The probe's preview server never answered on ${PROBE_URL}, so the probe cannot claim the registry was reached.`);
    }
    try {
      const response = await fetch(PROBE_URL, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return child;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
