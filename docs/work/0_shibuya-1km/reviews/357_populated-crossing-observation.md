# 357 — Populated crossing observation

The observation is **inadequate for populated visual acceptance**. All five inspected native frames show an empty signature crossing. No recognizable pedestrian or vehicle advances between the disclosed timestamps. The five PNG files are byte-identical, despite advancing render frames and simulation ticks. The required visible human and vehicle event remains unverified.

This is the dominant product problem in this observation: the explicit population flow runs and reports active and drawn actors, but it gives the reviewed crossing view no visible life during the observed interval. Plausible actor scale, walking appearance, road contact, intersections and disappearance cannot be judged where no actor is visible. This short interval does not prove the crossing stays empty later or establish a complete routing root cause.

## Flow and execution

The primary checkout was main `1e840ac590149c1bae2760ca4e6ef06f521fd6b9`. Its existing production build was served headlessly on owned port 4324. The exact user input was `/?agents=1&pedestrians=150&vehicles=20&seed=5970698&style=satellite&time=noon`. The existing OrbitDriver used real pointer and wheel controls to reach the signature crossing pose, then waited for loaded tiles and a settled camera. The population waited until its actual clock reached 20 simulated seconds. No build, source edit, data change, alternate population or default activation occurred.

The successful retry ran from 2026-09-30 01:30:48.389 UTC to 01:31:37.566 UTC, or September 29 local time. Chromium reported `ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)`. The GPU probe named NVIDIA GeForce RTX 4090, driver 616.64. The camera was at `(31.7400949103, 18.3831764312, 31.7400949103)`, targeting `(0, 15.2, 0)`, azimuth 0.7853981634, polar 1.4999999451 and distance 44.9999984669 m. The scene was idle with no pending or failed building tiles. The post chain was active with no error, moving sample level 1 and no accumulating TAA.

## Actual population and sampling

At readiness, tick 1203 and 20.05 simulated seconds, the requested 150 pedestrians were all active and reported drawn. All 150 used far LOD; near and medium counts were zero. Of 20 requested vehicles, 14 were active and reported drawn, while six were waiting. These are whole-scene instance counts, not a census of pixels visible to the camera.

| Original | Wall time from recording start, ms | Render frame | Simulation tick | Simulated seconds | Pedestrians active/drawn | Vehicles active/drawn | Vehicles waiting |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| representative.png | 16.0 | 1394 | 1205 | 20.083333 | 150/150 | 14/14 | 6 |
| keyframe-1.png | 1200.7 | 1465 | 1276 | 21.266667 | 150/150 | 14/14 | 6 |
| keyframe-2.png | 2415.8 | 1538 | 1349 | 22.483333 | 150/150 | 14/14 | 6 |
| keyframe-3.png | 3616.4 | 1610 | 1421 | 23.683333 | 150/150 | 13/13 | 7 |
| keyframe-4.png | 4816.8 | 1682 | 1493 | 24.883333 | 150/150 | 13/13 | 7 |

Successive samples were 1184.7, 1215.1, 1200.6 and 1200.4 ms apart, spanning 71, 73, 72 and 72 rendered frames and the same numbers of fixed ticks. Pedestrian waiting was zero and near/medium LOD counts stayed zero in all five. The worker opened all five at their original 1280×720 resolution; recognizable visible human and vehicle counts were zero. The recorded camera stayed fixed.

The clip requested 30 fps through canvas captureStream and MediaRecorder. Its track settings reported 30 fps at 1280×720; duration was 4817.8 ms. The observer saw 289 fresh application frames while recording. This is not a decoded video-frame count, measured encoder cadence, isolated performance test or proof of the separate 1080p target. Only the five disclosed native samples were inspected. Footage between them is outside the appearance verdict.

There were no refusedSpawns entries. At the first sample there were 32 refusedRoutes reason entries totaling 219 accumulated attempts; the last had 34 entries totaling 258 attempts. These count repeated route-planning attempts, not distinct actors. At readiness the leading reasons were bus portal failure at scale 1.002 (48 attempts), bus portal failure at scale 1.001 (21), lane 97333609 finding no true AOI exit (21), and the corresponding spawn lacking a drivable route (21). Pedestrian refusals included walking components with no crossing within 60 m of the origin reachable within 1000 m. Existing source-support corridor refusals also remained explicit. No refusal was overridden. The observed authorityViolations counter was zero, which does not establish continuous collision safety. At the final observation, vehicles had seven completed routes and 16 authority crossings; pedestrians had no completed routes or authority crossings.

