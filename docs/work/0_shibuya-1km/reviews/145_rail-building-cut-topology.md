# Review145: current Y14 building-cut construction

The bounded prototype passes the stored Float32 topology requirement on all ten authorized buildings. Its 18,534 rendered triangles have no new boundary, nonmanifold or winding defect. Six original open edges on `d7fb4726` and five original panel-contact edges on `1e7ccbe9` remain, with exactly the same stored edge keys as the source. This is an implementation handoff, not an integrated product or visual acceptance.

Author: independent `rail_topology_fresh` worker, 2026-09-27. Integration owner: root. Implementation owner: `completion_reconcile`. Assigned base: `f078538b070b9cdb97cdd578b6bddfa1c386881b`. Every task write is inside this ignored evidence directory; product code, source data and dependencies were read-only. Root will promote this authored review into the permanent work folder when integrating.

## Fixed contract and inputs

The accepted cutter is the union of the unchanged source-node 4 m prisms at Y14..24.9 within the canonical AOI, for exactly the ten approved objects. Neither source track X/Z nor the lower cut plane changed. The required output retains all original geometry outside these cuts, its source identity, batch, material and barycentric UV/normal correspondence. Original vertices must not move. New returns must close without omitting generated faces or hiding new faults among source defects.

Disqualifiers remain tolerance growth, unexplained hole patches, omitted objects or generated faces, wider/deeper cuts, approximate or same-winding panel exceptions, moved source coordinates, lost attributes and a topology-only appearance claim. The old rejected Y8 run is not an input to this proof.

The worker's immutable run-09 fixture is byte-identical to current run-07 for all 15 relevant recipe, source, inventory, building and check files. `input-manifest.json` records the original paths, local copies, byte lengths, SHA-256 values and run-07 match results. Nine generator/dependency source files were also copied before use. All 24 local and original snapshots were rehashed after verification and remained unchanged. No live product helper was imported after the snapshot.

The frozen producer SHA-256 is `69ddf1746a6c97f38e70e9cd63d91cc3f15d3f9826a2874f4295159bb7375666`; the kernel is `964ab8094392e75e78b13879bc71d4bd42c285f9b5e4bff54e4c46a443bcb76e`; planar helper is `e69922fb0ba8311c87e925245912d824ac8c4b7af4d781c56cfd43eb6b9cd208`. `HASHES.json` pins the complete retained prototype, results, snapshots and runtime dependency entry points. This proof starts from the pinned decoded source-face fixture; it does not independently decode the tile archive again.

## Diagnosis and construction

The original Y14 output has 504 new open-edge keys across eight buildings. The independent `audit.mjs` counts every triangle edge using its exact stored Float32 coordinate key, its direction and its incident faces. The first bounded attempt only subdivided exact stored T-junctions. It closed small seams but left large missing returns. Those retained red results ruled out treating the remaining holes as a weld-tolerance problem.

**Coplanar return ownership.** The original producer subtracts every other cutter from each cutter's return cap. At Y14 and Y24.9, overlapping cutters have co-oriented, exactly identical cap planes. Each cap loses its overlap to the other, so both omit the same surface patch. A deterministic first owner must retain that overlap. In `raw-components.mjs`, an earlier cap skips subtraction by a later cutter only when the other cutter has an exactly equal normal and plane offset. It still subtracts all other cutter interiors. Opposite-facing/internal boundaries get no exception. This is union boundary ownership, not a new hole patch or change to the clearance prisms.

The restored union-cap area is 43.5809604080 m² on `d7fb4726`, 123.6124777265 m² on `140d14bc`, and 2.3430981356 m² on `780bc11d`: 169.5365362701 m² total. Other changes at this stage are only double-arithmetic residuals below 1e-12 m². `final-verification.json` records the old, union-owned and final cap areas for every object.

**Original component classification.** After excluding its two exact opposite panel pairs from volume classification, `1e7ccbe9` contains five closed, positively oriented source shells with 12, 52, 36, 24 and 164 triangles. A single even/odd section across their combined edge soup treats overlaps between these separate source shells as a parity cancellation. That produces one new nonmanifold edge and eleven wrong-winding edges. The final prototype calls the unchanged `solidSection` separately for each component returned by the unchanged `sourceComponents`, then constructs that shell's returns. The original shells and their existing overlap are retained; they are neither repaired nor merged. This classification change adds 0.0003241984 m² of return area on `1e7ccbe9` and removes those new faults. Apply the same component method to each of the ten objects rather than special-casing that object. In product code, compute components once per object, outside the cutter/plane loops.

**Exact stored subdivision.** The frozen `conform` runs before final Float32 storage. Storage can make an already-existing point exactly collinear with a longer stored edge. `refine-stored.mjs` runs afterward. It converts finite Float32 coordinates into exact dyadic BigInt integers, tests strict interior membership and zero cross product, and subdivides only at existing stored positions. A positive-ear triangulation retains the original triangle's surface, boundary and winding while preserving every inserted boundary vertex. It adds no coordinate, moves no vertex and fills no hole. Source weights interpolate along the original edge. A 4 m search grid is only an acceleration structure, not a tolerance. Thirteen insertions across twelve faces suffice for this fixture.

The final construction uses the existing clipping and section helpers plus these three local corrections. It does not introduce a general CSG framework or alter support deck/pier work.

## Exact stored result

Object prefixes below uniquely identify the full IDs in the machine-readable files. Boundary and nonmanifold counts include the retained original defects; all wrong-winding and degenerate counts are zero.

