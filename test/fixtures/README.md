# Test fixtures

These are real bytes from public sources, cut down so checks can run without a network or a 1.4 GiB checkout. `npm run data:fetch` regenerates the full originals under `data/`, which is gitignored.

These are promoted test inputs; their checks and provenance are named below. Each is below the256KiB promotion threshold.

## `commercial-lettering-source.json` —13,667 bytes, SHA-256 `d73cb9aa2614af342e3d958eade237e89916b032563795e977faa31224afcd60`

Two unaltered decoded RGB rectangles from image0 of the PLATEAU data518 building tile, outside the browser bundle. Tile4,973,844B SHA-256 `5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b`; embedded4096×4096 WebP atlas2,966,552B SHA-256 `eed564fded549988afc20edc49a5bc67c19590c4ea53b4324eaee34ac76179fb`. Boxes use top-left source pixels and exclusive right/bottom: STARBUCKS COFFEE `[280,3483,365,3502]` (85×19), TSUTAYA `[345,3512,394,3537]` (49×25). Each base64 field is row-major top-to-bottom interleaved RGB uint8, sRGB encoded, with its own raw-RGB hash. No background removal, mask, resampling or invented font is in these raw fields.

Reproduce with `python test/fixtures/extract-commercial-lettering.py` after restoring the pinned tile and tileset. The extractor independently parses the embedded GLB image and verifies its input hashes before Pillow RGB decoding. It also retains the exact final-detail leaf metadata from the67,872-byte scene tileset, SHA-256 `71b1716f6fafd028e1f6bad46fb8f7848c36f941c30d428be21828e9902b4483`; `--tileset <path>` can select a separately retained exact input. This corrects the old complete-plugin fixture's absent geographic metadata/1×1 image shortcut without weakening its scalar/source guards.

`test/crossing-corner-material.test.ts` uses the retained nativeLeaf metadata and image dimensions to exercise the complete facade plugin with the installed loader’s TRS placement. The raw RGB rectangles retain source provenance. The ground replacement preserves these photographic fields above its cut. This fixture supplies input identity and geographic metadata, not rendered readability or appearance acceptance.

出典：国土交通省 PLATEAUウェブサイト（https://www.mlit.go.jp/plateau/）

「3D都市モデル（Project PLATEAU）渋谷区（2025年度）」（国土交通省）（https://www.geospatial.jp/ckan/dataset/plateau-13113-shibuya-ku-2025）を加工して作成

MLIT Japan, PDL1.0 with CC BY4.0 permitted. Modified: MLIT's3D Tiles atlas decoded and cut to two test-only RGB rectangles.

## `gsi-dem5a-15-29099-12905.png` — 68,080 bytes, SHA-256 `ac68fdd3092a8ca01035eb22c08197f4e043940cfbff64b5f27ffd19a479eb9b`

The GSI 5 m elevation tile covering the Shibuya Scramble Crossing, unmodified.

Fetched from `https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/15/29099/12905.png` on 2026-09-06. 256x256, 8-bit RGB, non-interlaced. The crossing falls at pixel (217, 192), which decodes to 15.18 m.

Elevation is packed into the RGB triple by GSI's own formula, which is not Terrain-RGB and not Terrarium — see `tools/geo/gsi-elevation-tile.ts`.

出典：国土地理院ウェブサイト（https://maps.gsi.go.jp/development/ichiran.html）

Geospatial Information Authority of Japan, PDL 1.0. Category 2, so attribution alone and no Survey Act application. Reproduced here unmodified.

## `plateau-dem-crossing.gml` — 68,517 bytes, SHA-256 `e05d8606a02ef01a6fcc5dc097ae856aa392a23c96fb6a4dcc27b5921baf3435`

200 triangles of PLATEAU's terrain TIN, cut from `udx/dem/533935_dem_6697_op.gml` inside `13113_shibuya-ku_pref_2025_citygml_1_op.zip` (SHA-256 `f7437469d85b1d4a85f2141671b08bbb84d6e05cb15ad2a8b4e8f6a28e67831d`).

The cut keeps every triangle whose centroid falls within 25 m of 35.6595 N, 139.7005 E. The source file is 378 MB and holds 1,101,033 triangles. Each kept triangle carries verbatim source coordinates; the surrounding document was rewritten to a minimal valid wrapper, and line endings were normalised to LF so the fixture is the same bytes on every machine — see `.gitattributes` here.

Heights in the excerpt run 14.760 to 15.350 m, orthometric, above Tokyo Bay mean sea level.

出典：国土交通省 PLATEAUウェブサイト（https://www.mlit.go.jp/plateau/）

