# Review163: focused rereview of the repaired motion instrument

2026-09-27. Independent reviewer: crowd_benchmark_review. **R160-01 through R160-04 are resolved. The fixed component instrument is ready for root to admit candidate scoring within its stated bound.** No movement candidate was scored or accepted. No new material regression was found in this focused review. Root owns admission; the instrument's explicit pending-review metadata is not an approval.

The bound remains cadence-capped point motion for the two fixed pedestrians on three disclosed starts, with local adapter reset. It excludes acceleration, braking, jerk, heading feasibility, realistic walking, anatomy, floor/support ownership, runtime trim geometry, default3000/200 behavior and production generation retirement. No tolerance or kinematic threshold was added.

## Exact target and method

Reviewed artifact: `artifacts/crowd-motion-benchmark-repair-20260927/`, review162, in `C:/Users/38909/.codex/worktrees/crowd-admission/maps`. Target REPORT SHA256 `dadfd59da97d72ca0fd415938732fd1d2a6a96d58cf22a804f38c1976a9d5980`; SCHEMA `633a01ca50844476a0777bcb01609a5b2b1e72ab4f87abd99b87ae5186e3ac99`; freeze `1182ca7ccc862dc18e8a738ecaba450a9700f87c2b2ac65d409af6a60d5eabab`; code seal `062ac39e402a02c65327940829e07373313bfbc9b6a811f718ba936694dd72bd`. Real input remains `d5010643a6c98557b95782f8f9e3f3c6406781b4d74a5f970972eca807f028eb`.

All294 inherited preservation pins and the target's own frozen packet were checked before and after reproduction:413 unique paths, zero changed bytes. The source and151/152/154/157/160 evidence are preserved. The six previously delivered entry files remain unchanged. `reviewed-pins.json` and `final-integrity.json` bind these checks.

The advertised full command writes mutant modules at the author's artifact root, so it was not invoked against the frozen author directory. Instead `audit.mjs` copied11 needed files into this review-owned directory. Eight were byte-exact. Only the hardcoded artifact/output root in `benchmark.mjs`, `run.mjs` and `mutations.mjs` was redirected. Observer, qualification, proposal, control and wrapper logic stayed unchanged. `copy-provenance.json` records both hashes and every transformation. Canonical source seals still verify the author's original files; results separately identify the actual executed copies.

The bounded full six-arm command then ran from that owned copy on Node24.12.0. Its children retained full traces and completed output seals. A second invocation exercised the real `run.mjs --candidate` path with the intentionally broken reset control. No solver or movement repair was introduced. A final small wrapper fixture checked missing-output rejection. These probes write only inside `artifacts/crowd-motion-benchmark-rereview-20260927/`.

## Stable finding dispositions

### R160-01 — resolved: qualification belongs to the actual imported factory

`qualify.mjs:7-16` imports the requested module, records its before/after SHA256, runs each real case with a fresh instance, and runs the fixed reset comparison on that factory. The same instance receives generation1/start2345 and then generation2/start2400; a fresh instance also receives generation2/start2400. Each comparison arm must execute8 steps,16 publications/observations and8 resolves with valid generations and no held leases. Actual proposals and published state are compared exactly. `benchmark.mjs:52-53` uses this path for `--candidate`, publishes that candidate's reset evidence and requires its `componentPassed` for exit0.

The repaired callback metadata sets the current fixture generation both at reset's top level and on each actor specification (`checker.mjs:21`). That makes the override internally consistent without changing the frozen source generation. This and the exported execution-module URL are the only checker differences from157; original movement enforcement is unchanged.

The actual imported broken-reset adapter retains the first reset generation while delegating movement to the rejected baseline. Canonical qualification observes correct first generation1 and fresh generation2 outputs, but stale generation1 on reuse. `reset.passed`, `observationsComplete` and `sameObservedGeneration2` are false; all three arms still execute8/16/16/8 calls. The fresh-instead-of-reused mutation makes this broken adapter appear correct and therefore causes the named `imported-stateful-broken-reset` control to fail, exit1. This is the required false-positive guard.

