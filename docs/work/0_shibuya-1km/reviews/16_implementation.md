# Review 16: implementation

## Target

This round preserves four actual independent reviews of ignored gait candidates at main `636bff7dca10f00dc3ada892ebb7005cfa815c92`. It records the progression from bounded phase-independent initialization, with a retained ongoing failure, to the next-departure selector and its sampled 60 Hz contract, then the measured CPU cost. It does not ship a gait controller or complete the pedestrian deliverable.

The initializer is `4f9e2540eec68afa1cb53b91bc71c56132b4d754002dd5f448f2b1dec7fea576`; the later selector and both cadence/cost experiments use controller `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26`. Each report below names its exact target, source/corpus digests, reproduction and retained negative evidence. The earlier initializer's assignment crossed documentation-only checkpoints; its report distinguishes those revisions from the artifact target.

Exact copies of the named changed text targets are retained under `artifacts/network/gait-visibility-checkpoint/candidate-03/recovery/source/`. Their recovery patch is `recovery/reviewed-source.patch`, SHA-256 `a7a9e2096482f5e66520f436cd2bef6c0a01573dc19174e09ba9c02c13cbfd9c`, covering 14 complete text files across this checkpoint. Copies retain exact bytes; patch transport normalizes line endings to LF only. The patch restores ignored evidence paths, not production code. Original instruments, source dependencies, corpus and binary inputs remain retained through the sealed handoffs; this does not replace their complete recovery closure. Raw runs, JSON and screenshots are not promoted in this checkpoint.

## Reviewers and coverage

Realism independently reviewed phase-independent initialization, having previously assessed its mathematical design but not implemented the candidate. `/root/gait_departure_review` independently reviewed the next-departure selector and the separate cadence work by their respective authors. `/root/gait_cost_review` independently reviewed the cost experiment. Root read the full reports and accepted their stated finite scopes. The network worker assembles this permanent record and is not credited with the independent gait findings.

The following reports are embedded in full. Only Markdown heading depth increases by three levels; a checked inverse transformation recovers every original byte. Exact original report copies and their handoffs remain under this checkpoint's ignored `originals/` directory. The controller author reports remain pinned recoverable evidence; they are not substituted for the independent reports.

| Report | Original report SHA-256 | Independent handoff SHA-256 |
| --- | --- | --- |
| Phase-independent initializer | `6ab3563fcaec8213c4a1242e3d5cbc4d84bc0af646697e42a819494d05fd4ef6` | `329cc606098de90e235c520e2d7bc52b67fec4a5cb51668b5a56b7ceab8e73c5` |
| Next-departure selector | `59e2d1a792741877791515bf2760f9bfa4a18d35b6224b6dbdf430268714273b` | `2b921ce3726eaadb5d873998dfdb1dedd4114a500a247dc54a8679809455716c` |
| Sampled 60 Hz cadence | `7fc5ddbac887006d45be1013c866316c2ceba8770a14356ad0e6aab1682f1c13` | `14c34194977a89e0595546c67606e21b262732612ede41987e63b166886d54b9` |
| 3,000-agent CPU cost | `baeb3c4c272d1eebcc3d087a11d0384f9124ea2942663c0390f92e837131a905` | `ca0fc2f0937f27714c29afe85942f7e62fea2430107aba5ec21e53443ea5850b` |

## Reports

### Realism: phase-independent initialization

#### Independent review of phase-independent initialization

##### Target and scope

Reviewer: realism, independent of the implementation author. I previously assessed the mathematical design contract; I did not implement this candidate. The exact target is `artifacts/agents/gait-phase-independent/handoff-final.json`, SHA-256 `a9df7c5cf616f96d9ebf64a450e5c27c0c493a8638733bb7e015f06025dc93db`, candidate `4f9e2540eec68afa1cb53b91bc71c56132b4d754002dd5f448f2b1dec7fea576`, source freeze `5e848f87e1bd94e2601939f6fa99111196b5c2de98a11687c84d22cd18302aa1`, and authored report `bded0fe7b3151967e797cb30bdec9595dc57f64609a311933042bd0e70f79a2a`. Assignment base was main `7ec174`; the author reports the later documentation-only `e93dfa9` checkpoint. Main advanced to `636bff7` before this review; acceptance here binds the artifact bytes, not an unchanged shared HEAD.

The authorized scope is one initializer, for a single fixed source rig under constant nonnegative speed, zero yaw rate, and a fixed level plane. It must choose one duration independent of requested phase, sample both legs with that duration, preserve the existing 35 mm lowering cap plus 3 mm prediction margin and 2 mm reach reserve, and retain all ongoing-controller counterevidence. No live source, candidate, browser, GPU, build, bake, Git or canonical document was changed. All review writes are in this ignored directory.

##### Decision

No new material finding within this initialization-only scope. The selection now depends on speed and both rig legs, with phase used only for placement along the selected periodic trajectory. The old phase-boundary jump is reproduced as a negative control. I recommend accepting the bounded initialization evidence; the full gait candidate remains rejected by the inherited stop/restart failure, and naturalness and production integration remain unproved.

##### Source and mathematical review

I read the complete candidate, old-to-new patch, final report, phase control, inherited-state control, retained failure diagnosis, source reference loader and geometry adapter. The unchanged 7,043-byte prefix contains the trajectory sampler and ongoing duration predictor. The unchanged 4,768-byte suffix contains `update` and `scenePose`. The numeric policy is byte/functionally unchanged. Thus the new initializer does not replace or relax the failing ongoing logic.

