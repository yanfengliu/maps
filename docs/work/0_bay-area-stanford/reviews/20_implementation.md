# Review 20: implementation

## Target

Repository maps, exact revision feb44cb8551035b0b28cd3e681065611ef173404 against 7f49891c8ac9931041ecae2d0a6abcbedab1ee5d. Scope: owner-reported tilted church wall artwork, planar photo rectification, curved apse unwrapping, emitted-mesh regressions and visual acceptance. The subsequent F44 correction changes only a comment in church-artwork.ts; runtime implementation remains identical.

## Reviewers and coverage

Independent art_mapping_review read the exact committed diff and surrounding geometry, inspected the native before/after and rotated/phone captures, and reran nine targeted artwork/interior tests. It did not launch a browser or server or duplicate full gates. Root owns actual-control production verification and full gates. A separate bounded read-only art_mapping_assessment diagnosed the planar shear and doubled apse curvature and supplied the shared apse pixel control points; its unfinished additional nave assessment was stopped once the implementation and independent review were sufficient.

## Reports

### art_mapping_review

Reviewed feb44cb8551035b0b28cd3e681065611ef173404 against 7f49891c8ac9931041ecae2d0a6abcbedab1ee5d.

No P1/P2 findings. The nave's diagonal shear is removed, and the apse artwork follows the modeled cornices and verticals in both fixed and rotated captures. The implementation preserves the existing renderer, texture assets and source geometry. All nine targeted artwork/interior tests passed independently.

One nonblocking finding, F44/P3: src/church-artwork.ts:32 claims a quarter-texel interpolation bound. The code checks edge midpoints at 0.20 pixels and stops at depth eight; tests establish under 0.5 pixels at sampled points. Reword the comment to describe that actual refinement criterion.

Coverage: changed geometry, projection mathematics, tests, attribution and design notes; native before/after nave and altar images, rotated altar and phone capture. No browser/server was launched, and full gates were not duplicated. Tight nave cropping and two brown clerestory regions remain limitations of the existing photo coverage, not newly introduced tilt defects.

Follow-up on the comment-only working-tree correction: Confirmed: the comment-only correction accurately describes the refinement criterion and its limits. F44 is resolved. No runtime changes appear in the reviewed geometry files since feb44cb.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F44 | P3: comment claims a global quarter-texel bound beyond what the algorithm/tests establish. | Accepted; describe actual midpoint criterion, depth cap and sampled test evidence. | Comment corrected and independently rechecked; no runtime change. |

## Verification

Root: Node 24.12.0, npm ci, build, typecheck, 108 tests and audit pass with zero vulnerabilities. Existing bundle-size and stripTypeScriptTypes notices remain. The new emitted-nave calibration regression first failed against the original two-triangle mapping, then passed; tests also check an independent camera grid, triangle interpolation and all emitted apse facets. No texture or source-data bytes change. The corrected interior has 55,329 triangles, 8,631,324 geometry bytes and 7,132,160 texture bytes, 15,763,484 combined, with two custom draws.

Headless production Chrome at 1600 x 1100 passes church search/entry, Whole church/Nave/Altar controls, two right-drag views, ceiling on/off and exterior return. All three views also pass at 390 x 844. Fixed and rotated images are inspected at native resolution. The final observer has no errors; exterior restores 648 buildings, 159,747 triangles, 24,920,532 geometry bytes and zero photo bytes. The before/after gallery loads all six images with no horizontal overflow. Task-owned browser, daemon, hidden server and descendants close in a finally path, with an empty remaining-process inventory. Evidence is retained in ignored artifacts/church-art-alignment-20261107/output/.

The first QA script used the wrong observer mode name and timed out; its cleanup completed. Corrected development and production probes pass. No new physical-device, graphics-context-recovery, network-failure or broad performance claim is made. An inherited review-19 heading mismatch was found by the work-document checker; an explicitly labeled additive format correction preserves its original report and dispositions unchanged.

## Round outcome

Accepted for the reported tilt defect with F44 resolved. Existing photo coverage/proportion limits remain disclosed. Delivery revision and final remote/cleanup status belong to the current plan.
