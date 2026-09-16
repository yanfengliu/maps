import { createApp } from "./app.js";
import { installFailedBridge } from "./harness/bridge.js";
import { recordTeardown } from "./harness/teardown.js";
import {
  DEFAULT_TIME_PRESET,
  isTimePresetId,
  TIME_PRESET_IDS,
  type TimePresetId,
} from "./scene/time-of-day.js";
import { installAttribution } from "./ui/attribution.js";
import { DEFAULT_SEED } from "./world/rng.js";
import { populationFromQuery } from "./agents/population/config.js";
import { DEFAULT_WORLD_STYLE_ID, WORLD_STYLES, worldStyle } from "./world/styles.js";
import { createStylePicker } from "./ui/style-picker.js";

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

  const query = new URLSearchParams(window.location.search);

  // A seed can be overridden from the query string so a scene can be reproduced
  // from a bug report. Anything unparseable falls back rather than seeding with
  // NaN, which would silently give every draw the same value.
  const requested = query.get("seed");
  const parsed = requested === null ? Number.NaN : Number.parseInt(requested, 10);
  const seed = Number.isFinite(parsed) ? parsed : DEFAULT_SEED;

  // `?time=` picks the time of day. An unknown value is refused by name rather
  // than falling back quietly: a run that asked for noon and silently got dusk
  // would be reviewed as a daylight frame.
  const requestedTime = query.get("time");
  let time: TimePresetId = DEFAULT_TIME_PRESET;
  if (requestedTime !== null) {
    if (!isTimePresetId(requestedTime)) {
      throw new Error(
        `"${requestedTime}" is not a time of day this scene knows. ` +
          `?time= takes one of: ${TIME_PRESET_IDS.join(", ")}.`,
      );
    }
    time = requestedTime;
  }

  // `?agents=` is the population switch, on the same path as `?time=` and
  // `?seed=`. An absent parameter means no population, so a run without it
  // renders exactly what it rendered before the population existed; `?agents=0`
  // is the population-free appearance sweep and `?agents=1` the default
  // populated run. An unknown value is refused by name rather than silently
  // rendering an unpopulated city that a review would read as a populated one.
  const population = populationFromQuery(window.location.search);

  // Before the scene, not after: PLATEAU, OpenStreetMap and GSI all require a
  // credit, so a run that draws the city without one is the wrong failure to
  // tolerate. It throws if the element is missing, and the handler below turns
  // that into a message on the page.
  installAttribution(document);

  const initialStyle = worldStyle(query.get("style") ?? DEFAULT_WORLD_STYLE_ID).id;
  const app = createApp(canvas, { seed, time, style: initialStyle, population });
  const picker = createStylePicker({
    styles: WORLD_STYLES,
    initialStyle,
    onChange(id): void {
      app.setStyle(id);
      const url = new URL(window.location.href);
      url.searchParams.set("style", id);
      window.history.replaceState(null, "", url);
    },
  });
  document.body.append(picker.element);
  // The cleanup result is recorded, not left implicit: an exception thrown from
  // this handler while the document is being torn down is reported to nobody —
  // not to the page's own error handlers, not to Playwright's — so the lifecycle
  // lane reads this record to tell "the disposers ran" from "one of them threw
  // and the rest were skipped". See `src/harness/teardown.ts`.
  window.addEventListener(
    "pagehide",
    () => recordTeardown(() => { picker.dispose(); app.dispose(); }),
    { once: true },
  );
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
