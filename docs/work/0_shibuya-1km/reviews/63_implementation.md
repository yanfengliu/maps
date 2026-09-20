# Review 63: implementation

## Target

Independent read-only review of the one admitted native survivor-observer run, based on maps `d7c8eea43c1cbfc6e85bcd01306fd43898be6b66`. The exact [run-03 report](../snapshots/63_native-survivor-run-03-report.md) is retained byte-for-byte, SHA-256 `6b2f99e3be25bc3bb8aa74bd78494f2aa0c36543bf5238aa042a728bbf6df83a`. The executor's 63-member `run-03/RUN-03-HANDOFF-FREEZE.json` is `bf4ac79911596e7d0314c279c3e89c75c098cf9f112946f518f7d7634cee8068`, rooted at `artifacts/native-survivor-observer/wt/artifacts/native-proof/`.

The executed source and binary are the exact Review61 targets: source `83ef7ed5bf917cc24249441f28e01285c94c64e9cfa849351e933f3d1a96c68e`, executable `b068a95dd98adb466bf4668323a0f63e1d5921b4cb9066d531552ae01438c681`. Review61's authored report is `e90e2515295d3cb077fbc86880dcf23d0555a4930aedc5411426ca6f95cd0be3`; its original target and source remain recoverable under `artifacts/native-survivor-review/frozen/`. The 47-member preparation freeze remains `668e541b4737b40b2918e6ed596cea20f171f666c12e2bbfeda6b72ce34af3c9`, and the 15-member execution-input freeze remains `6f9a76fdacbd3d85ff8e9a0b220509177c875bf34234608d5c77cbd8cefedc78`.

Raw `baseline28/events.tsv` is `72cdce3c787fe5fd75b619fa6b6c98108dd555f46a9ae119527ff731101df26d`; raw `observer6/events.tsv` is `641a9681fdcc5ac91399b4323ad120072d226922501b2a630988037b802707b1`. The original executor tree remains intact. Minimal reviewed raw evidence, the independent parser and before/after checks are retained under `artifacts/native-survivor-results-review/frozen/`.

## Reviewers and coverage

Reviewer: `native_survivor_review`, independent of the executor. This round checked the saved actual tool receipt, complete observer rows, all baseline owner waits/exits, accounting sequences, scores, rescue and handle-balance records, both group summaries, source interpretation and all three frozen manifests. The reviewer wrote a separate parser directly against the raw TSV records; the executor's parser and synthesized inspection results were not used as the acceptance oracle.

The earlier Review61 source judgment supplies the already-reviewed original-handle and acknowledgement semantics. This round is a results review of those unchanged bytes, not another implementation review. No second reviewer or CLI vote is claimed. No new native execution, compiler, browser, GUI, CDP, GPU, server, dependency work, product gate, source mutation, CPU model-suite run, commit or push occurred. Root owns finding disposition, stage admission and integration.

## Reports

### Independent result judgment

**Accept the new six-case evidence as satisfying F32's missing liveness discriminator within this run's stated bounds. Recommend that root permit preparation of the already-reviewed minimal pipe-stage design next. Neither recommendation accepts the whole primitive or grants implementation or execution of that next stage.** The evidence separates a retained live fixture from delayed positive accounting. No new material discrepancy was found between the raw records and the executor's report.

Every new target was unsignaled before its owner was killed. Each original owner wait then returned WAIT_OBJECT_0; each exit-code query succeeded with 93 and the shared verdict remained zero. The post-cut target wait was recorded after the same bounded accounting loop and before observer closure or outer rescue. The recorded distinctions are:

| Matched pair | Cut | Target | Negative post-cut wait | Candidate post-cut wait | Negative / candidate last outer count | Negative / candidate pre-to-post sample interval |
| --- | --- | --- | --- | --- | --- | --- |
| Post-assignment / creation-assigned | 12 | Created root | WAIT_TIMEOUT | WAIT_OBJECT_0 | 1 / 0 | 500 / 16 ms |
| Leaked job / private job | 14 | Created root | WAIT_TIMEOUT | WAIT_OBJECT_0 | 2 / 0 | 500 / 16 ms |
| Breakaway / contained child | 16 | Created descendant | WAIT_TIMEOUT | WAIT_OBJECT_0 | 2 / 0 | 500 / 16 ms |

