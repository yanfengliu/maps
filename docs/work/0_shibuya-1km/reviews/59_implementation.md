# Review 59: implementation

## Target

Independent review of the F26 ordered segment observer. Author workspace: `artifacts/walking-segment-observer/wt`, base `927250018e86db4c89c9063a8f5f166ee15eb391`. Reviewer workspace: `artifacts/walking-observer-review/wt`, detached at current main `d7c8eea43c1cbfc6e85bcd01306fd43898be6b66`. Root owns disposition, integration and final gates.

The exact authored report is retained as [59_walking-observer.md](../snapshots/59_walking-observer.md), SHA-256 `cb4e1213ad6b096645c30c5e3f6e8ff9824478c67a2aebc5e779c7656eb37de9`. The author's `artifacts/observer/FREEZE.json`, SHA-256 `f8deb1416e9931a47e780af85cec5c95bc39b1d1db9985115c62057d40861686`, binds 49 files and five configuration inputs. Exact copies live under `artifacts/review59/target/` in the review workspace. The complete five-addition patch is SHA-256 `fd632068c0f2cc71c7d76962106d6136b777702b62cfac6a14d3c700449e6f55`; the observer-only path delta is `dc07c596602d2f10a479efd6c926317617505dc48bf88d15f994204cdea0e3a5`.

| Candidate path | SHA-256 |
| --- | --- |
| `src/agents/population/walking-path.ts` | `99f78810e51a0b03de8ea81a34f095250ce88abaf725edaccfe86ba5331f75e3` |
| `src/agents/population/walking-surfaces.ts` | `9c0274aa6cf2ec0f2362b30f9c1d486531937527e725448d1da9a35198259674` |
| `src/agents/population/walking-corridor.ts` | `18d119d735c64373a6ce8598a6d81b57f9ac572dacf3a043b8f5b3d5f626922a` |
| `test/walking-path.test.ts` | `8acdf6aab744cd6f853dcd68f754d4c44a5eff126dc0c5e138ab5602a306271b` |
| `test/walking-observer.test.ts` | `4a1ac323821934b628313a1d6d08105a333fe454819d34498781e76b60fb78db` |

The first four are unmerged F26 imports, with only `walking-path.ts` changed from the Review 48 baseline `fe8f579dde019abffb949abeaa2ea214abb4de1f7f0cf5958ac3f6cd916cafa0`. This round reviews the observer increment admitted by Review 57. It does not re-admit a source-selection policy or a controller transaction.

## Reviewers and coverage

Codex `walking_observer_review` authored none of the target. I read the repository instructions, local rules, lessons, fleet work-document format, accepted Reviews 48 and 57, the exact observer delta, the actual advance and support contracts, the tests and the replay instrument. The current population harness does not import this unwired candidate. The review therefore calls the frozen public walking APIs with explicit analytic support, using the retained original advancer as a compatibility reference and independently calculated geometry for selected expectations.

All execution and writes stayed in the isolated review worktree. Candidate and original files were copied byte-for-byte. No author or primary product file was edited. No full suite, build, visual gate, browser, native fixture, GPU, network, server, fetch, dependency install, commit or push was used. This is a finite CPU component review, with no city, feet, appearance or performance coverage.

## Reports

### Codex walking_observer_review

**Recommend acceptance of the frozen observer increment within its declared diagnostic contract. No material new finding was reproduced.** The movement equations, source-hold lower inverse, conservative footprint sweep, state transitions and legacy return fields remain unchanged. Observation records are appended after each original move or geometric turn. The callback runs once after construction of the original result. Recording interval boundaries does not feed back into the arithmetic or authority decision.

The new array, interval, pose, support position, normal and triangle identity are detached and frozen. The copied support shape covers every object in the declared `WalkingContact` contract. Independent recursive identity checks compare all observed objects against the actual path, incoming state and returned state. Mutation attempts, a nested callback that runs another advance, and exact exception-identity propagation pass. A callback can still act through its own unrelated closure; the author states that boundary explicitly, and this API is not a sandbox or a gait admission transaction.

An independently calculated short sloped corner produces move, turn, move and done in order. Its 13 mm north leg and 21 mm east leg have physical lengths `0.013 * hypot(1, 0.2)` and `0.021 * hypot(1, 0.3)`. At 0.73 m/s and 2.5 rad/s, the total consumed duration agrees with those two travel times plus `(pi / 2) / 2.5`. The final yaw is pi/2. This expectation is independent of the constructor's arc and the observer's totals.

