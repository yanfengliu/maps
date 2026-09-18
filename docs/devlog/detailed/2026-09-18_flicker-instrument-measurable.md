# The flicker instrument, made measurable: a crawl number that measures crawl

2026-09-18. Branch `flicker/measure`, commits `559bd3f`, `f58e41c`, `2bd5bba`, off `4efaea6`. Worktree `artifacts/flicker/wt`, `node_modules` and `data` junctioned to the primary and used read-only: no `npm ci`, no `data:*` command. Subject: the four items of RUN-01's blocking problem, plus one defect found while answering a review of the result.

## What RUN-01 left, and what this session changed

RUN-01 (`artifacts/flicker/RUN-01-REPORT.md`, instrument landed in `2cdc349`) found that the lane was measuring its own limits rather than the dusk preset, and refused to calibrate the crawl bar from pairs the estimator could not align. Four items, all fixed here:

| | RUN-01 | RUN-02 |
| --- | --- | --- |
| picture motion per pair, as the estimator measures it | `-3…0` px — bounded by the search, not measured | **1–2 px** |
| picture motion per pair, as rigid-scene arithmetic predicts | ~30–35 px | ~5.4 px |
| camera motion per pair | 1.52 m / 0.0346 rad | **0.1911–0.2016 m / 0.0042–0.0045 rad** |
| estimator's shift | `0,0` on 4 of 9 pairs, rest at the boundary | **0,1–0,2 px**, never at the boundary |
| `changedFraction` | 1.0000 on six pairs | **0.1871–0.2206** |
| worst `crawl` per frame | 7.086e-3 | **1.351e-3** |
| `tick` | −1.07e11 | **13–252** |
| span between stills | 6–8 rendered frames (idle time, the wrong window) | **20.5–23** (mid-shutter to mid-shutter) |

1. **`motion.ts`.** `GESTURE_PX` 4 → 0.5 and `PATH_RADIUS_FRACTION` 0.05 → 0.30 — a 10× cut in the angular step, because the orbit's step is the drag over the radius and 0.5 px alone sits at the floor of Chromium's pointer coordinates. The comment claiming 4 px of drag moves the picture "by a few pixels" was wrong by an order of magnitude; it now carries the measured ~30 px and the derivation.
2. **`capture.spec.ts` + the new `tools/flicker/shutter.ts`.** The pose and the frame counter are read on both sides of the shutter, and the frame's pose is the midpoint. A pair's span is measured midpoint to midpoint, so the motion and the span it is divided by describe one window; the real shutter edges stay in the record as `shutterOpenedAtFrame`/`shutterClosedAtFrame` and the old reading is kept as `idleGapFrames`.
3. **`judge.ts`.** `SEARCH_RADIUS` 12 → 24. The fine pass's window is now derived from the coarse grid's own cell (41 px at 1280×720, 7 px on the unit frame) instead of a fixed 3 — the fixed 3 was *narrower than the grid it refined*, so "the refine pass reached its edge" was true of every correct answer and useless as a failure signal. A pair whose best shift lands on the search radius fails **by name** as unmodelable, with the two readings spelled out: a `0,0` from a failed search and a `0,0` from a still picture are the same two numbers and only one is the criterion satisfied. The crawl figure is still computed and still reported for such a pair; only the failure is suppressed.
4. **The new `tools/flicker/step.ts`.** `deriveStep` subtracted `performance.timeOrigin` — an **epoch** timestamp, 1789702869047.3 here — from `performance.now()`, which is milliseconds since navigation. That is minus fifty-six years, and it is where `tick ≈ −1.07e11` came from. It now subtracts `performance.now()` read once before the first still. It moved out of `capture.spec.ts` so a unit case can reach it; the same for the pose midpoint.

## The fifth defect, and it was in `main`

A review of the result asked why two of the lane's own numbers disagreed: `changed ≈ 0.97` on every pair while the estimator's shift was 1–2 px. The answer was neither the estimator nor misalignment.

`channelDelta` reads **byte** offsets; `comparePair` passed **pixel** indices, and the `* 4` was missing on both arguments. The unit frames are 192×108, whose whole RGBA array is 82,944 bytes, so no pixel index can leave the buffer and **all eleven unit cases passed**. At 1280×720 the pixel indices run to 921,599 against a 3,686,400-byte array: `Uint8Array` returns `undefined` past its end rather than throwing, `Math.abs(undefined - undefined)` is `NaN`, every comparison in the ternary is false, and the function returned a channel *byte* as a difference. Reintroduced by mutation, it reads `0.9813` of the frame where the correct value is `0.187`.

