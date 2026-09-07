# Data sources and coordinates — the Shibuya 1 km AOI

Status: written in Phase 1, 2026-09-06. Owner: Phase 1 implementer.

## What this document is, and whose measurements these are

This is the provenance for every data decision in the project: which dataset, which files, which coordinate system, which licence, and which numbers everything downstream is checked against.

Most of it is a **distillation of a read-only research pass** run on 2026-09-06/07, which fetched the pages, ran the requests and parsed the bytes it cites. That report was 1,229 lines and lives outside the repository; what a later phase needs is here. Where a claim is carried from that pass and not re-checked, it says so.

Some of it I measured again in this repository, against the archive `npm run data:fetch` actually downloads. Those are marked **[verified here]** and the command or test that produced them is named. Where my numbers differ from the research's, both are given.

Nothing in either pass has been through a renderer. Every geometry claim comes from parsing bytes. The plan is right that only a rendered frame counts, and Phase 3 is where that starts.

## The sources

| | supplies | licence | where |
|---|---|---|---|
| PLATEAU Shibuya-ku FY2025 | buildings, terrain, road surfaces, street furniture | PDL 1.0, CC BY 4.0 permitted | `tools/data/manifest.ts` |
| OpenStreetMap | road, sidewalk and crossing topology; signals; rail | ODbL 1.0 | `tools/data/overpass-query.ts` |
| GSI elevation tiles | an independent check on PLATEAU's terrain | PDL 1.0, attribution only | `tools/data/manifest.ts` |

`npm run data:fetch` gets all three. Everything lands under `data/`, which is gitignored; about 620 MiB downloads and 1.4 GiB unpacks, and none of it enters Git.

### PLATEAU — Shibuya-ku FY2025, not Tokyo 23-ku

The plan first named the Tokyo 23-ku bundle. That is FY2020, spec v2/v4, and 4.97 GiB.

The per-ward Shibuya-ku FY2025 dataset is five years newer, spec v5, a tenth of the download, and it adds LOD3 road surfaces, LOD3 street furniture and an underground-mall model. Dataset page: https://www.geospatial.jp/ckan/dataset/plateau-13113-shibuya-ku-2025 . Municipality code 13113.

**[verified here]** The CityGML archive is 649,322,807 bytes with SHA-256 `f7437469d85b1d4a85f2141671b08bbb84d6e05cb15ad2a8b4e8f6a28e67831d`, holding 19,877 entries totalling 4,788,685,541 bytes unpacked. Both the length and the hash are pinned in `tools/data/manifest.ts` and checked on every fetch.

There is a second copy behind the alias `https://api.plateauview.mlit.go.jp/datacatalog/citygml/13113-latest/citygml.zip`, which 302s to a **different build of the same-named archive** — 649,325,272 bytes, 2,465 bytes larger. Neither pass diffed them. The manifest pins the citable geospatial.jp resource; the alias will silently move when FY2026 lands. That alias also answers 404 to a HEAD request and 200 or 302 only to GET.

There is no per-file endpoint. You download the whole archive and extract.

#### The files the AOI needs

Japan's standard grid, JIS X 0410. The AOI straddles a 2×2 block of 1 km cells inside one 10 km cell.

| mesh | covers |
|---|---|
| 53393585 | Dōgenzaka, 109, south-west quadrant |
| 53393586 | Shibuya Stream, south-east quadrant |
| 53393595 | Center Gai, north-west quadrant |
| 53393596 | **the Scramble Crossing**, Hachikō, Scramble Square, Hikarie, Miyashita Park |
| 533935 | the 10 km cell, which names the single terrain file |

`src/world/aoi.ts` holds these, and `tools/data/manifest.ts` builds the archive member list from them rather than restating the codes.