For the defined periodic path, stance relative displacement lies within `[-.6,.4] * speed * T`. Swing displacement is `(2Q(u)-u-.6) * speed * T`; its derivative is `60u²(1-u)²-1`. Endpoints and the two internal roots give approximately `[-.6968045032607824,.4968045032607823]`, which contains stance. With fixed local lateral offset, squared horizontal distance is convex in fore-aft displacement, so its maximum over that interval occurs at an endpoint. Required lowering increases with that squared distance. Checking both endpoint values for both legs therefore bounds this ground-height reach calculation under the declared assumptions. Using ground height for the lifted swing foot is conservative for this upper-reach constraint; it does not establish joint comfort, folding limits, source surface contact or whole-mesh clearance.

The selected durations are 0.327 seconds at 0.1 m/s, 0.29700000000000004 at 1.1 m/s and 0.2295 at 2 m/s. The ordered four-factor search and explicit infeasible state remain visible. An infeasible initializer does not advance in `update`. The existing minimum nominal duration does not prohibit the already-authorized smaller factors; no numeric bound was silently changed.

##### Fresh independent verification

Every one of 408 original records, including the runtime executable, matched its length and SHA-256. There are 407 exact copied records under `copy/`. The original record bytes total 138,828,178 including the 89,935,872-byte Node runtime. The author candidate, original sources, source reference and saved results remained unchanged before and after both useful runs and the retained failed probe.

I reran the unchanged author's phase checker from the exact copy into a new output. It passes 18,441 phase/placement states, 54 epsilon boundary triples, 21 stationary cases and four explicit infeasible cases. Its nine previous boundary triples reproduce, and the three 2 m/s triples still reject the old duration discontinuity. This is an independently executed authored probe, distinct from my five new checks below.

My controls independently compare the unchanged source regions and policy, sample full-period actual-rig reach using de Casteljau evaluation, reproduce the old boundary failure, exercise an asymmetric second-leg-only failure, and replay the inherited failure through exact recorded inputs. They pass 1,539 initializer states over phases -1 through 3, with nonzero body position/elevation/yaw, and 480,024 whole-period ground samples across all four candidate durations at the three measured speeds. The analytic bound exceeds the dense observed maxima by at most `8.335965251404787e-11` metres; the written analytic argument, rather than the sample count alone, supports the interval between samples.

At the three phase boundaries, the old candidate jumps about 48.60 mm while the new candidate differs by at most `9.18000003791164e-9` metres at epsilon `1e-8`. The second-leg control makes only that leg infeasible while the first leg remains feasible; the new selector refuses all four durations and a subsequent update leaves the failed state exactly unchanged. This checks that a first-leg-only shortcut would contradict the required result.

My first custom probe had one extra closing parenthesis and failed parsing before any checks ran. Its exact source, log and run record are preserved. Removing that parenthesis and syntax-checking the probe was the only correction; a new bounded run then passed. No product or author test threshold was changed.

The successful copied phase child completed in approximately 0.84 seconds and the corrected independent child in approximately 0.54 seconds. These are review instrument runtimes, not population performance measurements. All three attempts had a 120-second retained-child deadline, bounded output and finally cleanup. The fresh read-only process check at `2026-09-13T08:33:59.9049791Z` found all six recorded wrapper/child IDs absent. No browser or server was launched.

##### Preserved failure and limits

I recomputed all 43 case-row SHA-256 values from their Float64 rows and confirmed the 18,523-row denominator. The author's one full-corpus run completes 30 cases, observes 206 rows of `old-stop-0.017`, and never starts 12 cases. Its reported 2,396-row observed prefix is distinct from the separately run turn/live-stop families. I did not repeat the expensive mesh corpus or resume unrun cases.

The independent replay compares every physical state in that 206-row failure prefix against the previous phase-dependent candidate, excluding only the changed `spawnSelection` diagnostics, and matches the final retained snapshot exactly. The failure follows stops at 0.2375 and 0.5166666666666666 seconds and restarts at 0.3 and 0.55. At 0.8541666666666666 seconds the best ongoing forecast requires 37.848929007162524 mm before the existing 3 mm margin, or 40.84892900716253 mm including it. The current posture also requires 35.032379921382195 mm including margin against the unchanged 35 mm cap. Geometrically valid leg solving does not erase that separately unmet policy condition. The prior report's corrected transition history is supported; a general deceleration cause is not established.

The unchanged source-reference/full-weight observations and saved geometry pins remain evidence within their previous bounds; I did not claim a new full-mesh verification. The retained 30 skipped-whole-flight discrepancies also remain nonzero, and production 60 Hz behavior is not established by the 240 Hz pilot. The author additionally records a discrete speed-selection threshold with 10.95/46.93 mm position changes; this review accepts fixed-speed phase independence, not speed continuity. Observed 219.19 m/s² foot acceleration, 7.57 m/s whole-shoe speed, crouch, source appearance, normals, raster, population cost and naturalness are not accepted by these numerical checks.

##### Handoff

`inputs.json` binds original and copied targets. `reviewer-results.json`, the copied `results/reviewer-phase.json`, logs and retained-child records contain the fresh checks. `cleanup-fresh.json` is the targeted resource observation. `handoff.json` binds the authored review and its evidence without modifying the author's seals. No production adoption or further controller change is implied.


### Gait departure reviewer: next-departure selector

#### Independent review of the next-departure selector

The sealed selector passes the contracted finite CPU scope. I found no material selector, source-correspondence, or corpus regression. Fresh execution completes all 43 original cases and 18,523 rows, with byte-identical traces and identical per-case results and postchecks to the author's run. This accepts a bounded candidate experiment, not production adoption, naturalness, continuous arbitrary-command safety, or the Shibuya deliverable.

Reviewer: `/root/gait_departure_review`, independent of author `/root/gait_transition_independent`. Base and final observed main: `636bff7dca10f00dc3ada892ebb7005cfa815c92`. Review writes are confined to ignored `artifacts/agents/gait-next-departure-review/`; no target, source, data, main, other worktree, dependency, browser or server was changed. No commit or merge occurred.

