/**
 * The frame-budget probe seam: the one line in `index.html` and the switch that
 * makes it inert.
 *
 * The probe wraps `requestAnimationFrame` and two `RenderLoop.prototype` methods,
 * and it is loaded by the shipped page rather than by the lane. Two things follow,
 * and each has a case here:
 *
 * - the script line must be present and must precede `/src/main.ts`, because the
 *   probe's whole mechanism is wrapping the app's own class before the app uses it.
 *   Losing the line, or moving it after the app, does not fail until a browser run
 *   is minutes in and reporting nothing — so it fails here instead, by name;
 * - the probe must install nothing unless the URL asks for it, because otherwise the
 *   appearance frames the certificate photographs are drawn through a wrapped frame
 *   boundary.
 *
 * **The bound.** These cases read `index.html` as text and exercise the switch on
 * its own. They do not run a page: whether the wrappers work when the switch *is*
 * on is the frame-budget lane's own evidence, and this file says nothing about it.
 */
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { PROBE_QUERY, probeRequested, withProbe } from "../tools/frame-budget/probe-switch.js";

const PROBE_SCRIPT = "/tools/frame-budget/probe-entry.ts";
const APP_SCRIPT = "/src/main.ts";
// The tags, not the bare paths: both paths are also named in the comment above the
// seam, and `indexOf` on the path alone finds the prose first and reports the order
// backwards.
const PROBE_TAG = `<script type="module" src="${PROBE_SCRIPT}"></script>`;
const APP_TAG = `<script type="module" src="${APP_SCRIPT}"></script>`;

describe("the probe seam in index.html", () => {
  it("carries the probe script ahead of the app", async () => {
    const html = await readFile("index.html", "utf8");
    const probe = html.indexOf(PROBE_TAG);
    const app = html.indexOf(APP_TAG);
    expect(probe, `index.html does not load ${PROBE_TAG}, so the frame-budget probe is not on the page`).toBeGreaterThan(-1);
    expect(app, `index.html does not load ${APP_TAG}`).toBeGreaterThan(-1);
    expect(
      probe,
      `${PROBE_TAG} is loaded after ${APP_TAG} in index.html. The probe wraps the app's own ` +
        "RenderLoop class, so it has to be evaluated first or it wraps a class the app is no longer using " +
        "and observes nothing.",
    ).toBeLessThan(app);
  });

  it("loads the probe as a module, so it is the app's own module instance", async () => {
    const html = await readFile("index.html", "utf8");
    expect(html).toContain(PROBE_TAG);
  });
});

describe("the probe's switch", () => {
  it("is off for the delivered app and on only for its own exact value", () => {
    expect(probeRequested("")).toBe(false);
    expect(probeRequested("?agents=1&seed=5970698")).toBe(false);
    expect(probeRequested("?frameBudgetProbe")).toBe(false);
    expect(probeRequested("?frameBudgetProbe=0")).toBe(false);
    expect(probeRequested("?frameBudgetProbe=true")).toBe(false);
    expect(probeRequested("?frameBudgetProbe=11")).toBe(false);
    expect(probeRequested(`?${PROBE_QUERY}`)).toBe(true);
    expect(probeRequested(`?agents=1&${PROBE_QUERY}`)).toBe(true);
  });

  it("builds a URL the page's own gate accepts", () => {
    expect(withProbe("/?agents=1&seed=5970698")).toBe(`/?agents=1&seed=5970698&${PROBE_QUERY}`);
    expect(withProbe("/")).toBe(`/?${PROBE_QUERY}`);
    for (const url of ["/", "/?agents=1", "/?agents=1&seed=2"]) {
      expect(probeRequested(new URL(withProbe(url), "http://127.0.0.1:4335").search)).toBe(true);
    }
  });

  it("installs nothing on a page that did not ask for it", async () => {
    // The seam is what ships, so this is the delivered app's own state: no global
    // for the lane to read, and `requestAnimationFrame` left exactly as it was found.
    const before = globalThis.requestAnimationFrame;
    const entry = await import("../tools/frame-budget/probe-entry.js");
    expect(entry.enabled).toBe(false);
    expect((globalThis as unknown as { __frameBudgetProbe?: unknown }).__frameBudgetProbe).toBeUndefined();
    expect(globalThis.requestAnimationFrame).toBe(before);
  });
});
