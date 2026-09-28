# Proposal 302 - close one north crossing frontage join

Proposal only; no implementation is accepted. Select the crossing-facing apron below the large TSUTAYA photographic facade, immediately north of the scramble, near the centre-right of the existing hero crossing images. The source building name is null; the visual name identifies the inspected facade, not a surveyed property label.

## Exact scope and source identity

Building: bldg_5f7ff4f3-a620-4fd0-a380-3ec46435cd27, batch 63 in data/scene/buildings/data/data518.b3dm. A read-only decode through the existing b3dm/Draco utilities and tile root matrix gives building bounds X [-29.913116, 5.326808], Y [15.098117, 67.231854], Z [-58.131400, -28.301056] metres. The low front wall edge runs from A=(-15.56315,15.09898,-28.30106) to B=(1.35682,15.09812,-30.31105), approximately 17.03894 m in plan. Coordinates below use X east, Y up, Z south.

Pavement parent: tran_f2a5948b-23c4-4932-83a2-a5c3591bf06c. LOD3 TrafficArea: traf_3c0280f7-c73e-4d08-bab3-07b05ebf748e, function 2000. The adjoining source rear-edge pieces include poly_ff5c0f79-9b19-46ee-ad6f-7f66f28263c7 and poly_ca58f7a0-b210-4996-a016-ab342a20354e, with rear points (-14.443,-27.631), (-5.543,-28.952), (1.557,-29.850) in X/Z. These are source-selection records, not newly recovered raw CityGML authority.

Bound the proposed authored infill to wall stations 0.1 through 0.9 on A-B, a 13.63115 m frontage. Investigation envelope: X [-14.0,-0.2], Z [-30.2,-27.6], Y [15.09,15.65]. This envelope limits investigation; the actual mesh must use the wall segment and exact noded pavement boundary, not a rectangular patch. End returns must be explicit at the two station cuts. No change outside this one strip is proposed.

## Geometry findings, separate from appearance

The outer curved apron already has a raised top and vertical closure geometry. Along the examined source chain from X/Z (-4.203,-12.224) to (6.716,-27.606), ten paired midpoint samples 0.03 m either side show the inward pavement approximately 0.080 m above the road. Fifty-eight vertical pavement triangles occur in the inspected chain's enclosing box; that count includes all vertical faces in the box, not a proved one-to-one chain membership. The road remains beneath/alongside the pavement; no outer curb hole is established. One outward sample also hits pavement, so source endpoints alone must not be treated as the exact runtime outline.

The building-side problem is different: there is a real terrain-only strip before road/pavement coverage begins. At each of three stations, rays in plan followed the unit outward normal (0.1179645,0.9930178). Intersections were calculated against the existing pavement triangles, with no mesh mutation. Heights use the existing highest-surface sampler; pavement/road heights below are sampled 1 mm inside the first boundary. The building edge coordinates are rounded to 0.01 mm, so the reported widths are approximate rather than survey precision.

| Wall station | First pavement distance | Boundary X/Z | Pavement top Y | Terrain Y at boundary | Terrain Y at wall |
| --- | --- | --- | --- | --- | --- |
| 0.1 | 0.777991 m | -13.779378, -27.729500 | 15.406019 | 15.108096 | 15.110635 |
| 0.5 | 0.579525 m | -7.034802, -28.730576 | 15.477254 | 15.162431 | 15.166078 |
| 0.9 | 0.494959 m | -0.276789, -29.618548 | 15.570016 | 15.305128 | 15.310675 |

At all three stations, 0.03 m from the wall has neither road nor pavement coverage. At the first two, 0.5 m is also uncovered; 1 m reaches pavement at all three. Terrain is present throughout those samples: this is missing pavement coverage and a level discontinuity, not a hole through the world. The observed top-to-terrain differences at the boundary are approximately 0.298, 0.315 and 0.265 m. These three transects do not establish the continuous strip's maximum width, full area, or all overlapping sheet ownership.

Current presentation uses one pavement MeshStandardMaterial for top and closure faces in src/scene/roads.ts. The sidewalk shader uses world-X/Z 0.6 by 0.4 m staggered cells, roughness 0.82, and detail strengths 0.08 Cartographic / 0.12 Satellite. Palette sidewalk colours are 0xd2d1c8 and 0x898982. It has no corner-specific finish. Cartographic buildings already have a shader ground floor and base band; adding a dark band would not supply the missing pavement. Satellite blur is inherited photographic detail and remains separate.

## One bounded candidate for root's decision

Author one narrow frontage infill that closes this actual terrain-only strip from the existing pavement rear boundary to the existing building wall, retaining the existing outer curb. Extend the adjacent pavement top continuously to the wall, node it against the actual selected top boundary, and close its two ends down to the existing terrain. Reuse the existing sidewalk material in both styles so the infill reads as the same apron. No shadow decal, black contact stripe, global palette change, added facade detail or curb rebuilding is proposed. This is a complete local pavement-to-wall join rather than a subtle edging-only milestone.

This candidate needs an explicit local presentation-footprint change: it adds pavement outside the mapped pavement footprint while leaving the mapped source record, original road/pavement/terrain bytes, building geometry and AOI cutout unchanged. The source base is not moved. At the sampled boundaries the new visible floor replaces a surface roughly 0.27-0.31 m lower; height next to the wall must be derived from the adjacent top planes, not assumed equal to these boundary values. Some existing low facade will be occluded. The infill is authored geometry, not a surveyed correction or an admitted physical support surface.

