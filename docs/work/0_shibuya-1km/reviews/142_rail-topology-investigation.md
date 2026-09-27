# Review142: independent rail topology investigation

Status: bounded support construction proved on the frozen inputs; full rail geometry remains blocked by new building-cut openings. Owner: rail_topology_fresh. This is an independent CPU investigation, not production integration or visual acceptance. The product tree remained read-only; only this ignored directory was written.

Fixed reproduction: read the frozen run-04 and run-05 support-plan and support-edge-refusal data; independently census every exact Float32 edge and reproduce the four-face edge. Any proposed construction must include the physical union of all four 3.4 m supports, preserve source centreline X/Z and exact protected floor/graph polygons, and close new cut/return boundaries without adding torn/open edges beyond separately enumerated inherited source defects. Source positions, UVs and material identities outside authorized cuts must survive.

Disqualifiers: tolerance growth; omitted generated faces; four overlapping plinths labeled union; missing generation scored pass; only testing the named edge; approximate or same-winding source-panel exceptions; endpoint/native appearance claims from topology; H0/H1 tuning; claiming the building cuts are sound from support-only results. Exact coincident opposite-winding source panels may remain visually and be excluded only from solid-volume slicing.

The initial independent mechanism was to reconstruct occupied support regions before extrusion rather than keep repairing the failed triangle soup. Source inspection narrowed this to a smaller, concrete change: construct ribbons from original source segments, form their physical union, and only then subdivide it by horizontal station and protected-span planes. A separate cross-section integral independently checks the resulting union area. The earlier worker's hypothesis/search narrative was not read.

No browser, GPU, server, background worker, network request or dependency install is allowed or needed. Structural evidence cannot establish visual quality.

## Exact reproduction and cause

The worker base is `0ec3dd03831b605235302212b7d140cb35297071`. The frozen geometry helper SHA-256 is `964ab8094392e75e78b13879bc71d4bd42c285f9b5e4bff54e4c46a443bcb76e`; the candidate writer SHA-256 is `049dc75e5948defbc11a36ecf732b572539b7538ae7f21d3d3cf88fa0b39d70b`. All 14 recorded original input pins match the live source bytes. Every input hashed at the first investigation pass remained unchanged at completion. The complete identities are in `input-hashes.json` and `final-proof.json`.

`node artifacts/rail-topology-fresh-20260927/investigate.mjs` reproduces the failure into this directory without running the old producer. The run-05 stored edge is `(84.57144165039062,0,79.72464752197266)` to `(84.99247741699219,0,79.6144790649414)`. Four faces use it, with signed XZ areas `+0.044851107290014625`, `-0.001316411537118256`, `+0.0003291604807600379`, and `+0.06582300871377811` square metres. It is not an exact pair that may be cancelled. The run-04 named edge does have an additional exact reversed pair of area `0.000020495150238275528`; cancelling that pair explains progress between runs but does not solve the run-05 failure.

The raw plan contains 39 negative and 17 zero-area fan triangles before Float32 storage. The run-05 stored plan still has five negative triangles and two four-face edges. At the named edge, raw triangles 10506–10508 are the fan of a repeated-end polygon; their signed areas are `-0.001316699282087011`, `+0.0021123995912567806`, and zero. This disproves a rounding-only explanation.

The upstream defect is an invalid convexity assumption. `cells()` inserts metre and span stations into the source chain, uses a miter normal at the original source node, and uses a straight-segment normal at the newly inserted station. Five of the 4,152 resulting quadrilaterals fold. Track `146060426` from station `80` to `80.02406578890077` has successive corner turns `-0.04760330352120379`, `+0.21675988261318757`, `+0.216759882613188`, `-0.047603303521203344`; one side moves backward in Z from `79.5696724973038` to `79.55612751951257`. Passing this ring to `partitionConvex` and fan triangulation does not establish the claimed union. The second remaining four-face edge near Z44 belongs to another of these folded cells. `ribbon-cells.json` preserves all five, across tracks 146060426, 155269600 and 155269603.

## Proved support construction

The 104 cells bounded only by original source-node segments are all convex. Their width remains 3.4 m, their four source track identities and centreline X/Z are unchanged, and they are clipped by the same AOI. `ribbon.mjs` unions these cells first. It then intersects the resulting 356 pieces with horizontal Z strips at the existing metre stations and exact protected-span endpoints, and with the unchanged source terrain triangles. No source building vertex, source UV, material, road mesh, pavement mesh or graph polygon is edited.

