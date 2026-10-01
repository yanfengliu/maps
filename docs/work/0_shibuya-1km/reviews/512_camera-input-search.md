# 512 — independent camera input search

Date: 2026-10-01. Owner: control_input512. Bound: source and retained-receipt reading at base `c5722cb6f4277741c25f50816f77b7572989f607`; no native dispatch, browser, server, GPU, test, build, source edit or worktree creation. Root owns integration and the one native lease. The current tree contains unrelated uncommitted candidates; none was changed. The assigned `src/render/camera-rig.ts` does not exist; the actual rig is `src/render/camera.ts`.

**Held WASD is a supported independent event path with an exact source mapping. It is a viable finite probe, not a proved way to reach the prescribed facade target.** It bypasses FlythroughDriver's pointer calibration and drift compensation, while still entering the same shipping OrbitControls pan primitive and damping. It therefore can distinguish a pointer/calibration problem from a problem shared by panning or settling. It cannot by itself prove the cause of506 or replace any paired appearance view.

The510 contract remains binding: first Satellite/noon ready state, first recipe target, unchanged angle0.001rad, targetXZ0.5m, targetY0.001m and distance-fraction0.001 checks; all eight fixed views, one seeded view and six sparse motion samples per arm remain required. Preserve the four earlier failures. No CDP/body observer, pose setter, dropped pan, changed treatment/input byte or readiness-as-appearance claim is admitted.

## What the input actually does

`camera.ts:65–84` sets targetY15.2m, damping0.08, distance limits25m to the unchanged world maximum, screenSpacePanning=false and middle-button rotation, then installs control-rest followed by camera-keyboard. `camera-keyboard.ts:34–69` accepts unmodified native W/A/S/D key events only while body/canvas has focus and controls/pan are enabled. Pointerdown on the canvas restores focus. Its frame wrapper queues `_pan` once for a positive finite frame delta; key repeat is a set membership operation, not added distance. A keyup, blur, UI focus or hidden document clears held input. The harness must use `page.keyboard.down/up`, never call `_pan`, dispatch DOM events in evaluate or focus the canvas through a setter.

For azimuth theta, define camera-right `R=(cos(theta),0,-sin(theta))` and ground-forward `F=(-sin(theta),0,-cos(theta))`. Native W moves along F, S along -F, D along R and A along -R. At radius r and FOV55degrees the fully settled displacement queued by held input is `0.6*r*tan(27.5degrees)*sum(min(frameDelta,0.25))*direction`, with diagonal direction normalized. The sum contains only frames for which the key was held; it is not exactly the requested wall-clock pulse duration. `OrbitControls.js:865–910` supplies those signs and the perspective scale. `loop.ts:138` also caps frame delta at0.25s. `app.ts:193` passes the real frame delta to the controls.

Pan adds the same horizontal displacement to camera and target; source math preserves targetY, radius and angles. Damping makes the immediate displacement incomplete. `controls-rest.ts:157–190` flushes the remaining subpixel residual through the existing control update. Every pulse therefore needs an immediate observation and the existing `orbit.settle('preservation')` before its displacement is used. There is no target clamp inside this AOI: upstream defaults are minTargetRadius0 and maxTargetRadiusInfinity.

At the first frozen pose theta0.1182403756144717, r89.0648623693917, R is `(0.9930177473,0,-0.1179650526)` and F is `(-0.1179650526,0,-0.9930177473)`. The full settled speed is27.8185396269m per integrated held second. From the origin, target `(-12.36048587423128,15.2,-72.9958004832977)` decomposes into -3.6632283962m along R and73.9442307213m along F: A for ideal131.6829871ms and W for ideal2658.0917515ms. Those are feed-forward estimates, not accepted native pulse durations.

Other inspected routes offer less separation. Upstream Shift/Ctrl/Meta plus left-button rotation maps to pointer pan, but still uses the same pointer handler and pan map. Arrow-key pan exists upstream only after `listenToKeyEvents`; no shipping call installs that listener. A touch pan would also enter `_pan`, but no already-demonstrated multi-touch driver was found in the scoped files. None is a stronger supported alternative than shipping WASD for this bounded search.

## Concrete retained evidence

Actual506 records `Intended target not reached through controls`, zero originals, no page/request errors, unchanged mounted/build/instrument pins and successful page/context/browser/browserServer/preview/esbuild cleanup. It retains no failed final camera or pan-step receipts, so it cannot establish convergence direction or root cause.

Its actual `run.log` retains a rounded map at89m: X column `(-0.0630,0.0075)` and Y column `(-0.0566,-0.0572)` m/px. The source full-settled columns at the prescribed pose are `(-0.1278902942,0.0151926643)` and `(-0.0151926643,-0.1278902942)`. The logged columns are not orthogonal. This is concrete evidence that the immediate calibration differs from the settled geometric mapping; it does not prove that the difference caused the final refusal. `measurePanMap()` observes immediately between two right drags, while506 settles after each subsequent `step()` and discards its return.

