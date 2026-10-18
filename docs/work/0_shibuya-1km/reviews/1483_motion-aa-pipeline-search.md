# Branch B: renderer/history ownership search

Owner: /root/train1483_pipeline_search. Read-only diagnosis, 2026-10-17. Base main ea98b89f0ae8286ce6c8ffa003a2816e201019b1; executable adopted59fbb1c per assignment. The primary checkout contains the staged C1 train files and current post.ts, not a clean HEAD executable. No source, index, build, scene input or executable was changed. The optional frozen worktree post.ts was read only to identify its extra SMAA composition; no other branch conclusions or held-out contents were read.

Contract: ../contract.md, SHA-256 fa174c2c0369f663abc3b368c9d4f6f7efddccd829b1a203d79882574a8bf6a6. All reproduction inputs and disqualifiers remain binding. All35items/14criteria remain OPEN. Nothing here proves A10 or changes 3000 pedestrians/200 vehicles/60fps at1080p.

## Result

The ordinary-city AA regression is structurally consistent with a global history-domain decision: app.ts244 disables the only TAARenderPass history whenever the north-side train moves, although much of the visible city remains stationary. Its moving path has two current-pose colour draws rather than the settled32-sample city image. This is a source explanation, not a fresh timing or pixel-causality measurement.

A bounded, testable pipeline route exists without replacing the material system: retain train-free city history and replace the complete current-scene colour inside a conservative dynamic-influence region, then run current GTAO, bloom and output once. Complete current-scene rendering owns depth, transparency and shadows inside that region. This avoids a flat actor-over-city depth merge.

This route is UNDEREXPLORED, NOT IMPLEMENTED, NOT ACCEPTED. Its first unresolved quality case is ordinary facade/sign/paint detail inside the current train or shadow influence region, where the output still has the current two-sample quality. Its first unresolved construction case is a finite conservative region that covers every affected receiver while remaining narrow enough to preserve the observed city. A claim that these gaps are merely integration would relocate the original problem. There is no impossibility claim.

## Instruments consulted first

src/render/post.ts and installed Three0.180.0 TAA/SSAA/GTAO implementations answer pass ordering, history and target ownership. src/render/loop.ts answers the clock and pose update order. src/harness/bridge.ts publishes post/camera/time/train observations; test/post-motion-sampling.test.ts exercises actual installed pass sample counts with a renderer spy. Those instruments cannot prove spatial quality, dynamic influence coverage or GPU cost without a runtime experiment. No such experiment was launched.

The existing tools/frame-budget/probe-entry.ts measures rAF intervals and RenderLoop.advance CPU wall time with simulation cost separated. Its present frame-budget.spec.ts is a populated continuous-orbit1920x1080 instrument and its wait predicate requires >=2700 drawn pedestrians. It cannot be run unchanged as an ordinary train-only A/B. Its probe mechanism and helpers can be reused for a separately declared matched train-only window. It has no cumulative renderer draw-count or GPU timer observation. CPU advance cost alone is not GPU cost.

## Actual interfaces and counterevidence