**[verified here]** Sizes of the members the fetch extracts, uncompressed: buildings 93.3, 81.5, 87.0 and 102.3 MB; terrain 378.2 MB in one file; roads 10.1, 14.5, 13.3 and 21.8 MB; street furniture 14.6 and 53.3 MB. Building textures are 2,611 and 2,634 JPEGs for two of the four cells alone. About 1.1 GiB unpacks for the AOI.

Only two of the four cells have a street furniture file at all — 53393586 and 53393596. That is the dataset, not a fetch bug.

`codelists/` is not optional. Without it `bldg:usage` and the road function codes are bare integers.

### OpenStreetMap — via Overpass, pinned by timestamp not by hash

The query is built in `tools/data/overpass-query.ts` from the one AOI definition, and the exact text sent is saved next to the response.

**[verified here]** The run on 2026-09-07 returned HTTP 200, 1,211,346 bytes, 7,915 element records, `timestamp_osm_base 2026-09-07T03:23:56Z`. The research's own run returned the same byte count and the same element count at `02:38:48Z`, so the extract is stable across the hour between them.

OSM changes daily, so there is no hash to pin. Provenance is the `osm3s.timestamp_osm_base` field, which the fetch script prints and records in `data/provenance.json`.

Three operational facts, all carried from the research and all costly to rediscover:

`overpass-api.de` answers **HTTP 406 to any User-Agent containing a parenthesised comment** — which is exactly the form OSM convention asks contact details be given in. 406 is documented as meaning "rate limited, pause 30 s", so it misleads twice. Use a bare token; `tools/data/manifest.ts` does.

`out body; >; out skel qt;` **emits some elements twice**, once with tags and once bare. The 7,915 records deduplicate to about 7,214 elements. Anything indexing by id must keep the **first** occurrence; keeping the last discards every tag in the file and does it silently.

`overpass.kumi.systems` was found **45 days stale** against the main instance. Use it for throughput, never for currency.

Overpass usage guidance for a regular application is under 100 queries and 10 MB a day. At 1.2 MB a fetch that is eight rebuilds, so the extract is cached on disk and re-fetched on a schedule, never per build.

### GSI — the tile API, and only as a cross-check

Terrain comes from PLATEAU. GSI is here to answer one question: does an independent survey agree.

`https://cyberjapandata.gsi.go.jp/xyz/dem1a_png/{z}/{x}/{y}.png` is 1 m airborne lidar to zoom 17 and covers Shibuya; `dem5a_png` is 5 m to zoom 15; `dem_png` is DEM10B to zoom 14, and there is no `dem10b_png`. No account, no registration, no Survey Act application. `Access-Control-Allow-Origin: *` is set.

Two dead ends that look alive. The `.txt` form of the same tiles has been **frozen since October 2024** and now disagrees with the PNG by up to 3.10 m while the specification still claims they are identical. And `fgd.gsi.go.jp` no longer resolves at all — the 基盤地図情報 download site moved to https://service.gsi.go.jp/kiban/ in April 2025, needs a free account whose login expires yearly, and its raw DEM is 基本測量成果 which may need a Survey Act application. The derived tiles are not, and need only attribution. That asymmetry alone settles it.

Also avoid AWS `elevation-tiles-prod`: it is SRTM from 2017, a surface model, and over this AOI it is wrong by +10 to +31 m and **inverts the Shibuya valley into a hill**.

## Coordinates, and the two ways to mirror the city

Source CRS is **EPSG:6697**, a compound CRS: JGD2011 geographic plus the JGD2011 vertical datum. Axis order is **latitude, longitude, height**, and the height is **orthometric** — metres above Tokyo Bay mean sea level, not above the ellipsoid.

Target is **EPSG:6677**, JGD2011 / Japan Plane Rectangular CS IX. Transverse Mercator, latitude of origin 36 N, central meridian 139°50′E, scale factor 0.9999, no false easting or northing, metres.

Same datum on both sides, so this is a projection and nothing more. No NTv2 grid, no Helmert, no accuracy loss, and heights pass straight through.

