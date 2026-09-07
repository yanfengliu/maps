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

## The visual gate refuses to photograph another app on the preview port

**Gate:** `npm run visual` — `OrbitDriver.assertServingThisApp` in `tools/visual/orbit.ts`, comparing the page's `app-id` meta tag against the one `index.html` carries. It runs at the top of `waitForFirstFrame`, before anything is waited on or captured.

**Landed:** Phase 0, 2026-09-06, in `74d0df18f79cac9cd392c840f27f181482857cfd`. Proved red 2026-09-06 from `c35ae775e51474e922a6fbee1c09d218c72a1e05`.

**Mutation:** the two other fixes undone, and nothing else. `preview.port` in `vite.config.ts` from 4319 back to Vite's 4173 default, `PREVIEW_URL` in `playwright.config.ts` from `http://127.0.0.1:4319` back to `http://127.0.0.1:4173`, and `reuseExistingServer` from `false` back to `true`. Phase 0 had it as `!CI` rather than a literal `true`; with `CI` unset those are the same value, and this ran with `CI` unset. The check itself was left alone, because it is the thing under test.

No decoy app was needed and none was written. aoe2's `vite preview` was live on 4173 while this ran — the same sibling app the gate photographed the first time — so this is the original two-part failure and not a staged stand-in for it: the fleet's shared default port, plus a Playwright that attaches to whatever answers on it.

**Failure:**

```
Error: Port 4173 is serving a different app, so this run would photograph that one.
http://127.0.0.1:4173/ carries meta app-id absent and the title "AoE2 Prototype".
This gate captures only a page whose <meta name="app-id"> is "maps-shibuya-1km".
Free port 4173, or point the gate at the port this app previews on, and run it again.
```

Exit status 1, after 462 ms, with `artifacts/visual/` left empty.

**What it proves.** Playwright reused aoe2's server without a word, exactly as it did in Phase 0, and the run refused anyway. The gain is in what the failure says and when. Phase 0's run sat for ten minutes waiting for a bridge that page was never going to publish and then reported a timeout, which says nothing about which of a dozen causes produced it; this one stops in under a second and names the app it found.

**Bound.** The check compares one string, so it separates another app from this app and nothing finer. A stale build of *this* app answering on the port carries the same `app-id` and sails through. `reuseExistingServer: false` is what covers that case, and it has not been proved red.

**A claim this run did not support.** `docs/devlog/summary.md` says the first sweep "photographed a sibling repo's app", which reads as twelve captured frames and a green run. The detailed entry for the same day records what actually happened: a ten-minute wait for `window.__mapsHarness` and a timeout, with no frames written. This run matches the detailed account — `artifacts/visual/` was empty when it failed. A wrong-app run has never produced a passing sweep here, and nothing in this repo shows that it could.

## Not yet proved red

Three failure paths are written and reachable and have never been watched to fire. They are code, not evidence, and a later phase that relies on one should make it go red first.

- **WebGL unavailable** — `createRenderer` and `waitForFirstFrame`. Forcing headless Chromium to refuse a context without also breaking the page some other way needs a launch-flag combination that was not worth chasing in Phase 0.
- **The render loop stopping mid-sweep** — the stalled-frame-count branch in `OrbitDriver.settle`. Needs the loop to die after the first frame, which no natural failure in Phase 0 produced.
- **The camera never settling** — the poll-limit branch in `OrbitDriver.settle`. Would need damping turned off or a control that oscillates.
