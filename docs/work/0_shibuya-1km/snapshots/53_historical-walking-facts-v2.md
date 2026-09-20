# Historical walking facts v2 — F29 error repair

Owner `lease_retirement`; detached worktree `artifacts/historical-walking-facts-v2/wt`, base `82ee91772f9533ab3e8661f73af2eb4eb1e2bd3c`. Root authorized this narrow follow-up to Review 52. This candidate is uncommitted and awaits independent Review 53. No shared data, canonical document or original author/reviewer evidence was edited.

## Defect and change

Review 52 (`195e61421a133abd63d1ffaf365b9bb2bee91be4eab43f8a22da3a7c56b39fb6`) reproduced bare `ENOENT` messages for an actual missing lineage directory and member. Both safely refused output but omitted recovery. An injected `EACCES` write failure and a native dangling junction showed the adjacent error class. Root accepted F29. The original 60-file author freeze `cfb89919…`, patch `d5ff9b7c…` and rejected review remain unchanged.

The v2 CLI wraps filesystem operations with a short context message: failed operation, affected path, OS code where valid, and what satisfies the read or output requirement. Reads request the complete readable reviewed bundle matching the external digest. Output inspection/directory creation/exclusive file creation request a writable real artifact directory and new filename while retaining existing output. The underlying error stays available as `cause`; arbitrary verbose raw OS text is not printed. Displayed filesystem paths are capped at 320 characters and OS codes at 32, bounding wrapper messages without hiding which operation failed.

Only `tools/network/build-walking-facts.ts` and `test/historical-walking-facts.test.ts` differ from v1. The readonly types and producer are byte-identical (`612cd028…` and `2b58bf8d…`). Source/helper/roster/payload checks, output containment, validation-before-write, link refusals and exclusive `wx` creation are unchanged. No schema, source policy, support selection, dependency, installation, application or data-writer wiring was added.

## Verification

Node `v24.12.0`. The focused file passes **67/67**, including all prior 50 cases and 17 F29 cases. TypeScript `--noEmit` exits **0**. New tests cover each of the eight missing required files, two actual native CLI missing-input executions, read denial with bounded text and retained cause, output existence/stat/realpath failures, directory/write denial, and native dangling-junction recovery. The injected denial tests do not change ACLs or claim native permission failures. Successful creation/existing-file preservation and no-output-on-invalid-bundle cases continue to pass.

An isolated copy combines these exact new tests with the exact frozen v1 CLI. All **17 F29 cases fail** for the intended missing context/recovery/cause behavior; the old control exits **1**. It never edits v1 or v2 source. `old-red.stdout.log` and `old-red.stderr.log` retain the output. The first author test attempt used spies on Node's immutable ESM namespace and failed six injection setup cases while 61 cases passed. The test-only module wrapper fixes that instrumentation boundary and forwards every uninjected function to the actual filesystem; it changes no production interface. `initial-test-instrument.json` records that initial failure rather than treating it as a product regression.

The exact unchanged Review 52 `cli-error-controls.mjs` was copied privately and replayed. Its two actual native missing-input probes and one exact-ESM injected write-denial probe now all set `recoveryPresent:true`; all still exit 1. Original reviewer outputs are untouched. Its copy SHA is retained in `results.json`.

The actual native v2 CLI also derived one private successful artifact from the reviewed lineage bundle. It remains exactly **255,664 bytes**, SHA-256 `e56babad1c2f687aac40313002e87f9e88b402839158031f2ad806f8f800c9b9`, identical to v1 and Review 52's independent artifact. This is a replay through the artifact CLI, not another network generator arm or source adoption. All **60 original frozen author files** and **17 watched input files** were checked unchanged afterward. The Review 52 authored report digest also matches.

`run.mjs` records each command's actual exit, stdout and stderr. All runs are focused CPU tooling; no full suite/build/audit/visual gate, browser/GPU/server, network request, install, generator, source/data writer, commit or primary write occurred. Native test processes returned, test-owned junctions were removed, and private evidence remains intentionally retained for Review 53. No source/support policy is inferred from the separate frozen nine-case support study.

## Handoff

`candidate.patch` contains all four new files for integration at the stated base. `repair.diff` records only the two v1-to-v2 changes. `freeze.json` binds the source, report, patches, scripts, output, controls and logs. The original facts and Review 52 targets remain separately recoverable. Independent Review 53 and root's later integration/gates precede delivery. Historical admitted source facts remain distinct from current surface authority, step locomotion, a paired source/network adoption and the overall Shibuya goal.
