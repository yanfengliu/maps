# 444 — Source-aligned photographic window response

2026-09-30. Investigation only. Owner 444 recommends one bounded material increment after the current 16-file unit lands. No product, data, dependency, build or runtime changes were made. Main/frontage HEAD is `1ee8cf13619d282630da5f225561d861ecc5318c`; the current candidate remains uncommitted.

## Evidence and cause

I individually opened three current 1280×720 Satellite originals at native resolution. Noon crossing shows photographed windows and painted signage sharing flat wall planes. Plaza 000 shows soft storefront/window detail beside much sharper authored boards. Dusk approach repeats this across several peripheral blocks; their windows mostly remain dark. These three views establish recurring appearance, not whole-AOI coverage or the cause of every blurred pixel.

`tile-materials.ts:267–292` chooses photographic glass from dark, low-chroma pixels, then changes roughness. This cannot distinguish glazing from dark paint or a photographed shadow. Its detail uses a world-axis-aligned 2.9 m grid, not the photographed window layout, and fades between 90 m and 190 m. This branch does not perturb normals. The procedural branch already filters bay coverage and bevel normals (`:170–236`). Photographic window emission remains zero because `mapsWindowMask` starts at zero and `mapsGrid` is zero in Satellite's textured branch; its separately admitted sign emission remains active.

`procedural-facades.ts` supplies building floor bounds/counts and a GML-seeded tone, but no observed window positions. `delight.ts` explicitly cannot recover spatial detail or separate dark material from shadow. The capped photographic atlases therefore remain essential identity/color evidence but cannot supply architectural relief. The relative contributions of source resolution, caps and photographic blur are unmeasured here. `sky.ts:175–192` supplies a sky-only environment, so clearer glass response will not produce neighboring-building reflections.

## One implementable hypothesis

Add source-aligned window bays on four audited planar photographic faces: two at the crossing and two peripheral faces selected from current 442 exploration. Each face gets its own observed bay spacing, frame width and pane extent. Preserve source RGB; apply shallow bevel normals and restrained reveal darkening only along observed frames, with matte frames and lower-roughness, nonmetallic panes. Use existing sky lighting. Hypothesis: aligned crisp edges and different frame/pane light response materially reduce the wallpaper appearance at close and block scales without color inflation. This establishes shading depth, not geometric recesses, parallax or shadow-casting windows.

Implement a small `src/scene/facade-window-regions.ts` registry and eligibility helper; integrate through `FacadeTexturePlugin.processTileModel` and `patchTileMaterials`. Reuse the existing SHA/GML/UV0/plane/outward-normal admission pattern from `facade-emission.ts` and `crossing-corner-material.ts`. Extend the plugin's normal-request source-pin resolver to admit the additional reviewed tiles without a duplicate fetch. A vertex group must gate matching buildings; plane/normal/UV bounds must exclude other faces, signs and roofs. Do not alter emission records or the existing TSUTAYA surround. Derivative-filter pane/frame coverage and fade bevels earlier than bays, reusing the current procedural filtering technique.

No new atlas or draw call is needed. One float per vertex in selected tiles and a bounded shader term are the expected costs; measure actual added geometry accounting and startup/frame cost before acceptance. Tile preparation includes attributes before existing LRU admission. Keep geographic caps, source arrays, placement and seeded behavior unchanged. Disable this authored response in Cartographic and preserve style-switch continuity.

## Source review and acceptance

Before authoring any bay, independently inspect the selected source atlas and decoded tile using existing `parseB3dm`, `parseGlb` and `decodePrimitive`; bind source SHA, GML, original UV0, face plane/winding and observed window/frame bounds. Record ambiguous panes as omitted, and disclose approximate authored dimensions. Store only compact reviewed coordinates/provenance, retaining source licensing. Neither brightness nor storey count alone may select windows.

Compare unchanged fixed close/block poses at noon and dusk for all four faces, then held-out seeded oblique views through real controls. Accept only visible source-aligned frame/pane separation and lighting response without doubled grids, sign/roof spill, halos or moving-view sparkle. Check unchanged source arrays/atlas dimensions, eligibility negatives, shader compilation, owned disposal and basic style return; run existing final gates once the increment is ready. Whole-city facade quality, occupied-window illumination and actual architectural geometry remain open.

