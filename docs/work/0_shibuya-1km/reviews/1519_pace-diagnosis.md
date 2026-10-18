# 1519 — young ordinary-scene pace diagnosis

2026-10-18 UTC. Bound: one fixed crossing pose, retained walker, zero or 24 requested vehicle slots, six short wall-clock windows on unmerged traffic candidate3. This diagnoses young-scene load and the far observer only; it does not qualify traffic circulation, identify CPU versus GPU cost, or accept the 3,000 pedestrian/200 vehicle/1080p/60 fps target.

The short measurement detects substantial scene cost without the repeated observer. Adding the literal far observer shows no consistent additional penalty in these young windows. The severe age-dependent slowdown in the earlier native run remains UNKNOWN; this result does not exonerate either production history or observer history at later ages.

The root-granted exclusive GPU lease dispatched one headless owned run at 02:41:03.818 UTC, Node PID 56276. Its payload completed in 383.415 wall seconds; supervisor exit was zero. No fourth traffic qualification arm, executable edits, gates, commit or adoption ran.

The existing frozen `window.__mapsHarness` was the first instrument. Independent [1520 instrument review](1520_pace-instrument-review.md) inspected the helper before dispatch and reviewed the actual results. The unchanged candidate has 23 pinned paths; candidate freeze SHA-256 `461a3e2deed114a29f290e7e36b974516072816fdeb7c7a37e2e8359f991e91c`. All 322 source/bundle/scene/network/rail/harness inventory entries matched before and after; all 23 candidate paths also matched afterward.

A-B-C-C-B-A used fresh pages in one owned browser and preview lifecycle, the same seed 5970698, Satellite, 1280×720/DPR1, RTX 4090 over D3D11, driver 32.0.16.1664. Real Start walking, OrbitDriver pointer and wheel inputs established target [0,0], azimuth π/4, polar 1.5, distance 45 m. Six native pose-proof originals were captured before warmup, outside measurement. All arms then had 20 wall seconds of quiet warmup with no repeated observer. A used the supported diagnostic URL `?vehicles=0&pedestrians=0&local-walk=1`; B and C used ordinary `/`. A and B had no in-window polling. C reproduced the run3 full observe → validation → retained population/scramble/local-walk sample → 1000 ms post-call wait, only during measurement. Each C window made 19 full observations. The 50 ms near-event cadence, navigation and screenshots were excluded.

| Arm | Actual measured wall seconds | Render iterations/wall second | Walker fixed seconds/wall second | Full observer calls |
| --- | ---: | ---: | ---: | ---: |
| A1 | 20.0868 | 45.104 | 0.98074 | 0 |
| B1 | 20.0416 | 39.019 | 0.96466 | 0 |
| C1 | 20.1360 | 41.468 | 0.96924 | 19 |
| C2 | 20.1705 | 39.414 | 0.96758 | 19 |
| B2 | 20.0596 | 40.629 | 0.97376 | 0 |
| A2 | 20.0557 | 44.227 | 0.97479 | 0 |

Pooled rates, using summed actual wall time, are A 44.666 render iterations/s and 0.97777 walker seconds/wall second, B 39.824 and 0.96921, C 40.440 and 0.96841. B is about 10.8% lower in render-iteration rate than A under these conditions. C and B overlap across the two repetitions; these observations do not establish a statistically precise observer cost or absence of one.

The denominator is browser `performance.now()` sampled beside counters in each synchronous endpoint evaluation, with independent Node monotonic before/after brackets retained. The actual intervals replace the nominal 20 seconds. `frameCount` counts returned render calls per RAF iteration, not GPU-completed or presented frames, GPU milliseconds or internal post-processing passes. The render loop caps five fixed steps per frame and drops backlog. The started, ready, unrefused walker's tick counter therefore measures actual eligible shared fixed steps; root elapsed time agrees with tick/60. Train time is an interpolated corroborating clock with up to one-step endpoint phase differences. There is no directly published global fixed-tick counter. A has no population, so its population ticks remain zero while walker and train clocks advance; its population pace is explicitly null.

At every endpoint the camera stayed fixed, tiles were idle at revision 67 with 16 visible tiles and unchanged visible identities, drawing size and moving post path matched (`taaAccumulating=false`, `taaSampleLevel=1`), and no application/authority/refusal error occurred. B/C had 18 active/rendered vehicles at measurement start and 19 at end, with 24 requested; their population ages were about 25.5–45.57 simulated seconds. Bus refusal and waiting slots remain disclosed in raw status. No full-24, 200-vehicle or crowd fill is claimed. All arms include walker work, the same moving AA path, automation connection and ownership supervisor, so common costs remain inseparable here.

The broader run3 slowdown occurs at older ages and may involve growing production work, growing status/history serialization, or both. A young, 1 Hz, two-repeat comparison does not resolve that gap, exclude 50 ms near-event overhead, prove continuous temporal quality or justify a production patch. Traffic1499/1516 remain parked and unmerged, with their unmet boundary exit unchanged.

Cleanup closed page, context, browser, browser server, preview and esbuild. The original process census and a later fresh CIM census passed with no owned survivors; only the exact externally owned TEMP directory was removed after absolute-path, ancestor and descendant link checks. No server remains.

Private evidence remains under ignored `artifacts/performance1519/`; none is promoted to Git. `summary.json` retains actual counts, ages, clocks, endpoint tiles/camera, six image digests and pooled calculations. Raw `run1/payload/capture.json` SHA-256 is `2ed3eaf1ff640a15a83332b06984e800424303d5221d94b8d0c6783e17a05fb6`; `measurements.json` is `09a1ec0c3039b16dea84e82c122b857725539ba5c499d79bad6623ebd5c826c6`; original `process-cleanup.json` is `707edadb4c29ae7aaf27a6730e5daddcd16da473e80a0cd2ce5eb0688e0f2c2d`; fresh census/TEMP receipt is `2b1baabdbd12d7710b0c28d8873bef89a7c17ea8336124da89714f6d5ec1173c`. Payload and retained supervisor digests are `c68257ad294738d52eec96ec7292229dce4841196974701bbaee5788ee2ddd53` and `8bc0262463b7d1d2a5625abd74874a83ff3f5018bf8177852144ef900d8b8446`.
