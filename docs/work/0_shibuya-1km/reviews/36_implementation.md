# Review 36: implementation

## Target

The certificate-location candidate in `maps`, based on `a9b5c3ee1278c33f847b26ecddf52de540ad5785`. The independent review checkout is its documentation-only descendant `244632ca8d88dc464a162fad3782baa91f59f136`. Eight frozen candidate files were copied into that checkout and individually verified against the author's SHA-256 manifest before review. The original complete patch is retained at `artifacts/certificate-review/tmp/review-runs/round36/candidate.patch`, SHA-256 `ed9791f78d656099d48a68028cf346b086568dc2a0e8e222e642a1d0cf8e08db`; `candidate-freeze.json` beside it records every file digest.

The code scope is `tools/visual/checkout.ts`, `tools/visual/verify-output.ts` and `test/visual-checkout.test.ts`. The documentation scope is `docs/policies/local-rules.md`, `docs/learning/defect-register.md`, `docs/learning/gate-proofs.md`, `docs/devlog/summary.md` and `docs/devlog/detailed/2026-09-19_certificate-location.md`. The candidate leaves the 44-frame set and imported verifier functions unchanged. It adds a primary-checkout guard to the three CLI steps and documents the two style-return approach frames as separate lane evidence.

The repaired frozen patch is retained beside the original as `candidate-v2.patch`, SHA-256 `57023afe681a4a985f378a9cd52e86eb6bf11a7a0597ba7afee8a468af27bc11`. `candidate-freeze-v2.json` identifies its eight exact files. `checkout.ts` is `2d9a6c34418e4e0a8e55a9cd3924d688101da73d06bdf8fe126e8f70b980266f`; `visual-checkout.test.ts` is `7275c4e3034bbd376e04a1d08bc2608bbd5d1e2762e12f2f2a80cbb5697bb7ed`; `verify-output.ts` remains `643db599d7c7ae512192bfb0783d892e3d624ff4d427e24b47a40cda1d26fdea`. The original target and finding remain above and below rather than being replaced by the repair.

## Reviewers and coverage

The `status_queue` worker performed an independent read-only code review in `artifacts/certificate-review/wt`, separate from the author's frozen worktree. It read the three code files, the complete patch, `package.json`'s gate chain, `tools/visual/lane.ts`, the existing visual-instrument/evidence tests and applicable repository rules. It ran the focused suite and bounded temporary-repository checks. No browser, build, data rebuild or GPU gate ran for this review.

Claude Code 2.1.263 was attempted with configured defaults and only `Read`, `Glob` and `Grep` available. It exited 1 before producing a review: `Failed to authenticate: OAuth session expired and could not be refreshed`. This is an abstention, not an approval. No authentication setting was changed. Its process exited; raw captures remain under the ignored review directory while the review needs them.

## Reports

### Independent reviewer: status_queue — original candidate

**F21, P2: an ordinary case variant of the primary Windows path is refused as a linked worktree.** `tools/visual/checkout.ts:45` compares four path strings with strict equality after `realpathSync`. On this machine, `realpathSync` preserves the caller's spelling, while Git's worktree list returns the primary path with its stored casing. A real temporary primary named `Primary With Spaces` is admitted with its original spelling. Calling the same guard with `primary.toLowerCase()` is refused, although it names the same existing directory. The actual wrapper reproduces this: `spawnSync(process.execPath, [wrapper, "--reset"], { cwd: primary.toLowerCase(), ... })` exits 1 rather than 0 and says its evidence must survive linked-worktree removal. The seven new tests pass because none uses an alternate-case spelling. Canonicalize the existing filesystem paths consistently without changing POSIX case semantics, and gate the actual Windows CLI path.

No other blocking finding was found in the bounded change. The guard runs after argument/lane validation but before `resetVisualRun`, `beginVisualRun` or `certifyVisualRun`, so its ordinary refusal paths cannot reach evidence writes. Inherited `GIT_DIR`, `GIT_WORK_TREE` and `GIT_COMMON_DIR` are cleared for both Git reads. Both stale-primary and stale-linked environment checks gave the intended result. The first worktree entry supplies an actionable primary location, and spaces in that location work. Linked, subdirectory and non-repository invocations of all three CLI steps retained both sentinel files; a missing Git executable refused before creating an output directory. These are ordinary workflow checks, not a hostile Git-configuration security claim.

### Independent reviewer: status_queue — focused repair

The repair uses `realpathSync.native` for cwd, all three `rev-parse` paths and the primary entry from `worktree list`. It canonicalizes the existing Windows path instead of lowercasing identity comparisons, preserving POSIX case semantics. The new Windows-only case checks both the helper and the actual CLI through a lowercased primary path, with spaces retained in the fixture. The original wrapper guard, imported verification functions and phase ordering are unchanged.

F21 is resolved on the frozen repair. The independent real-CLI reproducer now returns 0 for the alternate-case primary and still refuses linked checkouts. All eight focused tests pass, including the new case. The bounded environment and refusal checks still pass. No further blocking finding remains in this scoped change. A primary full visual gate and native frame review are still required before landing; this focused acceptance claims neither.
### Claude CLI

No authored report was produced because authentication failed before review. Its absence carries no approval weight.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F21 | Case-variant primary Windows cwd receives the linked-worktree refusal. | Accepted by the root integration owner after the finding; actual CLI reproduction confirmed the reported ordinary workflow break. | Resolved by frozen patch `57023afe…`; native canonicalization, the new Windows case and independent actual-CLI reproduction pass focused re-review. |

## Verification

The original frozen candidate passes all seven cases in `test/visual-checkout.test.ts`, independently run with one worker on Node 24.12.0 in 1.05 s. The first sandboxed attempt failed during Vitest/esbuild startup on an ancestor-directory ACL; the approved run outside that sandbox passed. This is an environment failure followed by an actual test result, not a product repair.

The independent `edge-cases.mjs` uses the shipped guard and wrapper against temporary repositories. It confirms F21 through the real CLI and passes the other bounded checks described above. Its first draft could not import a Windows path as an ESM URL; correcting that scratch-only import to `file:///` enabled the measurement. The script removes only the temporary fixture it created in `finally`, and no task-owned browser or server exists.

All eight frozen file digests and the full tracked diff remained unchanged after the review attempt and probes. The before/after tracked-diff SHA-256 is `e7494c1d6b681370ca6ad119d273f7d57ff9d0a2b308dc32f353dd505e857b33`. The author's reported 51-test run and typecheck were read as handoff evidence, not represented as independently rerun here. Full primary certification and native image inspection remain the integration owner's verification steps.

Focused repair verification independently passed 8 of 8 tests in 1.23 s and all eight grouped observations in `edge-cases-v2.mjs`. The initial scratch rerun expected the primary output directory to remain absent, but the now-successful `--reset` correctly creates it; the scratch check was corrected to compare its state before and after the missing-Git refusal. This was an instrument assumption, not a product failure. The author reports 52 combined visual unit tests and TypeScript passing; those broader checks remain author evidence here.

## Round outcome

The original candidate was rejected for F21. The frozen repair resolves it, with no remaining blocking finding in the certificate-location change. Claude is unavailable and contributes no review. The root integration owner must still verify the exact integrated bytes, run the required gates and inspect the final frames before landing. This review does not accept the Shibuya deliverable.
