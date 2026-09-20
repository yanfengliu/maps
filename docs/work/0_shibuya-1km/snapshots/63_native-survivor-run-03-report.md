# Native survivor observer: one admitted run

## Target and authority

Owner: `native_survivor_execution`. Root admitted exactly one diagnostic execution after accepting Review61, SHA-256 `e90e2515295d3cb077fbc86880dcf23d0555a4930aedc5411426ca6f95cd0be3`, and its 62-member review freeze `a762b8260e2866bbcb1054d66dd4d10dd9a6e22e86c8196ce0fe636528dc8aa9`. All six conditions in that review governed the run. `execution/root-execution-grant.json` records the separate grant. Historical preparation flags remain unchanged.

The isolated checkout is `artifacts/native-survivor-observer/wt`, based on `d7c8eea43c1cbfc6e85bcd01306fd43898be6b66`. Candidate source SHA-256 is `83ef7ed5bf917cc24249441f28e01285c94c64e9cfa849351e933f3d1a96c68e`; the frozen executable is `b068a95dd98adb466bf4668323a0f63e1d5921b4cb9066d531552ae01438c681`. All 47 candidate members and all 15 run inputs were rehashed immediately before execution. Candidate freeze `668e541b4737b40b2918e6ed596cea20f171f666c12e2bbfeda6b72ce34af3c9` and input freeze `6f9a76fdacbd3d85ff8e9a0b220509177c875bf34234608d5c77cbd8cefedc78` matched.

No source, frozen input, case, timer or control changed. No compile, retry, browser, CDP, GPU, capture, product edit, commit or push occurred. All new evidence is under this ignored `run-03` directory. The only native invocation was the exact `NEXT-COMMAND.txt` command, directly invoking the frozen binary with `paired-runner` and immediately propagating `$LASTEXITCODE`.

## Actual exit receipt

The execution tool returned completed, with no session ID: chunk `a8b776`, wall time `4.6941827` seconds, actual exit code **2**, empty tool stdout. Raw native stdout and stderr had been redirected by the admitted command. Before any report or parser ran, the complete returned tool object was saved verbatim in `execution/native-exec-tool-result.json`, SHA-256 `aa8318389e88bc0458106e32b7249002ba015a5e953c8601c6c7a3ec46fb92e2`. This is the independent tool/OS receipt. It was not inferred from native output.

Native stdout separately self-reported baseline28 exit 2, observer6 exit 0, and combined exit 2 with 34 total cases and no primitive certificate. Its SHA-256 is `1323204905525d9bda37419b4c89f975e9ef9e2cd6ee6d2ae0df2e297a0d753e`. Native stderr is empty. The prior run-02 OS exit remains unrecorded; this run does not recover or replace that missing receipt.

## Per-case observations

The baseline and observer groups keep separate denominators. Baseline28 recorded 23 PASS, four raw EXPECTED_RED, one UNAVAILABLE, zero failures, and three unvalidated survivor labels. Its final status is PARTIAL. Observer6 recorded three PASS candidates and three validated EXPECTED_RED controls, zero failures, zero unavailable cases and zero unvalidated controls. Its final status is COMPLETE. Combined status is still partial.

Every observer target was unsignaled at the live pre-cut sample. All six original owners were signaled after termination: owner wait returned WAIT_OBJECT_0, GetExitCodeProcess succeeded with 93, and the raw shared verdict remained zero. Each post-cut target sample followed owner signal and the unchanged bounded outer-accounting loop, and preceded outer rescue.

| Observer case | Cut | Target | Post-cut wait | Last raw outer count | Last accounting time | Pre-to-post sample interval |
| --- | --- | --- | --- | --- | --- | --- |
| Post-assignment negative | 12 | Created root | WAIT_TIMEOUT | 1 | 484 ms | 500 ms |
| Creation-assigned candidate | 12 | Created root | WAIT_OBJECT_0 | 0 | 16 ms | 16 ms |
| Leaked-job negative | 14 | Created root | WAIT_TIMEOUT | 2 | 484 ms | 500 ms |
| Private-job candidate | 14 | Created root | WAIT_OBJECT_0 | 0 | 16 ms | 16 ms |
| Breakaway negative | 16 | Created descendant | WAIT_TIMEOUT | 2 | 484 ms | 500 ms |
| Contained-child candidate | 16 | Created descendant | WAIT_OBJECT_0 | 0 | 0 ms | 16 ms |

The four root cases each recorded one successful non-inheritable SYNCHRONIZE duplicate, rights 1048576. Each descendant case recorded a successful original-root bridge with PROCESS_DUP_HANDLE plus SYNCHRONIZE, rights 1048640, followed by the original-child target with SYNCHRONIZE, rights 1048576. Every duplication reported error zero. The reviewed source establishes non-inheritance and immediate ownership-ledger insertion; the native rows separately record successful duplication, stage and requested rights. The rows do not independently query the granted rights or kernel object identity after duplication.