Actual native442 retained all four real120ms key pulses at r420m after its MMB turn. W/A/S each moved17.4866801353m and D moved15.3090440494m. Opposed directions, stable angles/radius and horizontal camera/target motion are visible in those numeric receipts. Equal requested wall duration delivered different travel: this is direct evidence to close the keyboard route against settled poses, not to assume a timed pulse equals its ideal distance. This prior opening is not current prescribed-target success, and I did not inspect its images or make an appearance claim.

## Finite discriminating native probe for root

Use the existing frozen arm/recipe/mounted-file witness and admitted owned cleanup under the same220s native,240s work and300s outer ceilings. Do not overwrite506 evidence or change its frozen files. Root can adapt the capture instrument in its own separately reviewed output while preserving product bytes and the original pair. This report supplies no launch authorization beyond510.

1. At the unchanged baseline Satellite/noon first ready state, retain the separately labelled1280x720 diagnostic before aiming, with same-task read-only camera/epoch/frame/status/style/light/post observations, image digest and renderer/error checks. It is excluded from qualification counts. Apply the existing OrbitDriver angle and distance aim exactly as506 does.
2. Click the canvas centre through real pointer input to establish focus. Read active-element identity and modifier absence; do not set focus in evaluate. Retain the actual before pose. Apply four120ms real W/A/S/D pulses, each released in `finally` and each followed by an immediate observation and preservation settle. Assert nonzero horizontal movement, the signed R/F projection and unchanged recipe angle/radius/targetY bounds. Preserve each receipt before any assertion can throw. The pulses change the target; compute the later goal residual from the actual settled target, never reset it.
3. Allow at most12 correction pulses and60s for the keyboard aim, within the existing outer work deadline. At each settled pose project residual onto the current observed R/F basis, choose the larger absolute component and choose A/D or W/S from its sign. Request `min(800,max(10,1000*abs(component)/speed))` milliseconds using the source speed at the observed radius. Record requested key/duration, down/up times, before camera, immediate released camera, settled camera, frame/epoch/page-clock observations, focus, errors and numeric residuals. Recompute after every settle. End only when the unchanged full `poseRefusals()` passes; otherwise preserve the final residual and refuse. This cap is a probe, not an increase in506's correction allowance or a universal convergence guarantee.
4. A focus-valid pulse with no fresh-frame displacement distinguishes keyboard delivery failure; a wrong signed axis or changedY/angle/radius distinguishes mapping/rig failure; immediate-versus-settled differences disclose damping; correct movement with oscillating/nonshrinking residual discloses pulse-resolution/convergence failure. A passing first pose admits this event route for the remaining unchanged paired captures; it does not qualify their appearance. All held keys and pointer buttons must release before owned closure, including assertion/timeout paths.

The exact remaining gap is native resolution and convergence at the prescribed r89m target. At60Hz the ideal queued keyboard step is0.4636423m, but30Hz gives0.9272847m and the legal0.25s delta cap gives6.9546349m. Source therefore cannot guarantee a0.5m target tolerance. A finer temporary radius is an available later real-wheel option, but is not included in this independent first probe; do not silently combine routes or tune tolerances after a refusal. Even a passing keyboard aim still leaves the full pair, pose matching, sparse-motion checks, original-image inspection and independent appearance verdict open.

## Inspected byte pins

The five camera/control/driver files below match both frozen506 baseline and pilot copies exactly, and `git diff HEAD` shows no change in those five current paths. `src/app.ts` is an unrelated working candidate; only its frame-delta call was read. No gate was run and no task-owned process was launched, so no runtime cleanup was needed for this source-only assignment.

