# Review 4: pavement layer design

## Target and reviewer

Repository: `maps`, uncommitted renderer recovery on main `277a8332e61bd29189fa65eae7271f952b04df33`. Reviewed 2026-09-11 by the root orchestrator, independently of the renderer author. This records the root's source inspection and design decision, not a finished pavement implementation review. Raw evidence remains under the ignored `artifacts/recovery-realism-20260908/` handoff.

## Finding and evidence

The preserved maximum-overlay counterexample is world `(89.3170013, -290.3471273)` in X/Z metres. PLATEAU source sidewalk `traf_c698d822-1c8a-4736-b400-09e5f80d7040`, in parent road `tran_537e2c9b-2597-4e9c-8763-a6e5d1db35ff`, has source height 14.80648714896 m there. The existing terrain is 19.60331252 m. A blanket requirement that this sidewalk clear the terrain heightfield would lift a lower passage through its overhead structure.

The root checked all five source hashes below, inspected the actual bridge `gml:posList` rings, and independently recomputed positive barycentric weights at the exact point. Bridge `brid_cb8a47ec-def6-47a9-9366-b294a047ee63` contains overlapping polygons `poly-3b73ad3b-ec53-4a60-85a1-4ba8415613c4` at 17.5649669662 m and `poly-6b079e30-bf3e-4752-8263-e4c52e306bad` at 18.5649642727 m. The original OSM record independently places road 23179562 on layer −1, while railway ways 146060261 and 146060343 carry `bridge=yes` and layer 1. The source road's section-type 1 describes road construction; it does not prove the absence of an overhead structure.

| Bound input | SHA-256 |
| --- | --- |
| `data/plateau/udx/brid/53393585_brid_6697_op.gml` | `bcee29bae5d690e7e950cd42c60eca2597ed4992f64fa2e8fbbbda24f024f7d9` |
| `data/plateau/udx/brid/53393586_brid_6697_op.gml` | `b8d9d41a5b7ce84f3eaec81cbbcea2b28a4502f81cb51bba0cf7dca09bb4ea44` |
| `data/plateau/udx/brid/53393595_brid_6697_op.gml` | `6210d88f29b2c3ace3976b5de14575ed71b9ba8c2bbfe428ba3764b5d7983895` |
| `data/plateau/udx/brid/53393596_brid_6697_op.gml` | `ab031fb56e944c4975ec7588ab291416add55c191638c98b4b4e5e720af9d23d` |
| `data/osm/shibuya-aoi.osm.json` | `9923a9ae93afbc73f82332bb5a03f06f76ed587cbc143541158d4c192b4b8671` |

The existing independent elevation instrument reads 18.98 m from local GSI 5 m data and 19.77 m from a narrowly fetched official 1 m tile. The latter tile is `dem1a_png/17/116399/51621.png`, SHA-256 `27cf3dac8e5a86197a946febef8fa01ab18eaf4ac62c0bd3d4648fade310e43a`. These measurements support the upper surface; neither survey is proof that no lower passage exists. Source creation dates alone do not justify altering the terrain.

The thirteen-ring `test/fixtures/pavement-source-conflicts.json`, SHA-256 `aa7eb9c1739f6a486a7249d729fc245eb3fa248b08978e76220d74feb92c24ca`, retains the hero and both named extreme conflicts with exact source IDs and coordinates. Its four source-file hashes bind the excerpts. It tests source selection and preserved published heights, not a complete road-coverage census or support construction. Changed fixture bytes do not inherit this review.

## Decision and bounds

Approved: retain the published 14.806487 m lower level at this proved passage, distinct from the upper terrain and bridge levels. This is a bounded correction to where the former support oracle applies. The former oracle, original three camera rays, rejected source meshes and independent prototypes remain preserved as counterevidence.

Approved isolated next prototype: clip classification regions using exact bridge and source ownership; apply the existing ground oracle to proved ground regions; keep source-height lower regions separate; and construct selective closure owned by each layer. It must preserve per-source area accounting and pass the original three oblique rays, connected edges, interior ridges, transverse paint, layer transitions and distinct stacked levels. Global X/Z welding is rejected. The prototype must not become the network's support authority before applicable coverage and classification are accounted for.

The broader sparse census is diagnostic: 85,152 original-vertex and source-centroid probes include 1,258 samples more than 0.75 m below terrain across 54 parents, of which 167 have a separate raw overhead bridge hit. This does not classify the remaining cases or prove complete coverage; the named 4.80 m interior peak lies outside that sparse probe set. Unclassified surfaces retain their source heights and explicit uncertainty. The 5,055 off-terrain samples need a canonical render-extent clipping ledger, not silent removal. This work does not expand the product into a full underground reconstruction.

Outcome: the named lower passage classification is accepted within this source-bound scope. Pavement construction, world contact, final pixels and whole-deliverable acceptance remain open.

## Follow-up: bounded encoding uncertainty

The root independently inspected the frozen hero overlay mesh, SHA-256 `fb379d951cc922fff59409533b52baa36ded0c50859a1c87dd132ca347c51b48`. The strict 6,757-point support probe still reports 21 missing observations and three clearance failures. Its unchanged result is `pavement-owned-v1/pavement-owned-verify.json`, SHA-256 `ad154054cd343292950f381752249ed67196f726234d8647578a84522dd553fe`. This is not a strict probe pass.

All 21 missing points lie within their own source triangle's measured horizontal Float32 vertex-displacement bound. They belong to 11 unique triangles totaling 5.340963822814405e-9 square metres; their maximum edge distance is 8.1457788e-7 metres. The three clearance observations are outside the corresponding road triangles by 0.7382546, 1.0709284 and 2.6362147 micrometres. The root recomputed those distances and negative barycentric weights. The existing sampler admits those exterior points through its numerical tolerance, while the exact overlay preserves the actual edge. Neither the sampler tolerance nor the interior 0.08-metre clearance requirement changes.

The encoding ledger, `pavement-owned-encoding-ledger.json` SHA-256 `b194aae25f109a69f552310e5f1ef2e6a323cf9e2b154be0c8ff0e503771439b`, retains all 380 source owners. Their total plan area is 4,215.855973230212 square metres. Measured maximum X/Y/Z conversion errors are 1.9072848/0.9535169/3.8145685 micrometres. The conservative plan error is 4.2648175 micrometres. Sum of absolute per-owner Float32 area changes is 0.002534119907 square metres, separate from double-precision clipping residuals. The complete ledger retains collapsed encoded triangles rather than silently counting them as coverage.

Approved declaration: these exact frozen observations are Float32 boundary uncertainty. General use must derive the bound from each affected source triangle, preserve identity and area accounting, and keep actual interior failures fatal. The road-edge details are `pavement-owned-road-edge.json`, SHA-256 `45fb6634ee9493228f41d9f225f36e1db01f96d40f2c66112a1a0450279e1afe`. The original three oblique rays remain unchanged.

The author's concrete controls use the actual frozen mesh at world `(22.5,17)`, 2.071 metres from the source edge. Removing three intersecting triangles produces a missing-interior failure; lowering the mesh by 0.2 metres produces an interior-clearance failure. The original mesh supports this point. `pavement-precision-controls.json`, SHA-256 `2910457a4852257f48ab4894801e97020416d6cf750120ca9367450737e2a8e4`, binds these controls. They show that the bounded declaration does not excuse a material hole or sunken interior; they do not establish whole-city support or final pixels.