**Trap one, twice over.** PLATEAU's `gml:posList` is latitude first. EPSG:6677's own axis definition is `AXIS["northing (X)",north,ORDER[1]]` then `AXIS["easting (Y)",east,ORDER[2]]` — northing first, the opposite of the usual convention. Two independent chances to transpose, and a transposed Shibuya renders perfectly, at the right scale, with the right buildings, mirrored. No frame review in this fleet would catch it.

**Trap two: there isn't one, on the vertical.** PLATEAU's buildings and PLATEAU's terrain both declare EPSG:6697, so both are orthometric and land on the same surface with zero correction. The 36.877 m geoid undulation is applied only at a boundary where data is handed to an ellipsoid-based globe renderer, which this project has none of.

### The measured constants

**[verified here]** `tools/geo/plane-rectangular.ts` is an independent fourth-order Krüger implementation, and it reproduces the research's four points to the millimetre.

| point | latitude, longitude | northing X | easting Y |
|---|---|---|---|
| Scramble Crossing, AOI centre, world origin | 35.6595, 139.7005 | **−37768.561** | **−12026.817** |
| AOI south-west corner | 35.6550, 139.6950 | −38267.112 | −12525.493 |
| AOI north-east corner | 35.6640, 139.7060 | −37269.982 | −11528.196 |
| Shibuya Scramble Square | 35.65831, 139.70221 | −37900.790 | −11872.168 |

The AOI measures **997.13 m north to south by 997.30 m east to west**. It is a 1 km square to within 3 m, and it is not square — the two extents differ by 0.17 m, which is enough for a test to tell them apart.

The local origin is the crossing, and `AOI_ORIGIN_EPSG6677` in `src/world/aoi.ts` carries it. Z stays at zero so scene Y reads directly as elevation above Tokyo Bay mean sea level.

Note that EPSG:6677 coordinates here are only about 38 km from the projection origin, not the millions of metres a geocentric or UTM frame would give. Float32 would already hold them to about 4 mm. Subtracting the origin is still worth doing — it takes the scene to sub-millimetre and removes a class of z-fighting — but this is not the pathological case, and `src/world/frame.ts` used to say 8,000,000 m, which was wrong.

`test/aoi.test.ts` gates all of this, including the composed chain from degrees to scene metres. See `docs/learning/gate-proofs.md` for the mutation that makes it red.

## Terrain — PLATEAU's own TIN

`udx/dem/533935_dem_6697_op.gml` is a `dem:TINRelief` at `dem:lod` 1, one file for the whole AOI, 378.2 MB unpacked, declaring EPSG:6697. Triangle edges are about 2.5 m — finer than a 5 m grid DEM.

**[verified here]** The file holds **1,101,033 triangles** across the 10 km cell. The research reported 80,896 within the AOI box, which is consistent and was not re-derived here.

80,896 triangles is nothing for a real-time scene. No decimation, no raster-to-mesh step, no resampling, and — the real gain — no registration work, because the ground and the buildings come out of the same bundle on the same datum.

The valley is unmistakable in the data: the crossing sits at about 15 m, Dōgenzaka climbs to 35 m in the south-west, the Aoyama side rises to 31 m in the east, and the Shibuya River drains to 12 m in the south-east. 27.6 m of relief across the box, so a flat ground plane would be visibly wrong exactly as the plan says.

### The elevation cross-check

**[verified here]** Four independent measurements of ground level at the crossing:

| source | elevation |
|---|---|
| PLATEAU TIN, 200 triangles within 25 m of the crossing | mean 15.137 m, range 14.760–15.350 |
| PLATEAU TIN, interpolated at the crossing itself | 15.20 m |
| GSI `dem5a_png` z15, decoded with GSI's own formula | 15.18 m |
| PLATEAU `bldg:GroundSurface` minimum (research pass, not re-checked) | 15.18 m |

