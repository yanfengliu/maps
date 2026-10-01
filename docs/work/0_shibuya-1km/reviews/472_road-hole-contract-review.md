# 472 — Road hole contract review

2026-10-01. Independent source-only review on FRONTAGE `02d06e982b6e516d0f05cd4b653a128c01a052cc`. **ACCEPT the preservation contract with the staged proof below.** No implementation, execution or consumer integration is accepted. Root owns each subsequent grant.

470 correctly retains exterior/interior XYZ, parent identity, LOD and explicit outcomes, reuses existing triangulation/clipping/support, and forbids a height-blind global mask. LOD2 height 0 is plan evidence; supported displayed-layer selection supplies placement. A hole constrains its associated source/layer, never an unrelated elevated road.

The retained 466 result reports nine controls and two interior-ring refusals. Both triggering exteriors are wholly east of geographic AOI: minimum longitudes 139.70664162462091/139.70791778716082, with approximately 58/174 m margins. Their preservation does not require a new mesher. Extracted/presented coordinates are not an independent precision oracle; directly parse the pinned original GML and retain full double-precision XYZ.

Smallest next proof: extend one private 466 adapter to retain and validate every original ring before exclusion. Prove both actual polygon/parent identities, every ring coordinate and unchanged source pins; project through existing authorities and prove disjointness against the existing AOI clip. Record explicit outside-AOI outcomes retaining both interiors. Preserve all 466 missing-parent/malformed controls and the next refusal. Keep in-AOI unsupported holes refused until their adapter is proved. No probe3 import or paint output belongs in this stage.

For intersecting solids, reuse `ShapeUtils.triangulateShape(exterior, interiors)` with original-XYZ indexing, then clip convex pieces. Nonempty triangulation alone is insufficient: require topology validation, net-area conservation and a dropped-interior red control. Define touching/crossing/outside/overlapping holes as refusal unless explicitly supported; include multiple holes and AOI-cut holes. This stays a short adapter over existing primitives.

470's no-alias rule is essential. `pruning-run` consumes `.ring`; probe3 independently reparses exteriors and uses height-blind membership. Neither becomes safe through a parser edit. Keep the new representation unavailable to those consumers until every membership/ownership/area/boundary adapter consumes hole-excluded solids, or explicitly refuses the representation. Add a legacy-consumer refusal control. Existing `checkPaintFootprint` lacks a semantic mask; exterior-only displayed asphalt cannot certify hole exclusion. Require a tiny-hole-crossing control against filled support plus another-layer counterexample before any paint acceptance. Interior edges confer no paint intent.

Actual reads/hashes match the dependency manifest. No import, Node, test, gate, Git, CIM, browser, server, GPU or product/data write ran; this document is the sole write. Parser success cannot close denominator, lane or native acceptance; pending native approval is untouched.

SHA-256 bindings:

- 470 report: `0e87c3546470316cb42eefad9210ed53f9dfc62597515428ed872398146a36ca`.
- Source holes: `bff8b63b7308d5f160ce7b455d13c8c2a34fb2a0a5a1d3ec776b9b9382764cfd`.
- Observed dependency pins: `1bb762d14b61a223f68de7213a8a88e646c27d734232edd797272d19607da347`.
- 466 helper/proof: `dcb98ac1f309af5baaccdfd0d98c35ddb32138ddbb77762ce6bb717270f25b67` / `139adfa6dbb412f32bbbecffb5f7f5222eaf80170ba68eff1e6e660e10de8095`.
- Pruning/probe3: `194aa97dc6cec490b7d58e47d652ba414cf4bb67b34bc2c88f24da100201c5b7` / `50b8fd3a885c97cb6d06bf2931615a217bc2c88e6be63dc73205c7c63d5ba41f`.
- Support/vehicle triangulation: `ca469c7b6a790ab56d6b63aef4d9ab21002b80cb6d47a6ce531c5aa594c63cec` / `63f990654ebd2b2b2d7c39c56c92ee742b12c69e2ddcdb771f5348a9e85ad974`.
