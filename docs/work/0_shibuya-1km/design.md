# Shibuya data and coordinate provenance

The pipeline uses PLATEAU for physical surfaces/buildings, a separately identifiable OSM movement database, and GSI elevation as a terrain cross-check. [Setup](../../reference/setup.md) describes current preparation; [the plan](plan.md) owns acceptance. Source decisions began on 2026-09-06 and were corrected after actual decoding/rendering. Counts below name their measurement vintage rather than promising current live-service contents.

## Source authorities

| Source | Role | Executable authority |
| --- | --- | --- |
| PLATEAU Shibuya-ku FY2025 CityGML | Terrain, road/pavement surfaces, original building attributes, appearance and furniture records | `tools/data/manifest.ts`, `tools/scene/build.ts` |
| MLIT pre-converted building 3D Tiles | Textured/untextured building geometry and spatial hierarchy | `tools/data/tiles-pins.json`, `tools/tiles/` |
| OpenStreetMap via Overpass | Surface movement topology, lane/control facts, crossings and separately retained rail centrelines | `tools/data/overpass-query.ts`, `tools/network/` |
| GSI elevation PNG tiles | Independent terrain cross-check, not rendered terrain | `tools/data/manifest.ts`, `tools/geo/gsi-elevation-tile.ts` |

Fetched inputs and generated worlds stay under ignored `data/`. The CityGML archive is pinned to 649,322,807 bytes, SHA-256 `f7437469d85b1d4a85f2141671b08bbb84d6e05cb15ad2a8b4e8f6a28e67831d`. The archive's `latest` alias returned a different same-named build during the original investigation; the pipeline therefore pins the citable resource and exact bytes. Pre-converted tiles likewise use an explicitly resolved endpoint and per-file pins.

### PLATEAU coverage

`src/world/aoi.ts` owns the four 1 km mesh codes 53393585/86/95/96 and the containing terrain cell 533935. The archive's `codelists/` are required to interpret usage/function attributes. Only two of the four cells contain street-furniture files; missing files are a source limitation.

The original full AOI reconciliation decoded 67 tiles and found 1,740 buildings: 1,676 LOD2 and 64 LOD1. The LOD2-named tileset includes both levels, so a second LOD1 merge is unnecessary. The count uses the `lod0RoofEdge` centroid: 25 buildings lie within 2 m of the box edge, making the last digit sensitive to the exact inclusion rule. The original Phase 1 count of 1,741 was superseded by this reconciliation.

The full tile audit decoded 532,315 triangles. Tile batch attributes and decoded bounds agreed to 0.062 m horizontally and 0.051 m vertically. Missing source heights/storey counts become JSON `null` in some batch columns; other columns use binary storage. Treating `Number(null)` as a real zero corrupts a building. `src/world/building-attributes.ts` and `test/sentinel.test.ts` cover both representations.