##### Exact reviewed inputs

The target handoff is `artifacts/agents/gait-next-departure/handoff.json`, SHA-256 `cd31e88979b6403713dd4d119de517c2aba40d32208dda85b41a15b0dbb31799`. Its report is `346ae9395e81720993612b427a1848eda6328dc5d7ce63142f6feebc2b8ff03f`; candidate `controller-v2.mjs` is `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26`. Accepted predecessor `controller-v1.mjs` is `4f9e2540eec68afa1cb53b91bc71c56132b4d754002dd5f448f2b1dec7fea576`.

I read the full patch, selector, initialization, update and scenePose contracts, source palette adapter, source rig loader, analytic leg solver, full-weight reference adapter and complete corpus observer. The patch changes the ongoing selector alone. The initializer slice and everything from `export function update` through `scenePose` are byte-identical to the predecessor. The initializer slice hashes to `a9b9bb0595687994cea7c32e21cbc9563b8bbe4b76ed01796041eb5f90b7d60f`.

`inputs.json` records 408 checked inventory entries, including the original 405 source/owned entries and three explicit target identities; repeated identities and mixed path spellings are not extra independent sources. Every recorded input length and digest matched before and after all runs and during `verify-final.mjs`. The full corpus, source and measurement scripts were copied byte-for-byte into this review directory and executed there. The target results were never overwritten.

Key data digests are: original `body-corpus.json` `83e7b50bc7da74ad071686f21a2e27ebd0c1fe8f0c8c87da09d66a4004014361`; `groups.json` `cdcafd7250b8eb60a40c4f1df4393808cf444f0aba4a121eed62e38698918d4d`; commuter-male near GLB `84fa51beb9650cdc4e1489593b8a153e6d4171703d0ad6c38666d98dd32c0c53`; source VAT `8e5889b0569146611d445712b0b763db07e1bbee16e1bfbf4e5953a6c8dbf4d8`; full-weight packed payload `adafaadc882287694fed51f7cd85796f26a604c596996b4189a9daf01210d9d6`; reference palettes `27218335a77a96a04c59b8f790460f4a8fa8bbf8da4cdb737bd322cdb2116411`; complete sparse weights `33bae22eecb637acaecbd56974d5a66b14da276c6d8195d9a485c5bb1452a425`. The full inventory also pins source scripts and installed three.js package/build bytes.

##### Fresh checks and denominators

Node was v24.12.0. Each retained CPU child had a 120-second deadline, bounded output and a finally cleanup path. The full corpus child closed successfully in 23.995 seconds. These are review execution times, not production performance measurements.

The copied source control passes 192 poses and 4,040,448 drawn-vertex comparisons; zero comparisons exceed the existing quantization allowance. The wrong-palette red control has 31,094 outside-allowance comparisons. The geometry remains the source-selected 21,044 drawn vertices, complete reference weights, 807 vertices per shoe and original sole/region memberships. The full-body observer samples initialization, contact events, final rows and failures, while shoes and soles are observed on every original row. It does not observe every full-body vertex on every row.

The unchanged full corpus passes 43/43 cases and 18,523/18,523 rows with no partial or unstarted case. Fresh byte hashes match all 43 author traces; complete per-case result objects and causal postchecks match exactly. It observes 29,896,122 shoe, 11,743,582 sole and 5,913,364 full-body packing samples. Maximum planted sole drift is 0.07307926514097238 mm; maximum extra lowering is 29.823422346945346 mm; maximum full-body packing error is 1.5613088738149914e-7 m. No threshold, fixture, body row, case denominator, contact membership, source palette or measurement rule changed.

Copied phase, focused, twin, after-liftoff, before-touchdown, transition and edge controls pass. Phase coverage is 18,441 cases, 54 boundary-epsilon cases, 12,294 transforms and 21 stationary cases. Focused coverage includes 276 spawn cases, 246 event cases, 30 fixed-anchor cases, 184 rigid cases and 84 nominal event crossings. The inherited 30 skipped whole-flight discrepancies remain disclosed. Corpus postchecks pass the 528-tick shared prefix, 14,526 shoe comparisons, 672 differing-future ticks, 672 resume ticks and three 960-row live contact branches. This finite causality evidence is also consistent with the selector reading only current input and retained state; it receives no command schedule.

To reproduce in a fresh sibling review directory, run the copied `setup.mjs`, then `node run.mjs source`, `transition`, `phase2`, `focused`, `twin`, `after-liftoff`, `before-touchdown`, and `corpus`; run `node run-edge.mjs edge`. The independent checks use `node run-independent2.mjs independent2` and `node run-continuation.mjs continuation`. Outputs intentionally use exclusive creation, so do not rerun over retained evidence. `verify-final.mjs` checks the exact input pins, full denominators, author/fresh case-object equality and every trace digest.

##### Independent transition and forecast checks

The exact changed `old-stop-0.017` input is time 0.6 s, body `[0, 0, 0.5545833333333334]` m, yaw 0 and speed 1.1 m/s. The old duration is 0.25245 s. The candidate selects 0.20790000000000003 s with a 0.29700000000000004 s opposite-foot successor and 1/60 s forecast allowance. The predicted first landing is `[-0.18167716859121497, 0.06913917070925005, 0.883366707075858]` m. At that changed decision, actual foot positions, velocities, accelerations and yaw remain equal to the old decision; only the future schedule changes.

Fresh execution of the existing independently derived continuous straight-line oracle gives 33.45636399040319 mm with margin, versus the selector's nine-sample 33.30099023030486 mm. All four successors to the old 0.25245 s flight exceed 35 mm even with zero wait; their best continuous result is 40.079237024204795 mm. This analytic result is limited to that exact straight decision, the frozen rig, constant speed and the declared finite pair.