| Object prefix | Rendered triangles | Boundary edges | Nonmanifold edges | Exact inserted edge points |
| --- | ---: | ---: | ---: | ---: |
| 20234796 | 890 | 0 | 0 | 0 |
| 5db01781 | 112 | 0 | 0 | 1 |
| d7fb4726 | 6,400 | 6 inherited | 0 | 0 |
| 1e7ccbe9 | 1,870 | 0 | 5 inherited | 2 |
| 5e342582 | 684 | 0 | 0 | 1 |
| 140d14bc | 6,138 | 0 | 0 | 1 |
| c8c721d8 | 192 | 0 | 0 | 1 |
| bc689157 | 1,080 | 0 | 0 | 7 |
| feb33dea | 692 | 0 | 0 | 0 |
| 780bc11d | 476 | 0 | 0 | 0 |

`final-verification.json` lists the exact inherited source and output keys and asserts equality of both sets. No new key is exempt. For volume classification only, source pairs `[1820,1890]` and `[1821,1891]` are omitted on `1e7ccbe9`; all four original faces remain rendered. Its resulting 1,866-triangle solid census has zero boundary, nonmanifold or winding faults. The six original `d7fb4726` boundary edges remain in both rendered and solid censuses. They are not patched.

## Preservation and adversarial evidence

Every retained raw source fragment, including face identity, material, positions and barycentric weights, is byte-identical to the corresponding frozen baseline clipping result. The repairs only change return construction and triangulation of an existing stored surface. All 6,730 original outside-cut vertex occurrences are present at their exact Float32 representations. The maximum barycentric weight-sum error is 2.220446049250313e-16, and the minimum weight is zero. The largest stored-position versus original-double barycentric discrepancy is 0.0000209923390393 m, disclosed as the existing Float32/conformance representation difference, not a widened seam tolerance or permission to move original vertices.

`candidate/` contains all ten serialized prototypes with source URI/node/primitive/face/object/batch identities, material, positions, weights, UVs and normals. `verify-assets.mjs` reads those bytes back and checks identities and attributes against the frozen source, checks exact stored geometry against the constructed mesh, and reruns the exact census. It rejects independent source-face identity, material, UV and position mutations for every object: forty red controls.

The full construction also ran with reversed cutter order and with a distinct duplicate of every cutter. All thirty object outputs retain the exact topology requirement. The duplicate-cutter output has exactly the same canonical stored triangle geometry and source/material assignments as the normal output for all ten objects. Reversing cutter order may change triangulation and final Float32 rounding, so byte identity is not claimed. Bidirectional polygon subtraction, grouped by original source face in barycentric coordinates or by exact cap plane and original source component, measures a maximum reversed-order residual of 4.6168103592e-14 in source barycentric area and 5.6633829269e-12 m² in projected cap area. These residuals are reported directly; the coverage instrument uses the frozen planar helper, whose existing sub-nanometre-edge and 1e-14-area guards bound this numerical evidence. No topology tolerance was added or increased. This is finite geometric coverage evidence for both ownership orders, not a claim of symbolic equality for arbitrary inputs.

For each object, empty generation, omitting one generated cap triangle, duplicating one cap triangle and reversing one cap triangle are all rejected by the exact topology admission: forty additional red controls. Exact opposite coincident source panels are accepted only for volume exclusion; a same-winding duplicate throws, and a 1e-12-displaced opposite pair remains in volume classification. Missing generation therefore cannot report success.

Intermediate rejected outputs are retained in `raw/`, `refined/`, `raw-union/` and `union-refined/`. Exact stored subdivision alone failed on the missing union patches. Coplanar ownership plus subdivision still failed on `1e7ccbe9` until original shell classification was preserved. The final component construction is the first result that meets the ten-object stored-edge contract.

## Implementation handoff and remaining limits

Port the three local mechanisms from `raw-components.mjs` and `refine-stored.mjs` into the building cut path. Keep the approved recipe and original retained-fragment clipping unchanged. Cache original volume components once per object; assign only exactly co-oriented coplanar return overlaps to the first cutter; after storage, split exact existing T-junctions without moving positions. Keep the exact source-panel rule and require a complete object/generated-face roster. Then rerun the producer and its stored-edge census on the accepted Y14 fixture, comparing each retained original defect by exact key. Do not substitute a summary count or global manifold exemption.

The operational reproduction sequence from this directory is `node raw-components.mjs`, `node finish-components.mjs`, then each of those with `reverse` and `duplicate` as its argument, followed by `node verify-final.mjs` and `node verify-assets.mjs`. The frozen baseline and coplanar-only raw evidence used by the final verifier is already retained; `raw.mjs` and `raw-union.mjs` reproduce those stages if needed. All calls use Node 24.12.0 and installed read-only Three dependencies. The original producer is never run over frozen output.

No product files were edited, and no commit, whole-repository gate, GPU job, browser, server, data writer or installation ran in this lane. The process inventory found zero remaining task-owned Node processes. The retained outputs are active integration/review evidence; remove them only after root has accepted the integrated replacement and no handoff needs them. Other tracked work observed during sealing belongs to the separate active lanes and was untouched.

Remaining work belongs to the implementation/integration owners: port the exact mechanism, independently review the resulting product diff, run applicable gates, and inspect the rendered cut returns and surroundings. This prototype proves the stated decoded-source topology and attribute bounds. It does not establish native visual quality, appearance from any viewpoint, endpoint behavior, support union correctness, or the final integrated scene's acceptance.
