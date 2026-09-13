# Review 26: implementation

## Target

Independent ABBA result interpretation. The single original/new/new/original CPU measurement of controller `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26` and destination evaluator `41fd26dbd7a175b5637d8e1870fb098a29202a1898333d6df1121e1ac7a395a3`, on the frozen repeated-stream workload. Its measurement context was main `7f8aeac51357654a4d39d3e6ecc5f8ac0bda79b6`. This result interpretation is distinct from the original and focused ABBA preparation reviews already preserved in rounds 20 and 22.

The exact target is `artifacts/agents/gait-pose-abba-r1/benchmark-handoff.json`, SHA-256 `4d53117141a53811a37d6887dac449a5666e149ebdc455f49df6ebd9df5d1b31`. Reviewed text sources are retained byte-for-byte under `artifacts/network/facade-b0-checkpoint/candidate-01/recovery/source/`; the consolidated `recovery/reviewed-source.patch` has SHA-256 `5be6da8e380b778de4d06369866a213d07650349c6239420b2e83d54efcc518a` across 46 source files for this checkpoint. The additive patch uses LF transport; exact copies and normalized reconstruction records preserve the original bytes and line endings. Raw output, source assets and earlier counterevidence remain ignored at their pinned handoffs. No experimental code is promoted by this document.

## Reviewers and coverage

Independent gait cost result reviewer authored the report below independently of the implementation. Root separately read its substantive findings and accepted only the dispositions stated here. The report is `artifacts/agents/gait-pose-abba-result-review/report.md`, SHA-256 `f5da23d88d4caa3d3bac38c0605dde7cfa4f738186bce8451d477aa1c0f545ad`; its handoff is `fe140f022206ee793263c56f35b2bb1c140fc27e4581eead64562850297f84e7`, sealed at `2026-09-13T13:55:38.2827650Z`. The wrapper is authored by the network worker for root's review; it does not alter the reviewer's body or claim additional independent work.

Rounds 24–26 follow these three handoffs' recorded seal times on 2026-09-13, not completion of their underlying work. Historical Review 23 and the earlier ABBA preparation reviews remain unchanged; these are new source, focused repair and result-interpretation rounds. The full authored text is embedded with ATX heading depth increased by three; inverse transformation is checked byte-for-byte. Local finding labels and priorities are preserved verbatim; permanent IDs occur only in the wrapper dispositions.

## Reports

### Independent gait cost result reviewer

<!-- authored-report-start sha256=f5da23d88d4caa3d3bac38c0605dde7cfa4f738186bce8451d477aa1c0f545ad -->
#### Independent ABBA result interpretation

2026-09-13. Reviewer `/root/gait_cost_review`; root remains the city coordinator and acceptance owner. This review writes only ignored evidence under `artifacts/agents/gait-pose-abba-result-review/`. The measurement names base main `7f8aeac51357654a4d39d3e6ecc5f8ac0bda79b6`. Root subsequently reported docs checkpoint `edd448e`; this review binds the actual unchanged measurement inputs and makes no Git or source change.

**No material protocol or interpretation finding remains within the finite claim. Accept the observed negative performance result and reject performance-improvement acceptance for this exact evaluator on this workload.** The destination evaluator is about 2.555 times as costly by the declared descriptive kernel-median comparison. Its prior correctness acceptance is separate and remains intact. This result does not identify why it is slower, show that reusable destinations are inherently slow, or measure an implemented production city renderer.

##### Exact evidence and independent checks

| Input | SHA-256 |
| --- | --- |
| Author benchmark report | `c4443c24165088f1db0706b8697865ae92eedab460d6e5fb6a1985569fab230c` |
| Author benchmark handoff | `4d53117141a53811a37d6887dac449a5666e149ebdc455f49df6ebd9df5d1b31` |
| Protocol | `d7a18994fd950699e799380ec933ff5356b9e8b965f2e071cf40e6d722d49006` |
| Workload | `5c74eb55e8d1373d93c4b9c4ecbdc2dba96c0e1c3c19c9d0c5b844d739a96405` |
| Original controller | `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26` |
| Destination evaluator | `41fd26dbd7a175b5637d8e1870fb098a29202a1898333d6df1121e1ac7a395a3` |
| Operational lease | `8821062151eb06fd97ad1efc2782e1258ea5990599993215414f36de7b30cdf7` |
| Original-1 result | `5167a3aaef6d4bba4ac565d5c6b07a78d1ced3c14a842b999d96975548670a64` |
| New-1 result | `b9073f0cab260fcd0d1c88f3cf22ddbb925ec5f6061d0aed2ce51f665e1748c4` |
| New-2 result | `4e8ae8716d8e96461096252fd221794bd16166ce8f5c53b3d161a90e1a3e8762` |
| Original-2 result | `ea547e2b871dd5b986e83dae278ecc2fb623055a79c01cfe0e06a95635953f25` |