1. TAARenderPass.render: accumulate=false delegates to SSAARenderPass.render and resets accumulateIndex=-1. The accumulating branch caches RGBA colour in _sampleRenderTarget/_holdRenderTarget and stops drawing the scene at32. It has no velocity, disocclusion, previous depth, per-object history mask or depth transport into composer buffers. SSAARenderPass averages jittered colour using depth-disabled fullscreen copies. A second layer cannot recover scene depth from that averaged colour.
2. post.ts currently orders TAARenderPass -> GTAOPass -> UnrealBloomPass -> OutputPass. Its composer targets and scene sample target have4xMSAA. GTAO separately draws actual current normals/depth at the unjittered camera after TAA restores the camera view offset. Therefore normal/depth is current even when settled colour was cached. installAgentNormals/withNormalMaterials preserve VAT/cutouts and registered normal variants. Their swaps are already scoped with finally restoration.
3. rail-trains.ts creates opaque MeshStandardMaterial glazing, not transmissive windows, but body meshes castShadow and receiveShadow. Its loop.onFixedStep/onFrame callbacks already produce one interpolated current pose before post.render. No pass may advance this clock, rerun render(time) at a different time, hold the train, or modify its pose for AA.
4. lighting.ts has one PCFSoft sun shadow map:2048square, left/right/top/bottom +/-700m, near100/far3200, bias=-0.0006, normalBias=.6m. Dusk shadows are intentionally disabled; noon casts them. Installed WebGLShadowMap checks object.visible before traversing descendants and checks the main camera layers, not merely an assumed shadow-only layer. Hiding the train from a history draw also removes it from that draw's sun map. The next complete current-scene draw must refresh the map with the train restored. Treat these as different shadow states, not interchangeable caches.
5. Real city glazing exists: rail-facades.ts136 opacity.30/depthWritefalse; peripheral-frontage.ts146 opacity.24; upper-windows.ts114 opacity.27; commercial-corner.ts474 opacity.23. Some normal variants deliberately omit glazing. A nearest-depth actor overlay cannot preserve actor-behind-glass compositing. All complete current-scene draws must keep ordinary transparent sorting and material hooks.
6. clipCityRoot/clipCityMaterial bind the same AOI clipping to colour, custom depth/distance and shadow passes. Source frontage shaders also discard authored openings. Replacing them with a bare global depth override would close openings; the existing registered pass materials must remain authoritative.

## Concrete candidate sketch: two colour domains, one complete live scene

Minimum bindings to review before implementation:

- src/app.ts: supply a late-bound getter for railScene?.trains?.root to PostOptions. Compute environmentStill from camera/tiles and static-world mutations separately from actor motion. Keep the actual train-moving witness; do not simply delete it from the old global predicate. Any other moving agents, walker or changing signal/material domain must be covered or cause a truthful fallback to the existing all-current path.
- src/render/post.ts: replace the first pass with one owning a city-only TAARenderPass and an always-current full-scene TAARenderPass with accumulate=false/sampleLevel1. The city pass retains the accepted32-sample construction with sampleLevel0. Use separate owned half-float targets; only its colour is retained. Composite before the existing GTAO. Keep AO_BLEND/radius, lighting, exposure, output and bloom settings unchanged.
- src/scene/lighting.ts: expose a read-only actual sun/shadow-camera state sufficient to construct the influence volume, including current shadow matrix, map resolution, bias and normalBias. Do not restate guessed sun geometry in post.ts.
- test/post-motion-sampling.test.ts and lifecycle coverage: retain the old whole-scene branch bounds and add exact history-domain, restoration, current-pose and target-disposal cases if the route is selected. This is a proposed verification boundary, not a request to write mirror tests now.

One frame, after the existing RenderLoop has interpolated the train:

```text
if camera/tiles/style/time/size/static-world revision changed:
    invalidate cityHistory
if unsupported dynamic domain exists:
    run original complete-current chain; report that actual path
else:
    if environmentStill and cityHistory not converged:
        save dynamic-root visibility and renderer/pass state
        try:
            hide dynamic roots only for this history-domain draw
            cityTAA.accumulate=true; cityTAA.sampleLevel=0
            cityTAA.render(...owned city colour targets...)
        finally:
            restore every visibility/state value, preserving errors
    restore all dynamic roots; make live shadow update explicit
    liveTAA.accumulate=false; liveTAA.sampleLevel=1
    liveTAA.render(...owned live colour targets...)
    R = conservative current train + current shadow influence coverage
    composedLinearColour = R ? liveColour : cityHistoryColour
    current GTAOPass(scene,camera), including train and all pass variants
    current UnrealBloomPass once
    OutputPass once
```

