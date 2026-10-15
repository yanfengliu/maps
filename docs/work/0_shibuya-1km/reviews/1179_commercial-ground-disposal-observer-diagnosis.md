# 1179 — Disposal observer diagnosis

2026-10-15 UTC. **HOLD — instrument oracle defect established; disposal leak not established.** Read-only diagnosis of the immutable early1178 archive and installed runtime metadata. No subject code or Process object was executed or created.

| Frozen observation | Actual bound |
| --- | --- |
| Error-order controls / child syntax | Five literal PASS; one syntax PASS |
| Lifecycle ledger | startup-failure FAIL; nine DID_NOT_RUN, including old-source RED |
| Startup witness | Pre-assert RUNNING; started=false; Dispose attempted/returned=true; Disposed events=0 |
| First/later facts | Helper first error is missing-executable Start; no helper cleanup error. Controller then reports “1171 actual disposal missing: startup-failure”; caller and host preserve their later phase refusals. |
| Native closure | Root19:25:31.6796173Z: five exact recorded births absent, zero scoped processes/listeners/kills; zero fixture Node children. Unknown metadata hosts and unrelated processes are outside this bound. |

**F1 — inherited event is not a disposal oracle for this Process implementation.** The pinned25-byte `Process.Dispose(bool)` IL checks `_disposed`, calls `Close()` when disposing, assigns `_disposed=true`, and returns. It never calls `Component.Dispose(bool)`. Inherited public `Component.Dispose()` virtual-dispatches to that override; the event invocation exists only in the bypassed Component implementation. `Close()` returns immediately for a never-associated Process, but the override still sets `_disposed`. Association therefore explains the absence of a child handle, not the absence of the event. The same event assertion would reject successful disposal in the remaining helper cases and after old-RED manual cleanup.

The source attaches the delegate before Start and invokes Dispose in an unconditional nested finally. Successful-return flags plus this implementation explain the observed zero count without an attachment/closure defect. They do not independently recover the actual object's private state. No observer-attachment execution test ran, and the historical child did not record loaded assembly MVIDs. Current local metadata binds PowerShell7.6.5/.NET10.0.11 and the same pinned pwsh executable used by the frozen run.

General [Component event documentation](https://learn.microsoft.com/en-us/dotnet/api/system.componentmodel.component.disposed?view=net-10.0) describes the inherited API; [Process disposal documentation](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.dispose?view=net-10.0) identifies the override. Neither establishes this installed override's event behavior. Exact informational-commit remote source retrieval was unavailable; local assembly bytes and complete IL supply the causal proof.

**Minimum correction:** retain the helper, old failing cleanup body, child, caps and geometry unchanged. In controls, bind the actual observed Process object and private Boolean `_disposed` field to exact runtime/assembly/MVID/field metadata, fail closed on mismatch, read false before disposal and true afterward. Never write the field. Keep Disposed counts as non-authoritative observations. Started cases must also retain actual SafeHandle closure, independent watchdog/birth closure and rescue=FAIL. Old RED must show false before its explicit rescue disposal and true afterward; its skipped-Dispose failure stays meaningful.

Before another lifecycle batch, separately authorize tiny never-started positive and omitted-disposal controls with independent literal false→true and false→false expectations; finally dispose both objects. These controls remain proposed, not executed. This is object-state evidence, not proof that an operating-system child exited; the existing handle/watchdog checks remain necessary.

**Secondary schema finding:** order/caller/syntax/controls are literally three-element arrays `[{},{},receipt]`. Their receipt records retain correct exit/status fields, empty guard errors and no cap/rescue. Preserve those arrays; do not claim singleton returns or silently normalize. Their empty-object runtime types are not established by JSON. The array shape did not cause the recorded lifecycle event assertion.

Two reviewer metadata attempts failed: unsupported IL operand decoding, then a reflection-extension lookup. Both diagnostics and the failed archival script are retained. The corrected metadata script produced six complete method decodes, read back independently. No runtime control, helper, caller, fixture, profiler, processor, calibration, constructor or public gate ran in1179. Root owns subsequent repair and release.

| Exact evidence | Bytes / SHA-256 |
| --- | --- |
| runtime-il.json | 54049 / `1d0d133221126dd208e7680fd107cd3d9d8891f04815777b54679f40499e1201` |
| System.Diagnostics.Process.dll | 329512 / `2b4871e02b366113c6ccf3b1436fadde5e69fc0a3e3ac421e2fa0f7af8c2bc3b` |
| System.ComponentModel.Primitives.dll | 79696 / `b671ae0e9463f65d2ad08366c890043fd570f7d3149bb57bc16b8d427d9684f5` |

Both assemblies report `10.0.11+e2f47b0110ed922f21a1522da67279133ce28f32`; MVIDs are respectively `23235a39-886d-4a56-8862-e081e5b834db` and `576a911f-a2f3-4789-a078-f5d4918e3621`. Full absolute input/history pins, raw-array projections, exact error facts and native census are in `data/commercial-work/1179/manifest.json`. The report is a separate external artifact; the manifest is written last.
