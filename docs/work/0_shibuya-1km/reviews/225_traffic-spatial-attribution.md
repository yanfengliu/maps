#225 bounded attribution handoff — lane released

This handoff supersedes the4m wall statement in CLASSIFICATION.md. No225 product/source/data changes are adopted. Primary and this worktree still contain the exact fourteen-file195 candidate befd10547a02829e0b4f80b4078bdd3f9a47b337ed7ab9c37537ce37f70d0d14 on main base ba3a0d7412b8fbf8e9360c75a17726da1a6458fd. End-of-task hashes verify all14files unchanged in both trees. No gates, fetch, generator replay, browser, server or GPU ran in the bounded resumed check.

## Attribution and correction

222 independently confirmed a source connector defect: the retained lane41857226:0:f:0→41857228:1:f:0 turn should rotate+83.681degrees but the untrimmed offset-endpoint cubic winds−276.319degrees and jumps−24.170degrees at each join. Six-transition shared-cut prototypes remove this numerical curl; none is adopted because actual body/road checks reject them.

225 establishes that the original outgoing lane already leaves displayed road. At4m its center is off-road; at6–12m the tested maximum-scale kei/taxi hulls are completely outside the projected road union. The incoming0–12m samples remain covered. Exact original roads recovered by226 and current roads have the SAME23local world triangles, with zero difference in all28compared hull areas. The road gap therefore predates current surface edits. No historical-building byte comparison was performed; the solid finding concerns current rendered building data.

The original outgoing car collision envelopes intersect wall triangles1734/1735/1736 of bldg_384202ab-cad6-4852-bdd5-bfe08a1643f2 in final leaf data458.b3dm at6m. Both admitted car classes at0.96/1.04scales and the retained taxi scale1.0218907594680786 intersect. Positive finite cases persist through12m. The claimed direct-matrix taxi contact at4m is WITHDRAWN: actual GLTFLoader-equivalent Object3D matrix recomposition moves tile vertices by at most6.590mm and removes that marginal contact. The corrected70-pose CPU check has20positive poses, versus21under the direct matrix. No further repair or retry was attempted.

All hit triangle vertices are at least28.279m inside the actual AOI half-planes under the direct matrix; subtracting the measured maximum recomposition displacement still leaves over28.272m. The tile is a final leaf, gltfUpAxis=z, all ancestor transforms are absent, and feature RTC is absent. Source tracing shows identity tiles-renderer adjustment and parent groups; CPU Object3D.applyMatrix4/decompose/recompose matches the relevant GLTFLoader path. Native WASM decoder differences, GPU draws/frustum, actual car-mesh penetration and continuous solid-free motion remain unmeasured. This is finite collision-envelope versus decoded building-face evidence.

The disclosed reconstructed historical OSM labels41857228 residential, with no supplied elevation/access exclusion tags; current graph width is3m and mapped stop13302752098 survives. Original raw OSM is unrecovered, so unconsumed original tag equality is unknown. Current graph generation can fall back to terrain+0.22m and does not certify road/building clearance. No published vehicle-surfaces corridor exists here. Buses are outside the existing3m width rule; an actual consumer refusal test remains pending.

## Smallest next code boundary

Recommend an explicit, named pre-admission refusal for the unreconciled source corridor, bound to reviewed graph/world inputs and reported in refusal telemetry, while the separately owned populated opening uses physically supported routes. Preserve the bad turn and wall witness as red evidence. Do not silently move a source lane, paint asphalt through a wall, change seed/body scale, or call a refusal a repaired turn. Any future route realignment needs supported corridor geometry, then the shared legal-pair/cut seam BEFORE normal junction/control/split/compound finalization.

The opening owner must share the existing RouteLibrary vehicle-body validation/assembly seam (routes.ts), actual footprint/frame helpers, passages/halts/admissions/receiving-clearance contracts, and tick/vehicles runtime consumers. Keep195 whole-body halt and stop behavior intact. Reuse current rendered surface inputs and real-control native capture bindings. A supported route must pass and the retained unsupported corridor must fail before activation; preserve route/refusal counts so missing demand cannot look like completion. No new schema or hardcoded per-event geometry has been authorized here.

## Evidence and resources

HANDOFF-VERIFICATION.json binds unchanged source, exact inputs, and the single corrected verdict. classification06-bounds.json binds old/current roads and clip/loader source; classification07-runtime.json is the final finite wall check. FINAL-HASHES.json binds this handoff and exact evidence. Earlier failed preparation and rejected prototypes remain intact.6mwall rows retain actual triangle vertices and IDs for independent review.

At22:46:44.7061299Z, scoped CIM cleanup found zero225helpers and killed nothing. No225browser/server/GPU or private temporary directory was created. All foreground helpers completed. The managed traffic-turns worktree, exact195copy, read-only dependency junction and ignored225evidence remain for root's transfer to the next owner. No further225work is running or requested. The broader map and rejected traffic event remain incomplete.