The old failure reproduces after 206 observed rows at time 0.8541666666666666 s, body `[0, 0, 0.8341666666666698]`, yaw 0 and speed 1.1 m/s. The entire state equals the preserved snapshot. All 21,044 actual drawn float32 positions reproduce digest `2c69e927ce9444afb14bb7f2bc9520f07fbbc3521e3d331567370a1c131e56ea`. Current required lowering with margin is 35.032379921382195 mm; the best old sampled future requires 40.84892900716253 mm. These are distinct present-posture and future-selection violations. They were not reclassified as a safe pose.

`independent2.mjs` implements footprint positions with Bernstein control points and de Casteljau evaluation, separate scalar rotation/prediction and lowering arithmetic. Across all 153 actual corpus departure decisions it reproduces the nine-sample maxima. Its 1,001 samples per flight plus 1,001 hold samples find a worst with-margin requirement of 34.25218439652111 mm, below the unchanged 35 mm cap. The largest dense-minus-nine gap is 0.9154588431043997 mm. The worst absolute result is `restart-0.53125-2` at 0.21666666666666667 s, side 1, first duration 0.2295 s, successor 0.14850000000000002 s, yaw rate 0. These are dense finite samples, not a continuous proof for turning trajectories or arbitrary future inputs.

`continuation.mjs` clones each of those 153 actual decision states and feeds the public update API constant-current-speed and yaw-rate body samples at 240 Hz through the selected first-flight, allowance and successor horizon. All 153 continuations complete without controller failure. This tests the actual retargeting, touchdown and later selection path over that finite horizon; it is not a recursively invariant terminal-set proof.

At the 0.6 s decision, the real first landing deadline is 0.8079000000000001 s and the next liftoff occurs on the 0.8083333333333333 s update, 0.4333333333332856 ms later. It selects the opposite leg with the same 0.29700000000000004 s successor duration. The 1/60 s selector allowance is therefore not the observed update cadence. Independent call counting gives exactly 43 initializations and 18,480 updates for 18,523 rows; update spacing is 1/240 s within 1.54e-15 s. Production `src/render/loop.ts:56` still defaults to 1/60 s, and this candidate is unintegrated.

##### Failure behavior and minor finding

For direct selector inspection only, the review appends a named export to a separate copy with a byte-identical candidate prefix. The candidate used for corpus/public-update execution is unchanged. The exact inherited failure supplied to the selector rejects all 16 pairs, preserves both complete live foot records and events, and records an explicit failure. Its best sampled with-margin requirement remains 40.84892900716253 mm. Once failed, public update is a no-op. Partial-flight and airborne selector calls throw before mutation. Duplicate/backward time and nonfinite time, body, yaw and speed throw before state mutation. The existing update function still accepts finite negative speed although initialization rejects it; this is unchanged predecessor behavior and outside the nonnegative corpus, not a newly introduced selector regression.

**Minor, nonblocking diagnostic gap:** `controller-v2.mjs:71` saves `rejected: candidates` before adding the current first-duration's local `successors`. When a later successor of that current duration succeeds, earlier rejected successors of the same duration disappear from the successful decision record. I observed this on 17 of the 153 corpus decisions. For `restart-0-2` at 0.23333333333333334 s, first duration 0.189 s and accepted successor 0.189 s, two earlier rejected successors are omitted while eight pairs from earlier first durations are retained. This qualifies the author's statement that rejected pairs retain their witnesses. It does not alter physical selection, the selected-pair witness, or full 16-pair failure completeness. `results/continuation.json` preserves every observed omission. A narrow diagnostic correction should retain these records and receive focused review; no controller repair was made here.

##### Bounds, evidence corrections and cleanup

This review does not establish production 60 Hz equivalence, four-update-per-frame cost, 3,000-agent performance, anatomy, visual naturalness, complete-mesh derivative continuity, arbitrary command changes, all rigs/LODs, terrain support or continuous safety beyond the exact straight oracle. The finite forecast checks do not turn the successor condition into a recurrence proof. Existing speed-selection discontinuity, target freeze, retargeting, blend behavior and skipped-update limits remain inherited constraints. No browser, GPU, port lease or native motion review was requested or performed. The repository's five code-delivery gates were not run because this task changes only ignored review artifacts and does not commit code.

The first independent instrument required bit equality for endpoint positions computed with a different arithmetic order and failed on a 2.22e-16 m difference. That script and failed output remain as `independent.mjs` and `results/independent.json`. `independent2.mjs` changes only that comparison to a 1e-12 m independent-arithmetic tolerance and separate output names. The controller, fixtures and acceptance limits were untouched.

The first seal script had a missing function-closing brace and failed to parse before writing a handoff. The corrected seal checks every target input again and binds the report and retained evidence. The review goal status was marked complete in the same orchestration call before the seal result was inspected; final delivery waited for the corrected seal to succeed. Neither bookkeeping error changes the reviewed candidate or test evidence.

The first process inventory used denied CIM calls and mistakenly reported their empty outputs as absence. `process-closure-invalid-cim.json` is retained only as invalid counterevidence. The corrected `process-closure.json` uses `System.Diagnostics.Process.GetProcessById`, disposes each inspection handle in finally, and compares creation time for the one live recycled PID. Former wrapper PID 3620 closed at 09:32:36.982Z; its current unrelated node process was created at 09:33:59.8931828Z and was left untouched. All 12 retained CPU children have observed close events and their PIDs are absent. Every other recorded wrapper PID is absent. All recorded task instances are closed; bare numeric PID absence is deliberately false because of that reuse. CIM command-line inventory was unavailable, not silently treated as clean.