**This invalidates a number RUN-01 published.** RUN-01 read `changed = 1.0000` as its own estimator failing and built reasoning on it ("a correct alignment leaves smooth dusk gradients well under 8/255, so a true 100%-changed reading is not reachable") — reasoning from the number rather than checking it. RUN-01's *other* diagnosis stands: the 30–35 px gesture against a ±12 px search was a real estimator failure, demonstrated independently by a ±80 px hand search and a monotone flat cost curve, neither of which touches `channelDelta`. The two findings are separate and the record now says so in `docs/learning/defect-register.md`, in `gate-proofs.md`, and in a correction block at the head of both copies of `RUN-01-REPORT.md`.

`crawl` is unaffected: it is `countUnexplained`, which never calls `channelDelta`, so RUN-01's crawl figures and their reading as an upper bound survive.

The generalisable part, which is what the register entry is for: **a missing unit conversion that every unit fixture in the repo is structurally unable to reach, because their dimensions are too small to index out of bounds.** The gate that catches it has to run the predicate at the size the instrument captures.

## The estimator question, settled by measurement rather than arithmetic

The review derived ~5 px of expected picture displacement from 0.0044 rad at ~1.2e3 px/rad and concluded the estimator was under-fitting. Searching the whole shift space by hand on a real pair says otherwise:

| shift px | aligned cost | unexplained |
| --- | --- | --- |
| 0,0 | 6.12 | 1.85e-2 |
| **0,1** | **5.73** | 2.22e-2 |
| 0,2 | 6.14 | 2.59e-2 |
| 0,5 | 9.28 | 3.37e-2 |
| 0,8 | 10.89 | 3.84e-2 |

The estimator's answer is the global minimum of its own cost and the cost rises monotonically in every direction from it. `unexplainedFraction` is likewise minimised at (0,0)–(0,1).

The rigid-scene arithmetic and the measurement disagree because the camera is **inside** the scene: a surface at 45 m would move 5.4 px, the crossing pavement under the camera moves more, the far facades less, so the global optimum lands on the dominant depth layer rather than on the rigid prediction. That residual is parallax across depth plus sub-pixel resampling, and it is exactly what the judge's docstring says lands in `crawl` by construction. So `changed ≈ 0.20` beside `crawl ≈ 1.3e-3` is not a contradiction: `changed` counts every edge that moved by a fraction of a pixel, `crawl` counts only hard local features that *failed to survive* the shift. Two percent of the frame is that.

## The bar: provisional, and why the data cannot calibrate it

Worst real pair **1.351e-3 per frame against the shipped 0.005 — 3.7× under it.** Two independent captures of the same pose (ten `orbit` pairs, eleven `ascent` pairs) put their worst pairs within 2.4% of each other, which says the number is repeatable and is a property of the picture.

It is still not calibrated, and the reason is a scale mismatch: the synthetic null moves the picture ~3 px a frame and reads 1.2e-4–1.6e-3 per frame, while the real lane moves ~0.7 px a frame and reads 1.0e-3–1.35e-3. The null band is a function of displacement, so the synthetic null is not this instrument's noise floor at this gesture speed, and reading the real figure against it would compare two regimes. A real-scene null at the real motion scale — the same poses rendered twice, or a known defect injected into a real pair — does not exist in this lane's scope. Tuning the bar from the synthetic controls would be tuning it to the easier population, which is what the first version's own docstring warns against.

**Decision: `0.005` stands as a provisional bound**, with the new record as an upper bound rather than a threshold.

**A defect in the bar's own shape is carried rather than fixed.** The bar is per rendered frame and a pair's bound is `bar × span`, so a *slower screenshot makes the bound looser*: the same content is allowed 0.115 of the frame at a 23-frame span and 0.030 at RUN-01's 6-frame span. A longer span should make alignment better, not license more residual. It also couples the unit cases to the fixture's span: at a 12-frame synthetic span the positive control reads 0.022 and falls below its own 0.088 bound, so the crawl case stops firing and the suite reports that as a pass. The fixture span is pinned at the 5 frames those controls were measured at and the coupling is recorded in `test/flicker-frames.ts`. The fix direction is to bound the pair's `unexplainedFraction` directly instead of a per-frame rate.

## What I saw in the frames

Worst orbit pair `09→10` (`orbit-09.png` `bb730dec…`, `orbit-10.png` `c77144af…`), at 1280×720 native and in 3× nearest-neighbour crops, plus a signed difference map after the estimator's (0,2) shift.

