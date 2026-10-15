# 1181 — Native disposal oracle source review

2026-10-15 UTC. **ADMIT SOURCE ONLY for the exact1182 object-control variant combined with unchanged frozen1180 inputs and lifecycle controller.** Original1180 remains HOLD. This permits root to consider a separate runtime release; no disposal, lifecycle, profiling or product acceptance follows.

| Initial1180 finding | Exact1182 resolution |
| --- | --- |
| F1: object-control line34 made event count a PASS criterion despite its informational role. | Event comparison removed from admission/assertion. Actual count and expected informational context remain recorded. |
| F2: earlier action/cleanup errors could be superseded by later Console failure; an active case could remain RUNNING. | Nine error sites share one recorder. It preserves the first fact, appends later facts, marks HOLD and immediately marks an affected active case FAIL. Later untouched cases stay DID_NOT_RUN. |

All13 literal reverse edits recover the exact3603-byte1180 object script. The4755-byte replacement parses without AST errors and contains zero Process.Start calls. Its sole primary-error assignment is guarded by absence of an earlier error. Before-cleanup output failure is recorded before mandatory finally disposal; post-cleanup observation and final-result output each have one guarded stderr fallback. Completed cases remain completed if later aggregate reporting fails, while overall status becomes HOLD. These error paths were inspected, not executed.

The unchanged1180 lifecycle delta has12 exact reverse edits recovering its1171 baseline. All ten IDs, order, injected faults,250/1000ms helper waits, expected termination, first/later facts, SafeHandle closure, independent watchdog and rescue=FAIL checks remain. New operational outputs resolve under1180; helper, child and old failing RED source stay absolute1171 references. All24 frozen1178 output pins match. Old RED observes native false before explicit cleanup and true afterward while retaining its original skipped-Dispose code.

The oracle reads the actual observed Process object's private Boolean field. Exact loaded DLL path/name/hash/MVID, field metadata and six method signature/token/IL bindings match the pinned1179 causal evidence. Missing or changed qualification refuses before cases. The two independent literals remain false→false/refused and false→true/admitted; both require finally=true. Helper flags do not supply those expectations. Started cases still require actual handle/watchdog closure.

Raw helper return is preserved before assertions, with exactly one checked lifecycle schema record and only the expected zero/two empty ancillary values. Refusals and independent observations are saved before case assertions. The unchanged source/input combination, early/full leaf parity, both preparation indexes and separate reports are pinned; no mutable1180/1182 source was read.

The proposed1183 parent arrangement is source-compatible with the exact five reviewed1176 function extents: own1183/target1171/UTF8(false), fresh object1183/control1183 output names, explicit pinned pwsh argv,5000/30000ms execution waits and5000ms shared grace. The object variant imports absolute1180 bindings; the lifecycle controller retains absolute1171 sources and1180 outputs. This is an unexecuted selection, requiring fresh root authority and pin/freshness/receipt/closure admission. Parent reporting overhead remains outside its documented measured span.

Both proposed object cases and all ten corrected lifecycle cases remain DID_NOT_RUN. No Process object, subject/oracle/helper/caller/control/Node, repeated syntax check, profiler, map, constructor, browser/GPU, public gate or Git execution occurred. No application closure,237-case policy, geometry, helper or cap changed. Two reviewer metadata mistakes—a CRLF matcher assumption and a report-name lookup—are preserved with their successful narrow corrections.

| Exact selected artifact | Bytes / SHA-256 |
| --- | --- |
|1182 object variant|4755 / `de7f0e61385c8d9a97847ac0d41f4ae78353d1e6b44ecc8c51c0e05041a56457`|
|1182 preparation index|22366 / `ac3e2f29cb286e4aa44e54e0eae9ee57ed0dee3c4dcd20e6321fde7782f47aaf`|
|Unchanged1180 preparation index|22341 / `7efb9e433abd0f2dbb533ea210cedd06c7c171d49402e4dc84845531bbf827b2`|

Full flat absolute pins, consumed/preserved history, source coverage and native census are in `data/commercial-work/1181/manifest.json`; the report remains separate. Census totals use explicit scalar addition, with no unrelated checkout content hashing. The manifest is written last and then verified read-only.