They agree to better than 0.05 m. If PLATEAU heights were ellipsoidal the gap would be **+36.88 m**, so this one comparison confirms the TIN parse, the tile maths, the PNG formula and the datum equivalence at once.

`test/elevation.test.ts` gates it against two fixtures cut from the real sources. Both halves have been made to go red — see `docs/learning/gate-proofs.md`.

The GSI PNG encoding is GSI's own and is **not** Mapbox Terrain-RGB and **not** Terrarium:

```
x = 2^16 R + 2^8 G + B, one unit is 0.01 m
x <  2^23  ->  h = x / 100
x == 2^23  ->  no data, which is RGB (128, 0, 0)
x >  2^23  ->  h = (x - 2^24) / 100
```

MapLibre's linear `encoding: "custom"` form decodes ordinary land pixels correctly but cannot express the two's-complement branch or the sentinel: it reads no-data as 83,886 m and a −1.00 m pixel as 167,771 m.

One residual, carried from the research and small: PLATEAU declares EPSG:6697, whose vertical half is JGD2011, while GSI products issued from mid-2025 carry JGD2024 heights. The mismatch is real and decimetre-scale. It did not show up in the cross-check, and taking terrain and buildings from the same PLATEAU bundle makes it moot by construction.

## The conversion path — pre-converted 3D Tiles, not a local CityGML conversion

This is a coordinator decision taken in Phase 1 and it changes plan item 10.

### Why the question came up

Item 10 assumed the PLATEAU GIS Converter is a tool you run. On Windows it is not. The release builds the CLI only for `x86_64-unknown-linux-gnu` and `aarch64-apple-darwin`; the `windows-latest` job builds the Tauri GUI, and `PLATEAU-GIS-Converter_*_windows_x64.exe` is that installer. The official answer for Windows is to install Rust and build from source, and upstream CI runs only on Ubuntu, so **the Windows CLI path is never CI-tested**. The canonical repository is MIERUNE's, not Project-PLATEAU's, which is a fork six months and five releases behind with issues disabled.

Meanwhile MLIT publishes ready-made 3D Tiles for this exact ward, whose `.b3dm` payload is glTF 2.0.

### What was compared, and on what

**[verified here]** Two `.b3dm` tiles covering the crossing were fetched from `https://api.plateauview.mlit.go.jp/datacatalog/3dtiles/13113-bldg-lod2-texture-latest/tileset.json` and parsed byte by byte, and the same buildings were found in the CityGML the fetch script downloads.

