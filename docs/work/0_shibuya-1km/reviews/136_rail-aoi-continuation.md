# Review 136 — south AOI rail continuation, independent lane E2

**Verdict: all four named railway classes have a finite, uniquely connected historical source path to the canonical south model cut. That supplies a concrete endpoint mechanism. The unmodified-building candidate fails: continuation at the accepted station height intersects seven additional PLATEAU objects, and requires new support openings over retained floors and graph corridors. Do not admit this as a completed rail design or appearance pass.**

This is a read-only feasibility lane on product base `0ec3dd03831b605235302212b7d140cb35297071`. It uses the fixed done condition and disqualifiers in `docs/work/0_shibuya-1km/rail-endpoint-search.md`. No comparison with lane E1 was used. The prior receipt SHA-256 `042995fa4ed2eefc4308bdab45c61f286c574c2a6a37d553247a029249b26778` and summary SHA-256 `ccf48c117e99433f24c291723311a18b39ac75332a326612445e42a3fee5cc7f` were reread and match. Their rejected short/deep station candidates and 560-sample counterevidence remain unchanged.

## Historical source route and exact model endpoint

`historical-south-query.overpassql` requests only railway ways in the small X70..300/Z135..530 corridor, at **2026-09-07T03:23:56Z**. It returned 24 objects in **45,918 bytes**, response SHA-256 `f1ced175572008d13a5f0b2e669c8c6523feae145ed13ef029a337542a6337af`. The eastern line continues beyond X300 before reaching the model edge; a second query uses its exact shared node **7037225480**, returning two ways in **4,698 bytes**, SHA-256 `a3738134763c73354e22c77896ea99e25aa6cb9cb8ad54485d29ad58040c6895`. Total new response transfer is **50,616 bytes**. Both HTTP 200 receipts, exact queries and original responses are retained. No current-date substitution or PLATEAU download occurred.

The response replication timestamp describes the server, while the saved query selects the historical state. Every returned way edit predates that selected date. All four overlapping station ways match the old historical extract in version, timestamp, node IDs, complete geographic geometry and tags; the second query's repeated way also matches byte-equivalent parsed content. The old `chains.json` SHA-256 is `388c30c691d9ec110680bc1668c7ab333b5b0e7ade8f93bc54072931c21d7445`.

`chains.mjs` traverses endpoint node identity, not proximity. Every onward join has exactly one eligible unvisited above-ground railway way. Each retains the starting line name and 1067 mm gauge. Every shared node projects to exactly the same X/Z through the canonical projection and world transform; every subsequent source vertex is retained. No branch is chosen by visual convenience and no line is shifted. The four new tunnel-tagged Tokyu ways returned by the corridor query are separate objects and are not substituted for these named above-ground classes.

| Named track | Historical station way and south continuation ways | Added centreline length from Z144.85 | Exact south-cut centre X/Z |
| --- | --- | ---: | --- |
| 146060273, west Yamanote | 211954421 → 853258588 → 853258594 → 211954209 | 421.493706 m | 316.070493 / 499.651712 |
| 146060426, inner-west Yamanote | 146060379 → 853258589 → 853258593 → 211954197 | 416.103865 m | 322.025083 / 499.659759 |
| 155269600, inner-east Yamanote Freight | 211954289 → 853258586 → 853258592 → 853258590 → 751605908 → 211954415 | 416.726874 m | 326.558875 / 499.665886 |
| 155269603, east Yamanote Freight | 211954427 → 853258587 → 853258591 → 144131731 → 74271098 → 753152569 → 753152570 | 416.153094 m | 342.612766 / 499.687581 |

The endpoint lies on the straight canonical south edge between `AOI_CORNERS_WORLD[2]` and `[3]`, not on a rounded Z500 line. The source itself continues beyond the edge. Total added centreline length is **1,670.477540 m**. Existing north geometry is unchanged. Rail, sleeper, ballast and support sections would all be clipped and capped on the same model plane as the surrounding city; there is no proposed rail terminus, painted door or new interior dead end.

