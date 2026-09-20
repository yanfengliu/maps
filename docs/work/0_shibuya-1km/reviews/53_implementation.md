# Review 53: implementation

## Target

Focused independent re-review of F29 in `artifacts/historical-walking-facts-v2/wt`, based on `82ee91772f9533ab3e8661f73af2eb4eb1e2bd3c`. The detached review workspace is `artifacts/historical-facts-v2-review/wt` at the same base. The exact 36-file author freeze is `artifacts/facts-v2/freeze.json`, SHA-256 `ad5938fa2149c86db1c0e8e20dee679ec34ff8b1dbf6d8ec3b5c3ea6d428b3ed`; complete four-file candidate patch is `40306f742d6c4e3fea19c5861b0c9759edc2ab5552d6bf6c34ca7a264420ce78`; the two-file repair diff is `86925ccf05a758dedfc13db8d0168fb787f01336be1282ba313b2459afa0ad25`. The [exact author report snapshot](../snapshots/53_historical-walking-facts-v2.md) is `4b5eb31ab96291c0a5cba668ea7ca2262e5ed2447c957d0b6f2f4c09b33b0963`.

The four non-document files for integration are bound below. Only CLI and tests differ from the rejected Review 52 target.

| Candidate path | SHA-256 |
|---|---|
| `src/world/walking-facts.ts` | `612cd0281c8c55547c3c5b908f25b53cded0387e5d73d5a1432b4bc8582505cf` |
| `tools/network/historical-walking-facts.ts` | `2b58bf8d024877cf117ec8b3f689ff323d1d72a293ee2e4c7b77cf9f7007b53a` |
| `tools/network/build-walking-facts.ts` | `a6e0c9ee9746ed3034dc3a2efbedadd391a5f7d832d29306db4d8f701cf2f5f8` |
| `test/historical-walking-facts.test.ts` | `360e0ee08c52fe8c1d4fc32ecb91bda7f67bcdd92084be44b8e3f09956cf44d6` |

## Reviewers and coverage

Codex worker `motion_review`, independent of the facts/repair author, inspected the exact repair, complete new test cases and retained evidence. It reran the 67-case focused suite, types, exact old-source red control, unchanged original reviewer error probes and actual native CLI output. No second CLI reviewer is claimed.

The reviewer authored the earlier source-lineage experiment, not this facts code. Its lineage premise continues to rely on independent Review 49. The unchanged producer/types retain only the scoped coverage established in Review 52, report SHA-256 `195e61421a133abd63d1ffaf365b9bb2bee91be4eab43f8a22da3a7c56b39fb6`; this round does not repeat or expand that source review. No browser, GPU, network, generator, shared-data writer, dependency install, full gate, primary edit or commit ran.

## Reports

### Codex independent reviewer

Accept the bounded F29 repair. Filesystem failures now identify the failed read/output operation, affected path and a valid bounded OS error code, then state how to recover. Input failures request the complete readable reviewed lineage bundle matching the external digest. Output failures request a writable real artifact directory and a new filename while retaining existing output. The original error remains in `cause`; verbose raw OS text is excluded from the displayed wrapper. The wrapper limits displayed paths and accepted code strings rather than repeating arbitrary exception content.

The original two actual native missing-input cases now produce contextual messages and exit 1 without creating the output parent. The unchanged exact-ESM injected write-denial case also gains recovery guidance and still exits 1. This is the same three-case instrument retained from Review 52, not a rewritten expectation derived from the repair. The denial remains synthetic; no ACL or native permission experiment occurred. The 67-case suite additionally exercises all eight required missing files, cause retention, output inspection/stat/resolution errors, directory/write errors and the actual dangling-junction refusal.

The repair retains containment, link refusal, validation-before-output and exclusive `wx` creation. It does not weaken any freeze, source, helper, payload or roster check. Its small path inspection change reuses the already obtained `lstat` result; it does not add a selection policy. The native CLI derives byte-identical facts from the reviewed bundle: 255,664 bytes, SHA-256 `e56babad1c2f687aac40313002e87f9e88b402839158031f2ad806f8f800c9b9`. A second attempt refuses the existing output and preserves that digest. The original 50 cases also still pass. No material regression was reproduced within this focused scope.

The tests wrap Node's immutable ESM namespace solely to make individual I/O failures replaceable; uninjected functions forward to the actual filesystem, mocks are restored before fixture cleanup, and the two native child CLI tests run outside that mock. The author disclosed its first six injection-setup failures and preserved that instrument history. They are not product failures or extra passing cases. This review's actual focused run completed all 67 tests without that setup failure.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F29 | Raw filesystem failures lacked recovery guidance. | Resolved for the exact v2 CLI. Actual original missing-input probes now name recovery, injected adjacent failures are contextualized, and all 17 new tests fail with the old CLI. | Root's integration review and required combined gates remain before delivery. Preserve rejected Review 52 and its original target. |

## Verification

- Exact 36-file v2 freeze and private retained target copies matched before and after; all four working source files match the table. All 60 original author files, all 17 watched inputs and all 170 files in the frozen Review 52 evidence manifest remain unchanged.
- `vitest run test/historical-walking-facts.test.ts`: 67/67 passed. `tsc --noEmit`: exit 0. These were focused checks, not the complete repository gate sequence.
- Exact v1 CLI SHA-256 `4866821dbcdfb0e7cd9f1c167eeb43d68e52ef848eb49e7506dff61bc3316c6e` with the new unchanged tests in an isolated copy: 17 F29 cases failed, exit 1. No live candidate was edited for the red control.
- The unchanged original `cli-error-controls.mjs` executed all three planned cases: two real missing-input failures and one injected write denial; all retain exit 1 and now report recovery. Result SHA-256 is `86e61d03ed684f0cc4eaa8ef0bc75a083f6cb69df1126ab77727c6a2aa75625c`.
- Actual native CLI success produced the exact artifact above; repeat creation refused and preserved bytes. The combined command/result record is `artifacts/review53/result.json`, SHA-256 `dfb4d27acea5383787793d0b47a9404001013123101916e7612fca8a4a8ef27e`. No generator arm or source adoption is included.
- Source, commands, stdout/stderr and exact target copies are intentionally retained under ignored `artifacts/review53/`. Test child processes completed, private test junctions were removed, and no browser/server was launched. The lane released its focused/type resources after checks.
- The work-docs checker still refuses inherited `docs/work/0_shibuya-1km/handoff.md`. This report has the six required headings and its exact authored target snapshot; the unrelated inherited path remains untouched.

## Round outcome

Accept the exact four-file candidate as a bounded offline historical-facts component with F29 resolved. Root still owns exact integration, document handling, required gates and final delivery. This does not adopt a source/network pair, assign current mesh support, authorize step locomotion, wire production walking, regenerate paint or establish city acceptance. The separate stacked-support study and launcher review retain their own unresolved boundaries. No integration review is implied by this component re-review.
