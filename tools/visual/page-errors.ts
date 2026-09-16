/**
 * The page's own error output, collected so any lane's assertions can fail on it.
 *
 * Three specifications want the same two listeners and the same shape of entry,
 * so they live here rather than being copied into each one. The sweep and the
 * hero block already had this pair inline; the lifecycle lane's failure mode is
 * the one that needs it most, because a disposer that throws during navigation
 * is exactly a cleanup that did not run.
 *
 * Bound, and the lifecycle lane's header repeats it: these listeners see what the
 * page reports through `console` and through uncaught-error handling. They do not
 * see an exception thrown inside a `pagehide` handler — measured 2026-09-16 on
 * Chromium 153.0.8010.12, that throw reaches neither `pageerror`, nor `console`,
 * nor CDP `Runtime.exceptionThrown`/`Log.entryAdded`, while the same throw from a
 * click handler is reported normally. So an empty list is evidence that nothing
 * was reported, not proof that nothing threw; the teardown record is what covers
 * the case these listeners structurally cannot.
 */
import type { Page } from "@playwright/test";

/**
 * Attaches the listeners and returns the list they fill, in the order the page
 * reported. Each entry names what threw: an uncaught error carries its name, its
 * message and its first stack frame, so the failure says which disposer broke
 * rather than only that something did.
 */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error: ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    const frame = error.stack?.split("\n")[1]?.trim();
    errors.push(`uncaught ${error.name}: ${error.message}${frame === undefined ? "" : ` at ${frame}`}`);
  });
  return errors;
}
