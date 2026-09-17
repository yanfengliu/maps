/**
 * The outgoing page's record of its own `pagehide` cleanup, and the reader's
 * refusal when that record is missing or names a failure.
 *
 * Why the page keeps a record at all: Chromium reports an exception thrown while
 * a document is being torn down to nothing. Measured 2026-09-16 on this machine's
 * Chromium 153.0.8010.12, a throw inside a `pagehide` handler reaches neither
 * `page.on("pageerror")`, nor `page.on("console")`, nor CDP
 * `Runtime.exceptionThrown`/`Log.entryAdded`, over an http navigation, while the
 * same throw from a click handler is reported normally. The probe that measured
 * it lived at `artifacts/gate-integrity/wt/probe/pagehide-visibility.mjs`, which
 * the reclamation pass removed on 2026-09-16; the measurement is quoted here and
 * the probe is rebuildable from this paragraph. So a
 * console/pageerror assertion alone would report the exact failure it exists for
 * as a pass — the cleanup that throws finishes faster, and the lane's elapsed
 * time bounds cannot tell the two apart.
 *
 * Session storage is same-origin and survives the navigation, so it is the one
 * channel the replacement document can still read. The writer and the reader's
 * refusal live in one module so they cannot drift: `src/main.ts` records through
 * `recordTeardown`, and `tools/visual/lifecycle.spec.ts` reads the same two
 * constants and refuses with `teardownRecordRefusal`.
 */

/** Where the outgoing document leaves its cleanup outcome. */
export const TEARDOWN_RECORD_KEY = "maps.pagehide-teardown";

/** Recorded when the cleanup chain returned without throwing. */
export const TEARDOWN_COMPLETED = "completed";

/** Prefix of the recorded value when the cleanup threw, followed by the error. */
export const TEARDOWN_FAILED_PREFIX = "failed: ";

/** The record's value: `completed`, or `failed: <error>`. */
export type TeardownRecord = string;

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * Runs the page's cleanup and records the outcome where the next document can
 * read it.
 *
 * The failure is recorded rather than rethrown, because the throw has no handler
 * to reach and a record is what makes it visible to the lifecycle lane instead of
 * invisible. The storage argument exists so a unit test can drive this without a
 * browser; `sessionStorage` is the real one, and if it is unavailable the record
 * is simply absent, which the reader treats as "the cleanup did not report"
 * rather than as a pass.
 *
 * Bound: the record proves the chain returned. It cannot prove that each disposer
 * did useful work, and it does not name which disposer threw beyond the error the
 * page raised.
 */
export function recordTeardown(
  cleanup: () => void,
  storage: Pick<Storage, "setItem"> = sessionStorage,
): void {
  try {
    cleanup();
    storage.setItem(TEARDOWN_RECORD_KEY, TEARDOWN_COMPLETED);
  } catch (error) {
    storage.setItem(TEARDOWN_RECORD_KEY, `${TEARDOWN_FAILED_PREFIX}${describeError(error)}`);
  }
}

/**
 * Why this teardown record is not evidence that the cleanup ran, or null when it
 * is. The caller supplies the sentence's subject, so the message can name the
 * document or the run that the record belongs to.
 */
export function teardownRecordRefusal(record: TeardownRecord | null, where: string): string | null {
  if (record === TEARDOWN_COMPLETED) return null;
  if (record === null) {
    return (
      `${where} recorded no teardown result, so the navigation is not evidence that the outgoing page's ` +
      "cleanup ran at all. The page records `completed` once `picker.dispose()` and `app.dispose()` have " +
      "returned (src/main.ts, src/harness/teardown.ts); a missing record means the handler never finished."
    );
  }
  return (
    `${where} recorded that the outgoing page's cleanup did not finish: ` +
    `${record.startsWith(TEARDOWN_FAILED_PREFIX) ? record.slice(TEARDOWN_FAILED_PREFIX.length) : record}. ` +
    "A disposer in the pagehide chain threw, so every disposal after it was skipped — and a cleanup that " +
    "throws also finishes faster, which is why the navigation's elapsed time cannot tell the two apart."
  );
}
