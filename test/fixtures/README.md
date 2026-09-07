# Test fixtures

Two files, both real bytes from a public source, both cut down so a gate can run without a network and without a 1.4 GiB checkout. `npm run data:fetch` regenerates the full originals under `data/`, which is gitignored.

These are promoted task output, not downloaded data: they are the pinned inputs `test/elevation.test.ts` measures against, and the canon allows exactly that promotion. Both are well under the 256 KiB blob ceiling.

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
