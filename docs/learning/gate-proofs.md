# Gate proofs

A gate that has never been made to go red is not yet a gate. Each entry below names the gate, the mutation that broke it, the failure the mutation produced, and the commit the gate landed in.

There is no `lessons.md` in this repo yet. Phase 0's findings became gates and repo rules in the same commit that learned them, so nothing was queued waiting for a gate. Entries here still stand on their own: they are what proves each gate can fail.

## The visual gate catches a camera that does not move

**Gate:** `npm run visual` — `OrbitDriver.orbitTo` in `tools/visual/orbit.ts`, plus the pairwise azimuth and signature-distance assertions in `tools/visual/sweep.spec.ts`.

**Landed:** Phase 0, 2026-09-06.

**Mutation:** `controls.enableRotate = false` in `src/render/camera.ts`, so drags on the canvas no longer rotate the camera. Nothing else changed.

**Failure:**

```
Error: The controls would not reach azimuth 0.000 rad, polar 1.470 rad after 8 corrective drags.
They stopped at azimuth 0.785, polar 1.068. If the polar angle is pinned, the requested elevation
is outside the controls' own clamp.
```

Exit status 1.

**Why this one matters most.** This is the mutation a harness that assigns the camera pose would pass. Setting `camera.position` still moves the camera with `enableRotate` off, so such a harness would capture twelve correct-looking frames and report the scene as fine while every drag in the app did nothing. The gate caught it because the camera moves only through synthesised pointer input.

The zoom in the same run still reached 115 m, which is right: the mutation disabled rotation and not dolly, and the gate failed on exactly the axis that broke.

## The visual gate catches a frame that did not render

**Gate:** `npm run visual` — the `luminanceSpread` and `distinctColours` floors in `tools/visual/shots.ts`, measured off the saved PNG by `tools/visual/png.ts`.

**Landed:** Phase 0, 2026-09-06.

**Mutation:** the five `scene.add(...)` calls in `src/app.ts` wrapped in `if (false)`, so the renderer draws its clear colour and nothing else. The loop still runs and still counts frames.

**Failure:**

```
Error: ...\artifacts\visual\street-az000.png is uniformly flat (luminance spread 2.84),
which is what a frame that did not render looks like
Expected: > 6
Received: 2.8374693096274726
```

Exit status 1.

**Bound.** The empty scene measured 2.84 rather than 0 because the attribution overlay is still drawn over it. Real frames measured 17.98 at the worst. The floor of 6 sits between those two numbers, so it separates "rendered" from "did not render" and nothing finer. It would not notice a frame that rendered the wrong thing.

## The visual gate reports a boot failure instead of a timeout

**Gate:** `npm run visual` — `OrbitDriver.waitForFirstFrame` in `tools/visual/orbit.ts`, reading the `#boot-error` element and the bridge's `error` field.

**Landed:** Phase 0, 2026-09-06.

**Mutation:** the canvas in `index.html` renamed from `id="scene"` to `id="scene-RED-GATE-PROOF"`, so the app has nowhere to draw.

**Failure:**

```
Error: The app reported a boot failure on the page:
The scene did not start.

No <canvas id="scene"> is in the document, so there is nowhere to draw. index.html must contain it.
```

Exit status 1, in seconds rather than at the ten-minute test timeout.

**What it proves.** A harness that only waits for a bridge that never appears reports "did not run" as a timeout, and a timeout says nothing about which of a dozen causes produced it. This path carries the app's own message out to the test report.

## Not yet proved red

The WebGL-unavailable path in `createRenderer` and `waitForFirstFrame` has not been made to fire. Forcing headless Chromium to refuse a context without also breaking the page some other way needs a launch-flag combination that was not worth chasing in Phase 0. Its message is written and its code path is reachable, but nobody has watched it happen.