Both descendant cases recorded actual descendant creation, original child-handle publication held until acknowledgement, child admission outcome 1, and runner acknowledgement with `target_owned=1`. In each log, the target duplication precedes acknowledgement and the live target wait. The acknowledgement is the runner's publication; no separate record proves that the child consumed it before termination. Source review supplies the held-handle barrier interpretation. No refusal is counted as containment.

All six transfers reported elapsed 0 ms, and each owner wait reported elapsed 0 ms. These are GetTickCount64 measurements at this clock's observed coarse resolution, not claims that operations took no time. The additional handles and transfer work can change scheduling and accounting. The six observations apply to this instrumented run and never rewrite the baseline's raw survivor labels.

Every observer close reported target and bridge closed, both errors zero, and retained error zero. All 34 cases separately recorded outer rescue closed, accounting zero, original root waited, pipe EOF, and outside sentinel still alive. Every case reported owned-handle balance true and kernel handles 63 before and 63 after. Both group finals recorded the sentinel drained and owned handle count zero. Rescue success was not used as the pre-rescue observation verdict.

All 28 baseline cases have their owner wait, exit query, shared verdict, every accounting sample, pre-rescue score, separate rescue and both handle balances retained in `execution/inspection-results.json`. The 25 baseline cases other than the three survivor negatives each observed an initial outer count 1 followed by zero at measured 0, 15 or 16 ms. This includes the deliberately unavailable cut and does not turn it into coverage. The three raw survivor negatives ended at counts 1, 2 and 2. All their accounting calls succeeded, but their labels remain `validation=not-established` in this baseline.

The held-pipe baseline retains its expected nonfinal event with a 100 ms pipe-drain bound, followed by separate EOF and rescue-complete events. `owner-creation-window` remains UNAVAILABLE at checkpoint 11. It is not claimed to interrupt the kernel inside process creation. Creation-time job assignment remains an OS premise from the reviewed design.

## Verification and cleanup

`execution/inspect-run03.mjs` reads existing raw output only. Its header names the frozen native harness and its one-run bound. It asserts the exact separate 28/6 rosters, all per-case waits and queries, six duplication chains and rights, live pre-cut and expected post-cut waits, child creation/publication/acknowledgement rows, close records, score-before-rescue ordering, all rescue fields, both handle balances, both FINAL rows, all GROUP/COMBINED rows, the actual tool receipt, empty stderr and successful census. It passed with exit 0; `execution/inspection-tool-result.json` retains that separate result. This log parser is author-side checking and is not an independent native review.

After the run, all 47 candidate members, all 15 frozen run inputs and all 76 original corrected run-02 members were rehashed unchanged. The original run-02 freeze remains `82efa1e3b6ddc27206549c6167bb0ed6a6869fde4db564cc7a04cdeeb2cc625b`. The preparation false/pending flags, old evidence and limits were preserved. `execution/before-input-check.json` and `execution/after-input-check.json` retain all checked hashes and lengths.

The first sandboxed read-only Win32_Process census was denied access. Its failure is retained as unknown in `execution/post-execution-process-census.json`. The approved read-only census then succeeded and found zero processes whose executable is in this exact task worktree or whose native-proof command line names it. That result is retained in `execution/post-execution-process-census-approved.json`, SHA-256 `2c521fe878e173843fc20a763f919bc458a69841ee1ab2c18256b5efa291cd3a`. No numeric-PID kill, broad process stop or alternative cleanup ran. Root was notified immediately after the joined exit and successful census, releasing the native resource lease before report formatting completed.

Two preliminary read-only preparation checks used an incorrect guessed manifest name and a Git command with the wrong safe-directory/cwd combination. Neither changed files or ran the native fixture. The manifest was then located and verified by its actual name; Git status was read from the correct worktree before execution. No execution or cleanup error was concealed by these preparation checks.

## Evidence identities

| Artifact | SHA-256 |
| --- | --- |
| `baseline28/events.tsv` | `72cdce3c787fe5fd75b619fa6b6c98108dd555f46a9ae119527ff731101df26d` |
| `observer6/events.tsv` | `641a9681fdcc5ac91399b4323ad120072d226922501b2a630988037b802707b1` |
| `execution/inspection-results.json` | `8246b9355739ba882b17781006eabaa23d8ba7076f91c3ddf5e79a4cd8642eb3` |

The new run handoff freeze binds this report, raw logs, actual exit receipt, input checks, census, parser and its results, together with the unchanged reviewed candidate members. The report does not hash itself or claim its author-side parser independently validates the native instrument.

## Handoff and limits

One admitted native execution is complete and joined. The three separate negative observer targets were not terminated at their measured post-cut samples, and all three matched candidates were terminated at theirs. This supplies bounded evidence for root and independent Review63 to consider F32. It does not prove continuing application work by an unsignaled process, every timing schedule, the unavailable kernel cut, whole primitive correctness, or the launcher.

F28/F30, pipe-stage admission and browser/CDP/capture acceptance remain separate. No next stage is admitted here. The source, binary, original evidence and isolated worktree are retained for independent read-only result review and any later root-authorized preparation. Nothing is committed, merged or pushed by this assignment.
