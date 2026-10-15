# 1172 — Exact lifecycle repair source review

2026-10-15 UTC. **ADMIT the inspected private lifecycle source for root's consideration of bounded controls.** No runtime lease or runtime success follows. Frozen1171 index:59223 bytes/SHA-256 `158d211b46a5ef76a0f4db242d009b4e39ccfbf682ef1217e38e8303b52f1c9b`. The command-metadata errata below must be corrected in explicit launch authority before use; the frozen packet remains unchanged.

1170 F1 is resolved statically. `owned-lifecycle.ps1:44–49` sets the local successful-Start state before identity work. Cleanup at59–84 uses that state and the retained Process, independently of complete identity. Never-started objects skip associated-process queries. Stream/file closes are individually guarded, with unconditional Process disposal at86–97 before receipt work. Errors15–18 preserve first and primary facts separately from later failures; incomplete identity, failed queries/termination/drains/disposal or missing closure exclude eligibility at104–109. Receipt construction/write faults at110–118 retain errors, and final controller JSON121 is separate from receipt-file success. The receipt file is explicitly a pre-write snapshot, not evidence that writing returned.

One grace stopwatch starts at59. Every termination wait and each stream drain consumes its remaining5000 ms; completed tasks alone reach GetResult. Actual cleanup overrun becomes HOLD. Execution wait, cleanup elapsed and whole helper span are distinct. Synchronous API/disposal/reporting overhead is not a proved hard wall deadline; the final controller-output cost is outside the helper span and must be included by root's outer measurement. No benchmark claim is accepted.

Both fixed launchers use the same helper, joined absolute owned argv/output paths and their selected caps:1000 ms control,10000 ms calibration,5000 ms processor. Inherited `NODE_OPTIONS` is refused before Process creation. Processor leaf and ancestor checks are present. Fresh-log/source/PID/birth binding and full native descendant closure remain root obligations.

| Proposed real-Process control | Actual source discrimination; all remain unrun |
| --- | --- |
| startup-failure |Missing owned executable; Start error retained, no associated queries, actual Disposed event required. |
| identity-after-start |Real wait child; failure precedes helper identity capture; retained termination and independent closure required. |
| birth-query |Real wait child; PID retained, birth absent, injected error remains first. |
| cleanup-query |Injected HasExited failure still requires Kill(true) and exited handle. |
| receipt-build |Real normal child is already disposed when injected construction error occurs. |
| receipt-write |Injected failure before writing requires HOLD and no stale receipt; controller output remains separately inspectable. |
| first-error-survives |AFTER_START remains first/primary while four distinct injected failures are retained. |
| normal-completion |Exit0, exact stdout, one Disposed event and closed subject SafeHandle required. |
| bounded-termination |250 ms wait must produce EXPECTED_TERMINATION, actual kill/wait, complete drains and independent closure. |
| old-startup-red |Precisely instrumented old source retains its failing finally; absent executable permits only unassociated-object cleanup after observing zero disposal events. |

`lifecycle-controls.ps1:40–58` observes Disposed events/SafeHandle closure and retains a separate Process handle/identity, saving raw evidence before assertions. Its observer/rescue finally runs after helper return; a hung helper therefore needs the separately retained outer watchdog. Any inner or outer rescue makes the run FAIL/HOLD. Ten controls mean eight proposed Node children plus two no-child startup cases, not ten successful runtime observations. Injected receipt faults do not prove every real I/O failure. Drain exhaustion, throwing disposal and controller-output failure are unobserved paths, not passing gates.

**E1 — command-metadata errata.** `control-plan.json.proposedOuterCommand` splits directory and `/lifecycle-controls.ps1`; `launch-delta.json.fixedRoles` similarly splits profile script paths and combines two processor prefixes into one string. These are not executable argv as written. Actual launchers use Join-Path correctly. Root must publish joined single-path argv elements and two distinct prefixes before dispatch; this does not require changing the inspected helper/application source. A control-role early PASS cannot prove forced-stop usefulness: require EXPECTED_TERMINATION/deadline plus the separately reviewed fresh raw/processed V8 samples.

All26 inherited files retain exact/inverse equality; the full237 IDs/targets/bodies/arms, recorder, uncached validation and geometry/material/source/ownership/tolerance policies remain unchanged. The frozen syntax list is24 positive MJS plus the exact old RED. The inherited `syntax-batch.ps1` remains inactive and unqualified: its old unbounded/identity-dependent lifecycle is not admitted by this review. Root must separately select any new-child syntax check.

Only source/hash/census checks and unevaluated PowerShell AST parsing ran. No launcher, child, JS parser, helper, profiler/processor, calibration, constructor, browser/server/GPU or public gate ran. Actual input/owned-file hashes and full native metadata are sealed separately from unrelated blob contents. Root still owns runtime-control admission, sampler usefulness,237 completion,1157 union, emitted/browser/lifetime/native/public/main/full35/performance acceptance.