When environmentStill=false there is no reusable city history for this camera: use the original complete current path. Do not carry the static image across camera motion. The route restores accepted settled ordinary quality while a train moves; it does not solve high-frequency quality during camera movement.

Why this solves actual ownership rather than hiding it: every selected live pixel was rendered with the entire current scene, so ordinary depth testing, facade openings, transparent order, train receiving static shadows and train casting onto city receivers all came from the existing renderer and current pose. The static history never contains the train or its shadows, so a departing train does not uncover an old train image. GTAO is recomputed from the full current geometry after colour selection. Bloom and tone mapping operate on the combined current radiance, not independently blurred layer images. Train lamps have no retained bloom history.

Neither image uses a generic flat alpha overlay; no history depth is claimed. A conservative region may select pixels whose train is occluded. That is safe for visibility but can unnecessarily lower their AA quality, which is the remaining acceptance risk.

## Region construction: explicit unresolved bound

A projected train AABB alone is invalid at noon because the train can affect a receiver outside its camera silhouette. A train mask alone also misses offscreen casters. A colour-difference-only mask is invalid: a train and the two-sample background can have equal pixel colour while the retained32-sample background contains a feature, leaving that feature visible through the actor.

A conservative starting construction uses the actual current four-car world bounds, transformed into the current sun-shadow frame, expanded in XY for the installed PCFSoft support and normalBias, extruded away from the light to the shadow camera far plane, then clipped against the view frustum before projection. Include the direct train bounds and a half-pixel jitter/MSAA support margin. If bounds cross the near plane or cannot be certified, select the full viewport for that frame and report the fallback.

This is finite without a per-building search but may be far too broad. Tightening with terrain minimum8.71m is NOT justified merely by manifest.json: the manifest does not certify that all building/rail/authored shadow receivers sit above that number. Using the GTAO depth alone also omits some transparent receivers. A finite receiver-volume bound would need source inspection of every admitted receiver class or a support mask evaluated at actual material fragments. The latter touches material shaders and substantially expands the minimum change. That gap must be resolved before claiming the region contains every current shadow influence with acceptable locality.

## Bounds, prediction and falsifier

Whole-scene colour draws: current path2/frame. Candidate steady converged city history2/frame; convergence ordinarily3/frame, first convergence frame4 (fresh city hold+one city temporal sample+two live samples). One full-scene normal/depth pass remains. Each history colour draw can additionally regenerate the sun shadow map; no savings are assumed there. These are source-derived nominal counts, NOT measured renderer counts or cost. No16x full-scene colour redraw and no per-building per-frame work is proposed. Every target must be created/resized/disposed through the existing post-chain partialDisposers/lifetime, including failure restoration and hold-target resize; bufferBytes must include both domains rather than report the old estimate.

Prediction: after a camera settles, native crossing/sign/paving detail wholly outside R recovers city-only temporal quality while current train pose and shadows remain fresh in R. Counterprediction: any conspicuous mask-edge seam, sign/stripe breakup inside R, old shadow/train trace, transparent occlusion change, or R covering the protected city rejects the route under the unchanged contract.

Next bounded check, only after root selects this family and admits its minimum renderer change: first inspect an influence-mask overlay on the four fixed ordinary poses and two north samples, never on the held-out pose. The overlay is diagnosis, not acceptance. Fail the prototype before gates if the conservative R already covers the crossing detail the route needs to restore. Then compare the final originals with mask overlay off, current pose/time brackets retained, at dusk and noon. A positive targeted result still requires root's precommitted held-out inspection, matched1080p A/B cost and the required fresh PRIMARY five gates/independent integrated review.

Suggested matched cost protocol: same frozen source/data/renderer and ordinary train-only population,1920x1080, fixed real-control pose; declare10s warmup then20s windows in A/B/B/A order, preserving all windows including refusals. Extend only the existing observation seam to retain cumulative actual scene colour/normal/shadow draws and sample domains, not renderer.info values reset by the last fullscreen pass. Report rAF and CPU advance distributions separately from GPU attribution. Include convergence work as a separate complete window; steady-state-only savings cannot erase it. This protocol is prepared, not dispatched, and establishes no full-population acceptance.

