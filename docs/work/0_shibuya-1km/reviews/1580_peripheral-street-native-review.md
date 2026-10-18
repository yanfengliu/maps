# 1580 — Peripheral street native review

2026-10-18 UTC. Independent read-only review of street1579/run1. I inspected start.png, exit.png and peripheral.png separately at their original 1280×720 resolution. No runtime launched or extra views requested.

**NO JUSTIFIED EDIT.** All three show unobscured road, pavement edges and adjacent building bases. The final camera is 93.785 m east of the crossing origin, looking toward X=138.673 m beyond the visible rail span: this reaches the eastern station-side street, not merely a file named peripheral. Broad dark asphalt patches appear in exit/peripheral, but these stills do not establish an erroneous join/material or a justified correction. Known facade softness supplies no new source/window evidence. No material defect meets 1578's two-view threshold; do not manufacture a fix or reopen parked work.

Actual poses share Y=18.383185 m, Z≈0, azimuth=−π/2, polar=1.499999757 and distance=45.000001 m. Before/after poses are unchanged for each screenshot; tiles idle, Satellite/dusk, RTX 4090 D3D11, no reported context loss/error.

| Original | Camera X m | Target X m | Terrain clearance m | Frames before→after | Walker ticks before→after |
| --- | ---: | ---: | ---: | --- | --- |
| start | −44.887275 | 0 | 3.300700 | 324→340 | 0→16 |
| exit | 16.250516 | 61.137791 | 3.296387 | 1447→1461 | 1136→1150 |
| peripheral | 93.785232 | 138.672507 | 3.497208 | 2744→2757 | 2433→2446 |

Start is the ordinary button click, startFrame 324. Two real W holds of 5,500 ms produce 61.138/77.535 m eastward movement. Before-observation gaps are 22.1447/21.6011 s; screenshot brackets are 263.8/219.7/217.9 ms. These sparse originals establish neither continuous motion, collision-free travel, A13 nor FPS.

**Run remains failed.** capture.json says captured=false: native peripheral inspection exceeded 15,000 ms. The peripheral decision arrived after that timeout. Usable retained images do not turn this into a successful journey record. Capture records zero errors/failed requests, all six cleanup flags true and unchanged build/scene certificate. Controller exit 1 in 79.712 s, final census PASS, marker count 0, port 4319 CLOSED. External retained-handle supervisor exits 1 in 80.965 s without timeout. Fresh 07:01:58 UTC census again passes with no known/omitted/late identities, markers or listeners; the literal owned profile is absent. These are bounded recorded cleanup observations; no restart is warranted.

SHA-256 rechecked after native inspection against all three frame rows, zero mismatches. Paths below are under artifacts/street1579/run1/:

- payload/start.png:1671759339a142f13eacd0d6143cc55b9d0a0950229ec6fffb796391fdf9311e
- payload/exit.png:bd7d7478f3544d63fae90a1d86c8db0cab0af5548a6250fed44df14088d22299
- payload/peripheral.png:23361632f5dff5a8c695635fa39e29c93c81d2120f08b9cf4f4aff130e114af0
- payload/frames.json:a43bd1a38bf3e604a9b53e451fe08a3aa891e02bf5d53d2225b26cf49acd7962
- payload/capture.json:c7bcaec9496a2f2d64096850e52cc8f278b077f70128f27ab136a81271750371
