# S1 test and ordinary-runtime successor review 02

2026-09-27. Independent Astra/xhigh, read-only. **Accept the test-only additions and the bounded ordinary-runtime observations. No new blocking product defect found. Final acceptance remains open.** The prior source review and diagnosis reports remain unchanged. No browser, GPU, gate, CLI reviewer retry or source/data change was performed in this lane.

## Reviewed bytes

The product target remains `frozen-review-01` over base `ab0bde6`; all 14 entries were rehashed and match (`frozen-review-01-rechecked.json`). The added test is `C:/Users/38909/.codex/worktrees/shibuya-cutout/maps/artifacts/square-cutout/frozen-review-02-tests/cutout-sections.test.ts`, SHA-256 `71e632f807ababede19a14ecb07a3731f2bb3884e684e14d7557de4b86062f08`. Its manifest names the correct previous test hash `d805576f…ac6416`. The assignment's manifest digest has 63 hexadecimal characters and omits an `f`; the actual reviewed manifest digest is `6e550144aafc3b9007bb8add92004f9aef68e36b1a1cd46f1a93f22237bbaa0e`. This apparent transcription discrepancy is retained explicitly in `reviewed-files.json`; it does not change the matching test-content digest.

The runtime record matches supplied SHA-256 `5b6153e2f472778a86ee89f9411923de689c892319cace536297cde421af32f6`. Its nine PNG hashes all match. The owned cleanup record matches `36e216450bc4a5d904374418b9ff8930b9e5df87e6c860c0c3129bf02431346a`. Exact paths and hashes of these inputs, the run log and the inspected `runtime-controls.spec.ts` are recorded in `reviewed-files.json`. `runtime-summary.json` preserves the relevant state and independent URI-set comparisons without the large pixel statistics.

## Test-only verdict

Compared the new test byte-for-byte with the previous frozen test, then against the retained independent `source-review-01/geometry-probe.ts` and its executed JSON. The diff adds only the intended cases, an import and a header adjustment. Existing controls are preserved.

- Every side now checks the one-metre outside point as well as the inside point.
- Independently projected geographic midpoints are compared to the straight clipping chords. The maximum is explicitly bounded between 13 and 14 mm, consistent with the independently measured 13.93432 mm. This is an assertion about the fixed Shibuya projection, not a claim that the straight chord is the geographic curve.
- The concave L contour checks independently known area 7. The coplanar face, point-only contact, plane edge and vertex/opposite-edge crossing cases use explicit expected coordinates/null outcomes.
- The rotated, translated and nonuniformly scaled root checks both local unit length and reconstructed outward world normal within `1e-7`, on all four sides, and disposes its temporary geometry.

These additions close the specific durable test gaps raised in source review 01. They do not pretend to establish rendered pass agreement, arbitrary topology healing or every cached source's validity. The worker/root report 17 focused tests and types green; this lane reviewed the exact tests and their prior independently executed controls but did not rerun that gate or independently inspect its execution log. The no-index diff command exited 1 because the files differ, as expected.

## Runtime instrument and observations

The inspected harness drives real pointer pan, wheel/orbit input through OrbitDriver and real style controls. It changes viewport size and navigates normally. Its missing-leaf arm intercepts only data533 and returns an intentional 404. It does not set camera state directly or disable post passes. Its completed-state assertion compares all live and expected leaf URIs, rejects visible coarse URIs, requires 28 cap meshes and one connector, ready status and active post. Independent extraction confirms those conditions for every successful recorded state. Runtime renderer reports NVIDIA RTX 4090 through ANGLE; every record lists TAA, GTAO, Bloom and Output, active with no post error.

Initial preparation has 44/44 leaves, 67 total loaded models, 644,485,660 cached bytes and a 470,993,287-byte plugin GPU estimate. The cache is below the 671,088,640-byte retention floor. `startupMs=21803` includes scripted zoom/orbit preparation before the initial record, so it is not an isolated time-to-ready measurement.

The pan-away record has target approximately (2500, 15.2, 2500), distance 220 m, zero visible tiles and zero estimated tile GPU bytes after a 2.8 s dwell. All 44 CPU leaf identities remain live, cached bytes remain unchanged and `unloadedModels` remains zero. Returning to the original approximately 1700 m overview restores 44 visible leaves and the same GPU estimate with `loadedModels` still 67. This is discriminating evidence for the installed GPU unloading/re-upload path and supports the source review's distinction from CPU eviction. It is a plugin resource estimate, not a whole-process physical GPU allocation measurement.

The style round trip records Cartographic then Satellite without rebuilding the resident set or changing cap counts. The 640×480 state retains all final leaves and reduces post buffer accounting from 209,196,000 to 69,732,000 bytes; restoring 1280×720 restores the original accounting. Navigation records teardown `completed` and a successful dusk reload with all 44 leaves, 37 currently visible at the closer default camera, 28 caps and one connector. Its reload interval is 19,172 ms. This is ordinary loaded-page disposal/reload, not disposal during an awaited operation.

The intentional data533 404 records ready false and an alert that names the URI, the HTTP failure and the required preparation command. Its tile traversal still reports one visible tile and ten loaded models, but the native image contains only sky/UI and the failure alert: the common city parent is correctly hidden. There are four recorded console/page errors, all marked as the intentional missing-leaf phase; no normal-phase errors are recorded. A successful failure-state check does not turn the intentionally failed source load into a successful load.

## Native image review

Inspected each of the nine hash-matching images individually at native size, without a contact sheet. All are 1280×720 except the 640×480 image.

| Image | Observation |
| --- | --- |
| initial / returned | Coherent full square city before and after the GPU resource cycle; no black-frame recurrence or obvious missing tile patch at this overview. |
| away | Empty sky/background and UI, consistent with zero visible tiles. |
| roundtrip-cartographic / roundtrip-satellite | Expected style change and return; square footprint remains coherent. |
| small-viewport / restored-viewport | Complete square at both sizes, with the style picker and attribution present; no obvious coarse replacement or black post image. |
| reloaded-dusk | Detailed city renders again after navigation, with dusk background/lighting and original style UI. The closer view is not a whole-footprint edge inspection. |
| named-missing-leaf | Readable named 404 alert, sky/UI and no partial city. |

The owned run log reports one test passed in about one minute. Its cleanup record reports exit 0 and every captured task process identity already exited, including the headless browser identities. Initial admission warnings in that cleanup record are not being mistaken for surviving processes. This reviewer launched no browser/server resources.

## Remaining acceptance boundary

The runtime JSON binds status samples and image bytes, but it does not contain a pre-run served-build/source/harness inventory. This review records the current harness digest; it cannot retroactively prove those bytes were the executed harness. Attribution to the unchanged frozen product also relies on the owner's controlled run. Keep these results as bounded mechanism evidence, and retain the required final bound replay on the integrated build. The 56 supplemental images accepted elsewhere for appearance have the same outstanding producer-envelope limitation; this report does not certify that frame set.

Forced CPU removal/reconciliation/reload, cap-refusal handling, disposal during pending work and the small all-pass failing-control fixture remain pending. None is established by the successful ordinary GPU cycle, missing HTTP leaf or loaded-page navigation. Complete those already approved probes, the final bound visual replay and required integrated gates/review; no new architecture or broader investigation is warranted by this successor. This lane ends here without waiting for the later fault probes.