## Inspected byte bindings

All three images match certificate `6a9990f8d8019e57c07cfd89af652ecb0df87b172234fbfd8b6ddb28d4a672a4`, run `e158ce779fa445c6`, after normalizing its Windows path separators. Paths are relative to primary `artifacts/visual/`:

- `hero/hero-satellite-noon-crossing.png`: `5e9f39da4f8bcdb6a2c27c2a394a24d18d509d1a64936a839d0bd72e8d3979ae`.
- `hero/hero-satellite-dusk-approach.png`: `4342762146939cf81da76930d44a4ee4b88971019f2ac1f87152c07e6477dc7a`.
- `sweep/satellite/plaza-az000.png`: `9c3666b8f59ec95f794ddcbce6265b080b2a0e1e2946d07528f0a7fad59cdce3`.

The inspected `tile-materials.ts` SHA-256 is `cbf4c513e787d28a61833793b80a60032185acd9f1c8fa6814a7821763b25ea1`; `facade-textures.ts` is `862fadec32c7d60bab01fb9f7fe708de25ea66f17d99f6e5d63140af7d8fa2ca`. No task-owned browser, server, GPU process or temporary artifact was created.

## Source audit follow-up — 2026-09-30

The granted offline audit reconstructs four certified harness rays using inspected side-effect-free readers and the existing Draco decoder. Final candidate position discrepancies are 0.000526–0.003969 m and UV discrepancies are below 0.000010; all 11 input files remained unchanged. Connected patches require shared world edges and matching UVs, avoiding unrelated atlas islands in a coplanar cluster. Native original-pixel crops were inspected for both crossing faces and both final peripheral candidates. This is source correspondence and authored parameter preparation, not independent material acceptance.

Both crossing patches use actual `data/data518.b3dm`, SHA-256 `5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b`, node 0, primitive 1, original UV0 and outward-facing source triangles:

- Mixed window/sign facade: GML `bldg_6abf2261-478c-437a-93f4-8ba23d7b1cad`, faces 10574/10575. Proposed atlas ROI is X 1454–1572, Y 3876–4040; observed bay columns and roughly 25-pixel row spacing yield approximately 4.2 m bays and 3.1 m rows. Proposed frame width is 0.202 m and shading relief 0.035 m. Exclude header/footer signs, the vertical advertising strip and right shop facade. Individual glazing panes remain HOLD where posters/blinds cannot be confidently separated.
- TSUTAYA glazing: GML `bldg_5f7ff4f3-a620-4fd0-a380-3ec46435cd27`, faces 494/495. Proposed atlas ROI is X 274–385, Y 3196–3442. Nonuniform observed horizontal bands and vertical mullions are recorded individually, rather than derived from storey count. Proposed frame width is 0.134 m and shading relief 0.030 m. Exclude Coca-Cola above Y 3183 and STARBUCKS/TSUTAYA lettering below Y 3460; the existing lower surround is untouched. These dimensions are authored approximations.

Peripheral selections remain open. The first west hit is a 0.63 m wall-edge strip. The final northwest hit is PARCO's largely blank source face, not window bays. The north face mixes pale wall and unclear screened/equipment-like regions. Adding glazing to these samples would invent unsupported detail. Their exact GML/tile/face bindings and refusals remain in the packet; use actual 442 findings to select credible replacements before claiming a four-face increment.

`artifacts/facade444/eligibility-proposal.json` (`c5dfeee336924791eb460b5fd64bb7760d5cad874bc22631d1570637974ad850`) contains original UV polygons, source/world ROI corners, current camera projections, planes/normals, divisions, exclusions and the proposed `mapsWindowBuildingGroup` scalar attribute interface. Final `source-v2/candidates.json` SHA-256 is `d832778c1226156bd313c3dea5b552e4e32a78191f58331623bf262bac682103`; `views-v2/views.json` is `e4732d6bc2a8585349f3467898b80059813da7dfd71f4ace5de8e685c670aa9b`. The finite ignored extraction is retained for this active handoff. No product, data, build, gate, dependency, policy or Git writes occurred; all audit commands exited, with no browser/server/GPU resources.