All source and review outputs are retained for this active handoff. No temporary or live task-owned browser, GUI, server, watcher or CPU child remains. The candidate and this review remain ignored artifacts outside main; root owns any later accepted integration and canonical status update.


### Gait departure reviewer: sampled 60 Hz cadence

#### Independent review of the sampled 60 Hz gait contract

The cadence experiment passes its stated finite scope. I found no material defect in the input selection, fixed-callback driver, observer delta, causal checks or emitted evidence. Fresh execution passes all 43 cases and 4,663 selected rows; all 43 traces and all per-case and causal result objects equal the author's output. This supports the sampled 60 Hz CPU contract, not production integration, 240 Hz trajectory equivalence, inter-update motion, naturalness or population cost.

Reviewer: `/root/gait_departure_review`, independent of author `/root/gait_cadence`. Base and final observed main: `636bff7dca10f00dc3ada892ebb7005cfa815c92`. All review writes are new ignored files under `artifacts/agents/gait-cadence-review/`. No controller, target, source, data, dependency, main or other worktree was changed. No code commit or merge occurred.

##### Exact target and instrument

The target handoff `artifacts/agents/gait-cadence/handoff.json` hashes to `8793a58a2d3523235436c9e5e553caeff0306bbc5d0bcf4339b01ae7029d6326`; report `af3903ba28bf883a8a8c91540ac6ccc43e75bbf60f630fcbd87bb838f26984be`. The controller remains `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26`, already reviewed at 240 Hz. The new probe is `2157d431a55a68913afa6fd44756fca88380e6c60dec319199b85da71ba11535`; mapping `0d6293527edbfb46788461e7e1dc0d00ea021e12197a9debf4e5a93eef6975d1`; actual `src/render/loop.ts` `1bb20f381eb50a6f2bfa3294d97fac8474353e2e3abda5aadf7170b70368dbaf`.

I read the approved design, builder, full probe delta, complete callback and causal paths, verifier and actual RenderLoop implementation. Fresh setup reproduces the exact probe, map and selected corpus. The observer slice is unchanged, digest `d6121fc7d4923b572d495cd17f1e4700c587afce04c011f15e0152b125221c81`; snapshot slice is unchanged, `7d348d507b2d6709ba1807c3b15bfb7072c9b54df3d47befe49006dce31dde09`. External observation `dt` explicitly changes to 1/60 for the speed statistic and branch clock. The sustained-stop window changes from 120 original rows to 30 selected rows. Numeric 35/3/2/5/15 mm policies and geometry checks remain unchanged.

`review-inputs.json` checks 494 target inventory entries: the 492 source/owned entries plus explicit handoff/report identities. `inputs.json` retains the 414 inherited source/review/loop entries. Repeated identities are not independent sources. Every target length/digest matches before replay and at final seal. The original corpus remains `83e7b50bc7da74ad071686f21a2e27ebd0c1fe8f0c8c87da09d66a4004014361`; shoe groups remain `cdcafd7250b8eb60a40c4f1df4393808cf444f0aba4a121eed62e38698918d4d`; full-weight packed payload remains `adafaadc882287694fed51f7cd85796f26a604c596996b4189a9daf01210d9d6`. Source rig, complete sparse weights, palettes, VAT and installed three.js bytes remain in the checked inventories.

##### Fresh execution and independent checks

On Node v24.12.0, copied `run.mjs setup`, `source` and `corpus` all pass. The corpus CPU child closes in 9.655 seconds under its 120-second cap. This includes full geometry observation and test work and is not a performance benchmark. Source validation again passes 192 poses and 4,040,448 drawn-vertex comparisons, zero outside the existing quantization allowance; the wrong-palette red produces 31,094 outside comparisons. The original physical 10 mm slip red also passes.

The main result is 43/43 cases, 4,663/4,663 selected rows, 43 initializations and 4,620 actual updates. No selected row is partial or unobserved. The 13,860 omitted original rows remain unobserved. All 43 original final rows are included because every final index is divisible by four. Preparation rejects an off-grid final index instead of adding a short step.

The copied verifier and separately authored `independent.mjs` recover all six original input floats from every emitted 23-float trace row. The independent checker reconstructs each selected/skipped partition directly from original indices, checks every row/time/index digest, and compares every fresh trace with its sealed author trace. Per-case and causal objects match exactly; whole-result hashes differ only because source timing/result metadata are fresh. Fresh result SHA-256 is `68be3a38d94a72e49244ccc5f4dc4337e75bb573af2a77766e73e0b89a614292`.

The main corpus observes 7,526,082 shoe, 2,956,342 sole and 5,892,320 full-body packing samples. Maximum planted drift is 0.07020303738104389 mm, maximum extra lowering 30.68538976554191 mm and maximum full-body packing error 1.5912116768819964e-7 m. Main full-body observations cover initialization, contact events, final selected rows and failures. Live branch full-body observations instead occur every 15 updates, plus failures; they must not inherit the main event-coverage claim.

The independent driver test extracts the exact `driver()` bytes, digest `d6e1ab04ab7552762863391ac253f3c5d0ac9d999c9f9fcd67378f0e7b27c1fb`, and replays all selected inputs through the actual RenderLoop with an update spy. It counts exactly 4,620 calls, each with the original current input object values, step exactly 1/60 and one no-op render per update. Callback accumulated time differs from the authoritative time by at most 1.2612133559741778e-13 seconds. The controller receives the original time bits, not that accumulated approximation. `probe-60.mjs:81` adds 0.001 ms only to the timestamp passed to `advance`; it does not add it to the controller input.

