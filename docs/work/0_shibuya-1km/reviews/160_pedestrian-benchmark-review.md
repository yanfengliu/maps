# Review160: pedestrian movement benchmark qualification

2026-09-27. Independent reviewer: crowd_benchmark_review. **BLOCKED: do not begin candidate scoring.** Four instrument findings below remain open. No movement candidate was implemented, scored or accepted. No product or author artifact was changed. Root owns promotion and acceptance.

This review covers the fixed two-pedestrian benchmark in `artifacts/crowd-motion-benchmark-20260927/` at base `bb4532df4e4cfd7d2cc3c072a951d9dc6ada3f7c`, including the six existing uncommitted entry files as pinned inputs. It does not qualify the 3000/200 population, anatomy, floor ownership, renderer, production generation retirement, or a runtime trim geometry. The three comparison starts are disclosed, not blind.

## Exact target and evidence

The target has input SHA256 `d5010643a6c98557b95782f8f9e3f3c6406781b4d74a5f970972eca807f028eb`, checker SHA256 `f872c460a309e0c278c10185d4dc1ddfd49d96a779853e33ee7cc2b0475ac7b1`, code-seal SHA256 `ba63eb9de3ba4097b4024d95f9443f4b57fda4fb8a85e5f100b9e82bcd2aefd9`, REPORT SHA256 `a7f42771010732215a6d09ccf69d4a2f284e67323db22df57cdc71a5cd66b022` and freeze SHA256 `be4857dff2b8945cec860a259e299f09403a5f8bfd4daee792fa11d7a50536aa`.

The reviewed author result is `runs/2026-09-27T14-56-37-563Z-44416/result.json`, SHA256 `2e3484f6d9b2e75f52988234568339e074cb50506d4bcb0295cf44a9661ed6e1`. `reviewed-pins.json` captures 253 unique source, raw-evidence and final-packet paths and hashes. The first audit and final integrity check confirm unchanged bytes, including all six pre-existing entry files and immutable151/152/154 evidence.

Review commands, from the crowd-admission worktree on Node24.12.0, were `node artifacts/crowd-motion-benchmark-review-20260927/audit.mjs`, then `denied-probe.mjs`, `additional-probes.mjs` and `input-trace-audit.mjs` under the same directory. These are bounded instrument controls, not candidate implementations. The first script runs the original 22 controls and three mutations in separate owned children with 30-second limits. The additional script runs one more bounded mutation. No browser, GPU, default replay, full gate, dependency install, data writer or CLI-review retry ran.

The review copies preserve target inputs and control expressions. The only harness changes are imports to the selected owned checker and original baseline, output routing into this review directory, and suppression of redundant full baseline trace writes. Each mutation changes one named enforcement expression. Target code and seals remain untouched. The copies' inherited `codeSealSha256` field verifies the canonical artifact; it does not identify the mutated executed copy. `mutation-results.json` and `additional-mutations.json` bind the actual executed checker and harness hashes. Their distinction is deliberate.

## Findings

### R160-01 [P1] Candidate reset qualification only exercises the baseline

`benchmark.mjs:33` constructs every adapter in `candidate-state-reset-positive` from the statically imported baseline `create`. The stale-generation control at line34 is also independent of the imported candidate. At line35, `--candidate` constructs a fresh `mod.create()` for each case and calls `simulate` once. `simulate` calls `reset` exactly once at `checker.mjs:21`. A candidate which initializes correctly on the first reset but keeps obsolete state on subsequent reset is never exercised across reuse. Its generation2 output and fresh-versus-reused state are not compared. The 22 baseline controls can therefore be green while the candidate violates the promised local reset contract.

Minimal repair: make the future candidate factory itself undergo the fixed reused-versus-fresh reset comparison, with measured generation1-to2 output and the fixed second-start observations. Include a stateful broken-reset control which the same candidate qualification path rejects. Keep the present local scope; no production retirement/reuse expansion is requested. Surface each candidate's reset results with its three movement cases rather than reporting the baseline's reset as candidate evidence.

### R160-02 [P1] Actual budget and charged-arc enforcement have no negative control

The positive and uncharged controls at `benchmark.mjs:21-22` call `poseChecks` at `checker.mjs:11`. Actual execution duplicates these predicates at `checker.mjs:33-34` and does not call that helper. The advertised suite remains **22/22, exit0** after changing `checks.physicalBudget=false` to `true` in that execution path. It also remains **22/22, exit0** after independently changing `checks.charged=false` to `true`. See the `no-physical-budget` and `no-charged-arc` records in `mutation-results.json`.

