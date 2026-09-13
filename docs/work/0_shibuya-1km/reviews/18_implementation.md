# Review 18: implementation

## Target

Reusable pose evaluator correctness. The ignored reusable position-only pose evaluator and finite correctness instrument. The implementation records source base `636bff7dca10f00dc3ada892ebb7005cfa815c92` and observed main `7f8aeac`; the independent review records `7f8aeac` as its observed base. Neither target is the dirty primary worktree. The original controller remains `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26`.

The exact target is `artifacts/agents/gait-pose-evaluator/implementation-v1/handoff.json`, SHA-256 `936e1ef7d9f7f4dec787fac233d5c31d1bb2d51831dae134ffc655d4495d4290`. Reviewed text sources are retained byte-for-byte under `artifacts/network/retirement-pose-checkpoint/candidate-01/recovery/source/`; the consolidated `recovery/reviewed-source.patch` has SHA-256 `dd2fe770ac1368dbf21ee7bf3bd3033f2564f03b8141f63633c94478fa0114d9` across 61 source files for this checkpoint. The additive patch uses LF transport; exact copies and normalized reconstruction records preserve the original bytes and line endings. Raw output, source assets and earlier counterevidence remain ignored at their pinned handoffs. No experimental code is promoted by this document.

## Reviewers and coverage

/root/gait_cost_review authored the report below independently of the implementation. Root separately read its substantive findings and accepted only the dispositions stated here. The report is `artifacts/agents/gait-pose-evaluator-review/report.md`, SHA-256 `8676f63c37df2a482bf026d2de1ae4752c792e4ad5cb9e93536a7c2007becb46`; its handoff is `6d8a33ef1fbd7e764f877ee08950248e49172e3c096cd374e637874db8a32044`, sealed at `2026-09-13T11:33:51.338Z`. The wrapper is authored by the network worker for root's review; it does not alter the reviewer's body or claim additional independent work.

Rounds 18–23 follow the six handoffs' recorded seal times on 2026-09-13, not completion of their underlying implementation work. The original ABBA review and focused re-review remain separate rounds. The full authored text is embedded with ATX heading depth increased by three; inverse transformation is checked byte-for-byte. Local finding labels and priorities are preserved verbatim; permanent IDs occur only in the wrapper dispositions.

## Reports

### /root/gait_cost_review

<!-- authored-report-start sha256=8676f63c37df2a482bf026d2de1ae4752c792e4ad5cb9e93536a7c2007becb46 -->
#### Independent correctness review of the reusable pose evaluator

The reusable evaluator passes the approved finite correctness contract. I found no material defect in its arithmetic, source sampling, complete-weight points, state/input nonmutation, invalid-result reuse or ownership. Independent fresh execution reproduces exact values on every admitted row and preserves the failed-state geometry. This accepts the position-only CPU representation for root's next performance decision. No timing comparison, speedup, distinct-seed motion admission or production integration is accepted here.

Reviewer: `/root/gait_cost_review`, independent of author `/root/gait_cost`. Base and final observed main are `7f8aeac51357654a4d39d3e6ecc5f8ac0bda79b6`. All review writes remain ignored under `artifacts/agents/gait-pose-evaluator-review/`. No candidate, original controller, production code, data, dependency, Git state, browser, server or GPU resource was changed.

##### Exact target and source

The target handoff is SHA-256 `936e1ef7d9f7f4dec787fac233d5c31d1bb2d51831dae134ffc655d4495d4290`, report `1492b222a10440353d45eb1f6eead3fdc3ca60a3dcf874fbd1204c28f2d1754d` and implementation patch `338c5720bffac6f3127d1a20a8753f4a045d442ae71d3917b4d6b6be1c49a304`. The evaluator is `41fd26dbd7a175b5637d8e1870fb098a29202a1898333d6df1121e1ac7a395a3`; checker is `5966b1fb3458a5dce737f5ac446e4ef0a46e9ef408977d1a4cfe201d41069ce6`. The original controller remains `a81813b2c503f338cd8070b6c548f5801f0d0835b7512a5f313b72e4aa0cbb26`.

I read the repository rules and lessons, approved proposal, complete evaluator/checker/correspondence/source/ownership/control programs, the original source and analytic-solve implementations, the launcher/verifier/seal/history/cleanup programs and their retained results. The review pins 240 unique files totaling 40,669,840 bytes: all 239 author input/owned records plus the target handoff. Every input length and SHA matched before and after each successful child. The inventory includes installed three.js core/module/package bytes, selected GLB/VAT, complete sparse influence adapter, both source-palette copies, all 48 independently evaluated source endpoint payloads, original corpus/observer/loop, failed-state lineage and approved design. The nine-file normalized-LF implementation patch reconstructs the actual file contents.

The original initialization and update are unchanged direct imports. The evaluator introduces no phase cache, phase quantization, reduced influence list or controller-failure shortcut. Preparation copies source data and precomputes fixed rig membership; it does not replace dynamic solve/source arithmetic. The two source palettes still store all 848 values in Float32 before sampled matrices are constructed. All 53 joint worlds overwrite all 60 copied bind worlds in original order. Precomputed nearest leg ancestors preserve left-then-right overwrite order, and upper-body membership preserves source-joint order. Point evaluation keeps ordered complete influences and separate idle/reference values in the original addition-then-subtraction order.