The exact leading readiness reasons were:

| Recorded reason | Accumulated attempts |
| --- | ---: |
| vehicle class bus at scale 1.002 has no AOI entry portal with a complete route and clear halts for its 5.800 m authority radius | 48 |
| vehicle class bus at scale 1.001 has no AOI entry portal with a complete route and clear halts for its 5.798 m authority radius | 21 |
| vehicle route from lane:97333609:0:0:ground0:f:0:section0 reaches no true AOI exit inside its component within 120 sections | 21 |
| vehicle spawn at lane:97333609:0:0:ground0:f:0:section0 planned no drivable route to a true AOI exit that a 1.952 m body can halt on | 21 |
| pedestrian route from walk:1465365729:0:0:ground0:f reaches no walking crossing inside 60 m of the world origin inside its component within 1000 m of walking | 10 |

## Evidence and input binding

Evidence is retained under `artifacts/populated357-retry1-20260929/`. `capture.json` binds 120 raw source files, six production files and 151 served scene/network/rail files before and after the run. Both bindings are identical. All 107 compiled source-map entries match current source after only one leading BOM and CRLF text normalization; exact raw-file lengths and SHA-256 remain separately bound.

- Raw source tree digest: `b69fc86002f149580f3cd4c6fc36e6e5a6eb40e61bb31cf3d5e301619a4a6cf5`.
- Production tree digest: `82c4d56ab8460e441dd76d7b910c19c676abdcd3965fd65bd926f8d95d1c8d22`.
- Main bundle `dist/assets/index-CDeUH-RQ.js`: `0c06649a0f82ef784302e5d0785338dc9f244af359e5d31d222f4d4b7e75e84e`.
- Scene digest over 354,752,173 bytes: `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce`.
- All five original PNGs: `a9067297fd534397d4f14cdb60b2ba44fb664c39d55b9f61d2018e83215fb5d9` each.
- `motion.webm`, 1,658,273 bytes: `accfaf364782da951065c0d53f2b9f810bd50b9bd82d5ae9a11211c3ae2d7e9f`.
- `capture.json`: `4df20fc346d8ebf98fbf7901bff7e610cdd1ebc467f2539d64937ad747985bf0`.

The existing response observer accepted its CDP buffer configuration and hashed 149 actual browser response bodies against the 166-file input list. Playwright and CDP response coverage agreed. The responses covered 148 unique URLs, including 35 actor-asset responses. Browser-derived blobs were separately recorded. Runtime error and warning lists were empty. This proves the bodies actually requested matched the binding; it does not claim all bound files were requested.

## Cleanup and earlier failure

The page, CDP response session, context, browser, browser server and preview all closed in finally cleanup. The retained-handle launcher exited zero. Final identity observation found no retained survivor, unadmitted live process, scoped process or port 4324 listener. Exact owned TEMP/cache cleanup found zero links, removed its root and restored the environment. GPU and port 4324 were released.

- `owned-run-receipt.json`: `82feeeecb58a2e0d13cba6d3e08dd14b257bc3aed6a6b2eff1b4241b3177100f`.
- `process-cleanup.json`: `7bf4ad57c1174346e246d97171bfffbef7d6513201d747226c5e1dde31ef4ca5`.
- `temporary-cleanup.json`: `375f1c41646b90abfc9ff0ac1c41d17ea66d8b40b2795c32a8af7ef037042e97`.

The original attempt remains under `artifacts/populated357-20260929/`. Sandbox CIM port access was refused before the launch; the approved owner-context launch then failed before browser or server creation because Vite's source map omitted cell-grid.ts's leading BOM. Its logs and cleanup receipts were preserved unchanged. Root authorized the minimal textual normalization and one fresh-directory retry after the existing binding function proved all 107 entries and unchanged raw hashes. This was a runner defect, not a population startup failure. The successful retry's `passed: true` records bounded execution and cleanup only; populated appearance remains inadequate. No further capture was attempted.
