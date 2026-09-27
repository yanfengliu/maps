# Integrated opening change: independent review

Bound: the four integrated source/test files below against primary HEAD `9d83fa7cb4ef854a05e623e843209581caa93591`, the retained worker red/green logs, four completed and bound actual-initial PNGs personally inspected at original 1280x720 size, and the saved first-overview-zoom browser evidence. Source and focused visual review are complete with no material finding. The whole-square opening is accepted in Satellite and Cartographic at noon and dusk. This is not whole-deliverable, source-fidelity, motion or full-flythrough acceptance.

## Source result

The camera change is exactly the approved initial distance of 1800 m and polar angle 0.50 radians. Azimuth remains pi/4, and `createCameraRig` still targets `(0, GROUND_AT_ORIGIN_M, 0)`, with the existing 15.2 m datum. The default remains within the unchanged 25-2000 m controls range. Near/far planes, field of view, damping, rest behavior and input ownership are unchanged.

The existing flythrough needs its starting distance updated because its zoom factors are relative to the app's initial camera. `OPENING_DISTANCE_M` now reads `INITIAL_VIEW.distance`, and `OPENING_AZIMUTH` reads the same pose's unchanged azimuth. The first factor becomes 620/1800; the remaining factors retain their original ladder denominators. All eleven requested overview distances remain `[620, 950, 760, 600, 470, 370, 290, 220, 175, 170, 170]`. The diff changes none of the pan or height targets, later route steps or simulation behavior. The driver dispatches large zoom factors as multiple wheel ticks; no newly exceeded fixed one-tick cap was found by source inspection. This is not a new browser flythrough validation.

The new route test creates the actual camera rig, reads its controls distance, and applies the actual plan's factors against a separate literal reviewed-distance array. It does not derive its expected sequence from the plan it checks. The existing camera-rest test's new 1800 m expectation matches the approved product behavior.

The worker's retained stale-opening control changes the plan's shared-distance read back to 620 while keeping the actual camera at 1800. The new test fails at the first route value: actual 1800.0000000000002 versus expected 620; the existing swing test passes. The restored run passes four focused files and all 28 cases. I independently rehashed both logs against the handoff manifest; I did not rerun tests or the mutation. The log supports the stated CPU arithmetic bound, not wheel delivery or complete flythrough behavior.

Importing the pose from `camera.ts` introduces the camera module and its dependencies into the plan's import closure. Inspection found no module-top-level DOM access in `camera.ts`, its local imports or OrbitControls' imported module setup. DOM handling occurs on control construction/connection. The plan's observed consumers use Playwright or Vitest, and the retained green tests import and construct the rig with an EventTarget stub in the configured Node environment. No DOM import regression is established. This is not a claim that every hypothetical bare-Node `.ts` entry point is supported.

## Exact source and supporting evidence

| File | SHA-256 |
| --- | --- |
| `src/render/camera.ts` | `0529a16ff037d98f9305f6523b8adc649d7d9191b19309123b687f138b6ceec1` |
| `tools/flythrough/plan.ts` | `79704b3d0c73b4ff1133a8f6a1b76a8ed53643084fd386a8aed02b70c044292d` |
| `test/camera-rest.test.ts` | `2aa540b9a3b53aae5f283e0b2192120709fd768593413252540894f8100886d1` |
| `test/flythrough-plan.test.ts` | `445ca25c15fcd5ee971de000edc01bbca39361080b8989126f09b27050faa28d` |

All four hashes match root's `artifacts/opening-integration-20260927/root-integration.json`. `reviewed-source.patch` records the inspected diff, and `source-inputs.json` records the initial hash check. Worker evidence is under `C:/Users/38909/.codex/worktrees/shibuya-quality/maps/artifacts/opening-implementation-20260927/`: stale-control log SHA-256 `64bfaf81f9d289d26838b26046a127b695a67317c6fd10342e9fb0a302c39569`; focused green log `f4c60a9895df195b73c2ab8552691a5737ba526e04ff9a2f9da3cfba5b09e5b0`.

## Final four-image visual acceptance

The completed capture uses literal `/` and `/?time=noon` initial loads. It captures Satellite before camera/style input and selects Cartographic through the actual dropdown, by pointer at dusk and keyboard at noon. The source issues no camera input before any of the four images. The manifest reports passed=true, failure=null, no errors, four records and the two expected dropdown interactions. All four frames report distance 1800.0000000000002 m, polar 0.5000000000000001, azimuth 0.7853981633974482 and target approximately `(0,15.2,0)`, with zero recorded screenshot pose drift. I read the current probe and its v2 diff rather than inferring this from filenames.

