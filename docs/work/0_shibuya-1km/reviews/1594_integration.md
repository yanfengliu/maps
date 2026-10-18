# Review 1594: integration

## Target

Actual CPU preparation1601 for one fresh-baseline S1/train capture, not the candidate. Maps maina4dcc79232f8e22fa1d6e2c1844d5f96d0ab527c; accepted executable e1097edd; unadopted candidate source actual base16bb1f360eb1b530fb4cf92413f932b21dc11616. Retained artifacts/taa1601/freeze.json SHA-256 7aa0fa077e3ff5fb8f5c45b324b89c3d67cc06fe8dd15899cf19fadf3cd26f4c binds exact adapters, inputs and existing builds. Root's issued baseline lease SHA-256 e2a3416d9be96cdaf4bbe00d4eb2485490d164c2f7fba7683a393f018c34e616; candidate has no lease.

## Reviewers and coverage

Independent native1602 reviewer checked actual minimal adapter changes and54 pins plus two protected files. Its substantive report follows unchanged, original SHA-256 86803b8a1c89af5c94e78ff579850d279c7484a3d32ba96f42079319ae23f7f7. This is readiness for one bounded qualitative attempt. No temporal quality, arrival or final acceptance is inferred.

## Reports

### Independent native1602 reviewer

# 1602 — Conditional S1 native-capture readiness

2026-10-18 UTC. Independent read-only review by /root/native1602_s1_readiness. Verdict: GO for ONE bounded fresh-baseline S1 attempt under root's clarified done-condition. Candidate remains undispatched and requires actual baseline capture, native train inspection and external closure. No promise of train arrival, successful capture, comparative quality, adoption, full-gate completion, FPS or A6 acceptance.

The initial assessment was HOLD for unconditional schedule readiness: the CPU predictions are simulation time, and current S1 setup latency plus simulation/wall pacing are unknown. The first predicted interval is 7.8333333333–8.75 s and the second 46.65–47.5666666667 s, with period 122.6383256585 s. After the second interval the next begins at 130.4716589918 s, more than 82.9 simulated seconds later. Thus the 40 s wait is not a coverage guarantee. Root explicitly clarified that one safe bounded attempt is the required outcome, accepting this uncertainty without retries, longer limits, weaker predicates or new scheduling machinery. This clarification resolves the initial HOLD; it does not establish reachability.

## Inspected inputs and actual pins

Read AGENTS.md, local-rules.md, lessons.md, plan.md and exact contract1552. Actual primary HEAD is a4dcc79232f8e22fa1d6e2c1844d5f96d0ab527c. The accepted executable remains e1097edd4f0d65f41e6d6c157def4d51fa877318. Candidate worktree is artifacts/taa1582a/worktree, branch codex/motion-aa1582a, actual base 16bb1f360eb1b530fb4cf92413f932b21dc11616. The source-freeze base label 244ef9 is not the actual worktree base. Existing unrelated primary edits and untracked snapshot were preserved.

Independent current measurements passed 54 SHA-256 comparisons: the1601 freeze and all12 listed files, all16 contract inputs, all8 candidate source files, four helper equalities against1593, both six-file builds, and the candidate patch. Each measured path's ancestors were checked for reparse points. Two additional protected-file pins matched. No broad source/helper re-audit or runtime build was performed.

| Input | Actual SHA-256 |
| --- | --- |
| artifacts/taa1601/freeze.json | 7aa0fa077e3ff5fb8f5c45b324b89c3d67cc06fe8dd15899cf19fadf3cd26f4c |
| artifacts/taa1601/runner.mjs | 5a2844007dda6622199c53e6db56115e884c84e38850047ef67c71106893ac7a |
| artifacts/taa1601/contracts.json | 98695de552487b05be2b865f042c266f4aff1b37a178d239596b6c04510327a3 |
| artifacts/taa1601/run-owned1601.ps1 | ee4fed473bf37776fac4d55ad3c388078d23373146537c95be9f9a4bda4ac4eb |
| artifacts/taa1593/source-freeze.json | 80f003149b1dbb1b075d5eeeea06e1b24a4924a8c23c44afc80730c06ff01bd4 |
| artifacts/taa1582a/reviewed-source1593.patch | 3648ae7bed00625e6e11e4ec78d6ab781c96f67ce2ad359dcd03908db738277e |
| artifacts/train1473/candidate1/frames.json | 0c3fbc3625e00fe4fd9008d990d4c985b5cb3f1efd67d896ab68030b9a3ae786 |
| artifacts/taa1601/cpu1601-result.json | 64b840619c24293a8c4463c8ee6bc5bf02c89be32c9e2e0cccd3d8f32ee3fa96 |
| AGENTS.md | 3009aa563a6d4199646a12ff7832741d585f6c08ee80e3397f68aeb718787df3 |
| test/facade-emission.test.ts | 48a3d4d9c0ae833c2fe12082ba59c8fd32335e062de76f062f8508496a3fc52a |

## Source findings and dispatch boundaries

The1593-to1601 runner diff changes only baseline/candidate selection for S1, removal of S0 baseline reuse, references to the existing pinned builds, port4371, and the approved actual-event wait. Controller changes are path/marker/port and S1 admission only. burst96.mjs, checks1572.mjs, lifecycle.mjs and process-safety1563.ps1 remain byte-identical. The pinned CPU receipt records before/after runtime156files/364187965B/digest288997c50656c4adc6300b42beaa52903247b6c55e8cf22beb314954f4f32e62 in each arm,25 harness files and the unchanged certificate. This review verified that receipt's bytes and current source/build pins, without independently rehashing the full runtime tree; actual runner checks runtime before and after dispatch.