Those intervals are between the two recorded GetTickCount64 samples, not measured intervals since kernel owner death. The negative accounting loops last recorded 484 ms. The first two candidates last recorded zero at 16 ms; the contained-child candidate's first accounting query already recorded zero at 0 ms. Zero elapsed values reflect the instrument's coarse clock and do not prove zero-duration operations. An unsignaled process is not yet terminated at that sample; it does not prove continuing application progress or survival for every future schedule.

The raw transfer chains agree with the reviewed source. The four root cases each record one successful `original-root-target` duplication with requested SYNCHRONIZE rights, 1048576. Both descendant cases record an `original-root-bridge` duplication with requested PROCESS_DUP_HANDLE plus SYNCHRONIZE, 1048640, followed by an `original-child-target` duplication with SYNCHRONIZE. Every duplication reports success and error zero. The child target duplication precedes runner acknowledgement, which precedes the live pre-cut target sample. Each case records the expected target kind and a successful post-cut validation.

Both descendant cases have actual child-creation evidence. The source events record the original root returned to the owner, a descendant created by that root, child-handle publication by the root, first execution by that child, successful child admission and checkpoint 16. The recorded PIDs corroborate fixture roles; they are not the ownership authority. The authority remains the unchanged source's original process-handle chain. Granted rights, non-inheritance and kernel-object identity were not separately queried by the native rows; successful calls are interpreted through that reviewed code and the OS DuplicateHandle contract.

The runner publishes `OBSERVER_CHILD_ACK target_owned=1` after acquiring the target in both cases. Neither trace contains `observer child duplication acknowledged; source handle may close`, so neither proves the source fixture consumed the acknowledgement before termination. That is correctly disclosed by the executor. It does not invalidate the observation: the source barrier retains the original child handle until acknowledgement consumption or fixture disposal, and the runner already owns the final duplicate. The mailbox events are dumped later as EVENT rows; their position in the TSV is not their execution order. The review uses their recorded event indices and ticks, together with the reviewed call order, instead of treating append position as a cross-process total order.

Every explicit observer close reported target and bridge closed, both errors zero and retained error zero. All 34 cases separately recorded outer rescue closed, accounting zero, original root waited, separate pipe EOF and the outside sentinel still alive. All 34 case records report owned-handle balance and kernel-handle count 63 before and after. Both group finals report the sentinel drained and zero owned handles. These are the scoped cleanup observations after scoring; they do not turn rescue into evidence that an inner candidate passed. No pending close or incomplete rescue path was exercised in this run.

The original baseline remains a separate, honestly partial result: 23 PASS, four raw EXPECTED_RED, one UNAVAILABLE, zero failed checks, three unvalidated survivor labels. Its 25 non-survivor cases each recorded count 1 followed by zero at elapsed 0, 15 or 16 ms. The three survivor labels ended at positive counts 1, 2 and 2 but still say `validation=not-established`. The new observer6 records three PASS and three validated EXPECTED_RED, with no unavailable or unvalidated cases in that group. Its COMPLETE status covers only those six cases. Combined status remains PARTIAL because the unchanged baseline still carries its stated limitations.

The held-pipe control remains distinct evidence. Its recorded inner zero precedes a `pipe drain pending` record naming the 100 ms bound and an expected nonfinal verdict; separate EOF and rescue-complete records follow. This demonstrates the zero-versus-EOF distinction for that fixture. It does not establish native CDP framing or overlapped-I/O disposal. The checkpoint-11 creation-window case remains UNAVAILABLE. Creation-time job assignment and enclosing-job containment remain named OS premises from the reviewed design, not measured interruption inside the kernel and not grounds for demanding a driver.

### Actual command receipt and next-stage boundary

The independently retained execution-tool object records chunk `a8b776`, wall time 4.6941827 seconds, completed exit code 2, empty output and no session ID. Its exact digest is `aa8318389e88bc0458106e32b7249002ba015a5e953c8601c6c7a3ec46fb92e2`. This is separate from the native stdout, which self-reports baseline28 exit 2, observer6 exit 0 and combined exit 2. Native stderr is empty. The saved object agrees with the actual tool result supplied in the root's assignment; the reviewer did not witness a second execution or reconstruct the OS value from FINAL. The receipt file predates the parser and report on disk, consistent with the recorded save-before-formatting sequence; those mutable timestamps are corroboration, not an independent immutable chronology proof. Run 02's OS exit stays unrecorded.

