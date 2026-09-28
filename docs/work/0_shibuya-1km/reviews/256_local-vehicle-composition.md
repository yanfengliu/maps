# Local vehicle feasibility review 256

2026-09-28. Bounds: independent read-only review of the two frozen local experiments before one 11-section qualification. No runtime, default activation, complete journey, visual or performance acceptance. Work stopped on the owner's wrap-up instruction; no further probes are needed to preserve the finding below.

**Decision: retain the positive local-interior evidence, but do not approve these as a joined continuous replacement of the existing path yet.** The fixed turn's support/clearance bounds and the seam's interior rigid-contact construction are defensible within their stated domains. A concrete wheel-pose discontinuity remains at the seam boundaries. The next decision is a bounded contact-representation join decision on this same candidate, before spending a full itinerary qualification on an already mismatched join. This is not evidence that the physical route is impossible.

## Identity and checks

Reviewed worktree: `C:/Users/38909/.codex/worktrees/vehicle-integration/maps`, HEAD `3a508e9ed0279221242f91564f5b819a026d7c0b`. The expected ten modified/untracked Stage A files remain present. Stage A digest: `42f7488835ba1f9af3faae34915dc991dcc879a88855985187e16e3982b401ef`.

- Decision 244c SHA-256: `9d20df00b800f36404a23601d57f83ff3032d3d3c9f97dff1325c270db1c3560`.
- Candidate directory: `artifacts/local-replacements229-20260928/` in that worktree.
- REPORT.md: `1cb1645f5d6ed75a5929a94b25ee5760016a98ee44d73ff6bf06cc32c7c01073`.
- PROOF-NOTES.md: `6dfb6e07779101636e798f2eb648700ce76140ceb2e457ca82931baf5ead4ab6`.
- seal.json: `f571c5ec1bbdf1812ccfb34ea7ef04f148c5dbdecfe89cbf092d2db070eef2b6`.
- Exact taxi GLB: `ea528fc78b9728ee3edc0758c38dddbef754609be03b8f0d58514d9d3ecb4b23`; fleet: `5b29efc7977949db1611273c8fb294b3ab23a1a55c8f42316cad9b5309c94a01`; roads: `0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc`.

Independently rehashed all 58 packet files, 10 Stage A files, six direct source inputs, two prior manifests/seals, and four inputs named by the obstacle record: zero mismatches. Inspected applicable instructions, actual scripts/results, fitter, wheel-name mapping and envelope code. Ran only short, terminating CPU calculations from stdin with Node compile cache disabled. Independently recomputed turn arithmetic and the seam's local projected road-edge topology; evaluated 16 endpoint/phase/wheel contacts using the inspected exact-triangle prototype. Did not rerun the 1,024 retained finite seam samples, every turn sample, the route sweep, types/build/tests/audit, native visual gate or independent model review. Those are not implied by this report.

## Positive local bounds

The fixed turn consumes 0.713690307 source metres of the paired tail, below the 1 m cap. The source/plan conversion correction is explicit in the withheld pass; the older screen retains its original metadata. Recalculation agrees with 33.629529827 degrees conservative steering, 38.765798314 mm wheel residual in world units, 153.704905341 mm remaining road-boundary margin, and the 7.075960606 m upper bound for the fitted 3D arc. The exact concave two-triangle union replaces the inadequate convex-union assumption. Shared-edge heights are continuous. The conditional fit sensitivity has contraction 0.353525 and the claimed corner-motion charge is consistent with its stated equations. Retained static-domain and opposing-body screens support the stated local clearance bound, including 172.860347 mm separation outside shared authority after both interval charges. This does not grant a lease or transfer acceptance to the changed tail.

The seam's all-pose/all-spin travel enclosure remains inside unchanged +/-50 mm model travel. The contact maximum includes all wheel materials and actual road triangle intersections; its finite samples alone would not establish continuity. The packet's outer-end comparison misses a distinct internal main-tread cap: 60 actual rubber triangles lie at approximately x=+/-0.095 m with cap radius 0.308970939-0.308970973 m, inside the outer sidewall end at approximately +/-0.106 m.