I read the local rules, lessons and existing benchmark experiment, timing helper, launcher, lease guard, result verifier, preparation repair review and analysis before writing this observer. I also inspected the original source sampler, controller pose routine and new evaluator. `independent.mjs` imports only Node built-ins. It does not import or run the author verifier, controller, evaluator, source sampler or timing helper. All 369 input/owned records in the benchmark handoff, plus that handoff itself, match before and after independent arithmetic: 370 records, 43,333,658 bytes. Supplemental instruction and ignore-file pins are recorded separately at sealing.

The observer independently rebuilds all 133 input rows, including initialization, using explicit little-endian Float64 writes. It verifies the 60 by 50 grid, unique two-metre translations, 12 streams and 250 copies per stream. The reconstructed full input digest is `1e59d89a1959e3f6832b96295b431a2cbb09748f111d6a31f702ad6ebc1884c5`. Every arm has 132 sequential rows, exactly 12 warmup labels and 120 measured rows. All 528 rows and 528 emitted checkpoint records reconcile. Initialization, attempts, returns, per-tick coverage counts, departures, source samples, state/pose validation denominators and checkpoint cumulative counts agree. Checkpoint render count correctly lags one callback because the checkpoint is written before that advance's render.

All 40 recorded summary sets are recomputed from raw rows. Median averages sorted elements 60 and 61; p95 uses sorted element 114 of 120, with one-based positions. Each kernel wall/CPU sample is the sum of that tick's update and pose samples. It is not the sum of their marginal medians. Callback-minus-kernel exactly reproduces outside-batch bookkeeping values. The observer also recomputes heap extrema/decreases, warmup totals, measured zero-CPU counts, chronological non-overlap, lease headroom and each arm's frozen input file list.

Eleven controls mutate only in-memory copies of result JSON: a warmup mislabel, missing tick, omitted pose, missing returned update, altered same-tick sum, sum-of-medians substitution, wrong p95 order statistic, changed source count, changed input digest, changed full-state digest and collapsed geometry sample population. All reject. A clean cloned record passes afterward. These controls validate the new arithmetic observer; they do not replace the previously reviewed executable benchmark mutation controls or prove historical code execution from JSON alone.

##### What the measurement establishes

| Arm | Measured update-plus-pose median / p95 / max, ms | Measured pose median, ms |
| --- | ---: | ---: |
| Original-1 | 103.145 / 119.519 / 135.526 | 97.742 |
| New-1 | 263.538 / 282.330 / 307.167 | 258.585 |
| New-2 | 263.364 / 285.553 / 311.907 | 258.392 |
| Original-2 | 103.054 / 116.099 / 129.273 | 97.317 |

The mean of the two original kernel medians is 103.099875 ms; the equivalent new value is 263.450800 ms. Their ratio is 2.555296988, a 155.529699% increase and 160.350925 ms absolute difference. The corresponding pose ratio is 2.650368300. These are ratios of means of arm medians, not pooled medians or confidence intervals. All 240 measured new kernel values exceed all 240 original values: minimum new 254.089300 ms versus maximum original 135.526300 ms. Pose values also separate completely: minimum new 250.579000 ms versus maximum original 117.605900 ms. Comparing the mean of the two implementations' values at each matching tick gives a ratio above one at all 120 ticks, ranging from 2.210787 to 2.844724.

Original repeat-arm kernel median drift is -0.087983%; new drift is -0.066176%. Within each arm, consecutive 30-tick block medians remain about 101–106 ms original and 262–265 ms new. Thus the negative direction is not driven by one selected tail sample or one reported median. These descriptive checks do not establish stationary execution or rule out an unobserved host effect concentrated in the middle of the sequence.