The historical north-east-00 recipe is retained as target(85.89356314529735,15.2,-337.82969107803234), azimuth pi/2, polar0.62, distance220, native1280x720/DPR1. Pan, orbit and zoom use real controls. The runner retains actual observations, with no camera setters, render calls, actor hiding or simulation resets. Only historical pose/schedule metadata is reused; rejected candidate pixels are not quality evidence.

Each arm captures a new native setup.png and blocks until setup-decision.json names its actual SHA-256 and visible:true. Root must inspect that exact image and require a clear intended track/corridor before approving; counters cannot replace this judgment. The unchanged decision error text mentions pavement/bases or train, but the1601 contract explicitly requires the S1 track/corridor. This is a manual qualification boundary, not automatic proof that all cars remain visible throughout the later moving sequence.

The actual event requires track146060273, four cars,32 wheels, station490..500 inclusive and speed>6, identically for both arms. It records frameCount,pageMs,simulation time,station,speed,direction,dwell and counts for every observation and saves the matched full observation. The wait deadline is min(now+40000,workDeadline−15000); observation and polling are bounded by that deadline. An expired deadline or no remaining wait budget throws before burst. A successful match additionally requires at least15000 ms of remaining work before proceeding. No schedule prediction is used as an event match.

The unchanged burst still requires96 adjacent full1280x720 copies, an8s copy bound, nonblank images, actual moving camera observations, error-free rendering and complete cleanup. The337.5MiB estimate covers raw copies only. The15s reserve is an admission bound, not a guarantee that later encoding, IO or RPCs complete in time. The controller retains its150s work/30s cleanup boundary and the external180s ceiling remains independently required. Direction is observed rather than matched; different directions/timing can occur between arms and cannot be described as phase-matched evidence.

Fresh baseline SUCCESS must carry this S1 contract hash and successful runner cleanup. Candidate also requires successful baseline controller census, no marker matches and closed port. The code does not inspect native train quality or the external supervisor receipt; root must withhold the candidate lease until the actual baseline sequence has been inspected and its external closure accepted. No S0 baseline-reuse extension is present.

Cleanup remains based on retained process handles with PID/birth/executable qualification. Late acquisitions are tracked and closed after stopping; final census checks known and omitted identities plus late descendant edges. Foreign/unadmitted processes are not termination targets. The controller explicitly does not promise hard real-time OS inventory completion. Root must supply the same external180s retained-handle supervisor, reconcile omitted/late births and remove the exact owned profile after fresh closure. The prior1593 supervisor receipt, independently hashed5ab34ad9a75a043fa535cb694824befa3b2f56b25bd16be47def0e2a12b7369a, is historical evidence only, never current S1 closure.

No blocking source defect was found in this focused diff. GO is conditional on root's current lease, actual native setup qualification, exclusive GPU/port ownership and the independent external supervisor. A missed event produces a failed attempt with preserved observations; no automatic retry or limit extension is authorized. A successful baseline still requires native review before any candidate lease.

## Review limits and resources

No browser, GUI, GPU, server, build, test suite, external review CLI, source edit, dependency/cache mutation, commit, merge or push was performed. No task-owned browser/server/profile was created, so there is no reviewer-owned capture process to terminate. Only this ignored authored report was created. Existing user/other-task processes and artifacts were untouched. The first pin-summary command used a PowerShell property/literal comparison and incorrectly listed matching rows as failed; it was discarded, then all54 comparisons were rerun with explicit per-row value comparison and passed. A later read-only formatting command had a parser error before execution and was corrected. Neither failed command changed files.

## Findings and disposition

No material adapter defect found. The reviewer initially held unconditional arrival readiness because CPU schedule predictions are not wall timing and have long gaps. Root accepts that uncertainty for exactly one safe bounded baseline attempt; missed events must fail before burst without a retry, longer limit, weaker predicate or new scheduler. No successful arrival is promised. Candidate remains withheld pending actual baseline appearance and closure.

## Verification

The report records exact source/build/contract comparisons and unchanged helper bindings. Import/syntax checks passed in preparation; no browser/GPU/runtime gate was run by the reviewer. The prior external supervisor existed only in the original worker's inline tool call. Root recovered that actual source and retained it under artifacts/taa1601/external1593-original.ps1; path/lease/output/baseline/S1 adapters produce external1601-baseline-S1-run1.ps1, SHA-256 5598e42ee51c2505fd936355f0a18a59691a29e4709b1af635c996e9dc92f06d. Its180000ms wait and5000ms owned termination wait are retained, not a hard-real-time guarantee. No new launch framework was introduced.

The frozen setup authority permits root or worker to inspect the actual native image. Root delegated the time-sensitive SHA-bound decision to the capture worker and additionally inspected the same setup original. That delegation changes neither visibility predicates nor event/copy/time/cleanup bounds. Actual capture and closure belong to the subsequent run record, not this readiness verdict.

## Round outcome

Conditional GO accepted for the single fresh-baseline S1 attempt. Candidate, retry, held-out, final source adoption, cost/FPS and A6 acceptance are not authorized by this round. The accepted executable and all35 implementation identities/14 criteria remain unchanged.