- The view moves and nothing else does. In the 3× crop of the crossing the zebra stripes, the yellow lane lines, the paving grid and the shopfront lettering are the same features displaced ~2 px; stripe counts either side of the seam are unchanged and no stripe appears or disappears.
- The difference map is the fingerprint of sub-pixel misalignment, not flicker: paired yellow/blue fringing along every edge, widest on the near crossing and the tree and narrowest on the far facades — the parallax a single global translation cannot model. No speckle away from edges, no feature present in one frame and absent in the other.
- The tree is the strongest residual and every leaf is the same leaf, fringed on one side: one object from a slightly different angle, not a texture that resampled.
- Caveat: the review tool downscales a 1280×720 frame to about 1500 px, so the side-by-side is a preview. Only the 3× crops (900×600) and the 2560×1436 difference map carry these claims. RUN-01 was caught by exactly this and recorded it; it was not repeated.
- What I did not see: hard local features appearing and disappearing on alternate frames, bloom or SSAO thresholds flipping, a shader's stochastic term resampling, speckle that is not at an edge.

## Bounds carried

- **A pair spans 20.5–23 rendered frames against the criterion's `cadenceFrames: 2`.** Anything appearing and disappearing inside one frame, or alternating on alternate frames, is invisible. A clean crawl figure at a 22-frame gap does not establish "holds still" at the criterion's own cadence, and nothing else in the plan can measure that today. The assessed way out — a second mode that grabs the frame in-page on `requestAnimationFrame` with `drawImage` into a 2D canvas, ~1–3 ms and 3.7 MB a frame against ~250 ms and ~31 rendered frames of motion for a screenshot — is viable, meets the harness rule because reading the canvas is a read, and becomes its own bounded lane.
- **`ascent`'s dolly no longer moves the distance inside one run.** `distanceM` is 44.9999996519545 on all twelve frames: the wheel tick is spaced every sixteenth gesture after the pace was cut, and a 5-second run does not reach it. RUN-01's 45.0 → 41.0 m dolly is gone. The tick spacing needs to come back down, with its own run behind it.
- **The bar is not calibrated** and **its per-frame form is backwards**, both above.
- **One rigid translation cannot model rotation, dolly or parallax**, so `crawl` remains an upper bound; the parallax share is now ~2–3% of the frame rather than most of it.
- **The recorded pose is a midpoint, which is a model** — it removes a bias of half a shutter and cannot remove the shutter's own width.
- **No review.** This lane's diff has not had an independent read, and the `channelDelta` defect is the argument for one: it was live in `main`, every unit case passed it, and it was found by a reader asking why two numbers disagreed rather than by any gate.

## Gates

In the worktree `artifacts/flicker/wt` on `2bd5bba` (the commit before the docs): build **0** (bundle byte-identical to `main`, `index-DRmtpVMl.js`); typecheck **0**; `npm test` **521/523**; visual **0** (certificate `422c37617ddd0cd7`, 44 frames, three lifecycle records, on the RTX 4090 at driver 616.64); audit **0**.

**The visual gate moved nothing under `dist/`**: four files, identical paths and sizes before and after, and `index-DRmtpVMl.js` still hashes `C890299CE2547882710989B4A3337BA106A1C922AFFE9951EE96DF3CB708444F` — the same bundle hash RUN-01 recorded. So no frame re-inspection is needed on this lane's account.

**The two unit failures are a finding, not this lane's.** `test/paint-support.test.ts` refuses a changed `data/scene/roads.mesh` against its Review 10 pin (`3fe126cd675949daf4b337b890c99478c730a4f956c7f4241e7fe883cf967490` → `0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc`) and its census case reports the same difference. I verified this is not my diff by checking out unmodified `HEAD` with my files moved aside and re-running: the same two fail. The cause is the F1 terrain-cap batch writing `roads.mesh` without re-binding the pin in the same change, so `paint-support` is red on the post-batch scene until the pin is re-bound deliberately — which is exactly what that test is for: the paint regression inputs are pinned and reviewed rather than silently inherited.

## One correction worth carrying forward

The report's tables were first written from a run taken at ~21:00 while the F1 batch was mid-rebuild. They were **superseded wholesale** by the final-scene run rather than amended, and the earlier values are not left in the report: the two scenes differed by under 2% on `crawl` and not at all in conclusion, but a reader who saw both would otherwise read the difference as a change in the instrument. The general point is the one `AGENTS.md` already makes about A/B arms: the tree has to hold still, and a measurement taken against a moving input is a measurement of the movement.
