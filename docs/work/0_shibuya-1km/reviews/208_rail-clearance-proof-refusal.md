# Proof208 — stopped at recorded-equivalence boundary

**No N0 clearance was established. The single authorized offline attempt stopped on the first pose because the actual observer's reconstructed rail winding values did not exactly reproduce199.** Eye and all four near corners matched exactly. The small winding differences remain unexplained; they were not called harmless noise, rounded away or admitted under a new tolerance. Existing199 classifications and visual205's decision remain unchanged.

Root approved206's finite design and authorized execution after204 resource release.204 and root confirmed release before this run. Preparation imported the actual frozen source successfully on Node24.12.0; it performed no reconstruction. `DESIGN.md`, scripts and1546 input records were frozen before execution. The final `freeze.json` SHA-256 is `21b63ad838c481a45f71d4271287fe9ba88bf63bfc820708672af1e00741f046`; input inventory digest is `b6abcf934293baeb597af19792ba0d20584d2546320e9a2f5b089e3b81b81119`. A preliminary freeze is retained separately; root's pre-execution stop-at-first-equivalence-failure steering was incorporated before the final freeze.

## What actually ran

`node artifacts/rail-clearance-proof208-20260927/run.mjs` launched one owned Node child with a120000ms external watchdog. The child exited1 after1848.452ms; no timeout or kill occurred. The launcher returned normally after retaining the failed child result and checking preservation. Its exit alone is not a proof pass.

All52 original raw bindings matched their selected206 observations and reduced to13 distinct camera states. The actual `createRailTrialScene`/`railSectionGroups` factory reconstructed the frozen rail assets. Recorded membership includes each body's and cap's index hash, triangle count, exact position-array hash and clipping planes. Aggregate triangle totals match the stored assets. A shared-vertex component and directed-edge census found:

| Asset | Triangles | Components | Directed-edge defects | Repeated-vertex faces |
| --- | ---: | ---: | ---: | ---: |
| sleepers | 79,024 | 6,585 | 0 | 0 |
| supports | 119,492 | 3 | 0 | 0 |
| ballast | 74,984 | 3 | 0 | 0 |

This is an exact edge/vertex census of the stored assembled factory output. It is not a self-intersection, collinearity, rendered clipping-sliver or interior-clearance proof. The field named `degenerate` in the raw artifact counts repeated vertex IDs only; it does not establish absence of every zero-area triangle. The earlier progress wording “zero degenerate counts” must be read within that bound.

The actual frozen `createRailCameraObserver` then evaluated pose0. All15 rail winding values retained the same clipped/open reason but differed from the recorded doubles. Maximum absolute differences across the five queries were5.520007838137869e−19 for sleepers,1.825525407922468e−17 for supports and2.734539991092102e−18 for ballast. For example, sleeper eye winding was −2.75385050635435e−7 in199 and −2.75385050635987e−7 in208. `mismatch-summary.json` preserves every exact pair. The frozen criterion was exact equality; no spatial acceptance threshold was changed.

The failure was written immediately to `failure.json` and `result.partial.json`, and the process stopped. No component-separation calculation was admitted after the mismatch. Only one of13 rail poses reached the equivalence check. The other12 rail poses, all13 paint poses, all13 building-attribution poses, source-positive/clear/open/contact controls and partial N2/N3 controls did not run. `pose-disposition.json` marks every unexecuted record explicitly. Those controls exist in the frozen script but are unqualified code, not evidence.

## Decision and remaining boundary

This attempt cannot distinguish a cross-runtime arithmetic difference from an unaccounted reconstruction/evaluation difference. Identical eye/near corners, frozen source/input bytes and similar winding magnitudes do not by themselves settle that question. The building batch9 attribution and paint equivalence remain wholly untested here. No collision, clear exterior camera or product observer repair follows from the result.

The next step is independent read-only review of this exact mismatch and the frozen equivalence design. Any successor must first justify how it binds actual rendered triangle membership and evaluates arithmetic equivalence, with source-positive controls; it cannot add an epsilon merely to admit these numbers. No further reconstruction, retry, instrumentation or contract amendment is authorized by this report. Root owns any successor decision.

## Preservation and cleanup

Before/after inventories are byte-identical across1546 records: all273 source files, four build files,34 overlay files, relevant frozen scene/network inputs and44 leaf files, all52 raw bindings, the206 packet,1117 previously197-bound Three.js/tiles dependency files, Node and the final208 scripts/design. Source/build remain `fd1bfbea9248dbfb18686934134860d1d4a8bf1b4392520c600701f1142a79cc` / `f88f0162b73a6348715ac1768b5ac5978db40bb49dd52d1f22c2ec0c0c8eb01c`.

`launcher-cleanup.json` records child44376's exit; the independent final read-only CIM check found that PID absent and zero208-scoped survivors. No browser, GUI, GPU, server, gate, data regeneration, product edit, dependency change or Git action ran. No process was killed. All retained208 files are required preparation, partial-proof, refusal or handoff evidence under the owned ignored output directory. `HASHES.json` seals this report and packet. Acceptance criteria requiring completed13-pose proofs and real source controls remain unmet.
