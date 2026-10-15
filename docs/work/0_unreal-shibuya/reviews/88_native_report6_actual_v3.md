# Native dispatcher v3 report6 actual result review

Verdict: **ACCEPT REPORT6 ONLY: six AST/data reporting controls and the repaired wrapper's observed normal empty-stream/publication/readback path.** No material actual-result finding remains. Guard24, formal Native, Source, Runtime and Unreal acceptance do not follow. This is a separate actual review; prior static reviews, old RED records and their pending markers remain unchanged.

NativeW base supplied by Root is af8bdbd34228c69dea45dd99af4ae20d7c2a9798. The reviewed execution used dispatcher45885/d674fffa070736947cb90598e7e4856b1cc57e8e77dc4af623f6f75dcf5d174a, fresh reporting clone26531/78bfd50b and inputs3823/c022ba61. Original complete rows/subarms, Root stdout/stderr, saved outer/child records, started/lease/caller/prelaunch/closed packets, protection/cache records and current bytes were inspected. No target, helper, gate, process query or retry ran in this review.

## Complete original evidence and binding

| Artifact | Bytes | SHA-256 |
| --- | --- | --- |
| Root closed packet |14306|94616cc8973046a2c5cf55cbe7556f03c7d6fc7566234652c3c5cc181cb229b9|
| Root caller |2987|37b7a190c36b9dc84a136befadfec2ac4e9204e9f3d4ce74eb12154816219980|
| Root prelaunch |245149|e8f6bcbd6860cb62b1052627034a357aac82777f6cf2e27002738efdf0cce93d|
| Root one-mode lease |1411|21ea2d9bfdd462d04b3699c286208f53d163b52f0974555ccd8d081219d7dea2|
| Complete Root stdout |569|a6ee54370ce8496fd184a7557fde88a5de0e1079a0a3111707e6876771d8846d|
| Complete Root stderr |0|e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855|
| ND3/report6-outer-record.json |5033|3d0a27ae462b93cdfaedcb88a0e5bc4669cbc9cc303cfa5729533855cf2a1709|
| ND3/reporting-result.json |6271|d7aaf119973f24f24c5e207d1300072aeb60a6da4a3bb0025a4785bd4633a884|

Root raw stdout is exactly one complete JSON terminal with a final newline and no duplicate fields. Its final_record path/length/SHA equals the actual saved5033-byte outer record and the closed packet. Publication is complete, primary is null, secondaries are empty, terminal state requires Root wall/EOF/exit, and the actual caller supplies exit0 and complete streams within that wall. The saved outer's accepted_by_root=false and terminal's root_acceptance_pending=true are deliberate pre-Root markers, not rewritten success flags. External Root acceptance and this independent review supply the later conjunction.

Exact Root outerargv13/CWD match ready, prelaunch and lease. Actual childargv10/CWD match the fresh reporting-clone authority and started record. The actual configured ProcessStartInfo eight-entry environment equals the frozen authority. OuterPID54948/FILETIME134365410116414919 agrees between caller and saved record; held childPID53380/FILETIME134365410204935831 agrees between started and saved record. Full FILETIME values remain exact integers. No identity or descriptor was reconstructed from a path or process name.

Both actual saved child stream files are0 bytes with the empty SHA above. Each stream record reports observed_total=retained_bytes=0, true actual EOF, no overflow/read error, complete=true and diagnostic_only_if_incomplete=false. The descriptors independently match the actual regular files. Thus the repaired direct acquisition and saved-byte publication/readback succeeded through both empty-stream paths on this normal run. Empty files are observed complete captures here, not inferred from a PASS flag or missing file.

The new child result is at ND3/reporting-result.json, while the preserved old N2/reporting-result.json happens to have identical6271 bytes/SHA. They are distinct declared paths. The fresh path was absent in the recorded prelaunch52 set, is one of the exact nine created leaves, is selected by the new child argv/script/input binding and is bound by the actual saved outer result descriptor. Acceptance uses this complete fresh-path/owned-execution/publication chain; identical content hashes alone do not establish publication or reuse an old result. The old v2 missing-Length RED and missing child exit/raw/outer/terminal remain unchanged, and no old stream bytes are backfilled.

## Every actual reporting case and subarm

All six rows have the exact frozen order and typed attempted/completed/matched=true. Their observed RED/PASS values are compared with their intended negative/positive roles, not treated as interchangeable success strings.

| Case | Actual observation and bound |
| --- | --- |
|A1 old ordered receipt|Expected RED, with all19 exact mismatch indices23–41 and old_global=HOLD. Historical order is not repaired or repinned.|
|A2 source emission order|PASS with exactly41 derived names in frozen order, including all eight reserved keys immediately after count-alone. All six declared AST/operand negative subarms are present in order and observed RED/matched=true.|
|A3 future order fixture|PASS for the prepared order-only comparison; old R1 remains HOLD and no new110 runtime emission/adoption is claimed.|
|A4 old selector negative|Expected RED with the two class_root/outputs and class_root/population selectors.|
|A5 correct source selectors|PASS for parsed binding/resolution: fixture_root, class_fixture_root, members outputs/population and both exact corrected selector paths. This is not a full Native loader pass.|
|A6 one-sided mutations|Expected RED for metadata_only and source_only, input_repinning=false, with the complete three acquisition subarms below.|

