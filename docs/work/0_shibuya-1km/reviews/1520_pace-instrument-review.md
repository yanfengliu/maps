# 1520 — Independent pace-instrument review

Date: 2026-10-17 (measurement UTC 2026-10-18). Reviewer: independent methodological lane. Status: PASS for the bounded 1519 instrument and its reported short-window observations; the older slowdown's cause remains UNKNOWN. No product acceptance or source adoption follows.

## Reviewed subject and method

The subject is unmerged traffic candidate3 in `artifacts/traffic1499/worktree`, branch `codex/traffic1499`, base `0681715632e66ad825a3d78ac7d9282c5cb038b5`. The 23 source/test paths independently match `candidate3-freeze.json`, SHA-256 `461a3e2deed114a29f290e7e36b974516072816fdeb7c7a37e2e8359f991e91c`. This review is not a repeat of source review 1509 or a fourth native flow-qualification arm.

Before launch I read the actual render loop, query parser, ordinary-entry selection, local walker, post chain, bridge, train snapshot and historical run3 observer. `src/render/loop.ts:136-163` caps each raw elapsed delta at 0.25 seconds, runs at most five fixed steps per frame, drops remaining backlog and increments frameCount after post.render returns. FrameCount measures application render iterations, not GPU-completed/presented frames or GPU milliseconds. The loop's capped elapsedSeconds is unsuitable as a wall denominator.

`src/agents/local-walk-prototype.ts:53-72` increments the walker tick on eligible shared fixed callbacks after real Start. It is a valid fixed-step proxy while started, ready and without refusal. Its root elapsedSeconds independently advances by dt in `population/local-walk-gait.ts:62`. With zero requested population, `agents.ts:123-133` leaves population absent and its status ticks at zero; that is not evidence of a stopped world. The train status uses interpolated fixed time (`rail-trains.ts:155-157`), so it corroborates pace within endpoint phase differences rather than exposing an exact global tick counter.

The supported A URL requests zero vehicles and pedestrians with local-walk=1; default seed remains 5970698. Ordinary B/C retain 24 requested slots and the original route selection. All six pages use the real Start control and the same moving post path: nonaccumulating TAA, sampleLevel1, 2560×1440 scene target with 4 requested MSAA samples. `app.ts:246` and `post.ts:296-303` establish this path independently of requested vehicle count.

The approved immutable helper is `artifacts/performance1519/capture.mjs` SHA-256 `c68257ad294738d52eec96ec7292229dce4841196974701bbaee5788ee2ddd53`; supervisor `run-owned.ps1` is `8bc0262463b7d1d2a5625abd74874a83ff3f5018bf8177852144ef900d8b8446`. It runs A-B-C-C-B-A with fresh pages, a 20-second quiet wall warmup, then approximately 20 wall seconds of measurement. C observes only during measurement, not warmup. A/B have identical endpoint full snapshots and no intervening observer. C reproduces historical run3's full observe, validation, sample projection and 1000ms post-call wait. Run3 has no separate concurrent sampler. Its 50ms near-target cadence, screenshots and navigation are excluded from 1519.

Endpoint performance.now is sampled in the same synchronous evaluation immediately before status and walker counters. Node performance.now brackets each evaluation. All rates below were independently recomputed from the actual browser endpoint interval, not nominal 20 seconds. The common endpoint overhead is included; the experiment does not isolate individual polling CPU cost.

## Actual six-arm observations

The sole run lasted 02:41:06.168–02:47:29.583UTC. All actual intervals lie 20.042–20.171 seconds. Hardware is RTX4090/D3D11, driver 32.0.16.1664; viewport 1280×720/DPR1, Satellite dusk.

| Order | Condition | Wall seconds | Render iterations | Iterations/wall second | Walker simulation seconds/wall second | Observer calls |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | A: zero vehicles | 20.0868 | 906 | 45.1042 | 0.980744 | 0 |
| 2 | B: ordinary24 | 20.0416 | 782 | 39.0188 | 0.964660 | 0 |
| 3 | C: ordinary24 + far observer | 20.1360 | 835 | 41.4680 | 0.969242 | 19 |
| 4 | C: ordinary24 + far observer | 20.1705 | 795 | 39.4140 | 0.967585 | 19 |
| 5 | B: ordinary24 | 20.0596 | 815 | 40.6289 | 0.973765 | 0 |
| 6 | A: zero vehicles | 20.0557 | 887 | 44.2268 | 0.974785 | 0 |

All six raw endpoint checks agree with the declared controls. Each camera is exactly stable within its arm; maximum between-arm position difference is less than 4e-13m. Tiles remain idle at revision 67 with unchanged visible URI sets. Post settings match across arms. Walker root-time deltas agree with tick/60; B/C population tick deltas equal walker tick deltas. B/C actually have 18→19 active/rendered vehicles, not 24 filled slots; population ages span approximately 25.5–45.57 simulation seconds. A population ticks remain zero while walker and train advance. Local-walker event histories span 147–151 entries at start and 265–269 at end. These are young histories compared with run3.

I opened all six pose-proof PNG originals individually at 1280×720 and independently matched their byte lengths and SHA-256 to capture.json. Each shows the expected 45m crossing frame, Satellite and Local walk running. They precede warmup and lie outside timing windows; they prove framing, not traffic flow or continuous appearance. In order, the reviewed hashes are `a2d790b959aec18c5e41a24011e1e4c69aba038886709b60da25717d8f142d86`, `0c9f2addb7e26b592b7d8f89db70b2e0e08d5f54230a87eb36d2e87fdf438f09`, `7c3d11388a090577219a30f38f01ac3acdac19bc48f479a77002ec1b770aba5e`, `1006c185f81050485b67486a9f1fe213b403ebe1b423f178cb448f2c5a3ddc7d`, `ecc82628233588f54a57bc920df9f11036d2aedcbeb062acd1b794699ec4ea4e`, `ec807e80378dcb07b5c4c61fca25d010bbe46b8ef149027cb8ef8db83e6718a6`.

