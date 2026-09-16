/**
 * What one hardware lifecycle run records about itself.
 *
 * One definition, used by the specification that writes the record and by the
 * wrapper that refuses to certify a run without three of them, so the two cannot
 * drift: `npm run typecheck` fails if the specification stops writing a field the
 * wrapper reads, and the wrapper reads the same directory the specification
 * writes.
 *
 * The directory is the verdict lane's own root, spelled out here because
 * `laneDir()` answers a different question — which lane this process *is* — and
 * the lifecycle lane is not the verdict lane even though its records are part of
 * the verdict. The two spellings are checked against each other by
 * `test/visual-instrument.test.ts`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** `laneDir("verdict")`, the root the wrapper certifies. */
export const VISUAL_ROOT = "artifacts/visual";

/** The one directory the lifecycle lane writes its records into, under that root. */
export const LIFECYCLE_SUBDIR = "lifecycle";

/** The absolute-or-relative directory those records are read back from. */
export const LIFECYCLE_RECORD_DIR = `${VISUAL_ROOT}/${LIFECYCLE_SUBDIR}`;

/**
 * How many lifecycle runs `npm run visual` claims, and therefore how many records
 * the wrapper requires.
 *
 * It is the `--repeat-each=3` in the gate's own chain. One constant rather than
 * two spellings, so changing the repetition without changing the requirement
 * fails `test/visual-instrument.test.ts` instead of leaving a gate that certifies
 * one hardware navigation and calls it three.
 */
export const LIFECYCLE_RUNS = 3;

export interface LifecycleRecord {
  /** The instant this repeat began, and the file name the wrapper reads it by. */
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  /** The URL the run navigated away from, which is the gate's own `/?time=noon`. */
  url: string;
  /** The unmasked renderer string this run actually got, read before preparation. */
  glRenderer: string;
  preparationMs: number;
  /** The navigation step's elapsed time, bounded at 15 s by the specification. */
  navigationStepMs: number;
  /** The replacement page's first frame, bounded at 60 s by the specification. */
  replacementStepMs: number;
  /**
   * Every console error and uncaught page error the run saw. Empty on a clean run,
   * and the specification fails rather than recording a non-empty list.
   */
  consoleAndPageErrors: string[];
  /**
   * What the outgoing page recorded about its own cleanup (`src/harness/teardown.ts`),
   * which is the only witness that the `pagehide` chain ran to completion: Chromium
   * reports an exception thrown there to nobody, so the listeners above cannot see it.
   */
  teardownRecord: string;
  /** The build bytes the run was measured against, hashed from the served files. */
  build: { file: string; sha256: string }[];
}

/** Writes one run's record under its start time, the name the wrapper reads back. */
export async function writeLifecycleRecord(
  record: LifecycleRecord,
  directory = LIFECYCLE_RECORD_DIR,
): Promise<string> {
  await mkdir(directory, { recursive: true });
  const file = join(directory, `lifecycle-${record.startedAt.replace(/[:.]/g, "-")}.json`);
  await writeFile(file, JSON.stringify(record, null, 2));
  return file;
}