「3D都市モデル（Project PLATEAU）渋谷区（2025年度）」（国土交通省）（https://www.geospatial.jp/ckan/dataset/plateau-13113-shibuya-ku-2025）を加工して作成

MLIT Japan, PDL 1.0 with CC BY 4.0 permitted. Modified: cut to a 50 m box around the crossing.

## `plateau-batch-table.b3dm` — 80,744 bytes, SHA-256 `3534e7363ed7c3e72e445133f2ab3ca974f6b5eebce9c5941a03a7db4c58e066`

The 63-key batch table of one PLATEAU building tile, with its geometry removed. This is what `test/sentinel.test.ts` measures against, and it is here because the sentinel it exists to catch **is not a −9999 in these bytes**: MLIT's converter writes a missing `bldg:measuredHeight` as `null`, and `Number(null)` is 0. A synthetic fixture would have been written with the sentinel the reader expects rather than the one the data carries.

Cut from `data/3dtiles/bldg-lod2/data/data479.b3dm` (816,424 bytes, SHA-256 `255d6034de697446ddbac860e389bc2530dd21bdb2b3de278c9a76084368c78b`), which `npm run data:tiles` fetches and `tools/data/tiles-pins.json` pins. The header, the feature table and the whole batch table are the source bytes; only the glTF payload was replaced, by a valid empty one, because this test reads attributes and never draws. The recipe, run from the repository root:

```
node --input-type=module -e "
import { readFile, writeFile } from 'node:fs/promises';
import { parseB3dm, serialiseB3dm } from './tools/tiles/b3dm.ts';
const tile = parseB3dm(new Uint8Array(await readFile('data/3dtiles/bldg-lod2/data/data479.b3dm')));
const json = new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' }, scenes: [{ nodes: [] }], scene: 0 }));
const pad = (4 - (json.length % 4)) % 4;
const total = 12 + 8 + json.length + pad;
const glb = new Uint8Array(total);
const dv = new DataView(glb.buffer);
dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
dv.setUint32(12, json.length + pad, true); dv.setUint32(16, 0x4e4f534a, true);
glb.set(json, 20); glb.fill(0x20, 20 + json.length, 20 + json.length + pad);
await writeFile('test/fixtures/plateau-batch-table.b3dm', serialiseB3dm(tile, glb));
"
```

17 buildings. Four have no `bldg:measuredHeight` and twelve have no `bldg:storeysAboveGround`, both written as `null` in a JSON array column. The same table also carries binary `DOUBLE` columns — `_x`, `_y`, `_zmin`, `_zmax` — so both of the two shapes a batch-table property takes are exercised on real bytes rather than one of them being assumed.

出典：国土交通省 PLATEAUウェブサイト（https://www.mlit.go.jp/plateau/）

「3D都市モデル（Project PLATEAU）渋谷区（2025年度）」（国土交通省）（https://www.geospatial.jp/ckan/dataset/plateau-13113-shibuya-ku-2025）を加工して作成

MLIT Japan, PDL 1.0 with CC BY 4.0 permitted. Modified: pre-converted to 3D Tiles by MLIT, then cut here to its batch table.

## `pavement-source-conflicts.json` — 13,560 bytes, SHA-256 `aa7eb9c1739f6a486a7249d729fc245eb3fa248b08978e76220d74feb92c24ca`

Thirteen semantic pavement rings from the four Shibuya FY2025 PLATEAU `tran` CityGML files. The JSON preserves source parent-road, area, polygon and LOD identity, full original coordinate rings, aliases and the four source-file hashes. Its three named target points cover the crossing overlap and both extreme elevation conflicts from the pavement recovery. `test/pavement-source.test.ts` uses it to check exact same-level deduplication, same-parent LOD coverage and retained source elevations. It is not a complete pavement support fixture. Review 4 pins these exact bytes.

出典：国土交通省 PLATEAUウェブサイト（https://www.mlit.go.jp/plateau/）

「3D都市モデル（Project PLATEAU）渋谷区（2025年度）」（国土交通省）（https://www.geospatial.jp/ckan/dataset/plateau-13113-shibuya-ku-2025）を加工して作成

MLIT Japan, PDL 1.0 with CC BY 4.0 permitted. Modified: selected raw rings and source identities are represented in JSON; projected comparison coordinates are also recorded. The raw sources and rejected generated meshes remain outside Git.
# Source-visible emission coordinates

`commercial-ground-source.json` preserves the independent1101/1143 whole protected-field and five source-cut observations (15,786 bytes, SHA-256 `90f89f21228dc6a495ae5f5d25cca9a899f70e7e2be356b73f511a1c501c57a0`). PLATEAU / MLIT Japan and Shibuya-ku FY2025, PDL1.0 with CC BY4.0 permitted; processed by local-frame projection, field selection and mapped polygon extraction. The PLATEAU source and processing credits above apply. Its historical absolute path is provenance only. It records the inherited12.493133544921875px² source limitation and does not contain photographic pixels or certify rendered appearance.