B/C rates overlap and show no consistent far-observer penalty in these short young windows. This does not prove zero observer cost: C's Node-observed call means are 46.71/48.46ms, including browser scheduling/transport. Ordinary traffic has lower render-iteration rates than A in both order positions, but the design does not separate vehicle simulation, rendering, state, scheduling and GPU work. No precise causal cost or population target follows from two observations per condition.

## Retained run3 age comparison

Root authorized one bounded calculation from already-retained run3 samples, with no new browser, probe or source change. I checked launch differences first. Both helpers use headless Chromium 1243, the same functional browser flags and GPU/driver, one context and one page at a time, and the same 500ms CIM process-ownership loop. Only owned marker names differ. Run3's inspected event endpoints have the same 45m camera and moving post configuration. No material configured scheduling mismatch was found; this is not proof that external machine load was identical.

Run3 retains 576 timestamped samples between 6.283 and399.867 simulation seconds. For the table below I selected consecutive samples whose population tick/60 values fall wholly inside the stated band, whose next target among218/226/234/237/240.5/244/400 is identical, and whose two endpoints are both more than 2 simulated seconds before that target. The inspected untilTime source therefore sleeps 1000ms in these pairs. This excludes cross-target capture intervals and 50ms near polling. The first sample follows crossing navigation; the last precedes boundary navigation. The 246-second lower bound also excludes the final event capture interval.

| Population age band | Retained actual simulation interval | Pairs | Sum of recorded wall seconds | Sum of simulation seconds | Simulation/wall ratio |
| --- | --- | ---: | ---: | ---: | ---: |
| 0–50 | 6.283–49.233 | 42 | 44.191 | 42.950 | 0.971917 |
| 50–100 | 50.183–99.550 | 49 | 53.199 | 49.367 | 0.927962 |
| 100–150 | 100.617–149.283 | 52 | 59.069 | 48.667 | 0.823895 |
| 150–200 | 150.217–199.617 | 61 | 71.322 | 49.400 | 0.692633 |
| 200–216 | 200.117–215.750 | 21 | 25.016 | 15.633 | 0.624933 |
| 246–300 | 246.133–299.883 | 82 | 102.287 | 53.750 | 0.525482 |
| 300–350 | 300.550–349.700 | 81 | 103.814 | 49.150 | 0.473443 |
| 350–398 | 350.367–397.700 | 81 | 105.378 | 47.333 | 0.449177 |

The denominator sums actual positive differences between saved UTC Date timestamps for the selected pairs, not nominal sleeps or extrapolated time. Those historical timestamps are not monotonic instrumentation, so wall-clock adjustment cannot be independently ruled out. Individual selected intervals range 1.021–1.508 seconds. A first read-only calculation had a PowerShell pipeline syntax error before evaluation; the corrected in-memory calculation produced the table without modifying evidence.

The observed decline already exists during far waiting before the 218–244 screenshot sequence, whose approximately 0.583 ratio includes capture work. Thus near polling/screenshots cannot by themselves explain the entire retained decline. Age-dependent production work, accumulated observer/history cost and other changing state remain unresolved. The young 1519 result does not identify that cause or fix verification. The cheapest useful next question is whether this age-related decline persists with no intervening observer; no additional experiment was run by this reviewer.

## Binding, cleanup and verdict

I independently compared before/after groups and then hashed every current file against the final manifest: 139 source, 6 dist, 121 scene, 1 network, 34 rail and 21 visual-harness files, 322 total, with zero mismatches. These are endpoint byte checks, not a filesystem race lock. No source, cache, build, index or test was changed by this reviewer.

Actual page/context/browser/browser-server/preview/esbuild cleanup reports success, with no browser errors. The supervisor exited 0 and its fresh 02:47:30.1859794UTC census reports no known, omitted or late descendant survivors. The later receipt, SHA-256 2b1baabdbd12d7710b0c28d8873bef89a7c17ea8336124da89714f6d5ec1173c, independently records a fresh 02:48:28.9915778 UTC census with no survivors and confirms the exact owned external TEMP directory absent. This reviewer launched no browser, server or GUI process.

Retained raw evidence under ignored `artifacts/performance1519/run1/`: payload/capture.json SHA-256 `2ed3eaf1ff640a15a83332b06984e800424303d5221d94b8d0c6783e17a05fb6`; payload/measurements.json `09a1ec0c3039b16dea84e82c122b857725539ba5c499d79bad6623ebd5c826c6`; process-cleanup.json `707edadb4c29ae7aaf27a6730e5daddcd16da473e80a0cd2ce5eb0688e0f2c2d`. Historical run3 capture.json remains `283542053c2ce4fc610a87ab041fb578f76ee0db42c1fc2a7126fee0f25982ba`.

No material instrument finding remains for 1519's stated scope. Native boundary exit, full fleet fill, long-run flow, continuous contact/interpolation, GPU timing and the 3,000-pedestrian/200-vehicle/60fps at 1080p target remain OPEN. Five code gates, executable commit and main integration DID NOT RUN in this diagnostic. Candidate3 remains unmerged and unadopted.
