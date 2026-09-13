# Review 20: implementation

## Target

Original ABBA timing preparation. The original ignored ABBA preparation instrument at declared main `7f8aeac`, using the unchanged twelve-stream, 3,000-assignment workload and admitted evaluator. This is preparation review, not a measured population comparison.

The exact target is `artifacts/agents/gait-pose-abba/handoff.json`, SHA-256 `5958764bd894e9a69f72ca0abaa24339ed06eea3a34f05ac4c41e92d09b6624c`. Reviewed text sources are retained byte-for-byte under `artifacts/network/retirement-pose-checkpoint/candidate-01/recovery/source/`; the consolidated `recovery/reviewed-source.patch` has SHA-256 `dd2fe770ac1368dbf21ee7bf3bd3033f2564f03b8141f63633c94478fa0114d9` across 61 source files for this checkpoint. The additive patch uses LF transport; exact copies and normalized reconstruction records preserve the original bytes and line endings. Raw output, source assets and earlier counterevidence remain ignored at their pinned handoffs. No experimental code is promoted by this document.

## Reviewers and coverage

/root/assets_review authored the report below independently of the implementation. Root separately read its substantive findings and accepted only the dispositions stated here. The report is `artifacts/agents/gait-pose-abba-review/report.md`, SHA-256 `1eb1be445f126781809e825af411aa24fbafc8f93b770fd9967b2a2cd91f9295`; its handoff is `4016a8cbeb9f4ada832e4061a81187f44e9c8852160b18cfe39b95c4226d895c`, sealed at `2026-09-13T12:14:18.1790019+00:00`. The wrapper is authored by the network worker for root's review; it does not alter the reviewer's body or claim additional independent work.

Rounds 18–23 follow the six handoffs' recorded seal times on 2026-09-13, not completion of their underlying implementation work. The original ABBA review and focused re-review remain separate rounds. The full authored text is embedded with ATX heading depth increased by three; inverse transformation is checked byte-for-byte. Local finding labels and priorities are preserved verbatim; permanent IDs occur only in the wrapper dispositions.

## Reports

### /root/assets_review

<!-- authored-report-start sha256=1eb1be445f126781809e825af411aa24fbafc8f93b770fd9967b2a2cd91f9295 -->
#### Independent review of gait ABBA preparation

2026-09-13. Reviewer `/root/assets_review`; root owns integration and any quiet CPU window. This review covers the preparation instrument under `artifacts/agents/gait-pose-abba`, not evaluator performance. All review writes are confined to the new ignored `artifacts/agents/gait-pose-abba-review/`. No candidate, main, data, dependency or Git content was changed. No lease, population benchmark, build, browser, server or GPU work was run.

The dispatch, frozen workload, measurement boundaries, retained outputs and correspondence checks are sound within the declared scope. Two small instrument ambiguities are reproduced below. Root requested both be repaired and receive focused re-review before timing. Neither demonstrates that the current workload passed bad evidence, and this review makes no speedup claim.

##### Target and lineage

| Artifact | SHA-256 |
| --- | --- |
| ABBA handoff | `5958764bd894e9a69f72ca0abaa24339ed06eea3a34f05ac4c41e92d09b6624c` |
| Plan | `07e42a6fe6239873b93b060dc5e46fbabaa2103941bd4a5964b90e7c6adb5f5a` |
| Preparation patch | `4bc706daa9beedeac4427e4dffb8982a39c444732de13281cd19ace83709ccd7` |
| `experiment.mjs` | `801a43a71c87e64bbb39ea8ba838a3d0a297766fbebc5af2226c5d4c3c819bb5` |
| Original controller | `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26` |
| Accepted new evaluator | `41fd26dbd7a175b5637d8e1870fb098a29202a1898333d6df1121e1ac7a395a3` |
| Frozen workload | `5c74eb55e8d1373d93c4b9c4ecbdc2dba96c0e1c3c19c9d0c5b844d739a96405` |
| `timing.mjs` | `0bc4fef43940cf5e1369a3174f14e5a0cdd9f0b36cf81fa9b7240d3b7a531827` |
| `verify-benchmark.mjs` | `de49a4ac226d91127d416cd581b56f006a194666591cfeb576f8f082521ddd2c` |

The declared base is main `7f8aeac51357654a4d39d3e6ecc5f8ac0bda79b6`. I independently verified all 113 input and 104 owned records, totaling 40,381,887 bytes, before and after the checks. Every length and hash matches. The 14-file normalized-LF preparation patch reconstructs the actual target files. No source restoration was needed because the reviewer did not modify them.

The prior independent evaluator review is separately hash-verified at handoff `6d8a33ef1fbd7e764f877ee08950248e49172e3c096cd374e637874db8a32044` and report `8676f63c37df2a482bf026d2de1ae4752c792e4ad5cb9e93536a7c2007becb46`. I read its finite acceptance and limitations. It covers the pinned position-only evaluator and ownership/correspondence contracts; this preparation review does not repeat its roughly 16-million-point author oracle or expand its admitted motion population.

##### Dispatch, workload and timing