Photographic albedo is available for the LOD2 set, but it contains baked daylight/shadows, soft details and lower-floor occlusion. It supplies neither surveyed window recesses nor emissive channels. A count of atlas pixels is not proof of useful facade detail. At the original audit, 67 atlases spanned 128–4096 px, including 25 at 4096, with 551.9 megapixels before runtime caps. The current geographic policy is 1024 px generally, 2048 within 160 m, and one native 4096 final-detail leaf; [local rules](../../policies/local-rules.md#geographic-texture-limits) and `src/scene/texture-budget.ts` own that policy. It cannot be changed to disguise a comparison.

### OSM source vintages

`data:fetch` saves the query/response and `timestamp_osm_base` in provenance. Live Overpass is mutable; timestamp records when a response was based, while SHA-256 identifies the actual reviewed bytes. The original raw extract was `9923a9ae93afbc73f82332bb5a03f06f76ed587cbc143541158d4c192b4b8671`, timestamp 2026-09-07T03:23:56Z. The separately reviewed fresh extract is `162fbdec3baa5ed5c07eed33fa8ae20568dbd74d8f1f36a3490dccfbbd2d32b0`, timestamp 2026-10-18T13:27:51Z, 1,236,242 bytes/8,035 records. The [network contract](../../reference/network-contract.md#reviewed-source-succession) records the finite admitted changes and route limits.

Overpass can emit tagged and bare records for the same element. Preserve tagged facts when deduplicating; blindly retaining the last record loses tags. Filter underground/elevated/inaccessible paths before connectivity: platform ways 664527469/664527472 share node 291758776 with the surface scramble but are three levels below it.

OSM supplies some lane counts, widths, directions and restrictions, not a complete surveyed lane model or signal schedule. The movement graph discloses inferred offsets/widths, authored turn curves, conflict envelopes and timings. Mapped crossing 754454449 supplies one scramble diagonal; the other joins real surface endpoints as an explicitly authored completion. Physical paint/hardware cannot be inferred merely from a movement edge or controller. [Network](../../reference/network-contract.md), [pavement](../../reference/pavement-recipe.md) and generated provenance retain that distinction.

## Coordinates and placement

The AOI is 35.6550–35.6640 N by 139.6950–139.7060 E, approximately 997.1 × 997.3 m projected. The crossing origin is 35.6595 N, 139.7005 E. `src/world/aoi.ts` and `src/world/frame.ts` own these constants and transforms; consumers must not restate them independently.

CityGML uses EPSG:6697: latitude, longitude, orthometric height. Offline projection uses EPSG:6677 (Japan Plane Rectangular CS IX), whose formal coordinate order is northing then easting. Local scene X is east, Z south, Y up, in metres. Subtract the horizontal crossing origin before browser buffers; heights retain the terrain's elevation datum, so crossing ground is about Y=15.2 m rather than zero.

The measured crossing projection is northing −37768.561 m, easting −12026.817 m. The southwest corner is −38267.112/−12525.493; the northeast is −37269.982/−11528.196. `tools/geo/plane-rectangular.ts` performs the offline projection; `test/aoi.test.ts` checks projection, axis order and local-frame composition.

The building tiles store local glTF geometry around ECEF `CESIUM_RTC` centres. Conversion must account for glTF Y-up versus ECEF Z-up exactly once, and ellipsoidal geometry versus orthometric batch heights. The original whole-source audit derived geoid undulation 36.786 m from 2,607 buildings, with a middle-98% spread of 0.094 m. Missing the axis rotation produced plausible-looking buildings displaced by about 68 m, so a loaded tile is insufficient placement evidence. `tools/tiles/tileset.ts`, `test/placement.test.ts` and the builder's residual checks own the conversion; the rewritten tileset declares its resulting up axis explicitly.

MLIT's pre-converted tiles remain the building pipeline of record: they provide per-building attributes, Draco geometry and the existing spatial hierarchy. CityGML remains the independent source/attribute check and supplies terrain/roads. The project does not run the PLATEAU GIS Converter or require a Rust installation. The original Windows-converter comparison and rejected fallback instructions remain recoverable from `git show d7223c79b3564bae1872f4d23aff4faded7ba540:docs/work/0_shibuya-1km/design.md`; they are not current setup steps.

## Terrain, roads and support

Terrain comes directly from PLATEAU's `udx/dem/533935_dem_6697_op.gml`: 1,101,033 triangles across its containing cell, roughly 2.5 m edges. The original crossing check interpolated 15.20 m in the TIN versus 15.18 m from GSI DEM5A. `test/elevation.test.ts` retains small source fixtures and the actual GSI RGB decoder, including its signed branch/no-data sentinel. GSI is a cross-check, not a second terrain layer or a generic Terrain-RGB decoder.

PLATEAU `tran` LOD1/2 roads are flat at sea level; the pipeline drapes applicable geometry to terrain. LOD3 supplies physical road/pavement surfaces, not lane-level routing. Furniture/marking coverage is incomplete. Ground, road, pavement, paint and actor support remain separate authorities: choosing the highest X/Z triangle can attach an actor to an overpass. Finite paint seam allowances do not authorize actor contact or source-mesh changes. [Pavement recipe](../../reference/pavement-recipe.md) records the bounded source selection and unresolved observations.

The September terrain-cap correction and October source succession mean old graph counts/digests and missing-terrain diagnostics are historical. Do not copy their measurements into current status. Current A11 cached reconstruction and its 89 generated/67 external-file bound are recorded in [1632](reviews/1632_integration.md); whole-AOI visual quality, support, motion and performance remain governed by the plan.

## Attribution and data separation

The source/licence strings live in `src/world/sources.ts`; `src/ui/attribution.ts` installs the running app's source credit and processed/edited statement. Keep them visible and preserve rights-holder wording:

- PLATEAU Shibuya-ku FY2025: PDL 1.0, with CC BY 4.0 permitted; retain the local authority's credit and separate processing statement.
- OpenStreetMap contributors: ODbL 1.0. Keep the derived graph/centreline database separately identifiable from PLATEAU geometry and retain the section 4.6 database/method offer requirement for publication. The rendered scene is a Produced Work; this project has no approved publication target.
- GSI derived elevation tiles: PDL 1.0 category 2 source/processing credit. Raw survey products are a different source and were not selected.

Small promoted test extracts retain their exact provenance/terms in [test/fixtures/README.md](../../../test/fixtures/README.md); original imagery and full datasets remain ignored. The original source investigation's external links are provenance, not a current legal/service availability audit: [PLATEAU dataset](https://www.geospatial.jp/ckan/dataset/plateau-13113-shibuya-ku-2025), [PLATEAU policy](https://www.mlit.go.jp/plateau/site-policy/), [OSM copyright](https://www.openstreetmap.org/copyright), [ODbL](https://opendatacommons.org/licenses/odbl/1-0/), [GSI tile list](https://maps.gsi.go.jp/development/ichiran.html).