The actual wrapper command with that imported control returned exit1, `outputComplete:true`, all27 instrument controls green, `candidate.reset.passed:false` and `candidate.componentPassed:false`. Its recorded filename is the actual imported copy and its hash equals the author's control bytes. The overall component is also red because its movement delegates to the known failing baseline; that exit alone is not the reset proof. The measured reset flags and the fresh-instead-of-reused mutation isolate the reset claim. Evidence: `imported-control-command.json`, its complete result, and the sixth mutation arm.

### R160-02 — resolved: execution rejects cadence and isolated arc overrun

`benchmark.mjs:32-36` now sends the adverse proposals through actual `simulate`. Both one-step controls execute two publications/observations and one resolve. Cadence overrun proposes twice unchanged cadence×dt and requires `physicalBudget:false` while charged arc remains true. The second proposal advances0.01m on a0.0099999m budget: published displacement still fits the derived endpoint-error bound, so `physicalBudget:true`, while the independent arc charge must be false.

Removing only actual physical-budget enforcement produces exit1 with `executed-cadence-overrun` failed. Removing only actual charged-arc enforcement produces exit1 with `executed-isolated-charged-arc` failed. Those predicates now distinguish the two properties in the executed observer. The full observed control rows are retained in each arm's `executed-budget-controls.json`. These one-step probes do not claim finite join completion.

### R160-03 — resolved: valid-budget denied travel is rejected

`benchmark.mjs:37-39` injects one denied-boundary proposal into the disclosed baseline. At tick3480 slot1 crosses physical join start by0.001m without a current lease, within cadence and charged budget. The original observer returns authority false with the exact first-unauthorized witness. It retains complete execution, positive join progress,2084 resolves,4168 publications/observations,839 denied ticks and155 returned grant/held observations. Inherited nominal separation remains independently red.

Removing only the absent-lease crossing assignment at `checker.mjs:35` now produces exit1 with `executed-valid-budget-denied-boundary` failed. The control isolates movement authorization while retaining real request/resolve/observe behavior. It does not substitute the synthetic lifetime API probe for continuous movement evidence.

### R160-04 — resolved: positive publication and truthful baseline losses use the actual observer

The separate `synthetic-positive.json` defines parallel tracks2m apart and is never substituted for a real case. `benchmark.mjs:22-24` runs its120 steps through actual `simulate`, producing240 published Float32 poses/footprints,120 resolves and240 observations. The selected physical, separation, source, generation and complete-observer checks pass. Both actors advance about1m, with no loss witness. Its zero requests/grants and `authority:false`, `progress:false` remain explicit, so this is observer qualification rather than a join or authority solution.

`benchmark.mjs:29-31` independently recomputes each reported first-loss clearance from its published positions and unchanged radii, requires actual negative clearance, and matches the complete summary against157. The always-red separation mutation now fails both `executed-synthetic-positive` and `intended-baseline-loss-witnesses`, exit1. The positive-clearance fake first losses seen in160 can no longer qualify the instrument.

## Independent reproduction results

| Arm | Exit | Named failed controls |
| --- | --- | --- |
| Canonical | 0 | None;27/27 pass |
| Physical-budget enforcement removed | 1 | executed-cadence-overrun |
| Charged-arc enforcement removed | 1 | executed-isolated-charged-arc |
| Denied-boundary enforcement removed | 1 | executed-valid-budget-denied-boundary |
| Every publication marked as a loss | 1 | executed-synthetic-positive; intended-baseline-loss-witnesses |
| Fresh instance substituted for reuse | 1 | imported-stateful-broken-reset |

The full owned manifest is `mutation-runs/2026-09-27T15-27-40-566Z-44612/result.json`. All six arms have the exact expected27-name control set, complete output, matching output seals, and actual executed-module hashes matching the dispatched files and result report. The five removal copies therefore bind what executed, separately from the original canonical seal. `audit-result.json` records these independent checks.

