# Review 22: implementation

## Target

ABBA preparation focused re-review. The new ignored ABBA r1 sibling at declared main `7f8aeac`. Repair patch `883fe2cce49e0b885fee14c42e6d767ec00db1a55f81a68cef80fbc9d866449b` changes the error route and result predicate while preserving the original timed loop block. Review 20 and its adverse controls remain unchanged.

The exact target is `artifacts/agents/gait-pose-abba-r1/handoff.json`, SHA-256 `1dc40b65a673fb6dec6540d2b6f074b2214c7f4b567a7f7e5b06fc11cf5dc3d0`. Reviewed text sources are retained byte-for-byte under `artifacts/network/retirement-pose-checkpoint/candidate-01/recovery/source/`; the consolidated `recovery/reviewed-source.patch` has SHA-256 `dd2fe770ac1368dbf21ee7bf3bd3033f2564f03b8141f63633c94478fa0114d9` across 61 source files for this checkpoint. The additive patch uses LF transport; exact copies and normalized reconstruction records preserve the original bytes and line endings. Raw output, source assets and earlier counterevidence remain ignored at their pinned handoffs. No experimental code is promoted by this document.

## Reviewers and coverage

/root/assets_review authored the report below independently of the implementation. Root separately read its substantive findings and accepted only the dispositions stated here. The report is `artifacts/agents/gait-pose-abba-r1-review/report.md`, SHA-256 `4b3a1379acfe49391573554b2ec5c974b6343761caa4bfe6c2624f7743a797ca`; its handoff is `076bb03c2bcfdec8138acd3e7478b564272cc559af6dd0c97758230f25b89231`, sealed at `2026-09-13T12:47:38.2595790+00:00`. The wrapper is authored by the network worker for root's review; it does not alter the reviewer's body or claim additional independent work.

Rounds 18–23 follow the six handoffs' recorded seal times on 2026-09-13, not completion of their underlying implementation work. The original ABBA review and focused re-review remain separate rounds. The full authored text is embedded with ATX heading depth increased by three; inverse transformation is checked byte-for-byte. Local finding labels and priorities are preserved verbatim; permanent IDs occur only in the wrapper dispositions.

## Reports

### /root/assets_review

<!-- authored-report-start sha256=4b3a1379acfe49391573554b2ec5c974b6343761caa4bfe6c2624f7743a797ca -->
#### Focused independent re-review — ABBA r1

2026-09-13. Reviewer `/root/assets_review`; root owns acceptance and the quiet CPU window. The target is the new ignored sibling `artifacts/agents/gait-pose-abba-r1`, against declared main `7f8aeac51357654a4d39d3e6ecc5f8ac0bda79b6`. All reviewer writes are confined to `artifacts/agents/gait-pose-abba-r1-review/`.

**AB0 and AB1 are resolved within the requested scope. No material finding remains.** The explicit throw sentinel reaches the actual consumer and outer catch, persisted failures retain their typed values, and launcher/verifier share a strict null-signal acceptance predicate. The original timed loops are unchanged. This accepts the finite preparation repair; it does not authorize a benchmark or establish performance.

##### Exact target and unchanged inputs

| Artifact | SHA-256 |
| --- | --- |
| Successor handoff | `1dc40b65a673fb6dec6540d2b6f074b2214c7f4b567a7f7e5b06fc11cf5dc3d0` |
| Author report | `ab06c961b22184b66ea31aced29d75a5f9934183bc85d33e66de15ba14fa6022` |
| Repair patch | `883fe2cce49e0b885fee14c42e6d767ec00db1a55f81a68cef80fbc9d866449b` |
| `experiment.mjs` | `b0c371003cf01b439dca955ea239bb84de7ed34f711c9d9f9d9662f0119dee93` |
| `timing.mjs` | `ecc3179a35324371440a355dc4433ffc836fe446391c840dec2042672915badd` |
| `run-status.mjs` | `060b5b8464ae1b5c2a5aa18517e48f7fe613ffe00630566513a40865b8fc4c70` |
| Unchanged loop block | `bec437f218c65aec3ff3b74c830f96a88c8bf3c40adcfedaedc897c99d777012` |

Independent before/after reads verify all 247 input and 70 owned records, totaling 41,559,853 bytes. Every length and hash matches. Old/new file entries in `delta-pins.json` also match the actual files. The loop block from schedule construction through all fixed-step update/pose/validation work and final tick accounting is byte-identical to the frozen predecessor. The initialization, dispatch and unchanged-file claims were inspected alongside the focused delta; the helper/consumer change remains outside those unchanged loop bytes and is explicitly part of this repair.

Common validation/statistics, lease handling, benchmark child entry, protocol and cleanup source remain unchanged copies. Workload `5c74eb55e8d1373d93c4b9c4ecbdc2dba96c0e1c3c19c9d0c5b844d739a96405`, original controller `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26` and evaluator `41fd26dbd7a175b5637d8e1870fb098a29202a1898333d6df1121e1ac7a395a3` remain pinned. The earlier preparation and review, including their failure evidence, are untouched and included in the successor input closure.

##### AB0: actual throw route and persisted evidence

I read the exact helper, `observeBatch` consumer, fixture admission, outer catch and `describeThrown` implementation. `captureBatch` now records `didThrow` independently of the thrown value. The consumer branches on that boolean, records partial timing/counts and rethrows the same value. The real catch uses `error?.detail`, so `null` and `undefined` no longer cause a replacement TypeError. Its in-memory `thrownValue` preserves the original primitive or Error reference. The typed `thrown` record makes an omitted JSON undefined distinguishable from null, and numeric bit bytes distinguish negative zero and NaN from other numeric values.