I read the complete experiment, timing, common validation, emitted-result validation, lease, child, wrapper, preparation verifier, final verifier, sealing and cleanup code, plus the prior cost measure and actual default RenderLoop. Original evaluation calls the pinned `controller.scenePose` function reference with the original source object wrapped only to count `worldsAt`. New evaluation calls the pinned `evaluatePoseInto` reference directly. Invocation counters follow the selected function identity rather than an independent result label. The wrong-evaluator control rejects even though the two targets intentionally return equal poses.

The existing workload has exactly 3,000 assignments, sequential IDs, 3,000 distinct rigid translations, 12 cases with 250 assignments each and 133 rows per case including initialization. All case timestamps agree. The input transformation is unchanged from the previous cost instrument. Each assignment initializes its own controller state with that case's exact phase. The actual default RenderLoop receives current frozen input, a 1/60-second fixed step and only the existing 0.001-millisecond advance offset. Nothing drops a failing agent or changes commands, phase, geometry or contact thresholds.

Each planned population arm has 12 warmup ticks and 120 measured ticks, 3,000 initializations, 36,000 warmup and 360,000 measured calls to each update/pose route, 132 fixed callbacks/renders and 792,000 source samples. The sequence is original/new/new/original in fresh sequential Node children. Original fresh pose allocation remains inside its actual pose call, while new rig/workspace/3,000 destination allocation is reported at startup. Both arms retain all 3,000 current outputs through validation. The independent evaluator review already bounds the new destinations' deeper ownership; this instrument adds its own current retained-result and initialization identity checks.

The same capture helper brackets both update and pose batches. Common in-batch work consists of actual calls, attempted/returned counts, per-agent visits, immediate failure checks and one deadline read per 128 slots. Full-state serialization, matrix/solve validation, hashes, geometry samples and heap snapshots occur after these timed batches. Input construction/hashing occurs before the callback and is reported separately. Startup, source loading, rig preparation, destination allocation and initialization have separate fields. A full callback value deliberately includes validation/bookkeeping, and it is not presented as the kernel measurement.

The kernel statistic is calculated from each tick's actual update-plus-pose sum. It is never manufactured by adding separate percentiles. An independent anti-correlated synthetic example returns a same-tick p95 of 101 while the sum of the two individual p95 values is 200. Exact clock-event order and arithmetic pass synthetic-clock checks without timing a population. Windows CPU values and heap drops retain their stated limitations. Validation schedules are equal, but their allocations can affect later GC/cache state; neither the plan nor this review attributes that effect to isolated evaluator allocation.

##### Correspondence and independent small controls

Every tick checks one visit per agent, finite current controller fields, exact previous time/yaw/speed and controller failure. It serializes each complete own-data state with the already reviewed deterministic checker, in addition to retaining the older projected-state digest. Every valid pose contributes exactly 1,075 numeric values, including 960 output matrix values and 96 solve-transform values. All 60 output matrices, both complete valid solve records and all six solve transforms are covered. Per-tick input/full-state/output hashes and overall hashes are compared across arms. The previous baseline input/projected-state/geometry digests remain required for a completed population result.

Fresh reviewer execution completed the four untimed 12-agent/four-tick mini arms: 48 total initializations, 192 updates, 192 actual pose calls and 192 separate direct-original oracle poses. All full-state/output comparisons, coverage and checkpoint hashes pass. All 20 overall checksum comparisons against the author's final `check-05` mini records also match; see `fresh-versus-author.json`. No mini arm records batch or callback performance statistics.

The reviewer freshly rejected omitted update agents, duplicate pose agents, stale retained poses and wrong evaluator dispatch, checking the relevant failure stage and message rather than accepting an arbitrary exception. Additional fresh controls reject a changed same-tick state hash, changed same-tick input hash and changed input bytes. Missing lease entry rejects before source loading or initialization, both through the lease reader and a direct benchmark-mode call. The direct call executes only that guard; it performs zero population initialization/update/pose calls. In-memory lease controls test the exact 130-second boundary, wrong order and wrong owner without creating a lease or granting authorization.

The author retains 19 final controls, including the other omitted/no-op/duplicate cases and emitted-field checks. The original failed `check-01` remains intact: its duplicate-update negative reports the controller's strictly-increasing-time error, while its outer summary reports that the expected negative-error pattern was too narrow. All eight historical instrument files match that run's freeze. No failed run or denominator was removed to accept the final check.

Sparse geometry observation remains only five population ticks, the first 12 agents and 16 drawn vertices: 960 complete-weight point/packing pairs per completed population arm at the unchanged 1e-5 m limit. It is not a full-body contact or source-normal oracle. Population-scale hashes, fresh-process ABBA timing, quiet-window behavior, 200 vehicles, heterogeneous city work, GPU deformation and both-style 1080p performance remain unexecuted.

##### AB0 — preserve falsy thrown values explicitly