This addresses the geometric reason for an arbitrary interior endpoint. It does **not** make the strict zero-ray benchmark pass: no new rendered endpoint samples or native views were produced, and the old terminal samples still belong to the rejected candidates. A visible section on the existing square model edge is the mechanism under consideration. Whether that completed scene meets the fixed exterior-quality condition still requires the reviewed capture contract and native inspection.

## Existing surfaces and profile feasibility

The tested continuation keeps bed-top **Y20.65**, railhead **Y20.98**, complete structure width **3.4 m**, source-centred normals and exact source-join miters. It retains the accepted station profile without an additional grade. The probe divides at every source node and at 1 m Z stations, then clips the full polygons against the canonical AOI. It does not mistake centre station bounds for the footprint bounds.

| Track | Added footprint area | Bed above terrain, exact clipped extrema | Maximum uncovered terrain area |
| --- | ---: | ---: | ---: |
| 146060273 | 1,433.078601 m² | 2.199999–8.580579 m | 5.74e-13 m² |
| 146060426 | 1,414.753143 m² | 2.030141–8.630000 m | 5.14e-13 m² |
| 155269600 | 1,416.871372 m² | 1.869999–8.627694 m | 2.88e-13 m² |
| 155269603 | 1,414.920520 m² | 1.949999–8.740000 m | 3.78e-13 m² |

The summed footprint area is **5,679.623635 m²**. Inner-west and inner-east footprints overlap by **101.654293 m²**, over Z145.367436..280.699883. Four separately closed overlapping supports would create internal faces and seams; a candidate must form their physical union while retaining all four rail alignments. This union has not been generated or visually inspected. The measured footprint lies wholly within X88.962313..344.717080/Z144.148330..499.690425, inside the decoded inventory bound.

The extension intersects **203 distinct cached road triangles** and **1,515 distinct cached pavement triangles** in plan. They separate into lower kept floors and upper surfaces. Lower roads span Y12.212000..14.910849; lower pavements span Y12.292000..16.042037. Upper road surfaces begin at Y30.032927 and upper pavements at Y30.068719. **No retained road or pavement fragment intersects the trial rail/deck slab Y20.25..21.0005.** The upper values describe surface separation, not a surveyed deck underside or clearance through unmodeled thickness; overlapping building massing is checked separately below.

With a 0.40 m rail deck and the inherited conservative 0.0205 m allowance, minimum kept lower-road to rail-deck underside separation is **5.318651 m**; lower-pavement separation is **4.187463 m**. Those exceed the previously reviewed upright bus/human bounds of 3.330137 m and 1.980102 m respectively. This remains a static bound, not a swept pitched/rolled actor proof.

Continuous solid retaining fill would obstruct the following kept corridors. These are **minimum occupied Z intervals** from exact floor polygons and buffered graph rectangles, not approved abutment locations. Open spans must include each full polygon union, finite actor bodies and a reviewed margin. The new source rail ways do not assert `bridge=yes`; these would be explicit authored support choices grounded in retained surface separation.

| Track | Required open-support intervals, world Z | Road / pavement minimum underside gap | Intersected graph source ways |
| --- | --- | ---: | --- |
| 146060273 | 187.208562..228.142831 | 5.368524 / 4.187463 m | walking 759282888; no cached lane intersection |
| 146060426 | 180.766958..222.388433 | 5.511572 / 4.619491 m | no cached graph intersection; floors still retained |
| 155269600 | 179.723937..221.383635 | 5.318651 / 4.688429 m | no cached graph intersection; floors still retained |
| 155269603 | 174.258698..257.515001; 426.448381..428.572099 | 5.373787 / 5.118279 m | walking 759282883, 1228977019; lanes 23443810, 759282887, 1117318750, 1330873772 |

The inventory contains **6 directed walking IDs and 8 lane IDs**, with full IDs, per-segment polygons and Y ranges in `fragments.json` and the compact roster in `geometry.json`. All eight lane IDs intersect the east track only; four walking IDs intersect the east track and two intersect the west track. Use those exact records to freeze a support. The table's source-way mapping is checked in the sealed summary. The longest occupied interval is 83.256303 m on the east track. Do not invent piers inside its retained floor union or call a long unsupported visual span an engineered railway bridge. Abutments, actual union supports, moving-body clearance and the resulting appearance are unresolved implementation/design obligations. No floor, network route, actor height or source cache was changed.