##### Independent admitted-row replay

The final independent instrument is `independent.mjs`, SHA-256 `51246612665e6457dcc98e18394182f1649cdafd39de8535ab641b907a5a5ca5`. Accepted review runs are `evidence-02`, `core-02`, `source-02`, `ownership-02` and `controls-01`, all executed with those exact bytes.

`core-02` freshly initializes all 43 original cases and consumes all 4,663 selected rows through the actual default RenderLoop. It observes exactly 4,620 updates and no-op renders. Each callback has step 1/60 and receives the original current input values; only the advance timestamp receives the existing 0.001 ms offset. Every valid row evaluates both original and candidate poses. The independent checker compares all output/source matrix elements, all palette values and complete solve fields exactly with `Object.is`, without an epsilon fallback.

Fresh totals are 13,877,088 matrix-element comparisons, 7,908,448 palette comparisons and 27,978 solve primitive comparisons. The review's point schedule is deliberately distinct: every drawn vertex at each case's first and final row, and 16 drawn vertices at every other row. This gives 86 full-body rows and 1,883,016 exact point pairs. The original author schedule remains separate: 634 sole calls plus 1,614 shoe calls per row and 21,044 additional body calls on 280 initialization/event/final/failure rows, totaling 16,374,744 point pairs. Sole/shoe sets overlap. I reconstructed all 280 event-schedule rows from fresh unchanged controller execution, and all retained author per-case observations and 23-double trace hashes match the accepted cadence result.

The author final labels are `corpus0-03`, `corpus1-03`, `corpus2-03`, `source-03`, `ownership-03` and `controls-03`. The independent evidence check reconstructs each modulo-three case partition, all case row counts, checkpoint cumulative rows/full rows and the complete declared comparison denominators. All final freeze entries match. The review does not treat an earlier `-02` author run as the final target.

##### Nonmutation and checker validity

The independent replay does not rely on the author's serializer for its nonmutation claim. It captures each live state/input object's original identity, prototype, extensibility, own keys, property descriptors and exact primitive/reference values. It checks them after the original evaluator, candidate evaluator and point calls. All 13,989 whole-graph checks pass. This also detects equal-value object replacement, beyond equality of a serialized value graph.

The author checker deterministically serializes the complete own-data graph, descriptors, array lengths, number bits, undefined fields and sharing relationships. I inspected the retained V8 false-positive bytes: their raw buffers differ, but both deserialize to equal values, and the canonical checker correctly produces equal bytes. Fresh controls reject signed-zero replacement, NaN-to-infinity replacement, deleted undefined fields, hole-to-undefined replacement, array-length change, split shared references, changed writable/enumerable attributes and changed extensibility. A separate typed-view control rejects replacing a shared backing buffer with separate equal-value buffers. Each applicable mutation is also rejected by the independent live-object check. Functions, symbols and accessors are explicitly unsupported by the author's data serializer; it does not silently omit them. No real field or sharing change was hidden to admit the V8 representation difference.

##### Fresh source and retained ownership

`source-02` repeats all 192 source poses and 4,040,448 complete drawn-vertex source/VAT comparisons. Candidate source outputs match original A/B/t, all sampled Float32 values and all source worlds exactly. A separate interpolation expression also reconstructs the full sampled Float32 bytes directly from pinned raw palettes. All prior per-pose error records and maxima reproduce exactly: maximum source error `6.273105698761872e-7` m, maximum VAT difference `0.0004918970201102884` m, identity error zero and zero outside the existing VAT quantization bound. The fresh wrong-palette control yields 31,094 outside comparisons and maximum error `0.1476982707113685` m.

Thirty additional sampler-only calls cover wrapping, negative phases, signed zero, the smallest positive double, neighboring frame-boundary values and non-binary fractions. They match original source bytes and matrices. These calls exercise source sampling only and admit no new gait phase population or motion trace.

`ownership-02` creates 3,000 original states and retains 3,000 original/candidate destinations from the existing reviewed initial assignments. Two workspaces alternate during evaluation. Every destination is then revisited in reverse order, and 48,000 full-weight points are written using the other workspace. All retained matrices and points match. Recursive identity traversal finds 444,000 distinct destination objects/arrays and no workspace alias. This includes the 3,000 `destination.slots` arrays beyond the author's explicit 441,000-object inventory; the author's reported count is correct for its listed inventory.

Agents 0, 17, 1499 and 2999 additionally undergo valid-invalid-valid reuse. Invalid results expose no matrices, reject point access and sample no source clips. Recovery uses the same destination bank; every other retained agent remains unchanged. Returned solve fields match the active reference variant. Separate left, right and both-leg invalid controls pass. A synthetic input-access exception clears the workspace busy flag, invalidates accessible geometry and allows the next valid evaluation. Workspace ownership/reentrancy and malformed parent/name/joint/palette admissions reject as intended. A synthetic source-object change after preparation confirms that prepared matrices and influence data are private copies; original in-memory values are restored in finally.