Nine fresh cases crossed the actual consumer and outer catch: `undefined`, `null`, `false`, `0`, `-0`, `NaN`, the empty string, Error and TypeError. Each preserves raw identity with `Object.is`, records `didThrow=true`, retains the independent synthetic partial timing of 9 ms wall / 7 ms CPU, and stops at `work-fixture` with zero initializations, fixed callbacks and source samples. The reviewer wrote each full result into its own directory and read the saved JSON back. Undefined has an explicit type with no invented value; null remains null; primitive values or their numeric bit representation round-trip; Error/TypeError class, name, message and stack match the original objects.

Successful work returning false has `didThrow=false`, with no partial failure. A successful fixture through the real consumer then completes an unchanged original 12-agent/four-tick mini arm. A separate new-evaluator mini arm matches it and the prior accepted original/new mini records. Together these two fresh arms contain 24 initializations, 96 updates, 96 selected-evaluator poses and 96 direct-original oracle poses. Statistics remain null; fixture values are synthetic clock readings, not benchmark observations.

Two direct admission controls also pass: benchmark mode rejects a work fixture before source/controller work, and benchmark mode without a lease still rejects at the existing lease guard. No lease artifact or population result was created. This is typed failure evidence for these primitive/Error cases, not a general serializer guarantee for hostile getters, arbitrary cyclic objects or every possible thrown value.

##### AB1: one shared strict predicate

Both the actual launcher and final verifier import `isCleanRun` from the same module and call it at their acceptance point. It requires `exitCode===0`, `signal===null`, `closeObserved===true`, `frozenInputsStillMatch===true`, and no error, cleanupError, timeout or outputOverflow. The final verifier no longer omits the two flags identified in the original review. A missing signal is rejected rather than treated as equivalent to null.

Eighteen fresh emitted-row controls exercise the imported predicate. The two clean rows pass, including explicit false/null optional failure flags. Sixteen invalid rows reject: cleanup failure, overflow, error, timeout, nonzero/null exit, false/nonboolean closure, false/nonboolean input confirmation, non-null signal variants and an absent signal property. Thus false, zero, an empty string and undefined do not satisfy the required null signal. Source inspection confirms the wrapper and verifier use this exact predicate, rather than a duplicated expression.

The author's final `repair-02` record has 29 passing control groups. Its four retained mini arms also pass the actual emitted-result/ABBA validator. The retained `repair-01`, original preparation failure, and both earlier independent review instrument failures remain preserved. There was no new reviewer failure in this focused run. This review does not replay an actual signaled, timed-out or overflowing population child; those emitted-status controls validate acceptance semantics, while the unchanged owned-process launcher remains separately bounded by its recorded cleanup contract.

##### Cleanup, scope and handoff

The single review child, PID 32244, ran under a retained-launch-handle wrapper with a 120-second hard cap and finally-confirmed exit. Its program checks a 110-second cooperative deadline and contains no child-process calls. It exited zero at `2026-09-13T12:45:08.9376664Z`. Strict read-only CIM inspection at `2026-09-13T12:45:30.5913918+00:00` found that identity absent, no current descendants of it, and no remaining process containing this review path. Port 4319 had no listener. `closure.json` records that point-in-time evidence. Root was informed when CPU work and closure checks ended; no further test runs are planned.

No candidate/source/main/data/dependency/Git change, benchmark lease, production build, browser, server, GPU or watcher was created. Source restoration was unnecessary because the reviewer made no source edits. Every new reviewer file is retained handoff evidence; no disposable cache was produced.

The scoped re-review is complete. The repeated-12-stream 3,000-agent ABBA window remains unrun, as do distinct-phase scaling, heterogeneous city work, vehicles, GPU rendering and whole-scene performance. Root may now decide on a separate quiet-window lease for the exact accepted successor; this report supplies no timing or speedup claim.

<!-- authored-report-end -->

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F15 (original AB0) | Falsy thrown values need explicit failure state. | Resolved within the reviewed r1 scope. | Nine actual consumer/outer-catch cases preserve raw thrown identity and persisted typed evidence; the original timed loop remains unchanged. |
| F16 (original AB1) | Wrapper and verifier completion criteria differed. | Resolved within the reviewed r1 scope. | Both use the same strict predicate; 18 emitted-row controls require exact success and null signal. |

## Verification

The reviewer independently passed nine throw-route cases, eighteen status-predicate cases and two untimed mini arms, verified unchanged loop/source pins and closed its retained child. This report contains no population timing. Any later measured ABBA result is owner evidence with its own seal, not a retroactive addition to the reviewer's authored body.

Preparation of this documentation checkpoint checks the exact authored/source pins, reversible imports, scoped document headings and links, blob/secret/diff limits, and separate HEAD/WIP preservation. It runs no browser, benchmark, code build, five-gate sequence or source repair. Review 11 remains open. Primary WIP also retains rounds 2, 4 and 12 that are absent from HEAD. This checkpoint neither invents those missing committed rounds nor claims a whole work-docs continuity pass.

## Round outcome

Root accepts the focused F15/F16 repair. No material preparation finding remains within this target. Performance, GPU and production acceptance remain separate from this historical re-review. Current delivery status remains in [the plan](../plan.md).