## Raw evidence inspected and pins

Native originals inspected: accepted current-lifetime-world.png (1280x720,909485B,SHAff28bbc5ac0bf128bd1cb9f2783e1ff570ec7f95ffe0e636ce38c423aa696793) and C1 hero-satellite-dusk-crossing.png (1280x720,914561B,SHA199e7f1feda40e4ef81d3981896f28be07541bf40749c0f95cc9873c6da37fe4). The latter shows conspicuous stripe breakup relative to the retained reference. Accepted numeric camera telemetry is unavailable, so no exact pixel alignment/equality is claimed. Other five required poses, C2/C3 originals and sequences were not inspected by this branch.

Source SHA-256 pins at read time:

```text
src/app.ts b9adeee57b9546c7482781bbb642ff85691fb0f4546acb8f5bb9d723dd810cba
src/render/post.ts ae2435d754c5bb934e46c68e0e53fbc8b76c9674acb26763195dda1b4825eb59
src/render/normal-pass.ts 7ff8182a2768ceeab600722d786ddde6d128a7619e78870c728e755d5bfafc4c
src/render/loop.ts 8750fd5349bb0862e15825a94634226cc3a702a3549eb4f9d2a446ae3d10820a
src/render/renderer.ts e0219cfb908ce5e9b9dbb7aa84ba1d11900558943cfb05c005a65ff3e68ae7b4
src/scene/rail-trains.ts cda72eea0ff7b8269e2174a147aa92243dfb6479538474c363e1a2b188dba21c
src/scene/lighting.ts f335410a2c215a5d8860d4a6aff1fd82f1b8b7c5288ede89b54a5c5e40a978ba
src/scene/rail-facades.ts 43f92c20df1e7de92e8e29b499690907a97a33de20c04baf695060dd9765fb79
src/scene/commercial-corner.ts 46e89b16688d02c36d20a115b932bd6ad11d76950b3544a812a67b14f05bc671
src/scene/aoi-cutout.ts 9271f480bdb3fd0d339284512474f03cdd869ea9a9b5235631b41820bf644521
test/post-motion-sampling.test.ts 61e489dc3b957c480e9bd11f63dedce55c2dc1361d3609123e21c1137e988dee
three TAARenderPass.js 9382601b054937b1e55459302a2f6031e576eb090de5aab7521b2e7bc39c8ba2
three SSAARenderPass.js cd2b8e83b32e806091117dfbeff1f8f4e78df0175a4a3acd865b9989df1c420b
three GTAOPass.js 855fd7953e81c1050a4abea8af4bfeb5ad9b6d879f793a9c650e3768aaec62a3
three WebGLShadowMap.js 7c157a05d05d1f3f4d1090dbb923a6f14f0f03e799d64680d278d2a55f915041
```

Resources: read-only shell/file inspection and two existing native images; no new browser, server, GPU, gate, build, package install or app process. One PowerShell hash-output command initially had a parser error and was corrected; no artifact/source mutation occurred in that failed command. Git safe.directory was passed per command; no global Git config was written. Only this ignored report was created. Wall time/calls are not a measured efficiency claim. No process cleanup is owed because no task-owned app/browser/server process was launched. Stop after handoff.
Telemetry constraint: PostStatus.taaAccumulating currently means any TAA accumulation. A dual-domain prototype must report the city history honestly and separately identify live-colour history=false, live sample count2, current frame/pose and both domain targets. It must not retain taaAccumulating=false while secretly accumulating the city, or pass a stale global flag to the fixed contract. The integration owner must agree the observation semantics before prototype scoring. The shared train clock and current-pose observations remain authoritative.