| Input | SHA-256 |
| --- | --- |
|510 contract|`0ca2ed1bae815d6968f866e2d5ceb9f59ced1edbaea5d1b55fd76cd7c524f372`|
|506 native-inspection.json|`db42b8f5be5a25c6c02f2120211a0a171ecae52bcd8df8ebabafb14be7960b52`|
|506 native.mjs|`c5ceb1bd771759aec2f5d85dd725b88730f876a814be6c4f84fa5c2d216b1a1e`|
|506 recipe.json|`bfcabfb2cbb8edd024587c57cc5374b5fefe3502fdbc282f5747d3aebea8b4ad`|
|506 run.log|`d5617b67d83ed43630ec82f6837eafb59e57c44333907e7de3ebcd3619230e48`|
|src/render/camera.ts|`2319a949fcf2a54525f52a3a8e2530a3dab714cf83f5a3ec7a6fe6d590f63ecc`|
|src/render/camera-keyboard.ts|`cf5bccc2f483f5135b68164c88096f9c68dc0be1d78cbb30617dcbe82845aecd`|
|src/render/controls-rest.ts|`df3eb0ce3c6e3a4cc00640c0ced01e8037c6cf8cc9fc224f6cc830be799e9db3`|
|tools/visual/orbit.ts|`65c321bc88098b2bc9e181bddce66d950f5657e006ea1b6e8911595aca10abaa`|
|tools/flythrough/driver.ts|`d97c1951d26b494a01a0a7669565899d6658672a2c462e531611cdb7b21a4b4d`|
|installed OrbitControls.js|`b97879c748170baadeb3fb84cea1ffdf4674e283dc06042f34e2acb95a76042c`|
|src/render/loop.ts|`8750fd5349bb0862e15825a94634226cc3a702a3549eb4f9d2a446ae3d10820a`|
|src/app.ts|`fb7d3be15e020d3b440f00e46272c831eee7857f4d512983e0cf344a25a5da75`|
|test/camera-input.test.ts, inspected not run|`f7ffc5985d45c68cbd4d4f3348d981980d8efcd6a250f5f489248fe349cb6a3c`|
|native442 native.mjs|`ec2dcbcc17e3ad8bb4e503fed44d9016b265d486198786e01a4d72537a70f56b`|
|native442 native-inspection.json|`0a632ef93499ae716d316e2466b9fe9c290d6d4bed726ab1f9f0f15b93ca777a`|

## Focused516 source review — 2026-10-01

**ACCEPT, source-only, with no material finding in the changed aim and mechanical-ID scope.** This is an independent read-only review of frozen516 against513, not a native success or appearance verdict. Root owns the513 raw receipts/model comparison and its diagnostic PNG review. The keyboard alternative above remains unperformed.

`native.mjs:37–65` queues public `driver.step({panX:40,panY:0},null)`, reads its immediate receipt/pose, settles with preservation, and reads the settled pose; it repeats the same sequence for rawY40. The map uses X-probe minus before and Y-probe minus settledX, so the probes are independently settled rather than contaminated by the preceding glide. Its finite/nonzero determinant check and two-by-two inverse signs are correct. Each loop computes the residual from a fresh actual post-calibration observation, scales both requested components by one factor to cap vector length at200px, then calls the public raw-pan branch with a null destination. The shipping driver therefore bypasses private `panTo()` and automatic calibration; its component clamps do not shorten a vector whose length is already at most200px. No camera/render/bridge setter is introduced.

Every `aim()` measures a fresh map after angle/distance aiming, including later fixed/seeded/motion-base views. It retains pre-aim/orbit/zoom, both probe receipts/immediate/settled observations, each correction's input/inverse/residual/receipt/immediate/settled observation, failure text, and the final full camera/residual before the unchanged pose guard. The loop retains the original maximum12 corrections and the existing preservation settle. Probe travel is accounted for by recomputing goal error after both probes; it does not restore an assumed pre-probe target.

After mechanical513-to516 IDs and the reviewed aim body are excluded, the remaining native text compares exactly equal to513. The owner wrapper compares exactly equal after its mechanical ID substitution. Recipe bytes are identical. All154 served route metadata entries compare exactly equal; executable/shared-read-only/pilot-file metadata is unchanged. The frozen baseline and pilot OrbitDriver/FlythroughDriver files were independently rehashed and match the pins above. Thus viewport/query/targets/tolerances, eight fixed plus one seeded original and six sparse30fps samples per arm, hardware GPU and port4335 admission, finite time caps, first-ready diagnostic, mounted-file qualification and owned `finally` behavior are preserved within this diff bound.

Reviewed516 pins: native `cbaa183e0ed6d30aef6a0c1365e988ddd51f2c47890a229f9fbd84063b87eb14`; owner `4a4640eaf67b8ee5d4ef6de3149163086b26d79befa8123f5e8a2e951cb1ba3e`; prepared `957089fe537d4c9b389c9d04f8364bcb4421e91a0fa6a2e7a0a77ef83e442759`; recipe `bfcabfb2cbb8edd024587c57cc5374b5fefe3502fdbc282f5747d3aebea8b4ad`. Comparison513 pins: native `92401db092daa23770aacd73d90050bf5e6a8370c253183f5fd040ed3e7247d9`; owner `29d2fcddedb368d0249ed0dff2ba6e522536e3c590542c8817ca5afc34d3911d`; prepared `da724cb724f5e09e14cdc51cbb68ef6f2bc8cd11d595c5a2f4d1150d3610cba9`.

Remaining gaps: actual516 convergence for every prescribed view, paired pose/error/GPU/motion checks, all qualification PNGs and native-resolution independent appearance review. No516 native run, gate, server, GPU process, extra probe, worktree or helper/product edit was performed by this reviewer. Only this authored append was written.