The ownership contract remains borrowed output until the same destination is evaluated again. Previous/current storage requires distinct destinations. Caller-owned point vectors must not alias another retained destination or workspace object, as the authored contract states.

##### Failed geometry and adversarial checks

The retained old-stop failed state and the reconstructed all-16-departure-pairs-infeasible transition both keep valid failed geometry. The transition reconstructs 206 inherited-controller rows and then applies the unchanged current update at the failure input. Both fresh drawn Float32 hashes equal `2c69e927ce9444afb14bb7f2bc9520f07fbbc3521e3d331567370a1c131e56ea`. Controller failure remains distinct from pose validity.

All 11 exact author mutant files are independently loaded and rejected by the review's own matrix/source/point/identity assertions: wrong reference, wrong palette, missing source joint, missing influence, removed Float32 store, shared output matrices, acceleration/target/event mutations, failure shortcut and stale invalid matrices. Module import/preparation occurs outside the expected-failure catch. These are observed correspondence failures, not setup errors. The removed-store witness again distinguishes `0.1329584938192405` from original `0.13295849091394857`. An additional review-only mutant reads the last workspace body when writing a retained agent's point; evaluating B then reading A rejects it. Its source SHA is `d832b1e78cde00734af6f98362c2cc09ed4ab227f4e0f6708782006b9706f520`.

The author's 10 mm control checks an exact shifted coordinate; it does not itself exercise contact tracking. I added the actual unchanged observer body, SHA `d6121fc7d4923b572d495cd17f1e4700c587afce04c011f15e0152b125221c81`, around the candidate's standing pose. The first full observation passes; shifting the next observed points by 10 mm produces `unchanged-contact-bound` at 1/60 s with planted drift `0.010000000000000009` m. This closes that narrow review coverage gap without changing the candidate or any threshold.

##### Retained failures, cleanup and acceptance limits

The author's three failed runs remain retained: missing `toe_l` admission in `smoke-01`, the extracted observer's missing `up` binding in `smoke-02`, and the raw V8 serialization false positive in `controls-01`. Their logs, partial denominators and historical source reconstructions remain pinned. The three historical reconstruction files match their original pre-run byte counts and SHA values; none was replayed. They are disclosed reconstruction, not surviving original execution files.

All nine review children exited zero, with no timeout, overflow or cleanup error. Early successful review results and two exact earlier instrument versions remain retained. The initial core result had a prose typo saying 17 sparse vertices while its numeric denominator and actual schedule were 16; final `core-02` corrects that label. The final five accepted checks share one frozen instrument. Child elapsed values are resource accounting only and were not compared as evaluator performance.

Native identity inspection covers 21 author and nine review wrappers/children, 60 identity rows in total. All recorded processes are absent. Every native inspection handle was disposed in finally; recycled IDs would be preserved and inspection errors would fail closed. No numeric-PID signal, browser, GUI, GPU, server or watcher was launched by the review. Review children launched no further processes. All ignored evidence remains needed for root's active handoff.

No material finding remains for this finite correctness increment. Performance and the separate distinct-seed workload admission remain open. This evidence covers one pinned near rig and selected CPU positions; it leaves source normals, inter-update/body-contact interpolation, other rigs/LODs, arbitrary commands, heterogeneous city behavior, 200 vehicles, GPU upload/deformation and all color/depth/distance/AO passes unverified. The 13,860 unselected cadence rows remain unobserved. Current VAT remains an integration boundary, with no inferred contact equivalence.

The repository's five code-delivery gates, native rendered inspection and main merge were not run because this worker changed only ignored review artifacts. Root owns correctness acceptance, any separately frozen cost window and the next reviewed documentation checkpoint on main. The evaluator and this review remain outside main as experimental evidence.

<!-- authored-report-end -->

## Findings and disposition

No material finding was reported. Root accepts the finite position correctness and ownership result. Timing, other motion populations and production integration were explicitly excluded.

## Verification

The reviewer freshly replayed 43 cases, 4,663 selected rows and 4,620 fixed updates, comparing matrices, palettes, solves, complete-weight points and live object graphs. It also replayed 192 source poses, 3,000 retained destinations, valid-invalid-valid reuse and the independent mutation controls. Its exact denominators and limits remain in the authored report. This checkpoint verifies documentation and retained source correspondence; it does not repeat the oracle.

Preparation of this documentation checkpoint checks the exact authored/source pins, reversible imports, scoped document headings and links, blob/secret/diff limits, and separate HEAD/WIP preservation. It runs no browser, benchmark, code build, five-gate sequence or source repair. Review 11 remains open. Primary WIP also retains rounds 2, 4 and 12 that are absent from HEAD. This checkpoint neither invents those missing committed rounds nor claims a whole work-docs continuity pass.

## Round outcome

The finite evaluator correctness target is accepted. This historical result establishes neither a speedup nor GPU, naturalness, between-tick or whole-city acceptance. The later timing preparation is a separate round. Current delivery status remains in [the plan](../plan.md).
