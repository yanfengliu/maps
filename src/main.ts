import { createApp } from "./app.js";
import { installFailedBridge } from "./harness/bridge.js";
import { installAttribution } from "./ui/attribution.js";
import { DEFAULT_SEED } from "./world/rng.js";

/**
 * Entry point.
 *
 * Boot failures are shown on the page and published through the harness bridge.
 * The alternative — a blank page and a test that times out — reports "did not
 * run" as "failed to look right", and those need different fixes.
 */
function boot(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#scene");
  if (canvas === null) {
    throw new Error(
      'No <canvas id="scene"> is in the document, so there is nowhere to draw. ' +
        "index.html must contain it.",
    );
  }

  // A seed can be overridden from the query string so a scene can be reproduced
  // from a bug report. Anything unparseable falls back rather than seeding with
  // NaN, which would silently give every draw the same value.
  const requested = new URLSearchParams(window.location.search).get("seed");
  const parsed = requested === null ? Number.NaN : Number.parseInt(requested, 10);
  const seed = Number.isFinite(parsed) ? parsed : DEFAULT_SEED;

  // Before the scene, not after: PLATEAU, OpenStreetMap and GSI all require a
  // credit, so a run that draws the city without one is the wrong failure to
  // tolerate. It throws if the element is missing, and the handler below turns
  // that into a message on the page.
  installAttribution(document);

  createApp(canvas, { seed });
}

try {
  boot();
} catch (error) {
  installFailedBridge(error);
  const message = error instanceof Error ? error.message : String(error);
  const banner = document.createElement("pre");
  banner.id = "boot-error";
  banner.textContent = `The scene did not start.\n\n${message}`;
  document.body.append(banner);
  console.error(error);
}