Two independent negative controls pass. Duplicating a real default fixed callback, while retaining valid step/time labels, is rejected by the exact adapter's `2 !== 1` callback-count assertion. Replacing the `slow-0.017` trace's selected row 6 / original row 24 time from authoritative `0.1` to loop-summed `0.09999999999999999`, preserving all other bytes and counts, is rejected by the original-row verifier. These controls change review-only runtime objects/buffers; the controller and emitted corpus evidence remain untouched.

Causal checks reproduce the 132-update prefix ending at 2.2 s, 14,526 shoe comparisons, 168 unannounced future updates and 168 serialized resume comparisons. The resume driver first consumes the same 132-row prefix into a separate scratch state; it then receives the saved state at that already-advanced clock position (`probe-60.mjs:126`). Its first resumed input is 2.216666666666667 s. This proves state serialization under an aligned replayed clock, not serialization or restoration of RenderLoop internals.

All three live branches complete 240 updates. Their stop triggers remain tick 132 / 2.2 s, tick 9 / 0.15 s and tick 7 / 0.11666666666666667 s. Each branch has 336,704 full-body samples. Their callback times, counts and resume boundary arrays are independently checked. The controller receives current inputs and saved state, not a future schedule.

##### Limits and disposition

The output differs from the selected 240 Hz baseline on 4,352 physical rows across 40 cases. Both finite runs passing does not establish trajectory equivalence. The unchanged minor rejected-successor diagnostic omission remains deferred under the earlier review; this cadence work neither fixes nor expands it.

No inter-update representation is implemented or measured. The driver registers no frame-pose interpolation, and rendering is empty. Independent observation of actual frame callbacks finds alpha only about 0.00006, immediately after each fixed update: range 0.00005999999991533611 to 0.00006000000006313455. No mesh pose or pixels are evaluated at intermediate frame fractions. Omitted 240 Hz rows, arbitrary cadence/stalls, continuous contact, anatomy, naturalness, 3,000-agent cost, 200 vehicles, both rendered styles and whole-scene performance remain outside this review.

No material finding requires a cadence repair. The next production-facing work must state and test how frame poses between fixed updates are formed before making a rendered-motion claim. The five repository code-delivery gates and native visual review were not run because this scope changes only ignored review artifacts and does not integrate code.

##### Reproduction and cleanup

Use a fresh ignored sibling directory; the source layout is intentionally sibling-relative. Copy the review `bootstrap.mjs`, run it, then execute the copied `node run.mjs setup`, `source`, `corpus`, and `node run-verification.mjs`. Copy `independent.mjs` and `run-independent.mjs` and run `node run-independent.mjs independent`. Exclusive output creation protects the retained evidence; do not run over existing results. No 240 Hz corpus rerun is required or claimed.

All five retained CPU children and wrappers are absent in the final native identity inspection. Their close events were observed, all exit codes are zero, and none timed out. `process-closure.json` uses native process handles, disposes them in finally and would preserve a recycled PID after comparing creation time. It does not use CIM or treat denial as absence. No browser, GUI, GPU, server, watcher or descendant-producing program was launched. All review artifacts remain retained for root handoff. The candidate and review remain outside main; root owns later integration and canonical status.


### Gait cost reviewer: finite CPU cost

#### Independent review of the 3,000-pedestrian CPU cost experiment

The experiment passes its accepted finite scope. I found no material defect in the workload, batch timing boundaries, call accounting, raw statistics, retained source evidence or sampled geometry correspondence. The measured source/IK pose batch is 96.988 ms median, 109.623 ms p95 and 133.123 ms maximum for all 3,000 agents. The same tick's update-plus-pose batches are 101.412 / 120.269 / 144.613 ms. These observations establish a cost problem in the reviewed CPU reference representation. Production performance remains unmeasured.

Reviewer: `/root/gait_cost_review`, independent of author `/root/gait_cost`. Base and final observed main are `636bff7dca10f00dc3ada892ebb7005cfa815c92`. Root remains the integration owner. All writes are new ignored files under `artifacts/agents/gait-cost-review/`; no candidate, production file, data, dependency, Git state or unrelated work was changed.

##### Exact inputs and instrument

The target handoff is SHA-256 `f6caab340b0940993339bf11eeb9b2024bbc26176bc5ae8c22ab90582fb38e1c`, report `19e17fb812630294add01788292ebda690a0c7e92a1cd284eca958f46773b3b4`, instrument `9e7c9080e7653a00a10ebb9a0db9f2d4e81b3f405e424e683e39b61f6b294f60` and workload `5c74eb55e8d1373d93c4b9c4ecbdc2dba96c0e1c3c19c9d0c5b844d739a96405`. The unchanged controller is `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26`. The earlier independent 60 Hz review remains pinned at report `7fc5ddbac887006d45be1013c866316c2ceba8770a14356ad0e6aab1682f1c13` and handoff `14c34194977a89e0595546c67606e21b262732612ede41987e63b166886d54b9`.

I read the applicable repository rules and lessons, accepted cost design, preparation, complete measurement program, launcher, finite verifier, failure controls, cleanup and seal programs, the actual RenderLoop, controller, analytic leg solve and source/full-weight adapters. `review-inputs.json` records 518 unique input files totaling 57,324,085 bytes. Every length and digest matched before and after the review checks. Both per-run freeze records contain 505 matching entries. Repeated records are not additional independent evidence.

The controller receives only each current frozen input. Initialization constructs independent mutable states; source lookup and rig data are shared. The pose path constructs and retains all 3,000 current outputs in an array through validation, replacing each on the next tick. The code does not substitute representative poses for the population. Every timed update and pose batch contains the complete 3,000-call loop, attempt and return increments, direct failure checks and a deadline check at indices 0, 128, ..., 2944. Full state scans, matrix scans, geometry samples, input construction/hashing, state hashing and memory snapshots sit outside those batch timers. Checkpoint writes follow the callback timer. The cold initialization and 12 warmup ticks are disclosed separately.