`facade-emission.json` contains nine small observations and three authored sign-region coordinate records derived from the already attributed PLATEAU building source. It binds the selected GML buildings, placed tile bytes, normalized glTF UV0, observed planes and native frame digests. Raw photographs stay ignored. PDL 1.0 / CC BY 4.0; coordinates were reprojected and sign interiors manually selected. Full provenance, omitted regions and the corrected provisional fixture label are in `docs/reference/facade-emission.md`.

## `paint-road-seams.json` — measured paint-only seam controls

Eleven exact failed hero paint queries retain expected source elevation, nearest road triangle/edge IDs and gap widths. They were measured against the SHA-bound PLATEAU roads mesh after the initial F10 finite-support renderer omitted central diagonal stripes. The raw road mesh remains ignored. PLATEAU Shibuya FY2025, PDL 1.0 with CC BY 4.0 permitted; modified by local-frame projection and selection of these geometric observations. Existing PLATEAU source and processing credits above apply. The JSON is 4,458 bytes; `test/paint-support.test.ts` uses its named probes with the full pinned cached mesh. It does not authorize bridging arbitrary roads or actor support.

## `cutout-sections.json` — 23,104 bytes, SHA-256 `9fc9ee4ae173001a4c69582e6bb384966449582a34e1159ede2aa6fbce91e733`

Small promoted section and Float32 quantization witnesses from the pinned PLATEAU Shibuya-ku FY2025 final-detail building tiles. `cases` embeds each source tile SHA-256, batch, GML ID and cut side: `data510.b3dm` batch 29 south retains a degree-4 touching contact; `data533.b3dm` batch 42 west retains the independently measured 0.550 mm open gap. The stored endpoints are unchanged and contain no added connector or cap. `quantization` records the independent `data458.b3dm` batch 116 north triangle whose first and third vertices collapse to the same Float32 position, plus its source SHA, original section triangle, observed Float32 positions and zero normals from the old constructor.

Modified: cached scene reprojection into the local world frame, triangle/plane slicing into 2D section coordinates, and the explicitly labelled old-constructor quantization observation. The fixture proves bounded section topology and stored-triangle validity in `test/cutout-sections.test.ts`; it is not a complete building model, a rendered-pixel oracle or proof of city-wide visual quality. Raw tiles remain under ignored `data/`.

出典：国土交通省 PLATEAUウェブサイト（https://www.mlit.go.jp/plateau/）

「3D都市モデル（Project PLATEAU）渋谷区（2025年度）」（国土交通省）（https://www.geospatial.jp/ckan/dataset/plateau-13113-shibuya-ku-2025）を加工して作成

PLATEAU / MLIT Japan and Shibuya-ku source data, PDL 1.0 with CC BY 4.0 permitted; processed by this repository. Detailed provenance is embedded in the fixture.

## `corridor-paint.json` — source attachment for one authored road-edge pair

The 21,625-byte fixture (SHA-256 `f5ac5e740a829cc78c7ba185c99304df97effe7d026284aec8f2804db3c8d175`) promotes 27 selected PLATEAU Shibuya-ku FY2025 LOD3 paving source records and one separately identifiable OpenStreetMap physical crossing. Original IDs and ring coordinates are retained after local world-frame projection. It records the omitted 0.819893895 m source edge and the 14.317820 mm source gap; neither authorizes a connector. Marker width/inset and crossing margin are authored presentation, not surveyed paint, road width, lane count or turn authority. The five embedded binary/JSON length and SHA-256 pins bind the full ignored road, pavement, published-marking, pavement-source and network cache; missing or changed cache refuses with a restoration/review requirement. The derivation's two authored helper raw-byte pins are separate evidence, not physical fixture inputs or portable checkout-byte requirements.

PLATEAU / MLIT Japan and Shibuya-ku, PDL 1.0 with CC BY 4.0 permitted; processed by selection and local-frame projection. The PLATEAU source and processing credits above apply. OpenStreetMap contributors, ODbL 1.0; the selected crossing remains identifiable as OSM-derived topology. Raw source and scene meshes stay ignored. `test/corridor-paint.test.ts` checks finite displayed support, whole-edge omissions, physical exclusions, exact immutable955 output and bounded constructor reads. It does not prove continuous support, native appearance, loading speed, FPS or whole-map road quality. See [955 source handoff](../../docs/work/0_shibuya-1km/reviews/955_corridor-paint-source-handoff.md).
