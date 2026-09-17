# The visual gate's five unfixed instrument findings, and the measurement that changed one of them

2026-09-16. Worktree `artifacts/gate-integrity` on branch `worker/gate-integrity`, base `0ae46df`. Nothing committed. Full report: `artifacts/gate-integrity/REPORT.md`.

## What was believed and proved false

**That the previous attempt's base was close enough to reuse.** `artifacts/gate-hardening` sits on `e561d75`, 22 commits behind `main`. Between that base and today, `tools/visual/verify-output.ts` was 61 lines and is now 300-plus with a lane split; `orbit.ts`, `hero.spec.ts`, `sweep.spec.ts` and `lifecycle.spec.ts` all changed; and `tools/visual/budget.ts`, `progress.ts` and `lane.ts` did not exist. Every line of the previous attempt's code had to be re-derived. Its *report* stayed useful for one thing: the `pagehide` measurement below, which was re-measured here rather than believed.

**That adding the listeners the review asked for would close finding 4.** It would not. Measured on this machine's Chromium 153.0.8010.12 with `probe/pagehide-visibility.mjs` — four arms, each its own context, `--use-angle=swiftshader`:

| Arm | console errors | pageerror | CDP `Runtime.exceptionThrown` + `Log.entryAdded` |
| --- | --- | --- | --- |
| click handler throws | `[]` | `TypeError: click boom` | reported, with stack |
| click handler logs then throws | `["logged boom"]` | `TypeError: click boom 2` | reported |
| **`pagehide` handler throws** | `[]` | `[]` | `[]` |
| **`pagehide` handler logs then throws** | `[]` | `[]` | `[]` |

The positive controls fire and the question arm is silent across all three channels, including an explicit `console.error` inside the handler. A `pagehide` throw is reported to nobody. So the console/pageerror assertion the review asked for cannot see the failure the review named, and shipping it alone would have been a check that reports "did not run" as "passed" — the exact failure the certificate findings are about. The page now records its own cleanup outcome in session storage (`src/harness/teardown.ts`), the replacement document reads it, and the wrapper requires `completed` in the lifecycle record. That record was then made to go red on the shipping bundle: `"failed: TypeError: picker.dispose() is not a function"`, with console and pageerror still empty.

**That a test failure means what it looks like.** The mutation harness reported all six mutations red on its first run with empty output. The mutations had been applied with `await writeFile` and the test was then run with `execFileSync`, which blocks the event loop — so the tests ran against **unmutated** files. Its second and third versions then reported green for mutations that were genuinely red, because under this harness a Node child cannot capture another program's piped stdio (`execFileSync` with `stdio: "pipe"` returns `status=null` and zero bytes), and reading the human output by glyph failed. The version that works redirects stdout to a file in a shell and decides red from vitest's own JSON `numFailedTests`. Every one of those three states — bad mutation, empty log, mis-parsed log — looked exactly like a working proof harness.

**That `beginVisualRun` could stop deleting the certificate.** It cannot. `test/visual-evidence.test.ts`, which this unit may not edit, pins "clears the previous complete.json when a new capture run begins" against `beginVisualRun` directly. Splitting the deletion into a `--reset` step alone broke it. The fix keeps the deletion in `beginVisualRun` and adds `--reset` for *where in the chain* it happens: both are idempotent, and the property the test pins stays true.

## What a reviewer would want to know

**The certificate was not atomic for a while, and the probe caught it.** `verifyVisualRun` writes `complete.json` as its own last act, so `certifyVisualRun` — which is that plus the lifecycle checks — wrote a certificate carrying no lifecycle evidence *before* checking the lifecycle lane. A run whose lifecycle invocation never happened therefore left a `complete.json` on disk that a reader would take for a passed run. The certificate now removes that file before the lifecycle check and writes once, at the end; the CLI-level probe asserted the absence and would not have before this was fixed.

**A path-separator mismatch would have refused every healthy run on Windows.** `beginVisualRun` built its file list with `join`-style backslashes in the probe while `lifecycle.spec.ts` hashes the same two names with a template literal, and the wrapper compares the two lists by name. The real chain passes the default `dist`, so both sides happen to agree today — the mismatch surfaced only because the probe passes an absolute `dist`. The paths are now built with forward slashes and the reason is written where they are built.

**`--reset` has a residual that is stated rather than fixed.** If `--reset` itself fails, the chain stops with an earlier certificate still on disk. Nothing ran in that case and the run exits non-zero, but the file is not removed. Getting from "no certificate" to "no stale certificate" would need a claim token written before the run, which is a larger change than the finding asks for.

## What is not proved

- No lane of `npm run visual` was run: the verdict lane is three hours and another unit owns it. The two spec-side assertions (the lifecycle lane's page-error list and teardown read, and the specs' renderer refusal at the first frame) are typechecked, exercised against the shipping bundle through the probe, and pinned by source-level cases — but they have not executed inside the specs themselves.
- The scene digest is over file names, sizes and mtimes, not contents. A byte rewritten in place with the same length and mtime is invisible to it. **Correction, 2026-09-16, `f4e96f0`:** the digest is now over the path each file is served at and the SHA-256 of its bytes, so that rewrite is exactly what it sees, and this bound was still being repeated in two places in `docs/learning/gate-proofs.md` until the same day. What the current digest cannot report is a file changed and changed back between its two calls, which no digest taken at two instants can see. The sentence standing before this marker is what was believed when this entry was written and is left as it was, because this file is history; the red control for the byte binding is in `docs/learning/gate-proofs.md`, "The scene digest sees a served file rewritten in place".
- The three lifecycle records prove three conforming records for this build exist after this run's start. They cannot prove the records came from this process tree.

## Numbers that moved

- `tools/visual/verify-output.ts`: 61 lines → 613.
- `test/visual-instrument.test.ts`: new, 31 cases. Full suite 52 files / 383 tests, green, with `test/visual-evidence.test.ts` and `test/visual-budget.test.ts` unedited.
- Scene payload digest covers 137 files, 371,228,426 bytes across the two served mounts.
- The probe's first frame on SwiftShader: drawing buffer 1280x720, the crossing pose at 45 m drawing 146,576 building triangles from 18 visible tiles; the plaza zoom at 620 m drew 418,062 from 41.