**Per-building attributes.** The batch table carries **63 keys** per tile, including `gml_id`, `meshcode`, `bldg:measuredHeight`, `bldg:storeysAboveGround`, `bldg:storeysBelowGround`, `bldg:usage`, `bldg:class`, `bldg:address`, `uro:lodType`, the building ID attributes, and per-feature bounding boxes `_x`, `_y`, `_xmin`..`_zmax`. It is plain JSON plus a small binary block. Cross-checked against the CityGML on two named buildings: 渋谷ヒカリエ reads 173.6 m and 34 storeys in both; 渋谷ストリーム reads 171.3 m and 35 storeys in both. This is what item 15's window grids need, and it arrives without the converter's `EXT_structural_metadata` path, which has an open unfixed bug (#786) that makes Cesium throw.

**Individually addressable geometry.** `BATCH_LENGTH` plus a `_BATCHID` vertex attribute, so every building inside a tile is separable. The tileset is already a five-level `REPLACE` hierarchy of 730 content tiles, of which **67 intersect the AOI**. That is item 12's culling and LOD unit, built. The converter by contrast emits **one GLB per feature *type*** — `bldg_Building.glb` for every building in the input — so item 12 would have to rebuild the split from `_FEATURE_ID_0` or by invoking the tool per tile.

**Texture fidelity.** One 2048×2048 lossy WebP atlas per tile, about 700 KB at roughly 1.3 bits per pixel. Against the source: mesh 53393596's appearance directory is 2,634 JPEGs totalling **184.4 Mpx and 28.5 MiB**, and the 75 pre-converted tiles covering the same cell carry **314.6 Mpx** of atlas. So the pre-converted route is not resolution-limited — there is 1.7× the source pixel budget — and the loss is one lossy re-encode of already-lossy JPEG. WebP atlases also replace roughly 10,000 loose JPEGs, which matters for a web app.

**Geometry.** Both routes derive from the same FME-authored source; the tiles are MLIT's own build of it. Positions are local metres about the tile centre (±88 to ±174 m in the samples), which is the small-float property item 9 is after. Triangles are Draco-compressed.

### The decision

**Take MLIT's pre-converted 3D Tiles as the pipeline of record for buildings. Do not build the Rust CLI.**

It wins on the two criteria that matter most to Phases 3 to 5 — per-building attributes, which arrive in a form with no known bug, and individually addressable geometry with a spatial hierarchy already built — and it is adequate on texture and geometry. It also removes an untested Windows Rust build from the critical path of a pipeline the plan requires to be deterministic and cached.

The CityGML archive is still downloaded and still the source of record, for three reasons: the terrain TIN has no 3D Tiles equivalent; the authoritative per-building attributes and the codelists live there; and it is the independent thing to check a conversion against.

### What route B costs, and what is not yet proved

`CESIUM_RTC` is in `extensionsRequired` and three.js's `GLTFLoader` does not implement it. It warns and carries on, so a tile loads at the origin with its offset ignored. The pipeline must read `extensions.CESIUM_RTC.center`, an ECEF position, and place the tile itself.

**[verified here]** That conversion works. `data503.b3dm`'s centre `[-3956953.773, 3355546.821, 3697608.127]` converts to 35.6595201 N, 139.7016341 E, which is EPSG:6677 northing −37766.468, easting −11924.131, or 2.1 m north and 102.7 m east of the world origin — the right place. Note the ECEF height comes out **ellipsoidal**: 78.018 m, which is 41.141 m orthometric. The per-feature `_zmin`/`_zmax` in the batch table are already orthometric — 14.86 to 15.70 m at the crossing — so a pipeline can georeference from those and never touch the geoid at all.

Three things this decision has **not** proved, and a Phase 2 worker should not assume:

- **Nothing has been rendered.** The Draco decode has not been exercised, only observed to be declared. Phase 2 should decode one tile and reconcile its triangle count before converting the rest.
- **The LOD2 tileset is LOD2 only.** `_lod` is 2 for every feature sampled. The 3.6% of AOI buildings that are LOD1 live in a separate tileset, so the two must be merged and de-duplicated on `gml_id`. The converter would have done that per building automatically with `use_lod=textured_max_lod`.
- **`bldg:measuredHeight` appears as a JSON array in one tile and as a binary batch-table property in another**, depending on whether any value is null. A reader must handle both.

If route B fails in Phase 2, the fallback is the Rust build — `cargo build --profile release-lto -p nusamai` from MIERUNE at v0.1.19, with `--sink gltf --epsg 6677 -t use_lod=textured_max_lod`. It lands in EPSG:6677 metres natively, which is genuinely nicer, and `--epsg 6677` is mandatory because the glTF sink refuses anything that is not a Japan Plane Rectangular CS.

## What the data actually holds

### Buildings and texture — the plan's premise was inverted

The plan said PLATEAU supplies "almost no texture". For this AOI that is false, and several later items were reasoned from it.

**[verified here, independently of the research]** Parsing all four building files and counting buildings whose `lod0RoofEdge` centroid falls inside the box:

| | count | share |
|---|---|---|
| buildings in the AOI box | 1,741 | |
| with LOD2 geometry | 1,678 | **96.4%** |
| with a texture target | 1,678 | **96.4%** |
| LOD2 but untextured | **0** | |
| textured but not LOD2 | **0** | |

The split is exactly clean, and `uro:appearanceSrcDescLod2` is `1` (空中写真, aerial photography) for all 1,678 and `99` (未作成, not produced) for the other 63. This reproduces the research's figure to the building.

It does not rescue the plan's strategy, and this is the part that matters for Phase 4. The textures are aerial photogrammetry: soft at street level, lower floors often occluded by neighbouring roofs, **daylight and hard shadows baked into the albedo, and no emissive channel anywhere**. Shibuya's illuminated signage is painted into a daytime diffuse map and will not glow.

So item 16 stays the highest-value item and dusk stays the right hero preset. Item 15 was rewritten: PLATEAU texture is the albedo base for the 96.4%, procedural window grids are for the untextured 3.6% and for hero close-ups. And item 35 was appended to budget the de-lighting work, which the plan did not have.

**One correction to the research on texture size.** It reported a median AOI wall texture of 10 KiB, a 90th percentile of 37 KiB, and "a typical mid-rise wall texture is a 512×512 atlas". **[verified here]** over the whole of mesh 53393596's 2,634 JPEGs the median is **4,074 B**, the 90th percentile **25,952 B**, and the commonest sizes are 128×128 (391 files), 256×256 (390), 64×64 (287), 256×128 (262) and 512×256 (226). The populations differ — the research counted the AOI box across four cells, which skews commercial and mid-rise — but the typical texture is **smaller and lower-resolution than the report implies**, which makes item 35's de-lighting and item 15's hero-facade fallback more important, not less.

### Attributes for procedural work

**[verified here]** For the 1,741 AOI buildings:

- `bldg:measuredHeight` is present on **100%**, but **62 of them (3.6%) carry the sentinel −9999**. The plausible range is 2.5 to 220.0 m. The research reported this as "present on ~97%", which is the same fact; the sentinel is the part that bites, because a naive reader puts a building 9,999 m underground.
- `bldg:storeysAboveGround` is present on 100% but **298 carry the sentinel 9999**, leaving 1,443 usable, which is 82.9%. Item 15 needs a height/3.5 m fallback for the rest. The sentinel appears on real towers too — one 172.4 m building carries it.
- The tallest AOI building is 220.0 m and 45 storeys at 35.65831, 139.70221, which is Shibuya Scramble Square; then Hikarie at 173.6 m and Shibuya Stream at 171.3 m. That is the sanity check that this is really Shibuya.
- `bldg:usage` decoded against the shipped codelist makes about 43% of AOI buildings commercial, shop-combined or hotel — the signage-bearing set item 16 can place emissive signage over procedurally.

### Roads and street furniture — carried from the research, not re-checked here

`tran` has LOD3, and **LOD1 and LOD2 road polygons are flat at z = 0**. Use LOD3 or you get a sheet at sea level cutting through a valley floor at 15 m. Only about 43% of roads carry LOD3 — the arterials; the back streets of Center Gai and Dōgenzaka are flat outlines that must be draped onto the terrain.

Where LOD3 exists it is already correctly draped: road vertices near the crossing average 15.01 m against the terrain's 15.2 m.

It is LOD3.0, not LOD3.1: there are no per-lane polygons. You get roadway, intersection, sidewalk and island **surface** polygons, survey-accurate, but lane structure has to come from OSM or be inferred.

`frn` has LOD3 and includes some road markings, but only two of the four cells have a furniture file, and **the Scramble Crossing's own markings are not in it** — the nearest pedestrian-crossing objects are 152 m away along Meiji-dōri. The signature diagonals must be authored.

The useful split for Phase 6: **PLATEAU owns the drivable and walkable surface polygons, OSM owns the topology and lane semantics.**

### OSM — what is there and what must be inferred

Carried from the research; the element and byte counts were reproduced here, the tag breakdown was not.

The pedestrian network is excellent and mapped in the separate-sidewalk-geometry style, which is exactly what Phase 8 wants: 697 `highway=footway` of which 197 are sidewalks and 194 crossings, 151 `highway=steps`, 79 traffic-signal nodes, 243 crossing nodes, 46 turn-restriction relations.

The scramble is mapped, diagonal included: `way/754454449` sits 6 m from the centre, 32.1 m long on a bearing of 147°, tagged `crossing=traffic_signals` and `crossing:markings=zebra`. Only **one** diagonal is mapped; the real crossing's second one does not exist in OSM.

Lane-level detail is where it falls down. Of 535 drivable ways: `lanes` on 194 (36.3%), `turn:lanes` on 13, `lanes:forward` on 4, `width` on 2, `junction` on none. **No signal phase timing exists anywhere in OSM** — the all-red pedestrian phase that makes this intersection famous is not encoded. Item 22's signal model is authored from observation, and that should be written into the frozen Phase 6 contract as a design decision rather than a data gap.

Three things that will each cost a Phase 6 worker a day:

**The Scramble is one dimensionless node.** Node `291758776` carries `crossing:scramble=yes`, `junction=yes` and names in 16 languages, and it is the shared vertex of six road ways. The whole roughly 30 m by 30 m five-arm intersection has no extent in OSM. Its footprint must come from PLATEAU's 車道交差部 intersection polygons.

**That same node is a vertex of subway platform ways** `664527469` and `664527472`, which are `layer=-3`, `level=-3`, `tunnel=yes`. A graph builder that treats a shared node id as connectivity **splices the surface crossing into a platform three levels underground**. Filter on layer before building adjacency, and put a test on it.

**The scramble tagging is bespoke.** `crossing:scramble` has about 313 uses worldwide and this one intersection holds roughly 5% of them. Do not write a general detector.

## Licences

### PLATEAU

PDL 1.0 — 公共データ利用規約（第1.0版） — with CC BY 4.0 expressly permitted as an alternative, and ODC-BY or ODbL also permitted. Commercial use allowed. **No share-alike.**

Two details the plan did not carry. Copyright in the open 3D city model sits with **the local authority, not MLIT**. And modified data must say so, in a line separate from the source credit: 「コンテンツを編集・加工等して利用する場合は、上記出典とは別に、編集・加工等を行ったことを記載してください」. This project reprojects, clips, retextures and converts, so that second line is required.

`src/world/sources.ts` carries the exact required wording for both lines.

One door neither pass opened: the site policy notes that some content carries 測量法 constraints and points at a handbook that was not read. For an open-data render this is very unlikely to bite.

### OpenStreetMap

ODbL 1.0. The board-adopted attribution guideline asks for credit **to "OpenStreetMap"** and a separate statement that the data is under the Open Database Licence. For a scene styled by someone else it actively suggests the qualified form "Map data from OpenStreetMap", so OSM is not credited for a look it did not author. That is what the app says.

**The obligation the plan missed is ODbL section 4.6.** Publishing the app is publicly using a Produced Work made from a Derivative Database, which obliges offering recipients a machine-readable copy of the derived database, or a file describing the alterations or the method.

The classification: the rendered scene and any `.glb` are **Produced Works**, so no share-alike attaches to them — the endorsed guideline's own Garmin `.img` precedent covers a file that is searchable and routable, and a `.glb` is strictly less database-like than that. The Phase 6 lane, sidewalk and crossing graph **is a Derivative Database**, because it is an alteration of a substantial part of the contents.

So the coordinator decision recorded in plan item 23: **keep the OSM-derived network graph in files of its own, never fused with PLATEAU geometry.** Fusing them risks having to offer the whole thing. Separating them is nearly free now and expensive to unpick after the schema freezes.

Do not build a compliance argument on the Trivial Transformations Guideline: it is still at proposal stage despite a stale "endorsed" label on a community mirror.

Purely internal use inside one organisation is not Public Use and triggers neither 4.4 nor 4.6.

Nobody in this chain is a lawyer, and this is a reading of endorsed guidelines rather than legal advice.

### GSI

PDL 1.0. The elevation tiles sit in GSI's category 2 — 基本測量成果以外で出典の記載のみで利用可能なもの — so **attribution alone suffices and no 申請 is required**. Processed use needs the source line plus a modification statement, and presenting processed data as if GSI made it is prohibited outright. Both strings are in `src/world/sources.ts`.

The raw 基盤地図情報 DEM behind those tiles **is** 基本測量成果 and may need a Survey Act application. That is another reason to use the tiles.

## The attribution surface

`src/ui/attribution.ts` replaces the placeholder in `index.html` at boot with a real overlay: one dim always-visible line naming all three sources and their licences, and a details panel carrying each rights holder's own required wording. It throws if the element is missing, so the app cannot draw the city without its credits.

It is deliberately small and dim, and that is a constraint rather than taste. The visual gate's "a frame that did not render" proof measures an empty scene against a luminance-spread floor of 6, and the only thing drawn on that empty scene is this overlay. Phase 0's placeholder measured 2.84; **[verified here]** this one measures **2.20** by the same mutation, so the gate separates "rendered" from "did not render" a little better than it did. Growing or brightening the surface pushes a blank frame towards the floor and quietly weakens the gate, so anything that changes it should re-measure.

The credit is legible over the scene's dark road surfaces but was faint over its pale rooftops, so the line carries a text shadow rather than a brighter colour: a shadow adds dark pixels around the glyphs and raises contrast without raising a blank frame's mean luminance.

## Risks carried into Phase 2

Ordered by damage if ignored.

1. **Nothing has been rendered.** Every claim here is from parsing bytes. Phase 2's first act should be to render one tile and look at it.
2. **`tran` LOD1 and LOD2 are flat at z = 0**, and 57% of roads have no LOD3 and must be draped.
3. **The Scramble node splices into a subway platform** in any naive shared-node graph.
4. **The 3D Tiles LOD2 set omits the 63 LOD1 buildings**, which live in a separate tileset and must be merged on `gml_id`.
5. **Sentinel values**: `bldg:measuredHeight` −9999 on 62 buildings, `bldg:storeysAboveGround` 9999 on 298.
6. **`gml:OrientableSurface`, `TriangulatedSurface` and `Tin` are `todo!()` panics** in the converter's geometry parser, reported against bridges, and the AOI has four bridge files. Only relevant if the fallback route is ever taken.
7. **The two CityGML archives differ by 2,465 bytes** between the citable resource and the `latest` alias. Neither pass diffed them.
8. **`frn` coverage is partial** and the crossing's own markings are absent from it.

## Sources

PLATEAU — https://www.geospatial.jp/ckan/dataset/plateau-13113-shibuya-ku-2025 · https://www.mlit.go.jp/plateau/site-policy/ · https://www.mlit.go.jp/plateau/learning/tpc03-4/ · https://api.plateau.reearth.io/datacatalog/plateau-datasets

Converter — https://github.com/MIERUNE/plateau-gis-converter · https://project-plateau.github.io/PLATEAU-GIS-Converter/manual/use_command_line.html · https://github.com/NASA-AMMOS/3DTilesRendererJS

Coordinates — https://epsg.io/6677 · https://epsg.io/6697 · https://apps.epsg.org/api/v1/CoordRefSystem/?keywords=JGD2024 (authoritative; epsg.io lags and still shows pre-2025 names)

Terrain — https://maps.gsi.go.jp/development/ichiran.html · https://maps.gsi.go.jp/development/demtile.html · https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html · https://service.gsi.go.jp/kiban/

OSM — https://www.openstreetmap.org/copyright · https://osmfoundation.org/wiki/Licence/Attribution_Guidelines · https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline · https://opendatacommons.org/licenses/odbl/1-0/ · https://wiki.openstreetmap.org/wiki/Overpass_API
