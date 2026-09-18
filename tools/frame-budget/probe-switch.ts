/**
 * The switch that turns the frame-budget probe on, and the only thing that does.
 *
 * The probe measures the delivered app, so the delivered app must not carry an
 * instrument it did not ask for. `tools/frame-budget/probe-entry.ts` is loaded by a
 * `<script type="module">` line in `index.html` ahead of `/src/main.ts` — that is
 * what makes it wrap the app's own class rather than a second copy of it — and
 * without a switch it would wrap `requestAnimationFrame`,
 * `RenderLoop.prototype.advance` and `RenderLoop.prototype.onFixedStep` in every
 * session that ever loads the page, including every appearance frame the
 * certificate photographs. So it no-ops, and does not touch any of the three,
 * unless the URL asks for it.
 *
 * The switch is this lane's own query parameter and it is exact:
 * `?frameBudgetProbe=1`. Not `?frameBudgetProbe`, not `=true`, not `=0` — a URL
 * either carries the lane's parameter with the value the lane writes or the page is
 * the delivered app. `probeRequested` is the whole test, and it lives here rather
 * than inside `probe-entry.ts` so the page's gate and the lane's own URL builder
 * cannot disagree about the spelling: both import this file, which imports nothing.
 */

/** The query parameter that turns the probe on. */
export const PROBE_PARAMETER = "frameBudgetProbe";

/** The only value that turns the probe on. */
export const PROBE_VALUE = "1";

/** The query string this lane appends to a URL it is about to open. */
export const PROBE_QUERY = `${PROBE_PARAMETER}=${PROBE_VALUE}`;

/** True when a URL's query asks for the probe. Anything but the exact value is off. */
export function probeRequested(search: string): boolean {
  return new URLSearchParams(search).get(PROBE_PARAMETER) === PROBE_VALUE;
}

/** `url` with the probe switch appended, for a URL that may already carry a query. */
export function withProbe(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${PROBE_QUERY}`;
}