The double-precision union area is `14430.948381536838` square metres; the terrain-partition area is `14430.948381536795`. A different mechanism, the integral of occupied horizontal intervals using all source vertices and edge-crossing events, gives `14430.948381536908` across 227 slabs. It does not call the union producer. This supports the physical-union claim rather than four overlapping extrusions.

One triangle inverted after Float32 storage, with area `-9.604264050722122e-7` square metres. The first candidate is retained as `ribbon-plan.json` and `ribbon-validation.json`; incidence alone would have accepted it. `retessellate.mjs` replaces a six-triangle star by four positive ears on its unchanged six-edge boundary. Exact Float32 dyadic predicates prove the directed boundary and signed area are identical before and after; it moves no coordinate and removes only the interior tessellation vertex `(102.20594787597656,0,-425.2619323730469)`. It does not drop a face to quiet the census. `retessellation-proof.json` contains every old and replacement triangle. This is a constrained planar retessellation, not a tolerance weld or source-shell exception.

The final stored plan contains 38,185 positive triangles. An independent exact-dyadic check tests 52,047 pairs whose interior bounding boxes overlap and finds zero interior-overlap pairs. The complete support has 119,492 stored triangles in three connected components, with zero degenerate, open, non-manifold or wrong-winding edges. All exact stored edges have two incident faces with opposite direction. Its signed volume is `36781.38919562754` cubic metres. The XZ-positive/negative count in the solid validation is merely projection direction: top and bottom faces necessarily differ; the planar positive-orientation check is the applicable one.

The stored plan area is `14430.947365836477` square metres, `0.0010157004307984607` below the double source union through ordinary Float32 serialization. This is disclosed; no assertion or tolerance was widened. The existing conformance procedure's measured maximum final snap is `0.00002159981426929899` m. The prototype does not claim exact preservation of unrepresentable double coordinates in Float32. All source inputs themselves remain byte-identical.

All 9,325 protected floor and graph fragments remain byte-identical. Their source Z extents are inside the unchanged spans with at least the original 8 m authored margin. No ground-bearing support triangle intersects even the union of those protected source Z intervals. This is stronger than checking only a few actor poses, but it is not an actor swept-body or visual proof. The elevated deck remains governed by the existing authored profile and thickness.

The retained output is `support-positions.f32`: packed little-endian Float32 XYZ, nine numbers per oriented triangle, 4,301,712 bytes, SHA-256 `5925ba04056a728f63391ccc06ac8200ef21eb58cf40fe5ce0342038615f6809`. It passed exact serialization/readback comparison and the independent edge census. Two redundant 32 MB JSON position dumps were removed after this binary and its readback checks were established. The scripts can recreate them if needed.

## Reject controls and limits

The same final support census rejects empty generation, one omitted face, one duplicated face and one reversed face. An exact required-track-set check rejects a missing track. The source-volume rule excludes one exact opposite-winding coincident pair, rejects a same-winding exact duplicate, and retains both members of a pair displaced by `1e-12` rather than granting it the exact-panel exception. The raw run-04/run-05 failures remain preserved and red. The first closed-but-inverted support also remains documented as rejected counterevidence.

The 1 mm two-sided boundary probe in `ribbon-validation-repaired.json` finds no boundary with occupied source ribbon on both sides. That offset is a diagnostic only; it never changes vertices, welds edges or supplies an acceptance tolerance. The exact edge and overlap checks carry the structural result.

This proof covers the frozen four-track fixture and controls above. It is not a general station CSG library, a held-out geographic test, native visual inspection, endpoint acceptance, texture/material acceptance or actor clearance proof. No H0/H1 appearance cases were read. No full repo gate ran, no code was integrated, and no commit was made.

## Building-cut blocker

This census is specifically the frozen run-05 recipe with `clearanceBottom: 8`. The implementation owner reports that root has rejected that cut floor and authorized a return to Y14 after the freeze. This report preserves the Y8 counterevidence; it does not transfer these counts to a Y14 replacement. Any replacement must rerun source-preservation and stored cut-boundary checks on its own exact output.