A one-step negative through actual `simulate` gives each actor twice cadence allowance. For actor1, selected budget and advance are `0.03519949231160184m`, twice its unchanged limit. The original execution returns `physicalBudget:false`; the matching mutant returns `true`. A separate isolated arc test proposes `advanceM=0.01` and `budgetM=0.0099999`. Published Float32 displacement plus its derived endpoint bound is legal, so `physicalBudget:true`, but charged arc must fail. The original returns `charged:false`, the matching mutant `true`. This isolates the needed arc check from the displacement check. These one-step controls intentionally do not claim finite-progress success.

Minimal repair: route adverse proposals through the actual executed observer and require the specific budget/charge reason, with a cadence-overrun control and a charged-arc overrun whose published displacement remains within its bound. Require the named controls to go red when their corresponding enforcement is removed. A helper-only arithmetic check is not sufficient. Evidence: `adverse-proposals.json`, `additional-mutations.json`.

### R160-03 [P1] Denied-entry enforcement is unqualified by the authority controls

At `checker.mjs:35`, advancing beyond mapped physical join start without a current actual lease sets `checks.authority=false`. Changing only that assignment to `true` leaves **22/22, exit0**. Existing authority controls demonstrate actual API grant/entry/cancellation/observation behavior, but none demonstrates that executed candidate travel across a denied boundary is rejected.

`denied-probe.mjs` injects exactly one adverse proposal into the disclosed failing baseline. At tick3480 actor1 advances to `physicalStart+0.001m` without a held lease. The move stays within cadence and charged budget. Both observer variants retain `physicalBudget:true`, `charged:true`, all publications/observations, finite joint exit4428, 839 denied-request ticks and 155 returned grant/held observations. Original authority is false with `firstUnauthorized={tick:3480,slot:1}`; the mutant reports authority true. Separation remains red from the inherited baseline in both arms. This does not rely on a 17m teleport or an absent-work counter to fail.

Minimal repair: add a valid-budget denied-boundary proposal on the executed seam and assert the specific authorization failure, while retaining real requests, resolves and observations. Make that control fail when the line35 enforcement is removed. Preserve the explicitly synthetic authority API lifetime controls as separate evidence. Evidence: `denied-within-budget.json` and the `no-denied-boundary` mutation record.

### R160-04 [P1] The positive control never qualifies the actual publication observer

`benchmark.mjs:21` tests separated synthetic poses only through `poseChecks`. All complete `simulate` cases are the known failing baseline. Replacing `if(clearance<0)` at `checker.mjs:45` with `if(true)` makes actual execution call every pose a separation failure, including initially clear moving poses, while all **22/22 controls still pass, exit0**. The first baseline's `firstLoss` moves to tick2345 with **positive clearance `0.0010468734548739755m`**, which the controls accept. The other two starts similarly name positive-clearance first losses. `failing-baseline-stays-red` at `benchmark.mjs:24` only requires some failure, not the intended witness.

Minimal repair: run a clearly labeled synthetic positive through actual `simulate`, including the checker-owned integration/publication and relevant complete-observer path, and assert its expected positive checks. It must make the always-red separation mutation fail. Also assert the intended baseline loss witnesses or at least validate that every reported loss has actual negative clearance at its named publication. This is qualification of the instrument, not a request to invent a movement repair to make the real cases pass. Evidence: `additional-mutations.json`, `always-separation-red.log`, and that variant's retained result.

## What was independently verified

The unchanged checker reproduces22/22 and every complete baseline summary is JSON-exact with the final author run. Independent arithmetic read all6,042 retained fixture ticks and12,084 actor publications, checking contiguous ticks, Float32 positions, original starts, monotone source/arc, unchanged cadence budgets, actual footprint positions and recorded observation flags. It independently recovered all first and worst clearances. These counts are publication evidence, not a visual/body-motion certificate.

| Case | Steps | First loss | Minimum clearance | Final tick |
| --- | --- | --- | --- | --- |
| local-2345 | 2084 | 2394 | -0.0023321219291586592m | 4428 |
| local-2400 | 2029 | 3933 | -0.000542311850155075m | 4428 |
| local-2500 | 1929 | 3347 | -0.0007108086430467342m | 4428 |

`input-trace-audit.mjs` independently re-extracted literal2584/2585/2587/4350 before/after poses, budgets, radii, source progress, actual recorded lines and exact route samples from immutable151/152 raw traces. Every comparison matches. Both2394/4326 trim rows are JSON-exact with154. No original loss was erased or converted into a movement pass. `independent-input-trace-audit.json` records these comparisons.