## Additional building scope and concrete blocking faces

Nine final-leaf tile bounds intersect X85..350/Z143..502: data500, data504, data505, data508, data510, data512, data513, data514 and data515. The probe decoded all **85,136 triangles** in those leaves and retained **26,291** for the corridor inventory, preserving GLB transforms and source face identities. It did not inspect coarse proxies instead of final leaves. Actual intersecting building geometry belongs to data505 and data512.

The table lists every source object touching the full structure footprint. Collision counts are distinct source faces with positive-area intersection against the trial clearance prism **Y14..24.9 within the 3.4 m footprint**, and against the smaller rail/deck slab **Y20.25..21.0005**. They are geometric intersections, not permission to cut the objects. This lane did not build a 4.0 m clearance cut, so these counts do not bound a future wider station adaptation.

| Exact object | Source building identity and class | Footprint Z extent | Clearance / rail-slab faces |
| --- | --- | ---: | ---: |
| `bldg_d7fb4726-719f-47a1-a94f-4d0a1e89a2e0` | Existing reviewed station 渋谷駅; 13113-bldg-2649 | 144.148330..169.616941 | 18 / 7 |
| `bldg_1e7ccbe9-00e9-4756-bb12-bb123c5c3c1e` | **New**, 13113-bldg-2123; unnamed durable building, transport/storage use | 163.796212..198.197482 | 53 / 10 |
| `bldg_5e342582-90bd-4497-b851-648330ac5704` | **New**, 13113-bldg-1684; unnamed, class unknown, transport/storage use | 169.627666..190.502564 | 14 / 12 |
| `bldg_140d14bc-f7bd-45fa-a429-c296f4082805` | **New**, 13113-bldg-1389; unnamed, class/use unknown, transport/storage land-use category | 199.363374..278.267437 | 42 / 25 |
| `bldg_c8c721d8-46ef-4fe1-bc43-b7501a4427cf` | **New**, 13113-bldg-901; unnamed, class unknown, transport/storage use | 266.068379..298.065357 | 10 / 8 |
| `bldg_bc689157-d681-4005-a108-daa2827fd93c` | **New**, 13113-bldg-482; unnamed, ordinary wall-less structure (`普通無壁舎`), transport/storage use | 291.916285..412.469442 | 59 / 20 |
| `bldg_feb33dea-41a8-4487-bdeb-b85cef69d436` | **New**, 13113-bldg-1956; unnamed ordinary building, use unknown, transport/storage land-use category | 410.932080..446.886523 | 4 / 4 |
| `bldg_780bc11d-0c0c-440d-9546-a2f86e8295c6` | **New**, 13113-bldg-1396; unnamed, class/use unknown, road-land category | 428.384757..439.367838 | 6 / 4 |

The seven new objects account for **188 clearance-intersecting faces and 83 rail-slab-intersecting faces**. With the three previously reviewed objects, a combined intervention would concern **at least ten distinct source objects in three final leaves** (data503, data505, data512). That is a lower bound on necessary adaptation scope at the tested width, not an authorized maximum for wider cuts. Source transport land-use and a wall-less semantic class do not erase the closed or obstructing triangles actually supplied. All seven new objects have null source names; they must not be relabeled as the named Shibuya Station merely because the rail alignment passes through them.

Four exact source-centreline witnesses at Y20.815 make the failure independently reproducible:

| Track | First new obstruction at X/Y/Z | Tile, primitive, face |
| --- | --- | --- |
| 146060273 | 98.228873 / 20.815 / 164.446960, object 1e7ccbe9… | data505, 1, 5860 |
| 146060426 | 145.193224 / 20.815 / 225.630517, object 140d14bc… | data505, 1, 6143 |
| 155269600 | 147.615902 / 20.815 / 224.640692, object 140d14bc… | data505, 1, 6145 |
| 155269603 | 141.506975 / 20.815 / 175.390658, object 5e342582… | data505, 1, 5620 |