Mean arm-total differences across the 120 measured ticks locate the observed increase in the timed pose batches: new-minus-original pose total is +19,383.365750 ms, update total is -55.355800 ms, and kernel total is +19,328.009950 ms. The full callback difference is +19,043.591100 ms, with outside-batch validation/bookkeeping difference -284.418850 ms. This is an arithmetic partition of observed wall time, not a causal allocation of work or GC. Update code is unchanged; its small median decrease is not evidence of a controller optimization.

The intended contrast is valid: fresh children use the same workload and controller, both update all 3,000 states before evaluating all 3,000 current poses, and both retain the current population's outputs. The new arm prepares one rig, one scratch workspace and 3,000 independent destinations outside batch timing. The original arm creates outputs through its ordinary pose routine inside timing. Comparing their actual allocation/retention strategies is part of this implementation comparison, not a protocol error. Both modules load in both children, and target invocation/source counters verify which pose route runs.

Each arm has 3,000 initializations, 36,000 warmup and 360,000 measured updates, the same pose counts, 1,500 warmup and 15,250 measured departure replacements, 396,000 selected-target invocations, zero other-target invocations and 792,000 source samples. Every valid pose samples both clips and preserves all 53 joints/60 nodes. The batch includes common counters, failure checks, visitation writes and 24 deadline checks per 3,000 calls. The sum called the kernel consists of two separately timed batches with update validation between them; it is not one continuous production frame interval. Departure replacement counts are not an isolated selector-cost measurement.

All five overall digests and every tick's input, complete-state and pose digest agree across the four arms. The output hash covers 1,075 Float64 values per valid pose, including 1,056 matrix elements from 60 output matrices and six solve transforms. Per arm, 399,000 state records are checked, 396,000 full states serialized and 418,176,000 matrix elements checked. The 960 point pairs are 16 complete-weight vertices for the first 12 agents at ticks 1, 12, 13, 72 and 132. Their maximum packed discrepancy remains 1.2790430427803274e-7 m against the unchanged 1e-5 m limit. This review reconstructs input bytes and the aggregate full-state hash from the retained row hashes. The raw per-agent states/matrices are not retained here, so their full arithmetic is not reconstructed in this review. The earlier independent evaluator correspondence/ownership review supplies that distinct correctness evidence.

The four retained handles close in strict ABBA order between 13:01:40.831 and 13:06:39.481 UTC. All children exit zero with null signal, confirmed closure, matching frozen inputs, no recorded timeout, output overflow, error or cleanup error. Every child starts with more than 130 seconds remaining in the 13:00:40–13:10:40 UTC root lease and finishes within its 120-second hard/110-second cooperative limits. Those records support the claimed sequence and closure. The lease records root's quiet-window coordination; neither it nor this post-run review independently measures machine-wide CPU idleness, clock frequencies or interference.

##### Bounds and source hypotheses

One ABBA sequence on one Windows/i9-13900KF/Node 24.12.0 host is four process observations, not 480 independent trials. ABBA brackets ordinary time drift but does not cancel every nonlinear load, thermal, scheduling or JIT effect. Twelve warmup ticks are the agreed finite choice; no optimizer/GC telemetry proves stabilization. The extensive outside-batch validation costs roughly 383–388 ms per measured tick on average. Its matched schedule can affect later caches, allocation pressure and JIT behavior differently because the two representations retain different objects. The author report states this correctly. The raw result phrase “equally by schedule” must be read as schedule equality only, never equal runtime effects.

Windows process CPU readings are secondary. They record zero update CPU ms in 68/71/79/70 measured batches despite positive wall time. Process CPU can include other process threads and exceed wall duration; quantization does not make update work free. Outside-timer heap/RSS snapshots are whole-instrument observations, not allocation rates or resident palette measurements. New-arm heap maxima and final RSS are higher here. This neither proves a leak nor establishes GC as the slowdown cause. Cumulative source-sample/matrix counts must not be converted into simultaneously resident allocation.