The frozen candidate does not satisfy the full done-condition. Eight building outputs introduce open edges absent from their corresponding source census. Counts are independently reconstructed from actual stored positions; `buildings-diagnosis.json` retains the exact edges and incident output face/source identities.

| Building suffix | Source open edges | Output open edges | New exact boundary keys |
| --- | ---: | ---: | ---: |
| 140d14bc-f7bd-45fa-a429-c296f4082805 | 0 | 133 | 133 |
| 1e7ccbe9-00e9-4756-bb12-bb123c5c3c1e | 0 | 9 | 9 |
| 5db01781-54dc-4dbb-b392-cae3696fe8e2 | 0 | 3 | 3 |
| 5e342582-90bd-4497-b851-648330ac5704 | 0 | 3 | 3 |
| 780bc11d-0c0c-440d-9546-a2f86e8295c6 | 0 | 14 | 14 |
| bc689157-d681-4005-a108-daa2827fd93c | 0 | 19 | 19 |
| c8c721d8-46ef-4fe1-bc43-b7501a4427cf | 0 | 3 | 3 |
| d7fb4726-719f-47a1-a94f-4d0a1e89a2e0 | 6 | 199 | 193 |

The d7fb source's six inherited boundary keys survive exactly; they are separate from 193 new ones. The 1e7 source has five inherited non-manifold edges; its output has six and also 11 wrong-winding edges. No approximate source-panel or blanket inherited-defect exemption is justified. The 20234796 and feb33dea outputs have no open-edge defect in this census. There are 377 new exact boundary keys overall.

The current cut path computes retained fragments and return faces through separate constructions, then asks floating-coordinate conformance to join them. This investigation proves that the resulting boundaries do not join, but does not prove a replacement cut algorithm. The precise remaining work is to construct each retained/cap boundary from shared cut events, or another independently verified construction, and make the stored census pass while preserving source position/UV/material outside the authorized cuts. Support success cannot retire that requirement. Full source-preservation acceptance of these cut outputs remains open.

## Concrete integration contract

1. Keep source ribbon construction separate from tessellation. Build 3.4 m cells at true source nodes and the AOI only. Reject non-convex cells explicitly. Do not inject metre or protected-span stations into the mitered ribbon constructor.
2. Union those valid cells before terrain and Z subdivision. Split the union by actual horizontal planes for bed approximation and protected spans. Keep the exact protected polygon records unchanged and require the complete four-track inventory.
3. At stored-plan admission, require every planar triangle to have positive exact Float32 orientation and disallow interior overlap. Use a bounded boundary-preserving retessellation where storage creates an inverted fan; never move vertices or grow a weld tolerance to fit it. The proven local mechanism and full fixture are here, not a claim of a general repair library.
4. Extrude the admitted shared plan, use terrain only for non-span foundations, and require the complete stored support edge census to be closed and oppositely wound. Retain omission, duplication, reversal and absent-generation controls.
5. Continue building-cut repair as a separate unresolved dependency. Do not apply the planar retessellation blindly to source building faces, UVs or materials. Then run the required integrated checks and independent native visual review before making a product acceptance claim.

Reproduce from the primary maps checkout, in order: `node artifacts/rail-topology-fresh-20260927/investigate.mjs`, `node artifacts/rail-topology-fresh-20260927/ribbon.mjs`, `node artifacts/rail-topology-fresh-20260927/retessellate.mjs`, `node artifacts/rail-topology-fresh-20260927/extrude.mjs`, `node artifacts/rail-topology-fresh-20260927/validate.mjs --repaired`, `node artifacts/rail-topology-fresh-20260927/arrangement-check.mjs`, and `node artifacts/rail-topology-fresh-20260927/final-checks.mjs`. In the cleaned handoff, `validate.mjs --repaired` reads the retained binary and `arrangement-check.mjs` reads the retained plan. Node was 24.12.0. These are scoped CPU probes, not repo gates.

## Resources

Every launched Node command completed with exit code zero, including the two finite runs that yielded exec sessions 8585 and 81551. No browser, GUI, server, daemon, network operation or dependency installation was launched. A final read-only CIM check for Node command lines containing this exact artifact-directory name returned no rows. The initial sandbox CIM read was denied; an approved read-only escalation completed the check. The retained artifacts are needed for this unresolved integration handoff; no shared output directory was cleaned.