A2's41 names independently match the pinned restricted-emitter statement contract and the typed-literal names in the future order contract. Six negative IDs are conditional-skipped-pair, nonconstant-loop-condition, loop-key-mutation, loop-name-mutation, setup-order-mutation and operand-side-command-or-control. Each has the expected full-statement/operand refusal reason. The unchanged reviewed emitter's full42-statement admission is part of the exercised source assertions; this result does not serialize or claim a different Native compiler/emitter population.

A6 single_snapshot parses x=1 with exactly one acquisition. Former_v1 records the causal RED that accepts unvalidated B, parses x=2 and acquires twice. Mismatched_snapshot records RED, decode_calls=0 and the expected pinned-byte refusal naming the original readonly N2/reporting_gate.ps1 fixture. All three matched fields are true. These are the declared inert data-acquisition model and one-sided source/metadata mutations, not an actual filesystem race or permission to repin production data.

The full result has the selected schema, passed=true, null error, empty global cleanup_errors, old_global_verdict='HOLD R1/R2 preserved' and runtime_or_native_acceptance=false. These intentionally limited fields remain intact. Result-basis.json retains the complete actual child object, outer object, exact Root terminal text and frozen six expectations; no projection supplies omitted rows.

## Observed normal timing and closure

The saved outer reports cold helper compilation0.3741627s, preflight8.5657905s, child-to-exit-and-EOF1.0687158s, owned cleanup0.01772s, post-cleanup7.595433s and whole before final record17.2524672s. The final terminal records17.2907969s after saved record publication/readback. Root caller held time is17.6247365s and whole after caller record18.3288297s, including recorded prelaunch admission/startup/final flush/EOF/exit, below the same60 cap. No phase is excluded to claim fit and no cap is increased.

All seven inner close results are true: stdin, stdout, stderr, both memory captures, deadline and held Process. Deadline work completed, fired=false, kill_requested=false/kill_complete=null, actual EOF and exit were observed, pending is empty and closure.complete=true. These values describe a naturally completed normal path; no kill was needed. Root's caller records complete569/0 EOF capture, no stream errors/overflow, normal reap/pipe/process-handle closure, cleanup0.0000327s within TOTAL15, null primary/empty secondaries and no recovery. Root's closed packet records later exact known PID observations for both outer and child as absent87. The reviewer did not query processes or broaden those observations to unknown descendants.

The Root physical caller was an inline utility, not a prefrozen independently reviewed exceptional-recovery implementation. This review accepts its supplied normal observations and their consistent complete bytes; it does not certify timeout enforcement, interruption, held-tree kill, overflow, blocking OS calls, fault cleanup or opaque descendant closure. The wrapper's actual normal compile, admitted Utility consumers, capture, serializer, saved-byte checks and publication ran; no general transitive startup/import/compiler/loaded-byte closure follows. Guard24 cold27-source compilation and filesystem/fault fixtures remain separate unrun work.

## Independent conservation and next phase

The actual outer before/after records are byte-identical98157/SHA813fdae3b35f9466b1c5d2e662f576b9a6c8984ff777529560c43080f40f5a84. Independently rebuilding the union from353 protected rows, selected report26, host10, frozen source roles and exact recipe/authority/role/protection/addendum descriptors, deduplicating only equal complete descriptors and sorting by ordinal path, produces the same379 ordered entries. Both actual phases match that independent expectation. The two cache records are byte-identical351/SHAd73af416754d61936208044c1ab4b71b4b69199d24168082d00b267712f7f0cc and equal the exact required two absent leaves.

All394 original Root expected/current prelaunch files, including all387 scoped source/evidence files and seven independent review artifacts, independently match current bytes. The review also checks all nine newly created Native outputs and six complete Root packets/raw files:409 distinct files in total, with complete guarded before/after review-only conservation receipts and at most six fully joined hash workers. Expected pins remain unchanged. There is no current299/433/6435 cache-population claim.

The nine created Native files are exactly the eight declared report6 flat outputs plus fresh reporting-result.json. Removing that set from the original52 absent leaves gives precisely the remaining43; those43 were freshly observed absent with every original parent real. The two current cache leaves remain absent, as do the unconsumed guard24 paths. No guard24 nested result is probed under its absent parent. The historical static absence report remains preserved, with consumed paths explained by this actual run rather than repinned.

After Root FULL-reads this exact review, it may consider a separate guard24 command/lease with that phase's current exact sources/inputs/host/CWD/argv/environment, fresh output/parent checks, independently bounded caller, complete result/stream/record/terminal retention, genuine identity/physical closure and conservation. This closed report6 lease grants no such execution. The same60-child/120-whole/TOTAL15/decimal1m bounds and formal prerequisites still apply; no automatic advancement or retry is authorized.

Original formal FIRST11.2065538/pre8 remains RED. Original order/class annotations, real31/299/full InventorySHA/OuterSHA/fullproof/saved actual Manifest/typed AND canonical31, materialization/FIRST, Native82/Class6/Source/Runtime/Unreal and the requested city lighting/controls/moving population/performance are not accepted by report6. The check proves the scoped reporting observations and normal wrapper path only.

Only own guarded stdlib Python -I -S -B data/hash/metadata checks ran during this review. No target definition/import/helper/compiler/ProcessStartInfo/control/default/gate/query/retry, GUI/browser/server or external CLI review ran. No canonical/context/old file/cache was written; output is confined to this fresh ignored actual-review sibling. No persistent helper process or lease was created. The frozen handoff releases this bounded scope.