Exactly four new `view_image(detail="original")` calls were made, one per PNG, with each observation saved immediately to `native-inspection-ledger.jsonl`. No contact sheet, resized proxy or additional image was inspected for this follow-up. Pre/post hashes match, and all four source hashes remained unchanged through this review.

All four views clearly show the whole diamond-shaped square, with all corners separated from the viewport boundary. Foreground towers no longer hide the model, the connected street arrangement remains available, and height variation gives the miniature city depth. The style panel and attribution do not obscure it. The inspected extent is approximately x=365-914, y=151-653 in each frame. This is visibly a coherent whole-model opening and materially improves the prior tower-obstructed default.

The selected tradeoff remains: the crossing is a tiny central junction, not a strong recognizable street-level anchor, and broad margins leave the city relatively small. Satellite dusk is dark; Cartographic dusk has muted local street contrast. Noon makes building massing easier to read in both styles. These limits do not block this bounded whole-square opening change. They do prevent describing it as a complete solution to the earlier street-anchor finding or as supreme visual quality. No additional pose or UI change is required by this review.

| Actual-initial file | SHA-256 | Native inspection result |
| --- | --- | --- |
| `dusk-satellite-opening.png` | `9df838f7f553c0ab3d6c14050bea1b12d0e6801114aa17cb7ef2d1d672a3c4ec` | Complete square, no foreground obstruction; dark model and tiny crossing remain disclosed. |
| `dusk-cartographic-opening.png` | `2940bb90188a21114e0c3a587cca2ee8ebc3cfc147e165bc0b76539efa765990` | Same coherent footprint after pointer style switch; muted streets, readable massing. |
| `noon-satellite-opening.png` | `d07890351b5512fc1b1079217d574dc9fc7a6e600df2b9fe4e71f0224c4eac7a` | Brighter street pattern and towers; full footprint and unobstructed framing preserved. |
| `noon-cartographic-opening.png` | `e271b959ab7e4fbe38ad1e39914e1b60c43b6fccbf32f63636c6eb3177fc457e` | Clear model boundary and vertical scale after keyboard style switch; no material composition finding. |

The files live under `artifacts/opening-implementation-20260927/run-01/`. I independently rehashed the completed receipt as `71f9bf760226841313fc07fe7eddf5a9f32d40ec2790a5ae8326c01e4516ef7c`, manifest as `03184a4542f3d1f259b0f4028c2504c8cb3aaba31167eee66e6f1d5df3319324`, and owner receipt as `4d250de23fee5f950d479417c0e4c32f136a5d6648433f69291eb014d9bb9aaf`. Full served-scene/build/harness/GPU binding remains root's verification. `image-inputs.json`, `capture-binding-hashes.json`, `reviewed-capture-facts.json` and `final-input-recheck.json` retain the independent subset checks.

## Bounded real-input consumer check

The v2 probe adds its consumer check after all four images, using the actual `FlythroughDriver` and the first overview step's zoom factor. It calls `step({zoom: first.zoom}, null)`, deliberately excluding the other route components. The manifest records the final image after frame 221, the zoom's before-state at frame 224, and its after-state at frame 265. This is consistent with the inspected source order and does not contaminate the initial-image claim.

The saved evidence reports 1800.0000000000002 m to 620.0000127874778 m through nine dispatched wheel events over 41 advancing frames. Target is unchanged; rotate and pan results are zero, turn and stand are null, and azimuth/polar differences are at floating-point precision. This is useful end-to-end evidence that the changed first relative zoom is delivered through the actual wheel path. It validates neither the full first overview step nor the remaining route, height/pan/turn behavior, population or motion appearance. No new browser or test was run by this reviewer.

## Final review and resource boundary

No material source or opening-composition finding remains in this scope. The integration owner retains the five gates, final standard 44-frame review, commit/main integration and whole-deliverable acceptance. This report makes no acceptance claim for source-photo fidelity, facade treatment, corridor identity, rail treatment, motion or population.

Only this review's artifact directory was written. No test, gate, browser, server or GPU process was launched. The final reviewer process inventory was attempted but denied access; no reviewer-owned browser/GUI/server was created. The rehashed capture-owner receipt has empty retainedSurvivors, unadmittedLive, scopedLive and portListeners arrays, and the supplied independent cleanup record reports retained/scoped/listeners=0. Capture process cleanup remains that owner's evidence. Preserve this report and ledgers for root's exact authored-review promotion.
