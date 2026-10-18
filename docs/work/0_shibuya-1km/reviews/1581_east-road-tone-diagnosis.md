# 1581 — east-road tone diagnosis

2026-10-18. Read-only, finite source/pixel diagnosis for root at main `16bb1f360eb1b530fb4cf92413f932b21dc11616`; accepted executable `e1097edd` unchanged. No repair is justified by this result.

## Finding

The near right-hand dark road wedge in `street1579/run1/payload/peripheral.png` is explained by the intended authored resurfacing material. It is not a directional building/bridge shadow. This finding covers one geographically bounded patch, not every band in either street image and not whole-road quality acceptance.

First probe named the existing frozen `__mapsHarness` and retained capture metadata. They provide pose, lighting and renderer but no per-pixel material/caster identity. I inspected all three original 1280×720 images, then used a finite CPU ray/source check of the actual road, pavement and terrain arrays. No browser, server, GPU, build, tests, source regeneration, Git/index mutation or network operation was launched. A read-only git status attempt was refused by the sandbox identity ownership check. No temporary output was created.

## Bound bytes

The three originals match their retained frame rows: start `1671759339a142f13eacd0d6143cc55b9d0a0950229ec6fffb796391fdf9311e`; exit `bd7d7478f3544d63fae90a1d86c8db0cab0af5548a6250fed44df14088d22299`; peripheral `23361632f5dff5a8c695635fa39e29c93c81d2120f08b9cf4f4aff130e114af0`.

Certificate `artifacts/visual/complete.json` SHA-256 remains `9ac73ddecd91e219310aa0da16d37bf621c936b5bec74102bfb600fe93d13547`. Current `dist/assets/index-C2dDmSN1.js` matches its `a89a8b378205e0b89d8cd4aaa8a590de78c3d5ff134766e029a742ef1ca67206` pin and contains the panel GLSL, presence threshold and asphalt colour formula. The 1579 capture retains the matching certificate before/after and unchanged=true. Its final static-review stage timed out at 15 s and captured=false; the three earlier PNG/pose rows remain usable, but this is not a completed capture run.

Meshes decoded directly: roads SHA-256 `0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc` (231,537 vertices/79,367 triangles); terrain `c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773`; pavements `841ad72df38036a666085496ddc01a8f381085a4e2d6315ae1426265580cb9f6`. Loader uses these arrays without position or normal rewriting (`src/scene/mesh-loader.ts`).

## Finite explanation

All three retained lighting rows report dusk, solar elevation −3.48°, key elevation 6° and shadowsEnabled=false. `src/scene/lighting.ts:125` sets the directional light's castShadow only above 8°. Thus a directional shadow from the bridge or buildings cannot explain this dusk patch. GTAO remains active; this diagnosis does not disable or globally clear it.

Peripheral eye is (93.785232318,18.383185090,0), target (138.672507290,15.2,0), with recorded azimuth −π/2/polar≈1.5 and the production 55° vertical field of view. Pixel-centre rays at (1090,451) and (1090,471), 0-based image coordinates, first hit road triangle 61419 at (107.218397,15.627361,8.855860) and (105.721357,15.580210,7.885257). Both interpolate normal (0,1,0). The same triangle spans both sides of the visible colour boundary. Terrain hits occur farther along both rays, at 17.5786/15.8582 m versus road 16.3239/14.5776 m; pavement does not intercept either ray. This excludes a road triangle edge, normal change or terrain breakthrough at this pair, within the checked three surface meshes. Buildings were not exhaustively ray-tested.

`src/scene/surface-structure.ts:42` authors one independently rotated resurfacing panel per 24 m cell when seeded alpha≥0.58. The road cell (4,0), covering X96–120/Z0–24 m, receives RGBA bytes (253,161,240,214). Its computed panel is present. The independent decoded-ray world points fall inside/outside this panel with signed distances −0.742477/+0.300692 m. The material deliberately subtracts 0.18 panel coverage and 0.15 seam coverage from its colour multiplier and adds 0.07 panel coverage to roughness (`src/scene/surface-materials.ts:272`). This is explicitly disclosed in source as authored variation, not surveyed repairs.

At fixed image X1090 the panel edge crosses between Y464/466: independently evaluated signed distances −0.03737/+0.06194 m; native RGB (16,20,33)/(22,26,41). Rows Y450–462 remain inside with RGB ranging (16–19,21–23,34–36); Y468–472 are outside with (23–24,28–29,45). The projected panel edge and the native dark-to-light boundary agree within this two-pixel bracket. A second finite pair at X1010 gives inside (110.461410,15.725201,9.012617), RGB(17,22,35), signed edge−1.058794 m; outside (107.998682,15.656553,7.699117), RGB(23,28,44), edge+0.374425 m. The source-generated road seed atlas SHA-256 is `f0056207cbf2ff9496d71ba3ca34a19365c7f4595eb770d7c129300320a40494`.

## Decision and limits

Stop this source question. No shading/topology/support defect is demonstrated, so no fix scope or new runtime comparison is proposed. The panel can still be judged unattractive in a broader native appearance review; its intention does not grant visual acceptance. This finite check explains the near peripheral wedge only. Exit bands, other resurfacing cells, buildings, all shadows/AO and continuous travel remain outside the conclusion. Root retains all 35 implementation items and 14 original criteria unchanged.