The source gives useful hypotheses, with none accepted as diagnosis. `reference-worlds.mjs` reads palettes from a Float32Array and creates source matrices for each call. The candidate preserves the Float32 store-before-matrix arithmetic, but its prepared palettes are a frozen ordinary Number array, and cloned reference/bind matrix element arrays are frozen. It also replaces dynamic topology walks and temporary matrices with precomputed membership and mutable scratch/destination banks. These storage, object-shape, call-site and lifetime differences can affect access cost and optimization. The timed target includes source interpolation, matrix composition and leg solving, so allocation reduction alone cannot identify its dominant cost. A profile is needed before choosing an ablation; no storage rewrite is justified by this review alone.

The population consists of 12 synchronized state/input streams repeated 250 times at translated origins. Unique positions establish distinct state ownership and placement, not 3,000 independently phased behaviors or city diversity. Synchronized-phase memoization could exploit this repetition without establishing heterogeneous population scaling. This is one near-LOD rig with retained CPU poses and sparse weighted point observations. It accepts no new normal, color/depth/distance/AO deformation, inter-frame interpolation, naturalness, other-LOD, avoidance/signals, vehicle, GPU, whole-scene or 60-fps claim. Existing instanced VAT remains a separate integration boundary, not proven contact-controller equivalence.

##### Smallest proposed next discrimination — not executed

Prepare a separate diagnostic using the same pinned experiment, controller, evaluator, source and population. Preserve the actual update/pose loop, timers, validation schedule and retention contract. Adapt only the finite total bound and corresponding denominator checks to 24 ticks: initialization row 0, the existing 12 warmup ticks and ticks 13–24 afterward. Have that small instrumentation delta reviewed before execution. This yields 72,000 updates and 72,000 selected poses per child, 144,000 source samples, and 576 weighted pairs at the existing sample ticks 1, 12 and 13. It is the earliest short interval after the existing warmup and includes the observed departure work at tick 24; it is not claimed representative of the whole 120-tick measurement.

Under a new root quiet CPU lease, collect one original and one new fresh-child CPU sampling profile sequentially, with a 1,000-microsecond requested sample interval. Profile the whole child and preserve its complete call tree. The call-tree result covers the 24-tick prefix including warmup; do not relabel it as a warmup-free profile. Startup/preparation and validation can be separated by call ancestry. Keep the 120-second hard cap, 110-second cooperative cap, 1 MiB combined stdout/stderr limit and at most 16 MiB profile output per child. Stop on a missing/overflowed profile, mismatch, exception or timeout; retain it as failure and do not retry automatically. Root's graphics baseline has priority; this proposal grants no current lease or execution authorization.

`prefix-proposal.json` provides every one of the 24 expected input, full-state and pose row digests and departure counts, verified equal in all four original results. Both future children must match each row exactly. The expected aggregate full-state prefix hash, using the existing hash-of-row-hashes construction, is `5363653f470fe9356b70c579f85b3f9ce06d540d4bb6f2d01bfa51b3b2232c62`. At tick 24 the complete-state digest is `48dbf68f5daf09fad349521b85ee4b727d64ee8b536ff42c7c6bc70733516387` and pose digest is `3d516bb4d4b16dc2a8a388f8f70c4f72d4dcb7093cbadd3097ba3e90c6879ebf`. No aggregate raw-pose prefix digest is invented from individual hashes.

Attribute samples by full ancestry and pinned source location. Descendants of `controller.scenePose` versus `evaluator.evaluatePoseInto` identify the selected pose target within `observeBatch`/`captureBatch`; descendants of `controller.update` identify update work. Within pose ancestry, inspect `source.worldsAt` versus `sampleSourceInto`, the original `solveLeg` imported from `contact-f7-selection/controller-selected.mjs` versus `solveInto`, and their matrix/vector operations. Outside those targets, retain `finiteState`, complete-state `serialize`, `writePoseValues`, hashing, point sampling and rig preparation as separate call-tree regions. Do not attribute a shared `Matrix4` frame by function name alone when its caller may be validation or preparation. Keep common-loop overhead, GC, native, idle and missing/optimized-away frames explicitly unattributed when their ancestry does not identify a region. Use sample counts and inclusive/self weight without double-counting children; do not turn these into exact per-operation nanoseconds.

