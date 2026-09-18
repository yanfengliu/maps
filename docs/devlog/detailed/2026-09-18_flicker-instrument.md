# The flicker instrument: consecutive frames of a camera that never stops moving

2026-09-18. Branch `flicker/lane` off `9795fc4`, worktree `artifacts/flicker/wt`. Not merged: the coordinator lands it.

**What the first real run's numbers are for.** The bar in `tools/flicker/judge.ts` is `0.005` of the frame per rendered frame, and it was chosen from two synthetic controls rather than from this renderer. Whatever the first run measures should be read against those controls and then used to set the bar, in that order. Nothing else in this lane is waiting on a decision.

## What was missing

The deliverable's dusk criterion is that the preset renders with ACES tone mapping, bloom, SSAO and TAA "and holds still - no flicker or crawl over a moving sequence". Two halves, and only one had ever been judged.

The first half is answered by `tools/post-chain/`: `probe.spec.ts` asks whether the accumulator engages and `motion.spec.ts` asks whether it smears. Both are measured on the accumulating path, at a camera that has stopped.

The second half is about what changes *between* two frames, and two facts made it unaskable:

1. **TAA cannot accumulate while the camera moves, in any run.** `src/app.ts` feeds `cameraStill` into `post.setStill` and `post.ts` resets the sample index, so every moving frame is a fresh, un-accumulated picture. Whatever flicker or crawl a moving sequence shows is not the accumulator's smear; it is the post chain's own frame-to-frame behaviour.
2. **No lane had ever captured two consecutive rendered frames of a moving camera.** Every capture in the repository deliberately does the opposite: `OrbitDriver.settle` waits for three quiet intervals and twelve advanced frames before the shutter opens, because a frame taken mid-glide is not reproducible run to run. The existing flythrough frames are 285-2,202 ms and 39-119 rendered frames apart - two orders of magnitude too coarse to see anything that changes from one frame to the next.

So the instrument had to be the inverse of every other lane: keep the camera moving, and judge the pair.

## What was built

**`tools/flicker/judge.ts`** - the pure judge. Frames arrive as decoded pixels beside their metadata, so a unit case drives every predicate without a browser.

- `changedFraction`: the fraction of pixels whose largest per-channel difference exceeds 8 of 255.
- `digestDiffers`: whether the two PNGs are different files at all.
- `cameraTravelM`, `cameraRotationRad`, `targetTravelM`: what the controls did between the two shots, read from the frozen bridge on either side of each capture.
- `crawl`: the crawl indicator.
- `estimatedShift`: the rigid translation the estimator found and took out.

Three failure classes, each named:

1. **A pair that is byte-identical while the camera moved** - the criterion's opposite, a stale buffer photographed again. Failed by name with the pair, the digest, the travel and the rotation.
2. **A stalled render counter** - `frame.frameCountAfter <= previous.frameCountAfter`. A stopped loop makes every later frame a stale buffer, so the whole record goes with it.
3. **The crawl bar exceeded** - `crawl > crawlFractionPerFrame * frameGap`.

Plus refusals rather than passes: an empty record, a record shorter than 8 frames, frames at two different sizes, and a record whose camera never moved above 0.5 mm.

### The crawl indicator, and how it was arrived at

The first design counted pixels whose luminance changed by more than a display level after the estimated shift, at pixels that were a hard local feature. It failed its own unit case, and the reason is the reason the current design exists: a camera translation moves a picture *without changing it*, but only if the alignment is exact. The estimator was a cell-mean search on a 32x32 grid, which on a 1280x720 frame quantises the answer to 40 px; a 40 px misalignment leaves every hard feature of a synthetic field 40 px from where it was, and the indicator then reads the quantisation rather than the picture.

Two changes fixed it, and both are the instrument rather than the bar:

- **A two-stage estimator.** A coarse cell-mean pass finds the neighbourhood; a second pass searches every whole-pixel offset in a small window around it, scored on mean absolute luminance difference over every fourth pixel. The unit case now asserts `estimatedShift` equals the translation the frames were built with, which is the strongest statement in the file: the judge's first synthetic field was a smooth ramp with a level of noise, from which a 6 px shift scored as well as the true 3 px one. The field is now three scales of hash noise plus hard vertical and horizontal edges, and the assertion is what stops a return to a field the estimator can only align by accident.
- **Persistence instead of residual.** After the shift, the judge asks whether a hard local feature is still there. A feature that arrives or leaves is detail the motion does not explain; a feature that moved with the picture is not. Counting luminance residuals counts every feature that moved by less than a whole pixel, which is every feature in a slow crawl.

### The bar, and its two controls

`CRAWL_FRACTION_PER_FRAME = 0.005` of the frame's pixels per rendered frame, and a pair's bound is that times its own measured frame gap.

- **Negative control**: ten frames of the synthetic field, each a pure 3 px / 1 px translation of the one before - **1.2e-4 to 1.6e-3** per frame.
- **Positive control**: the same movement with the detail collapsed on alternate frames - **3.7e-2 to 5.2e-2**.

The bar is 3.1x above the worst the pure shift reached and 7.4x below the least the crawl reached, and the unit case asserts the *separation* (more than tenfold) rather than only the two verdicts. The bar is deliberately loose and is not calibrated to this scene: a rendered frame carries noise, anti-aliasing and sub-pixel motion the synthetic field has none of, so the first real run's numbers are what should set it.

## What the capture lane does

`tools/flicker/capture.spec.ts`, its own `tools/flicker/playwright.config.ts` on port 4324, `npm run visual:flicker`, writing to its own ignored `artifacts/flicker/` through the new `flicker-iteration` entry in `tools/visual/lane.ts`.

- Drives the canonical dusk crossing pose: `/?time=dusk&seed=9137&style=satellite`, `HERO_POSES.crossing` at `HERO_AZIMUTH`, the same framing the certified frames use, so the opening frame is one a reviewer already knows.
- **Never settles.** `tools/flicker/motion.ts` walks a continuous pointer path - one short press-move-release gesture per capture, around a small circle at the centre of the canvas - so the camera is always mid-motion when the shutter opens. Nothing assigns camera state, calls a controls setter or calls the render function; `OrbitDriver` is reused rather than reimplemented, and the movement is synthesised pointer input through `page.mouse`.
- Records per frame: the render counter before and after the shutter, the simulation step, the camera pose, the distance and the PNG's SHA-256, plus a per-frame sample log of the counter and pose.
- Two patterns: `orbit` (required) and `ascent` (orbit plus interleaved wheel ticks).
- Hands the frames to the judge, writes `manifest-<pattern>.json` and `flicker-report.json`, and fails with the judge's own failure list.

`RenderStatus` is unchanged, and that is a decision rather than an omission. The first version of this lane added `simulatedSeconds` to it - a read-only observation of `RenderLoop`'s own clock - and the coordinator refused it for the right reason: this lane is `tools/` and `test/` only, and any `src/` change moves `dist`, which strands the certificate `685d0eaeb5669287` issued at `a7f865d`. The check that closed the question was to build the pre-branch and post-branch trees and compare the emitted bundle: both produce `dist/assets/index-_LQ7yEQN.js` (981,039 bytes, sha256 `a5b9d4146308fea52447fbba8eee0b01bddaaf21d83fae1ae49f0237bb374364e`), so the certificate stays bound and no re-capture is needed. Measured 2026-09-18. Reverting it took one more step: `src/harness/bridge.ts` is now byte-identical to `9795fc4`, which `git diff 9795fc4 -- src/harness/bridge.ts` reports as empty, and the whole diff touches no file under `src/`, `index.html` or `vite.config.ts`.