For this exact local geometry, a small independent topology calculation closes that particular concern. In the midpoint lower-contact rectangle expanded by the packet's whole-span frame charge (half-width 0.161720510 m, rolling half-length 0.251479470 m), front wheels intersect only patches 2489, 2492 and 2498. Their crossing edges span the entire axial window, with absolute rolling/axial slope at most 0.017981279; no road vertex enters it. Patch 2498 remains a nonzero strip. Both rear windows are entirely on patch 2499. Thus a main-cap contact can continue into the tread with an arbitrarily small rolling adjustment along the transverse road edge, instead of disappearing at that cap. Outer axial ends and rolling tips are excluded by the packet's strict value margins; the smallest reported axial margin is 1.289258 mm world. Together with the closed central tread and adjacent-face equality, this supports continuity of the interior contact maximum. It is a bounded argument for these patches, not a general contact solver proof or a force/smoothness model.

## Material composition finding

`seam-contact.mjs` interpolates the unchanged endpoint chassis position and normal, then computes new spin-dependent wheel offsets. It does not join those offsets to the unchanged point-fitter offsets stored in `seam-frame.json`. Chassis continuity therefore does not establish wheel-pose continuity or actual tread contact at the boundary.

Comparison must use names: the prototype indexes left/right, whereas the fleet's `wheelObjects` array indexes right/left. The following values are correctly mapped to `wheel_0_left`; all offsets and differences are model metres.

| Source-local m | t | Spin rad | Old fitted offset | Exact tread offset | New minus old |
| --- | --- | --- | --- | --- | --- |
| 44.231669004082995 | 0 | 0 | 0.0031601493384626443 | 0.0035139246258910966 | +0.0003537752874284523 |
| 44.231669004082995 | 0 | 0.09817477042468103 | 0.0031601493384626443 | 0.0021474192835645913 | -0.001012730054898053 |
| 44.33166900408299 | 1 | 0 | 0.003093535181503686 | 0.003439853036107569 | +0.00034631785460388295 |
| 44.33166900408299 | 1 | 0.09817477042468103 | 0.003093535181503686 | 0.0020557878751805937 | -0.0010377473063230922 |

At the entry with spin zero, the maximizing witness is rubber triangle 90 on road 2489. Retaining the old offset places that wheel 0.000367926299 m below the prototype's least nonpenetrating translation in world units. At spin pi/32, the old offset is instead 0.001053239257 m above actual contact. These are observed geometric boundary mismatches, not merely missing proof or a new aesthetic threshold. They substantially exceed the declared 0.1 micrometre pivot charge. Each of the four wheels also differs at the two checked phases.

Switching directly between the old and new offset fields therefore jumps wheel poses. Blending those fields cannot be assumed to preserve actual contact and nonpenetration: the inspected rigid-contact construction defines the least allowable translation at each pose. Keeping the chassis continuous or keeping travel below 50 mm does not discharge this obligation.

Before qualification as one continuous joined path, the adjacent consumers must agree on one wheel-contact value at each shared boundary, for the physical spin used, under unchanged travel and clearance limits. A narrowly declared common contact treatment on adjoining unchanged chassis intervals could be considered and checked; no extension, interpolation or new contact policy is approved here. The original point-query refusal and raised-chassis/deleted-road controls remain valid and retained. No full itinerary qualification is authorized by this report while the join decision is open.

## Handoff and resources

Preserve this report and the entire frozen candidate for resumption. No source, Git state, shared scene data, installed dependency, browser, GPU session or server was modified. No persistent process was launched, so no task-owned persistent process remains to clean up; no denied process inventory is represented as a successful census. Only this report was written by the reviewer. The task is paused at the owner's request, with the endpoint composition finding open.
