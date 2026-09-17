# The dusk post chain's TAA could never engage, because the camera could never stop

Session: 2026-09-16. Landing: main `1090b29`, `src/render/controls-rest.ts` and `src/render/camera.ts`, off the post-chain lane's `657bb83`.

## What was believed, and what was true

`artifacts/gate-timing/REPORT.md` had recorded `taaAccumulating: false, taaSamples: 0` on all eight hero frames of the 44-frame capture, on both renderers, and the plan had carried that as the clearest case of a criterion whose mechanism is in the code and absent from the pixels. The natural reading was that something was wrong with the post chain: a pass missing, a composer misconfigured, a flag not plumbed. The plan itself said so in as many words.

It was not the post chain. `src/app.ts` decides whether the camera holds still by comparing the sixteen elements of `camera.matrixWorld` against `1e-7`, and that answer is what gates the accumulator. `OrbitControls` damping is a first-order lag: every `update()` applies `dampingFactor` of the residual and multiplies the remainder by `1 - dampingFactor`, so the residual decays by 0.92 a frame and reaches zero only when the arithmetic runs out of significand. **A damped camera therefore never satisfies a `1e-7` stillness test**, and the accumulator waits for a state the app cannot reach.

Measured at the hero crossing pose on the RTX 4090: the shutter reads the accumulator at frame 378, and at that moment the camera was still gliding at 8.96e-5 m a frame — 0.0014 of a pixel, which is to say the picture was already still and the predicate still said no. The glide crossed the bar 200 frames after the last pointer input, 82 frames after the shutter.

## The fix, and the fix that was refused

`src/render/controls-rest.ts` ends the glide when everything the residual still holds could not move the picture by one pixel at the pivot distance, by stepping the control once with damping off so both residuals are zeroed outright. The stillness bar is unchanged: the camera now reaches the fixed point that bar was always asking for.

Raising the `1e-7` bar was the obvious alternative and was refused with a reason worth keeping: it makes the predicate agree with the damping instead of making the damping stop, and it stays a race against the harness's shutter, which is a different frame on every renderer.

Measured at the shutter on the same lane, sequence and build inputs: `false / 0` becomes `true / 32`, and the first accumulating frame moves from 460 to 185.

## What the check would catch, and how it was made to fail

`test/camera-rest.test.ts` drives real `OrbitControls` through its real pointer handlers and requires the app's own witness to turn true within 120 frames and stay true for 200 more. Removing the `installControlRest` call and rebuilding produces:

```
the camera was still moving after 120 frames, so the app's own stillness witness — the one
the post chain's temporal accumulation reads — never turns true and no captured frame can
carry a single accumulated sample.: expected -1 to be greater than 0
```

`tools/post-chain/motion.spec.ts` is the rendered half: fifteen real pointer drags and then the stop, every frame captured at 1280x720, asserting from the PNG bytes that a held camera draws two byte-identical frames 500 ms apart and that across 711 frames **zero** accumulated samples came from more than one camera pose. That second assertion is the anti-smear property — temporal accumulation blending two camera poses into one frame — measured rather than read off the code, and it could not have been written before this fix, because the camera never rested.

## Numbers that moved

- Accumulator at the shutter: `false / 0` → `true / 32`.
- First accumulating frame: 460 → 185, against a shutter at 378.
- Camera glide at the shutter: 8.96e-5 m a frame, 0.0014 px.
- Tests: 384 → 390 across 53 → 54 files.
- Slowest single-frame motion across the glide-to-rest transition: worst mean difference 0.42/255 between consecutive frames, so the glide ends without a step.

## What is not established

The fix is measured on the hardware renderer only. The 44-frame verdict sweep runs on SwiftShader, and the predicate is frame-counted so the arithmetic transfers — which is an argument, not a measurement, and the post-chain lane said so itself rather than letting it pass as one. In a populated run `src/app.ts` keeps the accumulator off whenever agents are moving, so TAA does not reach a populated frame at all; that is code, not a measurement, and it means the criterion's "holds still over a moving sequence" is satisfied for the static sweep and unaddressed for the flythrough. There is no no-TAA pixel A/B, because `options.post` has no URL switch to build one from. No independent review of this change.

One number in the merged code comments is loose and is corrected here: `src/render/controls-rest.ts` and `test/camera-rest.test.ts` say the glide crosses the bar "460 frames after the last pointer input". 460 is the frame index; the count from the last pointer input is 200. Every operative number is unaffected.

## Why this one is worth remembering

The criterion failed for a whole capture cycle and nobody could fix it by looking at the post chain, because the defect was one module upstream of the thing the criterion names. The consumer was correct; the producer could not reach the state the consumer was waiting for. A gate that had asserted the accumulator would have caught it in the first capture; the gate asserted everything except the one number the criterion was about.
