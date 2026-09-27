# Rail profile design — 2026-09-27

**Recommendation: retain every existing ground, road, pavement and actor-contact input, and use the continuous authored profile below. RD1 and the interior RD2 crossing can be resolved by this design. The north end can meet the AOI boundary. Do not yet approve a complete corridor implementation: RD3's south end still meets closed source building shells, and the exact collision evidence below requires an explicit station-presentation decision.** Calling those shells open canopies would conceal a real remaining condition.

This is design only. Product reference is 13ef7e83c56202a17aa56975ef5786825bfcff2f; concurrent camera work was not reviewed. Geometry conclusions bind the unchanged cached bytes listed in SUMMARY.json and receipt.json, not a claim that a later whole checkout was tested. Writes are confined to this ignored folder. No product, source cache, graph, building tile, renderer or simulation was changed. No browser, GPU, server, build or gate ran.

## Crossing classification and exact ownership

Historical OSM way **136729994 v2 (2022-11-20)** is `highway=path`, `tunnel=yes`, `source=Bing,2007-04`. Its canonically projected line runs from `(61.155213, -97.024887)` to `(85.433633, -93.763863)` in world X/Z. It lies 0.561041 m from `(73,-96)`. West path 136729991 joins its first node; east path 1115659358 joins its last. This is source-backed pedestrian-underpass topology, not a level crossing. OSM's [tunnel definition](https://wiki.openstreetmap.org/wiki/Key:tunnel) supports the category, not the tunnel's floor height, width or portal construction. Primary object: [way 136729994](https://www.openstreetmap.org/way/136729994).

The road triangles actually intersecting the four full 3.4 m proposed strips at this passage are **65940 through 65948** in `data/scene/roads.mesh`. Their vertex IDs and XYZ values are retained in crossing.json; their individual strip intersections are retained in kept-floor-check.json. They span the strips between approximately Z -100.286 and -92.057. Their stored vertices equal the terrain sampled at those vertices plus 0.2 m, within about 2.2 micrometres. `tools/scene/build-roads.ts:143-154` uses `max(source Y, terrain Y) + 0.2` for all admitted road vertices. This establishes a draped rendered surface at the embankment top; it does not establish a real floor at Y20.3.

The combined road mesh dropped CityGML parent IDs. The retained pavement source has no selected piece in this crossing box. **The original CityGML road/polygon identity is unrecovered.** The bounded classification rests on exact cached triangle identity, OSM geometry/tags/connections, and the producer's clamp. It does not pretend to join the OSM way to a recovered CityGML identifier.

## Selected profile and physical support contract

Keep the four accepted horizontal centre lines and exact source joins. Gauge is 1.067 m. The new historical endpoint extract supplies the connected source ways through all bridge transitions to the north AOI edge and into the station. `chains.json` holds the complete canonically projected polylines, node IDs, way IDs, tags and geographic coordinates. It preserves every source vertex. No source X/Z is shifted onto a convenient plateau; `level=2` is never converted to metres.

Use the following common **authored ballast-top Y** profile. Between adjacent anchors, use `Ya + (Yb-Ya) * t² * (3-2t)`, with t normalized over world Z. All anchor tangents are zero; the maximum rise/run is **0.0290493 (2.905%)**. The northern anchor at Z -500 lies outside the cut only to define the interpolation; the actual visible end is clipped against the canonical AOI polygon from `src/world/aoi.ts:59-64`.

| World Z (m) | Authored bed-top Y (m) |
|---:|---:|
| -500 | 23.00 |
| -450 | 23.60 |
| -420 | 23.60 |
| -310 | 23.00 |
| -268 | 23.00 |
| -105 | 23.40 |
| -92 | 23.40 |
| +50 | 20.65 |
| Station terminal candidates | 20.65 |

Cross-section: 3.0 m ballast top, 3.4 m complete structural footprint, source-centred and normal to the track; 1.067 m rail spacing; railhead 0.33 m above the authored bed top; 0.40 m structural depth at open spans. Both sides of each station section use the same authored Y. Shared miters preserve the source joins; do not independently drape sleepers or either rail. Dimensions, support, rail section, colour, sleeper arrangement and Y are authored presentation, not surveyed construction.

Outside the four passage/bridge zones, support the full footprint by a closed narrow retaining/embankment prism, with its lower boundary meeting the unchanged terrain. Cut that lower boundary at every source triangle intersection; do not rely on a few sampled skirt vertices and leave gaps. Use one quiet continuous material treatment and a narrow shoulder, rather than four floating ballast ribbons. Between strips, exposed original terrain remains unless a separately reviewed structural cross-member is necessary.

At the three source `bridge=yes` transitions, use a through deck. Each track's open span covers its source bridge way, extends at least 2 m past both bridge nodes, and expands further wherever the union of the **kept road/pavement geometry and protected existing actor corridors** crosses the structural footprint. Abutments, retaining walls and piers must remain outside that union; no support can plug a kept footway. Source way nodes only define the change of support type, not a rail end. At the pedestrian tunnel, use the same open-span rule across triangles 65940–65948 and the mapped path; its existing floor and its approaches remain unchanged. This is an explicitly authored bridge/deck presentation of source-backed grade separation. It does not recreate a surveyed tunnel or establish a new walk route.

The principal visual tradeoff is **roughly 3 m of extra authored retaining height above the original Y20 shelf** near the witnessed corridor. At the RD1 sections, full sampled footprint bed-to-terrain gaps are roughly 3.1–5.0 m; at bridges the deck-to-terrain gap reaches about 8.26 m, where open spans replace solid fill. This is a visible design choice for review, not a small texture dressing. The alternative low profile around Y20.65 requires a local road/terrain cut and a contact contract for its mouths. It is not selected.

## Numerical support and kept-surface clearance

`kept-floor-check.mjs` clips every 1 m strip cell, with exact miters at source vertices and the exact AOI cut, against all intersecting cached terrain, road and pavement triangles. It also clips all source building triangles, including vertical faces. All 13 cached tile bounding boxes meeting the corridor were decoded on the CPU (64,232 faces; 9,162 retained for the corridor inventory), with source GLB transforms; no textures were decoded.

Each of the four complete trial footprints has terrain coverage with remaining uncovered area below **5.1e-13 m²**. The minimum authored bed-to-terrain separation, after allowances, is **1.033 m**. This proves the proposed supported footprint can meet the existing terrain; it does not prove source elevation authority or that a future support generator correctly creates its walls. Summed terrain triangle areas slightly exceed footprint area in two strips, so the proof uses polygon subtraction rather than treating an area sum as coverage.

The table gives minimum vertical separation from the kept rendered surface to the underside of the proposed 0.40 m deck, across all four full footprints. It subtracts 0.0005 m for analytic-profile/chord error and a conservative 0.020 m for converting world-Z section evaluation to a level normal cross-section. These are geometric design allowances, not visual pass thresholds.

| Crossing | Road minimum | Pavement minimum | Source rail bridge ways / passage |
|---|---:|---:|---|
| North, around Z -435 | 4.107 m | 3.071 m | 146060260, 146060356, 155269559, 155269568 |
| Middle, around Z -290 | 4.957 m | 2.686 m | 146060261, 146060343, 155269562, 155269567 |
| Pedestrian passage, around Z -96 | 2.655 m | No pavement hit | Tunnel path 136729994; road triangles 65940–65948 |
| South, around Z 0 | 5.423 m | 5.343 m | 146060265, 146060331, 155269569, 155269553 |

Cross-sections at Z -122.5, -122, -100, -96, -73, -30, -12, 0, +20 and the north boundary are in SUMMARY.json / kept-floor-check.json. They include actual normal-section terrain, road and pavement heights at the centre, gauge edges, top-bed edges and complete-footprint edges. They preserve the original RD1 counterexamples; the authored profile does not reproduce their vertical kink or gauge twist.

A first kept-floor draft with bed Y22.1 at the middle bridge was **rejected**: it cleared roads but left only **1.786 m** over a raised pavement patch. It remains in kept-floor-v1-rejected.mjs/json. The final middle shelf is Y23.0. This is why the design checks pavements as well as roads.

## Actor-contact and clearance bound

`network-overlaps.json` inventories the complete cached graph against the design footprint using edge width/2 + 0.5 m. The only overlapping edge groups lie at the existing bridge crossings, so the protected openings can be finite. That diagnostic is not a swept moving-body proof: it has no finite-body end caps, yaw transition or pitch/roll certification.

The tunnel way **136729994 is absent** from the cached walking graph. Both approaches are present. West walk 136729991 runs from Y16.173 to Y17.564 at the tunnel node; east walk 1115659358 starts at Y16.335 and joins walk 1074513107. `src/agents/population/routes.ts:746-755` samples the route's stored Y; `src/agents/render/pose.ts:15-28` interpolates the authoritative poses. The walking support layer also binds exact road, pavement and terrain hashes (`walking-surfaces.ts:141-153,157-169`). Lowering or clipping these surfaces could require a genuine contact dependency. **This selected design changes none of them.** It must not add the tunnel to routes, relocate feet, hide agents, or suppress population while claiming contact acceptance.

The cached vehicle manifest's highest unscaled upper bound is the bus at Y3.324500 m. Applying the existing `vehicleScale` cap (`routes.ts:716-727`) gives a maximum upright upper bound **3.330137 m**. Kei and taxi upper bounds are 1.981200 and 1.955200 m. The above road clearances exceed those upright values, but **do not yet certify a tilted moving bus**. Existing support normals, pitch/roll, yaw, lateral motion, wheel offset and the entire body must be checked against new decks/supports before integration. No universal vehicle-height or road-standard claim is made. The greatest supplied human LOD bound is 1.833427 m, or 1.980102 m at configured scale 1.08; moving humans still require the same support-opening check.

## RD3: north end resolved; exact south decision still required

All four lines continue through the two northern bridge transitions to the canonical north cut, at approximately Z -499.12 to -499.10. Cap the supported cross-section on that cut plane, matching the existing square model edge. No track ends at Z -230 or at a way split.

For the south end, a 3.4 m strip can become fully covered in projection by existing roofs above Y24.5 at the following first metre-long cells. Two metres farther inside provide concrete terminal *candidates*, not proof of an existing entry.

| Track | First complete roof-covered cell | Candidate terminal centre Z | Source obstruction before terminal |
|---|---:|---:|---|
| 146060273, west outer | +52 to +53 | +54 | bldg_20234796… side wall from Z20.313; bldg_5db01781… from Z30.066 |
| 146060426, west inner | +84 to +85 | +86 | bldg_20234796… from Z50.349; station bldg_d7fb4726… from Z83.033 |
| 155269600, east inner | +83 to +84 | +85 | station bldg_d7fb4726… from Z82.416 |
| 155269603, east outer | +80 to +81 | +82 | station bldg_d7fb4726… from Z78.651 |

The existing models are **closed shells at rail height**. For example, data503 primitive 1 face4563 at the west outer strip contains a vertical wall at Z20.31, with source Y14.874–26.994. The east inner entry intersects station data506 primitive1 face107 / data517 primitive1 face844 at Y20.3–21.0 around Z82.416. Exact XYZ intersection polygons, source GML IDs and corresponding faces are in south-obstructions.json. The small bldg_5db01781… has a roof near Y21.999, so a generic 3 m-high portal subtraction would also erase an existing roof. The station-tagged OSM polygon 904652357 provides broad station context, not permission to invent a hole in every intersecting shell.

**Do not silently run rails through those walls, cover them with a flat black doorway, fade the tracks away, or call roof coverage an open entrance.** The finite next decision is an independently reviewed **local station entrance adaptation for these three named source objects**, or a small primary source reference establishing an alternate real occluder/entry that avoids them. A proposed adaptation must identify which shoulders, walls and the low annex roof are kept, trimmed or replaced; preserve rail X/Z; terminate only once the entire rail/bed section is hidden; and prove its resulting building clearance. It is an additional authored building-presentation change, not contained in the accepted horizontal rail source classification. I do not authorize it by this report.

This is the remaining exact blocker to a complete implementation contract. It is not missing surveyed rail Y, and it does not justify PLATEAU archive retrieval, global terrain work or simulation research. The profile/support proposal is concrete enough for a focused independent review now; the reviewer must keep RD3 open unless that local station decision is expressly accepted with geometry evidence.

## Source and provenance

The new endpoint response is a **freshly fetched historical extract**, queried at 2026-09-07T03:23:56Z, matching the earlier network source date. It is not the lost original full-AOI response and is not evidence that every extension is unchanged in present-day OSM. Query window is world X35..150 / Z-540..65, with only railways and tagged highway bridges/tunnels; 77,340 response bytes. Full geometries of intersecting ways extend outside that window. No whole archive was fetched and no cached source was overwritten.

Endpoint source SHA-256: `8470bbe6c7c2e79dac82165eadf238525823af490f2046ae602f7735cdff6f33`. Query SHA-256: `284ba447372d0f9b3f22504937c9d1576af270bd2c25dc4a75b32a2501078429`. URL, time, status, query bounds and response headers are retained in historical-endpoints-receipt.json. Projection uses the repository's geographicToPlaneRectangular / planeRectangularToWorld and canonical origin; source alignment is not survey-exact. The earlier current/historical comparison of the original eight embankment/bridge ways remains preserved, with no stronger claim for the newly fetched continuations.

Keep OSM-derived centre lines and the authored recipe separately identifiable and regenerable from PLATEAU cached surfaces. Retain query/source hashes and date, disclose authored heights and reconstructed presentation, and extend visible OSM attribution to this scenery use. [OpenStreetMap copyright and ODbL](https://www.openstreetmap.org/copyright) and [Overpass date-query documentation](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL#Date) are the primary licence/query references. Existing PLATEAU attribution remains required. Do not imply the new static geometry has railway-operation, road-navigation or routing authority.

## Finite acceptance after design approval

1. Resolve the three-object south entrance decision above; then freeze the actual source-line roster, continuous profile, complete mitred footprints, protected openings and building exclusions. Until then, do not call the whole rail treatment approved.
2. Implement only that frozen scenery contract. Verify full generated-volume support and clearance, including exact new wall/abutment/deck triangles against the protected kept surfaces and actual actor body envelopes. Reject missing/stale inputs, RD1 draping, RD2 asphalt collision, disconnected joins and unapproved bridge/tunnel admission. Preserve existing source/network bytes and reject any new population contact regression.
3. Use the root-owned bounded hardware run after implementation: saved block pose in both styles, close oblique crossing, all three rail bridges, north cut and the accepted station entrances, plus one overview and a short real-control motion pass in noon/dusk. Inspect native images for the visibly taller supports, apparent wall entries, rail aliasing, empty or hidden end gaps and actor clearance. Then root's required gates and focused independent review of the exact integrated revision apply. No visual acceptance is claimed from this CPU report.

Preserve the original rail review, rejected direct-drape/200 m proposal, A1 native images, low-profile trial and rejected first kept-floor draft. These are counterevidence, not disposable passes. No task-owned browser/GUI/server process was launched or left behind.