##### Independent reconstruction

My separate checker reconstructs the phase-major original case order: old-stop, live-stop, turn and slow at each of 0.017, 0.333 and 0.777. It checks 250 independent assignments per case, all 3,000 unique 2 m grid translations, the exact source rows and original indices 0 through 528 at stride four. All six input doubles are streamed directly from those source rows for initialization and 132 ticks. The resulting 399,000-row hash is `1e59d89a1959e3f6832b96295b431a2cbb09748f111d6a31f702ad6ebc1884c5`, matching both author runs.

The checker rebuilds every cumulative count at each of the 132 checkpoints per mode, including the checkpoint's render count being one behind the final per-tick value. Each phase has 3,000 initializations, 36,000 warmup updates and 360,000 measured updates. Phase B additionally has 36,000 warmup and 360,000 measured poses. Every attempted call returned. The 399,000 state checks, 792,000 source-world calls, 792,000 sampled palette arrays, 671,616,000 palette floats, 23,760,000 returned matrices and 380,160,000 checked matrix elements all reconcile. A has 3,192 deadline checks; B has 6,360. There are 132 actual fixed callbacks and 132 no-op renders in each.

All 120-sample wall and process-CPU statistics, totals, validation/bookkeeping statistics, input preparation statistics and heap extrema/drop counts are independently recomputed. Median averages positions 60 and 61; nearest-rank p95 uses position 114. The combined cost uses update-plus-pose values from each same tick before sorting. A update wall time is 3.315 / 13.221 / 23.009 ms; B update is 4.031 / 14.331 / 24.429 ms. The warmup samples are excluded. The raw result identities remain A `d6095e41b0d76fd3cb638e1aae0c8a79f7a56ae93abe300bd60a2366038b8c49` and B `5329afeeb38448130702205d7d92ada4de2537a231952cfbe0303279f10911e1`.

The A/B state digest agrees at `7fdd586c44eda2ba3d14c7e197fb811d26d7a51506e46a74a61d76abe0c487e4`. Its scope is exactly 19 doubles per state/tick: tick, agent ID, source phase, blend, drop, and each foot's position, yaw and velocity. It does not hash acceleration, target, mode, previous input or retained event/selection diagnostics. This establishes equality of that emitted projection; full serialized state equality should not be claimed from it. The inspected scenePose path only reads controller state, and the small replay below also checks complete serialized state unchanged around all 60 sampled pose calls.

There are 1,500 warmup and 15,250 measured departure-selection replacements in each run. All per-tick counts agree. The 38 measured departure-bearing ticks and 82 other ticks reproduce the author's cohort sums: A 351.349 / 257.949 ms and B 391.706 / 313.824 ms. The small replay reproduces every population departure count as 250 times the twelve corresponding case outcomes. These inclusive cohorts leave isolated selector cost unmeasured.

##### Finite geometry and negative controls

I performed no fresh 3,000-agent timing run. A small untimed replay initializes only the first 12 translated states, executes 1,584 updates through the actual default RenderLoop, and evaluates 60 poses at ticks 1, 12, 13, 72 and 132. Independent packed-point arithmetic reconstructs all 960 full-weight correspondence pairs. The maximum error exactly reproduces `1.2790430427803274e-7` m. The complete ordered point-pair hash also reproduces exactly: `1666a691178b88ef7c59089ec93e4dbb39fe3cdbe0d2453c0943b04f032aadc6`. This remains the original finite sample, with the unchanged 1e-5 m correspondence bound.

Twelve negative controls pass. The independent record checker rejects a duplicated final grid location, a changed source time bit, one missing measured pose and a measured tick mislabeled warmup. Exact extracted measurement loops stop on an update throw, returned controller failure, pose throw, returned invalid pose and expired deadline. They preserve the correct attempted-versus-returned counts and the failed departure replacement. Exact finite checks reject NaN foot acceleration and an infinite analytic transform. An independent 10 mm packed-skin translation mutation fails the unchanged correspondence limit. The extracted slices and observed failures are retained in `checks.json`; these controls are finite checks, not cost samples.

The earlier source control remains pinned: 192 poses, 4,040,448 vertex comparisons, zero outside the prior quantization bound and 31,094 outside comparisons under the wrong-palette control. I checked its identities and counts; I did not repeat that full source-control run or expand its authority. The 35/3/2/5/15 mm policies remain unchanged.

##### What the cost can support

`worldsAt` materializes an 848-float Float32 palette for each of walk and idle per pose. Therefore 360,000 measured poses entail 720,000 such arrays and 2,442,240,000 cumulative bytes of element storage, or 20,352,000 bytes per measured 3,000-pose tick for this part alone. This arithmetic describes cumulative materialization. It does not describe resident memory, all allocations, whole-process GPU allocation or attributed garbage-collection cost. Post-tick heap/RSS snapshots include the source, diagnostic data and retained poses/events. The report states those limits correctly.

Windows process.cpuUsage has coarse observed increments here, including median zero for positive-duration update batches. Those medians do not establish zero work. Process CPU totals can include V8 helper work; elapsed wall batches remain the relevant measured latency. Initialization, source loading, instrument validation and input construction are separately recorded. No subsystem budget has been accepted.

The twelve command streams are synchronized and repeated 250 times on flat ground with one near rig. This finite workload omits population heterogeneity, long-session diagnostic growth, arbitrary commands, terrain/support variation, avoidance/signals, 200 vehicles, source interpolation between fixed steps, body-to-foot interpolation, rendering, GPU skinning/upload, both styles and 1920×1080. It cannot establish naturalness or the whole-scene 60 fps target. Cache or memoization gains that depend on those twelve repeated phases would need a separate heterogeneous workload before supporting a population-scaling claim.