The approved executor census records successful read-only enumeration and zero exact task-path matches. The preceding sandbox census records access denied with null count and remains unknown, not zero. The later census is a post-run cleanup observation, not process ancestry or ownership evidence. No numeric-PID stop or broad application termination is needed to interpret this run.

This evidence removes the specific unvalidated-survivor obstacle to preparing Review56's next minimal pipe proof. Review58 had kept that next decision open until positive observations and discriminating negatives were independently reviewed; this round now supplies that bounded review. It does not establish every primitive schedule, every browser descendant mechanism or the full launcher contract. The unavailable kernel cut and all original counterevidence remain named.

For root's design-only admission, the next preparation should remain the previously reviewed native CDP-pipe interoperability boundary: exact installed Chromium executable and default argument generator, existing headless/hardware flags, sandbox/profile behavior, 1280×720 viewport and scale 1; Windows inherited fd 3/4 mapping and framing; actual public SDK callback, rejection and close behavior; and the separately owned native ledger, root wait, successful job zero, settled I/O and handle/directory closure. The known SDK path can swallow transport-close failure, so its promise is not a drainage receipt. The design must preserve independent error retention, late-acquisition joins, the non-breakaway job-at-creation policy and the outer rescue boundary. It must not introduce unchanged BrowserServer's numeric-PID stop paths, a helper framework or a capture controller rewrite by implication.

Preparation means producing the concrete smallest design and frozen proposed checks for root review. It grants no pipe implementation, browser/native launch, installation, new experiment or capture. A later exact implementation and execution grant remain necessary. The original 22 lifecycle plus 11 candidate checks, Review54 reds, source/identity guards, 36-shot synthetic controller and separately admitted 44-frame capture remain whole-launcher obligations rather than substitutes for this six-case result.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
| --- | --- | --- | --- |
| F32 | Accounting alone did not validate the intended live-survivor controls. | Reviewer recommends scoped resolution: all three new negative observer targets remain unsignaled after owner death, and all three matched candidates are signaled before rescue. The old raw labels retain their unvalidated status. Root owns final disposition. | Carry this exact six-case evidence and its bounds into any next-stage design; do not relabel historical runs or issue a primitive certificate. |
| F31 / F33 | Initial observation and unavailable-status handling needed correction. | Corrected bodies and separate baseline PARTIAL/combined exit 2 are preserved in this run. Actual tool exit 2 is now independently recorded for run 03 only. | Preserve run 01 and the missing run-02 OS receipt as history. |
| F28 / F30 | Whole-launcher ownership, unsafe SDK paths and joined disposal remain unaccepted. | Unresolved. The evidence supports preparing the previously reviewed minimal pipe design, not accepting a launcher or running that design. | Root may separately admit bounded preparation, followed by exact source review and execution admission. |

No new finding ID is requested.

## Verification

The reviewer-owned `artifacts/review63/check-recorded-run.mjs` independently verified all 63 run-handoff members, 47 preparation members and 15 execution-input members against lengths and SHA-256 before review and again at handoff. It parsed all 34 raw case records, owner waits/exits, every accounting sample, six duplication/wait/close chains, descendant publication and acknowledgement ordering, separate rescues, kernel/owned-handle balances, group finals, stdout, actual saved tool receipt, empty stderr and both census outcomes. Both invocations exited 0. This is verification of recorded evidence, not another native run or a replacement for Review61's source review.

The permanent report has the required six sections, and the run-03 report snapshot matches its exact target digest. Minimal raw evidence and the reviewer checks remain ignored and byte-bound in the handoff freeze. No source, binary, executor report, old failure artifact or primary-checkout file was changed. The review created no junction or native/browser/GUI/server process. The final handoff records the review's own resource census and isolated worktree removal after preserving its files. The executor's original tree remains intact. The two authored review documents await root integration; no commit, merge or push is claimed by this worker.

## Round outcome

Run-03 results review complete. Recommend scoped acceptance of the three matched observer distinctions for F32 and design-only preparation of the already-reviewed minimal pipe stage. The combined diagnostic remains partial, the kernel interruption cut remains unavailable, and F28/F30, whole-primitive, launcher, browser and capture acceptance remain separate. Root retains admission and final disposition.