**P3, narrow preparation repair requested by root before timing.** `captureBatch` uses the value of `error` as its thrown-work sentinel, and `observeBatch` tests that value for truthiness. Fresh synthetic calls throwing `undefined`, `null`, `false`, `0` and the empty string all return a falsy `error`; the consumer therefore cannot distinguish them from a successful batch. This is a generic error-propagation ambiguity, not an observed failure from the frozen controller/evaluator. The actual current initialization/update/pose/deadline guards use Error or AssertionError, and later visit/return validation also bounds incomplete work.

Use an explicit `didThrow` boolean and preserve the original thrown value separately, then make the consumer branch on `didThrow`. Focused synthetic controls should cover all five falsy values, a normal Error, successful work and retained partial timing. The source-level consumer change needs review too; changing only the helper would leave the truthiness decision in place. No evaluator or workload change is justified by this finding.

##### AB1 — make final run validation match wrapper failures

**P3, narrow preparation repair requested by root before timing.** The final verifier requires a closed zero-exit run with matching pins and no error/timeout, but omits `cleanupError` and `outputOverflow`. The wrapper correctly rejects those two fields. Independent controls extract the exact predicates from the frozen source: synthetic rows with either flag are rejected by the wrapper predicate but accepted by the final-verifier predicate. `final-check.json` retains both predicates and outcomes. This exercises those predicates, not the complete future population verifier or a real failed benchmark.

The actual wrapper cannot set a successfully completed ABBA sequence after either condition, so no accepted bad current sequence is demonstrated. Nonetheless the verifier should independently reject all failure flags. Root also requested consistent rejection of a non-null termination signal in wrapper and verifier; a normal Node close cannot simultaneously supply exit code zero and a termination signal, but emitted-record validation should not admit that contradictory record. Add focused synthetic emitted-row controls and preserve the existing valid zero-exit/null-signal case. The lease remains a trusted operational record, not a security or authorization-authenticity system.

##### Resource handling and retained reviewer failures

The candidate wrapper uses a 120-second hard child deadline, 110-second cooperative guards, a 1 MiB output cap and a finally path that requests closure through its owned ChildProcess object and waits for the close event. It stops at the first failed arm, pin mismatch, correspondence mismatch or lease failure. Source and lease bytes are rechecked before and after each child. Missing leases reject before benchmark output creation or child launch. The native cleanup script preserves recycled PIDs, treats unavailable inspection as incomplete, disposes opened handles in finally and never signals by numeric PID. These are inspected preparation mechanics; population children and their hard-deadline path were not launched here.

The review used three bounded single-process Node children through a retained-launch-handle PowerShell wrapper. Each had a 120-second hard cap and a finally closure record; the review programs also check a 110-second cooperative deadline. They contain no child-process calls. The first review run stopped on a reviewer mistake selecting the outer historical summary instead of its nested negative result. The second completed the mini arms and substantive controls, then stopped because an independent whole-assert extraction ended at a semicolon inside a message string. Both failures, exact source versions, logs and partial results remain retained. The final small child extracts only the predicates, validates the already completed mini records, rechecks all pins and passes. No population work was repeated to fix either review instrument issue.

Fresh strict CIM/listener inspection at `2026-09-13T12:10:56.1024391+00:00` finds all three recorded review IDs absent, no current child of those IDs, no remaining process with this review path and port 4319 closed. `closure.json` records the evidence and its point-in-time boundary. No browser, GUI application, server, GPU process, benchmark lease or watcher was created. The reviewer generated no disposable cache; every new file is retained evidence needed for root's handoff.

The finite review is complete. Root should assign only the two small preparation repairs above, obtain their exact new handoff and focused re-review, then separately decide whether to grant the quiet ABBA window. This review authorizes no population timing and makes no whole-scene acceptance claim.

<!-- authored-report-end -->

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F15 (original AB0) | Falsy thrown values were used as the throw sentinel. | Accepted P3 preparation finding; the original target required repair. | Explicit sentinel and actual consumer/outer-catch checks are reviewed separately in Review 22. |
| F16 (original AB1) | The final verifier omitted wrapper cleanup/overflow failures and did not require a null signal. | Accepted P3 preparation finding; the original target required repair. | The shared strict completion predicate is reviewed separately in Review 22. |

## Verification

Fresh reviewer work completed four untimed 12-agent/four-tick mini arms and focused dispatch, correspondence, lease and same-tick statistic controls. F15 reproduced five falsy thrown values. F16 reproduced disagreement between wrapper and verifier predicates. These were instrument ambiguities, not an observed accepted bad population run. The exact scope and retained reviewer failures remain in the body.

Preparation of this documentation checkpoint checks the exact authored/source pins, reversible imports, scoped document headings and links, blob/secret/diff limits, and separate HEAD/WIP preservation. It runs no browser, benchmark, code build, five-gate sequence or source repair. Review 11 remains open. Primary WIP also retains rounds 2, 4 and 12 that are absent from HEAD. This checkpoint neither invents those missing committed rounds nor claims a whole work-docs continuity pass.

## Round outcome

Root accepts the review and both findings. The original timing preparation required F15/F16 repair before timing. Review 22 records the focused re-review; this original round is not rewritten as clean. Current delivery status remains in [the plan](../plan.md).
