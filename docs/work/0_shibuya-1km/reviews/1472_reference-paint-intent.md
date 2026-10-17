# Road1472 independent paint-intent lookup

Observed 2026-10-17, completed 21:28 UTC. Verdict: **UNKNOWN**. The inspected official references do not establish a pair of outer white margin paint lines extending at least 80 m on each side of the frozen road. This does not establish that such paint is absent. No prototype is authorized by this lookup.

## Finite scope

The assignment names `tran_6f89cacd-3abb-4510-be7d-2304ed3f6913` and `tran_4b976366-631d-4384-9925-31caae6abfd9`, with supplied world bounds X [-250.623, -125.373], Z [1.501, 63.861]. Geometry, parent identification, exclusions and support remain the road1472 owner's work. Function 2000 and road/pavement widths were not used as paint authority.

## Actual inspected references

- [GSI seamlessphoto 18/232796/103246](https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/18/232796/103246.jpg), retained as `paint-intent-gsi-seamlessphoto-18-232796-103246.jpg`. Inspected the original 256 by 256 image. 19,705 bytes; SHA-256 `20c675bc790ca9c43386d3440c22f14a4cad0cc671ab3fa6c4a350bc71e2ee84`.
- [GSI seamlessphoto 18/232797/103246](https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/18/232797/103246.jpg), retained as `paint-intent-gsi-seamlessphoto-18-232797-103246.jpg`. Inspected the original 256 by 256 image. 18,976 bytes; SHA-256 `f6156eaa336a9bfa60979f91e7b3b4365786a9e03a48bc3a9651b5e61aeb4ceb`.
- [GSI capture-date metadata 11/1818/806](https://maps.gsi.go.jp/xyz/seamlessphoto_spec/11/1818/806.geojson), retained as `paint-intent-gsi-seamlessphoto_spec-11-1818-806.geojson`. Its sole polygon contains both inspected tiles and identifies the source as electronic national basic map orthophotography, captured **June-November 2019**. 497 bytes; SHA-256 `66b539d3d6981ff51d99a51a5bc869cb51fba82359c235233bb6890cc82e7bf9`. The [official layer definition](https://maps.gsi.go.jp/layers_txt/layers1.txt) identifies this capture-period endpoint and its native zoom 11. Retrieval today does not make the photograph current to 2025 or 2026.
- [Shibuya Ward, December 2019 Dogenzaka 2-chome second planning meeting](https://files.city.shibuya.tokyo.jp/assets/12995aba8b194961be709ba879857f70/f07d7b7f99d34b7eb0730d593311699f/assets_com_20191220dogenzaka2_shiryo.pdf), printed page 28 / zero-based page 27. Inspected the labelled Dogenzaka street photograph on the left; the right photograph is labelled Bunkamura Street and is outside this paint claim. Retained PDF `paint-intent-shibuya-20191220-dogenzaka2.pdf`: 7,317,409 bytes; SHA-256 `d6dd031e6a205b803102a168615379a4aa5bbd16888195b91071e048a1dcbafb`. Page raster `paint-intent-shibuya-20191220-page28.png`: SHA-256 `c97f2cadac129c4121933fda2d0e2bd60f47d1977bd0785d9cabc399da4a86b0`; rendered at 2400 by 1800, tool display resized to 1824 by 1368. The photograph's exact camera position and finite overlap with the two frozen parents were not established.

## Location and pixel bound

The canonical `geographicToPlaneRectangular` and `planeRectangularToWorld` functions map the two-tile mosaic's northwest corner to world (-348.099769, -3.568539), northeast to (-99.422371, -3.226188), southwest to (-348.271915, 120.220274), and southeast to (-99.591058, 120.562620), using X/Z metres. This envelope includes the supplied frozen bounds. Each original tile covers approximately 124.34 by 123.79 m, about 0.486 by 0.484 m per pixel.

The aerial view exposes the road and thin bright boundary features, with substantial shadow, trees, vehicles and building occlusion. It does not reliably distinguish at least 80 m per side of **paint** from kerbs, pavement boundaries and other bright features. I did not trace qualifying paint lengths or infer paint from a bright boundary. The street photograph shows a zebra crossing and road edges, but does not establish the required paired outer margin paint or measured lengths. These are source-resolution/visibility and location limits, not evidence of absence.

The [official 2024 experiment notice](https://www.city.shibuya.tokyo.jp/kankyo/shuhen-machizukuri/oyamakaido/dogenzaka_jikken.html) states temporary one-lane operation, loading spaces and stopping spaces during 2024-02-05 to 2024-03-01. It is dated temporary context, and was not treated as authority for permanent 2025 paint. Its brochure was found but not downloaded or visually inspected.

## Retained inspection derivatives

- `paint-intent-gsi-two-tile-native.png` is a 512 by 256 side-by-side mosaic without resampling; SHA-256 `5a0f81de0545c4b140acaf2b44b3039ffc4c69c2d820854d74ad46dc331dd20f`. The two individual originals were inspected; the mosaic is retained for the owner's inspection.
- `paint-intent-gsi-road-crop-nearest4x.png` crops mosaic pixel edges [185, 0, 465, 160] and enlarges four times with nearest-neighbour sampling; inspected for pixel interpretation only. SHA-256 `78ba320496e3464d59fce675866062c0ffbdf564bfdf13e07e9983610732bd23`. Enlargement adds no source detail or paint authority.

All retained bytes are task inspection evidence under ignored `artifacts/road1472/reference/`; no runtime/source cache, product file or tracked plan was changed. No browser, GUI, server or persistent process was launched. The synchronous PDF renderer completed successfully. Evidence remains for the active road1472 handoff.
