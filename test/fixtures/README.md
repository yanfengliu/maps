# Test fixtures

Three files, all real bytes from a public source, all cut down so a gate can run without a network and without a 1.4 GiB checkout. `npm run data:fetch` regenerates the full originals under `data/`, which is gitignored.

These are promoted task output, not downloaded data: they are the pinned inputs `test/elevation.test.ts` and `test/sentinel.test.ts` measure against, and the canon allows exactly that promotion. All three are well under the 256 KiB blob ceiling.

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