This approach needs no per-pose profiler start/stop, per-agent stopwatch or assumption that CPU-profile timestamps share the origin of `performance.now`. Preserve the existing timed-batch labels for orientation, but do not assign GC samples to those intervals without a separately established clock mapping. Sampling perturbs execution, and a shortened prefix changes its process history. The profiles would choose the next hypothesis to test, not replace the unprofiled ABBA result or claim a speedup. If source interpolation/matrix access dominates the new pose call tree, a later one-factor storage experiment becomes a testable candidate; if unattributed/runtime work dominates, retain that uncertainty. Do not change storage before this discrimination.

##### Retained failures, cleanup and handoff

The first reviewer recomputation (`run-01`) failed on a reviewer variable-name mistake, `warmupDepartures` versus the accumulated `warmDepartures`. It reached checkpoint inspection after the first input/value checks and produced no passing result. Its exact instrument is retained as `failed-instrument-01.mjs` (SHA `60b61d500f8d8e5dc2313ff30f3fd7b6a20f4d7af8cdee357317512a9d736e62`), with nonzero log, run record and initial input manifest. The correction names that property explicitly and uses fresh attempt-prefixed outputs. `run-02` passes the complete observer and all 11 controls. `run-03` only constructs the future-prefix digest proposal from retained rows. Two earlier filename lookup errors are documented in `read-notes.md`; neither ran a test. All prior author/preparation failures remain unchanged in the input closure.

All three reviewer CPU children run with retained handles, a 120-second hard cap, cooperative 110-second guards and finally-confirmed closure. They contain no nested process launch. Native creation-identity checks found all 11 unique recorded review/benchmark PIDs absent across 14 role records; no signal was sent. `process-closure-02.json` records the final check time. Earlier closure evidence is also retained. The first seal attempt caught a missing expected cleanup filename: PowerShell's case-insensitive `$Label`/`$label` collision had saved the valid native check as `process-closure-original-2.json`. The loop iterator was renamed and only native identity inspection was repeated. The misnamed evidence, old scripts and `seal-01-failure.txt` are preserved. There is no browser, GPU, server, watcher, build, benchmark or profile process from this review, and no unrelated process was stopped.

Every new file here is retained review/handoff evidence. No candidate/controller/source/data/main/Git edit or disposable cache was created. `handoff.json` seals exact inputs, outputs, arithmetic and failure evidence, the next-prefix proposal and process closure. Only this bounded review is complete. Root owns acceptance, any permanent docs checkpoint and any separately authorized next diagnostic.

<!-- authored-report-end -->

## Findings and disposition

No material protocol or interpretation finding remains within this finite measurement. Root accepts the negative performance result: original same-tick kernel medians are 103.145250 and 103.054500 ms, against 263.538000 and 263.363600 ms for the new evaluator. The ratio of means of arm medians is 2.555296987508426. The intended cost reduction is rejected; prior finite correctness remains accepted. No source-level cause is established and no new finding ID is assigned.

## Verification

The independent built-in-only arithmetic observer reconstructs 133 input rows, reconciles all 528 tick/checkpoint records and recomputes all forty summary sets. Eleven in-memory negative controls reject and a clean clone passes. Raw per-agent state/matrix arithmetic is not reconstructed from the retained aggregate hashes. One ABBA sequence, twelve synchronized streams, validation overhead, JIT/GC and host limits stay explicit. The proposed 24-tick sampled CPU profile is unexecuted and supplies no speedup evidence.

Preparation of this documentation checkpoint checks the exact authored/source pins, reversible imports, scoped document headings and links, blob/secret/diff limits, and separate HEAD/WIP preservation. It runs no browser, benchmark, code build, five-gate sequence or source repair. Review 11 remains open. Primary WIP also retains rounds 2, 4 and 12 that are absent from HEAD. This checkpoint neither invents those missing committed rounds nor claims a whole work-docs continuity pass.

## Round outcome

Root accepts this independent interpretation of the finite negative measurement. It accepts neither a performance improvement nor production gait, heterogeneous population, native appearance or 60-fps city behavior. The operational lease and exact four-arm closure remain part of the measurement boundary. Current delivery status remains in [the plan](../plan.md).