The author run records fit the reserved window: A 10:20:00.625–10:20:02.569 UTC, B 10:20:06.524–10:20:23.031 UTC. Each child reports completion inside its wrapper interval and both wrappers observed exit zero within the 120-second cap. Root supplied the quiet-window coordination and release ordering. The retained files confirm run timing and closure; they cannot independently prove unrelated system idleness, and the report already excludes that claim.

One source-grounded next direction is a fixed-topology CPU evaluator that writes into reusable destination buffers. The current scenePose repeatedly finds named joints, walks fixed parent chains, clones matrices, materializes both source palettes and creates per-pose closure objects. A bounded replacement could precompute rig indices/ancestor membership and retain per-agent buffers while preserving source float32 interpolation, body/anchor authority and the complete-weight reference equation. This is a proposal only, with no measured speedup. Its output and failure behavior would need independent correspondence tests before any cost claim.

I also inspected the pending `src/agents/render/humans.ts`, `pose.ts` and `vat.ts`. They provide instanced VAT with shared color, depth, distance and AO deformation and per-slot body interpolation. They do not implement this reviewed contact controller. Any later representation must fit that integration boundary, preserve all deformation passes and independently establish source/contact fidelity and inter-update behavior. Existing VAT is not evidence that a contact-aware replacement is equivalent.

##### Reproduction, cleanup and disposition

To repeat these finite checks, copy the review `independent.mjs`, `run.mjs` and `close-processes.ps1` into a fresh ignored sibling directory and run `node run.mjs 01`, then the native cleanup script. No quiet population benchmark is part of this review command. The first review attempt in this directory exited one because I initially assumed case-major ordering; the frozen corpus actually uses phase-major ordering. I corrected that review-only assumption. Both attempt records remain retained. The successful retained child ran 10:30:54.290–10:30:54.875 UTC and exited zero; no deadline or overflow fired.

Native identity inspection finds both review wrappers/children and both author wrappers/children absent. All live inspection handles were disposed in finally. Recycled numeric PIDs would be preserved, and access errors would fail the check rather than imply absence. No browser, GUI, GPU process, server, watcher or descendant-producing program was launched by this review. No numeric-PID signal was sent. All review artifacts are retained for root's active handoff; no disposable output exists outside this directory.

No material finding requires repair of this cost experiment. The 19-double state-hash limit must remain explicit in any canonical summary. The five code-delivery gates, native visual review and main merge were outside this read-only diagnostic scope and were not run. The reviewed experiment and this review remain ignored evidence outside main. Root owns acceptance, promotion of authored conclusions into the meaningful reviewed documentation checkpoint, and any later optimization or integration.


## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| Historical initializer limit | Phase independence passes, but the inherited ongoing controller fails after stop/restart at 0.8541666666666666 s. | Root accepts initialization only. The retained present-posture 35.032379921 mm and best future 40.848929007 mm requirements include the existing margin and are not relabeled safe. | The later selector is a separate target; its success does not erase the original failure or unrun rows. |
| Next-departure finite result | The later selector completes all 43 cases and 18,523 rows at 240 Hz. | Root accepts this finite CPU result with unchanged limits and source correspondence. | No arbitrary-command invariant, naturalness or production adoption is established. |
| Minor diagnostic omission | Seventeen of 153 successful decisions omit earlier rejected successors of the same first duration. | Disclosed, nonblocking limitation. Selected-pair evidence and complete 16-pair failure records remain intact; this is not a new material finding ID. | A later diagnostic correction requires focused review. |
| Cadence boundary | All 43 cases and 4,663 selected rows pass at 60 Hz with exactly 4,620 actual updates. | Root accepts sampled fixed-callback evidence. It differs from the 240 Hz result and does not observe between-tick poses. | Define and verify inter-update motion before a rendered gait claim. |
| Cost limit | The finite 3,000-agent source/IK pose path exceeds a 16.667 ms frame interval. | Root accepts the measurement and independent reconstruction, not this representation as a production solution. | Any replacement must preserve source/contact behavior and receive independent review before a speed claim. |

## Verification

The next-departure reviewer reproduced all 43 traces, the old failure, source controls and 153 finite continuations. The cadence reviewer reproduced all 43 selected traces, original input bits and exactly 4,620 callbacks, with duplicate-callback and changed-time red controls. Neither result observes arbitrary trajectories or between-tick rendering.

The cost reviewer independently reconstructed counts and statistics, passed 12 negative controls, and replayed 12 states through 1,584 updates, 60 poses and 960 full-weight point pairs without another population timing run. A/B equality covers only the emitted 19-double state projection. A updates measured 3.315 / 13.221 / 23.009 ms median/p95/maximum; B poses measured 96.988 / 109.623 / 133.123 ms; the same-tick sums measured 101.412 / 120.269 / 144.613 ms. Palette bytes count cumulative materialization, not resident memory. The repeated twelve-case, one-rig, flat-ground workload is neither heterogeneous nor whole-scene performance.

This documentation checkpoint checks exact report/source pins, reversible heading normalization, scoped format/links, blob size, secret patterns, diff scope and preservation. It does not rerun the code-delivery gates, benchmarks or native capture. Review 11 remains an explicitly open graphics round; no placeholder or renumbering is introduced and no whole work-docs continuity pass is claimed.

## Round outcome

Root accepts the four reviews within the distinct limits above. Earlier rejected evidence remains permanent. Production gait, frame interpolation, naturalness, terrain/LOD contact, the 3,000-pedestrian population and whole-scene performance remain outside these acceptances. Current delivery status belongs in [the plan](../plan.md).