All six frozen starting actor records retain their actual prior/current positions, source progress, double and Float32 scales, cadence and generation. Measured initial velocity equals actual preceding-to-current Float32 displacement divided by1/60 in every case. This is internally consistent with subsequent publications and is openly a local measurement contract, not the original population replay. Original151 remains literal evidence of the different retained-intent velocity behavior.

Each physical polyline begins at the exact original published pose, has strictly increasing source and physical coordinates, and charges its 3D segment lengths. Its join-end coordinate exactly matches the frozen source end and physical end. Outgoing continuation remains in occurrence1 and ends beyond the local join, so the leader does not park at the old short endpoint. Both actors exit by4428, below5717. This resolves the old instrument's artificial liveness tail within the stated local bound. It does not approve the half-metre trim as runtime geometry.

The endpoint publication inequality is a valid triangle-inequality bound: distance between published endpoints is no greater than selected physical arc plus each endpoint's publication error. The observer calculates these errors from its own state and sample, and separately charges actual arc. This is binary64 arithmetic, not a formal exact-real proof, and is independent of the strict nominal radius-sum separation comparison. No separation tolerance was reduced or enlarged.

The production API is actually called: `resolve` once and `observe` for both actors per fixture step; the runner owns positions and footprint creation. Stable `RoutePassage` objects are created from the current network's edge objects, matching admission's identity checks. Read-only snapshots returned by `commitmentFor` do not expose mutable authority state. Synthetic positive/cancelled/omitted authority arms honestly exercise real API behavior, including refusal to cancel an entered commitment and release by an explicit later observation; their entry and release positions are synthetic and do not establish continuous travel or product retirement. The new clock and tick4320 first grant are explicitly two-actor evidence with no restored external occupancy.

The seam accepts only nonnegative finite arc advances and selected budgets for two fixed slots/generations. It owns source mapping, publications, footprints and authority records, so a cooperative adapter cannot supply its own pass counters, pose or lease. Candidate code still runs in the same process with ordinary JavaScript import capability; the report correctly disclaims a malicious-code sandbox. This review does not widen that contract.

## Kinematic and lifecycle bounds for root's later selection

`checker.mjs:34` enforces cadence times dt. It does not enforce acceleration, braking, jerk or angular speed. The baseline alone applies its acceleration ramp at `baseline.mjs:8`; another adapter need not follow it. `checker.mjs:38` assigns the local segment heading even for a zero-advance tick, with no heading-rate bound. Paths are piecewise-linear and continuous in position, but their tangents can turn abruptly. Candidate `maxArc`, blocked and segment-direction fields are information; enforcement primarily covers budget, source mapping and the no-lease join boundary. This is the actual scope of the fixed point-motion benchmark, not general human locomotion feasibility or realistic visual motion. No new kinematic threshold is imposed by this review. If root needs one to select mechanisms, freeze it before candidate exposure/results rather than infer it from a passing case.

Full population generation identity, retirement and reuse remain open. Local reset evidence and an entered-lease reset refusal cannot establish them. R160-01 asks only that the promised local candidate reset be genuinely tested.

## External code read and review availability

Source reads outside the benchmark include `src/network/admissions.ts:41-88` for request validation, identity, signal advance and real grants; `:91-104` for observe/entered/release/cancel behavior; `:110-120` for copied commitment snapshots; `src/agents/population/pedestrians.ts:29-31` for actual footprint construction and `:547-555` for occurrence lookup; and `src/agents/population/tick.ts:950-988` plus `:1708-1717` for the extracted gate functions and matching occurrence lookup. Source provenance and old failures were read in151/152/154 reports and raw retained rows. Primary AGENTS, local rules, lessons, root's motion-search contract and the fleet review runbook were read.

This is the dispatched Astra/xhigh independent review. Review107's unavailable CLI lanes were not retried, as assigned; there is no fabricated second-CLI approval. No subagents were needed for this bounded instrument review.

## Closeout and minimal acceptance

Keep scoring unadmitted until R160-01 through R160-04 are repaired in one explicit successor and independently re-reviewed. Retain the exact original witnesses, fixed inputs, finite bound and strict separation. The successor must demonstrate a positive through the actual observer and negative controls that detect each removed enforcement, plus qualification of the actual candidate reset path. No source geometry, solver, separation threshold or product lifecycle change is required by these findings.

All owned synchronous children exited. `resources.json` records final process checks; no browser, GUI, server or watcher was launched. Review evidence is intentionally retained for the unresolved findings and successor handoff. No shared output was cleaned or altered. Root can promote this authored report while raw mutation scripts/results remain ignored.