**So the step index is derived, and the derivation is bounded.** It is `floor(((performance.now() - performance.timeOrigin) / 1000) * 60)`, clamped to the frame counter, because `RenderLoop` advances its fixed step by `stepSeconds` (1/60 s) once per rendered frame of wall time. The obvious substitute - `population().ticks`, which the flythrough lane records - does **not** work here, and this is worth recording because it looks like it should: this lane captures `?agents=`-free on purpose, so a vehicle crossing the frame cannot be counted as a crawl, and with no `?agents=` there is no population at all. `src/app.ts` calls `agents.attach(...)` only when `populationWanted`, and `src/agents/agents.ts` registers `population?.update` against a `population` that stays `null` otherwise, so `status()` returns `emptyPopulationStatus()` and **`ticks` is 0 for the whole run** - a constant dressed as a measurement. The bound on the derived index is stated in the field's own docstring: it is a claim about the clock, not a reading of the loop, so it cannot see a fixed-step clock that stopped while frames kept being drawn, and it is the judge's stalled-render-counter predicate that carries the sequence's aliveness.

## Bounds, stated

- **The cadence is the screenshot's, not the frame's.** A native-resolution screenshot costs about 250 ms here, so about fifteen frames are drawn while the shutter is open and the closest two stills this lane can take are roughly that far apart. The criterion's "a still frame every N rendered frames with N 1-3" is not reachable by a screenshot-based capture, and the instrument does not claim it: the frame counter is read on both sides of every shot, the achieved gap is recorded per pair, and `judgeFlicker` refuses a pair spanning more than 18 rendered frames. `tools/visual/png.ts`-style canvas readback is not available either - `preserveDrawingBuffer` is deliberately off in `src/render/renderer.ts`.
- **It judges the non-accumulating path**, which is the only path a moving camera has.
- **No population.** `?agents=` is absent, as in the appearance sweep, so a car crossing the frame cannot be read as a crawl.
- **The estimator finds one rigid translation.** Rotation, dolly and newly-occluded edges are not explained by it and land in `crawl`. The indicator is an upper bound on crawl, not a measurement of it alone, and `cameraRotationRad` is reported beside it so a reader can see how much the estimator never had a chance to explain.
- **No browser lane was run.** Per the assignment, a sibling lane owns the browser. The capture specification is written and typechecked; the judge and its cases are proved on synthetic records and on the post-chain lane's archived real frames.

## Evidence

- `test/flicker-judge.test.ts`, 11 cases; three mutations each watched red, recorded in `docs/learning/gate-proofs.md` with the exact messages.
- `test/camera-settling.test.ts` gained a case for the new lane's directory, its hardware requirement and its certification refusal.
- The archived-frame case measured the surviving post-chain frames: `rest-a -> motion-07` is 219 rendered frames apart with crawl `2.39e-4`; `motion-07 -> stop-00` is 120 frames apart with crawl `5.05e-4`. Both are far coarser than this lane's cadence, so this is the instrument running over real pixels and not a verdict on the preset.
- Gates: build 0, typecheck 0, `npm test` 0 (70 files, 507 tests), audit 0 (two moderate advisories, below the `--audit-level=high` bar).
- The bundle identity, measured by building two checkouts on this machine on 2026-09-18: `9795fc4` (pre-branch) and the lane's own tree both emit `dist/assets/index-_LQ7yEQN.js`, 981,039 bytes, sha256 `a5b9d4146308fea52447fbba8eee0b01bddaaf21d83fae1ae49f0237bb374364e`.
- **No scratch file was ever committed.** `test/scratch-archive.test.ts`, `test/scratch-calibrate.test.ts` and `test/scratch-pixels.test.ts` existed only inside the working session, were deleted before the first `npm test` run that produced the recorded 507, and `git ls-tree -r HEAD | grep scratch` is empty. Nothing in `test/` is a scratch file in the commit.

## What a first real run needs

1. `npm run build` in the tree the preview server will serve, then `npm run visual:flicker` with the GPU free.
2. Nothing else: the lane starts its own preview server on port 4324 and refuses a software rasteriser by name.
3. For the numbers to be worth interpreting, the run needs the crawl figures read against the two synthetic controls rather than against the archived pairs, and the first run's worst `crawl` is what should set `CRAWL_FRACTION_PER_FRAME` - the `0.005` in the code is a bound with a control on each side, not a measurement of this renderer.