Suggested contract and files: one reversible authored component, src/scene/crossing-frontage.ts, attached/disposed and styled by src/scene/roads.ts. Bind its source to the exact pavement mesh and building ID/tile; keep the small wall/boundary contour explicit. It must not enter heightAt, paintHeightAt, network data, terrain sampling or actor support selection. Keep src/scene/surface-materials.ts unchanged by reusing its treatment. A separate narrow fixture/check should prove the infill only occupies its declared contour, meets the actual existing edge without a crack/overlap, and leaves all existing input buffers and samplers unchanged. Use the current geometry utilities; no new capture or surface framework is needed.

Preserving the current walking event requires confirming its complete swept support footprint is disjoint from this authored strip before implementation. Actor files/routes were deliberately not inspected here, so disjointness is not claimed. If any actor enters it, presentation-only installation would create a false visible contact surface; hold it and request a separate support-contract decision. Future physical use requires explicit source/height/clearance admission. The original strict preserve-all-visible-geometry constraint cannot close this gap; root must accept the stated local authored footprint change or defer this candidate.

## Existing-view acceptance

Use the existing Cartographic and Satellite noon hero crossing views at the retained camera (31.740095,18.383176,31.740095), target (0,15.2,0), plus the existing approach framing for surrounding context. Both native crossing originals show a thin, weakly articulated join beneath the large facade; the source check establishes that part of it is an actual surface discontinuity. No claim is made that the whole-frame quality gain is already proved.

A candidate passes only if the whole selected frontage visibly reads as one continuous pavement-to-wall join in both styles, with no terrain slit, duplicate lip, crack, end wedge, facade clipping artifact or paint change. The existing outer curb and crossings retain their shape. The improvement must be readily visible in the full native crossing comparison; if it needs a magnified crop or annotations to notice, reject it as too small for the next visual milestone. The approach view must show no new floating patch or bright ribbon. Existing gates and final independent review remain the integration owner's work; this proposal ran none.

## Inspected input provenance

No new image was captured. Reused the two earlier hero images; inspected one additional existing original, hero-satellite-noon-crossing.png, at native 1280x720. Other prior review298 images inform context only and are not evidence for this corner's geometry. No raw CityGML was read or regenerated.

| Input | SHA-256 |
| --- | --- |
| artifacts/walking295-20260928/native/hero/hero-cartographic-noon-crossing.png | ee50d3d295f85a9005c780612d38b7dfb9ebd5f2049bfa96ff770c74d1f594cd |
| artifacts/walking295-20260928/native/hero/hero-satellite-noon-crossing.png | 96b0a168206b701a7beb085fa3afbc264a0e8b8b1380e0c1cf5e38ae829a312d |
| artifacts/walking295-20260928/native/hero/hero-satellite-noon-approach.png | 8bdb6dd04e1e8d197029ef9eb87382f4f25b1a4bc85cfdd95b28edc6181c6d7c |
| artifacts/walking295-20260928/hero.json | 249da0421356e5e5bac259e70bd68ffe8045408434fb4244adcaba02f3d657f5 |
| data/scene/pavement-source.json | ab6a66b4da3fda3b0f3e60853f468fd203fd76bc92c56fdaa1d9a5a0dbdd58ea |
| data/scene/pavement-recipe.json | 0750f79ea57e8b58273d8bb65ff86a101e089c099bc7d048157708ec6ebb3c58 |
| data/scene/pavements.mesh | 3b24c5ef71f864fc6a90c768d8850b2f72ba1eb41255cf40dc37fd940115fb62 |
| data/scene/roads.mesh | 0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc |
| data/scene/terrain.mesh | c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773 |
| data/scene/buildings/buildings.json | 7faafdbc5047ff8e69cce83e1457080ab4d2d6a289f43b737a289ac3e0a40598 |
| data/scene/buildings/data/data518.b3dm | 5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b |
| src/scene/roads.ts | 2a941dc10ef8bd5582ce71da0695e3631ba68a8ae26f8c70082c574f6e2406bb |
| src/scene/surface-materials.ts | f905020c983366b27a763fd3403d5ed50eab06904d15c0994133cbcfeaf886c6 |
| src/scene/tile-materials.ts | 357026ece962e8c1d9189f3107ef7201bb03adc821df01ea97391db524674e17 |
| src/world/styles.ts | a9bd1f8d21c1056f4f1451d0e438e8048e57a4cbebdbabb72167248622376c50 |
| src/world/mesh.ts | 7490977ec95fa862ef75940ec4fd6cd1d2bea531adcfdbd3d7f03099ec83a5c6 |
| src/world/surface-sampler.ts | be12336a93fe749ebedcc5b21d3bef6aed5ca60a94449018db629c47eafb7263 |
| tools/scene/pavement-hero.ts | 8e3a580272f3ce8472eb11908bb6438f7caa9549d5f6c6b1d87c98368e3540d5 |
| tools/scene/pavement-geometry.ts | 3b7c8034061a8c28e8df143cbcc09cfafa90177eb45120e16141bb21f7bc9507 |
| tools/scene/compose-pavement.ts | 67581f14d69274db2830b6fc8974e4f159aece2a4cd4cf4616020de78259396e |
| tools/scene/build-roads.ts | c4b0f6e08fea2a66c53f9c9df4b4655d1a72231cd8cb3a245cd7f882ab38dad9 |
| tools/tiles/b3dm.ts | 4d9472df273d1a4df085ef66d143758796a1d76baa01f9f7cad0640a998b045d |
| tools/tiles/draco.ts | 9f7cadfcb147970ed223310a5184bc02167751bea3d517ffe48dca42e3ecbc25 |
| docs/reference/pavement-recipe.md | 359c78519245b52912756a05a4a04820cd95eaaa67b112cb437d36f20294a3e7 |

This was bounded read-only source/geometry inspection using existing utilities and in-memory calculations. No app runtime, browser, GPU, gate, data-generation command or new framework ran. No actor, product or canonical file changed. This report is the only created artifact; no persistent process is owned.