`audit.json` contains the full source triangles, hit points and all centreline hits. The west witness triangle spans ground to Y26.099994 and intersects the exact source line; terrain under its hit is Y14.900000. It is not an overhead-only roof that can be ignored. The ray instrument hits this unchanged triangle at zero residual in a positive control and rejects the same triangle translated behind the ray origin. The full prism clip independently establishes positive-area intersections, so the finding does not rest only on a zero-width centreline.

Therefore a continuation that edits only the earlier three authorized objects fails the no-wall-penetration condition. A larger bounded reconstruction may be possible, but this lane has not proved the new shell sections close, that their retained roof/facade portions remain coherent, that all support/upper-surface interactions clear, or that the resulting openings read well. Requiring seven additional adaptations and union supports is a real unsolved dependency. Calling that integration routine would relocate the hard part. This is not a proof that every south-boundary strategy is impossible; it is a concrete rejection of the unchanged-building continuation and an exact inventory for any separately authorized design.

## Adversarial audit and disposition

- **No class dropped:** all four accepted railway IDs have complete historical joins and exact south-plane intersections. The first corridor query's incomplete east tail was repaired by one exact-node query; it was not truncated or extrapolated.
- **No wrong date or invented join:** both queries select the same historical date, duplicate station ways match geometry and tags, and each join uses one identical source node. No nearest-line stitching or X/Z bending occurs.
- **No weakened endpoint assertion:** the prior 560-sample failures and hashes are preserved. No ray condition, camera list or appearance threshold was changed here. An unrendered boundary endpoint is not scored as a native pass.
- **No support collision hidden:** all retained roads, pavements and cached graph edges were inventoried against actual footprint AABBs. Solid-fill blockage and the additional open-span obligations are explicit. Upright static gaps are not reported as moving-body clearance.
- **No favorable-source-only test:** every final leaf intersecting the fixed corridor box was decoded; all overlapping building faces, including vertical faces, were clipped. The numerical box contains every tested footprint vertex. The wider cut and native visual class remain untested, not silently admitted.
- **No masking:** no darkness, opaque door, actor suppression, source deletion, floor adjustment, new routes, current-source substitution or camera exclusion was used.
- **Hard part not declared solved:** only source continuation, exact model endpoint and static support bounds are established. The seven new source-object adaptations, physical support union, actual actor bodies, native appearance and full product gates remain open.

Root should compare this frozen report with the independently frozen criterion review before selecting a mechanism. A decision to explore this route would need an explicit bounded contract for the additional objects and complete retained-surface openings; it must not silently widen the existing three-object station authorization or initiate a global station rebuild. No additional prototype is requested or running in this lane.

## Evidence, verification and cleanup

The small read-only commands are `node artifacts/rail-aoi-continuation-20260927/chains.mjs`, `buildings.mjs`, `geometry.mjs` and `audit.mjs`, with the same directory prefix for each. Historical fetch scripts are retained as provenance and must not be rerun over their frozen outputs. `chains.json` preserves every source join; `buildings.json` pins cached tile bytes; `fragments.json` retains every footprint and intersection; `geometry.json` and `audit.json` carry the compact conclusions. `SUMMARY.json` and `receipt.json` seal scripts, report, source inputs and outputs. Every input hash is rechecked at seal time.

No product, source cache, network cache, Git index or tracked document was written. Parent-owned tracked changes remained untouched. No browser, GUI, server, GPU, build, dependency install or full repository gate ran; the current assignment prohibited them. There is no rendered candidate and no commit or integration claim. Only completed short CPU commands and two bounded historical HTTP requests ran. Redundant stdout copies were removed within this lane's own ignored directory. The sealed evidence is intentionally retained for the active endpoint decision. No browser/GUI/server process was created, and every short owned Node command returned an exit status. The final exact-lane process inventory using `Get-CimInstance Win32_Process` was attempted but returned **Access denied**, so an independent OS process-inventory check is unavailable; no broad termination or privilege change was attempted.