The additional finite matrix varies both turn signs, yaw wrapping, reversal, a lateral connector with constant source station, slope, three tick sizes and hold/release authority. It completes every route after release. Immediate physical contact, a source hold behind the initial station, completed-path ticks and a tick below the existing loop tolerance also preserve the old result and expose the correct remainder. Each recorded move/turn names the actual step kind; time and pose boundaries are contiguous; source and physical deltas match endpoints; travel and angular duration agree with the independently supplied speeds. The bounded matrix accounts for 4,102 advances and 4,324 intervals: 1,423 moves, 2,762 geometric turns, 75 held, 49 done and 15 unspent records.

The disclosed rounding behavior is compatible with this observer's scope. Time endpoints are clipped into the requested tick, while the legacy elapsed value remains untouched, including the supplied 0.10000000000000002-second case. A changed pose or yaw with zero representable recorded duration is retained. Neither this record nor the `unspent` remainder promises that a future controller can consume zero-duration events or reject a complete tick atomically. Those are later coupling obligations already separated by Review 57, not missing authority in a read-only diagnostic.

The observer preserves Review 48's bounded source-hold acceptance and explicit unverified turns. It grants no sole support, contact validity, moving admission, handback, natural motion, production wiring or whole-city acceptance. The four baseline imports remain identifiable separately from the observer delta.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F26 | Existing physical/source hold authority must be preserved by observation. | No regression reproduced on the exact retained baseline comparisons, plateau/release controls or independent matrix. Recommend acceptance of this observer increment; root retains final disposition. | Preserve these exact bytes through integration and run the required final gates. |
| W4/F27 | Future ordered controller coupling needs moving admission and a defined atomic tick result. | Outside this increment. The callback observes a completed calculation and does not claim controller admission or rollback. | Review the later controller transaction separately. |

No new F-ID is requested. These rows retain existing obligations rather than inventing a new defect.

## Verification

On Node v24.12.0, the review's focused Vitest run passes 62 executions: the unchanged 24 original cases, 14 observer cases and an import-adapted replay of the original 24 cases. The replay still checks 17 constructions, 85 explicit samples, 10 initial states, 1,255 advances and 1,416 intervals. Both enabled and disabled candidate results equal the exact retained original under V8 serialization. These repeated executions are not 62 independent test designs. TypeScript `--noEmit` passes against the current-main review checkout and its five exact candidate additions.

`node artifacts/review59/independent.ts` passes the 4,102-advance matrix and additional callback controls described above. Its own verifier rejects four deliberately corrupted records by the expected assertion: a dropped remainder, a time gap, an incorrect source delta and the wrong step owner. These prove those instrument checks reject bad records; they are not four source-mutation tests. The author's separately frozen held-remainder and mutable-normal source-mutation receipts were inspected and retained, including the initial failed driver's over-specific diagnostic expectation. This review does not present those authored mutation runs as independently rerun tests.

The author roster and configuration inputs match before and after review. All 24 transitive source dependencies match the author, retained baseline and review worktree byte-for-byte. The primary checkout has some different raw line endings; LF-normalized content of all 24 dependencies matches, and the before/after record retains both raw and normalized hashes. This proves the observed content compatibility, not a raw primary-byte identity claim. The five current configuration files match in the review worktree. `git apply --reverse --check` accepts the complete candidate patch against the copied target. The snapshot matches the exact authored report.

The sandbox refused Git worktree metadata and esbuild's configuration read; scoped retries succeeded. The first preparation command used the wrong relative root and stopped before copying, then a strict primary raw-byte dependency comparison stopped at `routes.ts`; inspection established the line-ending difference and preserved the stronger content comparison. The failed focused startup receipt remains next to the successful retry. None is reported as a product failure. Fleet document checking still reports the inherited top-level `docs/work/0_shibuya-1km/handoff.md` structure violation; no repository-wide document pass is claimed.

Raw scripts, copied targets, run receipts, input manifests and results are retained under ignored `artifacts/review59/`, bound by its final freeze. The six-section report and exact snapshot are the authored handoff. A sandbox CIM query was denied; the approved read-only retry found zero process command lines naming this review scope. Every child command was waited to completion. The sole verified `node_modules` junction was removed without recursive deletion; no data junction was created. No resource remains intentionally running.

## Round outcome

Recommend scoped acceptance of candidate path SHA-256 `99f78810e51a0b03de8ea81a34f095250ce88abaf725edaccfe86ba5331f75e3` and the exact five-file target above. No material observer finding remains from this review. Required final product gates, integration, main delivery and later feet/controller/source work remain root's responsibility. This report does not authorize production walking or transfer visual evidence.

The report, snapshot and frozen ignored evidence are released for root's integration. The isolated worktree remains at `artifacts/walking-observer-review/wt` solely for that handoff; root must preserve the reviewed patch/evidence or bind it to a recoverable committed revision before removing it.