The reproduced three baseline summaries are JSON-exact with both157 and162. Real input bytes are also identical. Starts2345/2400/2500 retain first losses2394/3933/3347, minima−0.0023321219291586592m/−0.000542311850155075m/−0.0007108086430467342m, step counts2084/2029/1929, and join exits4350/4428. Literal151/152/154 controls remain distinct and green as rejection witnesses. This rereview does not replace160's independently retained raw-input and all-publication arithmetic audit.

Missing work still fails its actual counted checks: skipped-observer reports4167 observations against4168 publications; omitted-authority reports2084 resolves against2085 steps. Both set `completeObservers:false`. The missing-case and stale-generation controls also remain active. Every reported control was present and executed in this run; there were no empty pass counters or suppressed checks.

The output-completeness guard was tested separately with an owned fixture child that exits0 and writes correctly hashed but incomplete output, omitting `local-2345-baseline-trace.json`. Only the wrapper's child-entry path was redirected; its completeness logic was unchanged. It returned exit1, `outputComplete:false`, with exact error `Missing baseline trace local-2345`. `missing-output-control.json` records the executed wrapper and fixture hashes. A successful child status alone therefore did not certify missing output.

## Command write scope and resource bounds

**Operational note R163-N01, not a scoring blocker:** `mutations.mjs:12-13` writes or overwrites ten known mutant module files at its artifact root: five harnesses, four checkers and one qualifier. It also creates fresh run and mutation-run directories. The full reproduction command is not read-only and is not fresh-run-output-only. It should be run in an owned writable copy when preserving a frozen packet. This review did so. A downstream runbook should state that exact scope.

The future `run.mjs` path is different: it launches one benchmark child; `benchmark.mjs:10,53` writes only its fresh run directory and output seal. Qualification reads and hashes the actual adapter; it does not generate root-level mutant modules. The tested candidate-wrapper path preserved all11 copied canonical module/input files byte-exact. Source and author targets also remained unchanged. Candidate file/module mutation and subprocess creation remain outside the reviewed cooperative-code contract.

Each full-command arm has its own30-second hidden synchronous-child timeout and2MiB captured-output cap. There are exactly six arms. Those are per-child bounds; the driver has no separate total wall timeout for filesystem preparation, hashing and final manifest work. This reviewer additionally bounded that whole driver at200 seconds and the imported-control wrapper at40 seconds. Actual child times were4.250–5.413 seconds. The six child durations sum27.036 seconds; the driver, imported-control invocation and surrounding audit together took32.985 seconds. The imported wrapper reported5.243 seconds. No time limit fired. The wrapper's subprocess prohibition is part of the cooperative contract, not a malicious-module process sandbox.

All recorded owned children returned synchronously. `resources.json` confirms their PIDs are absent and no process whose command line belongs to this rereview remains. No browser, GUI, server, watcher, GPU process, default replay or full gate was started. No shared cache, data, dependency, product, author artifact or Git mutation occurred. The two review107 CLI lanes were not retried; no second-CLI approval is implied.

## Review scope and handoff

The focused source review covered162's benchmark, qualification, broken-reset adapter, run wrapper, mutation driver, schema and report; the complete checker diff against157; and the sealed synthetic input and measured controls. External production references already established in160 remain bound to unchanged source pins: `src/network/admissions.ts:41-104,110-120`, `src/agents/population/pedestrians.ts:29-31,547-555`, and `src/agents/population/tick.ts:950-988,1708-1717`. The primary instructions, local rules, lessons and review runbook from160 still govern this continuation. This is the assigned Astra/xhigh independent review, with no additional agents.

Root may admit comparison of distinct mechanisms against these disclosed, fixed component inputs. A future result must include its own imported-adapter reset qualification, full three-case traces, exact source identity and actual observer checks. It may establish only the stated cadence-capped point-motion component. Kinematic, geometry/support, realistic visual, full-population and production-lifecycle acceptance remain separate. No review163 finding requests expanding this component or repinning sources for another task.

The ignored review packet is retained for promotion and candidate-dispatch provenance. Original160 dissent remains intact with its resolved IDs linked above. No material instrument finding remains open in this focused rereview.
