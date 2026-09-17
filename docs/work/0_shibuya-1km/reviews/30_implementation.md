# Round 30 — road markings against the aerial reference, at 1:1

Reviewer: a bounded read-only lane of the paint-review wave. Revision reviewed: `e74375e`, main, clean at the time. This round's own commit is the one this file first appears in — `git log --diff-filter=A --format=%H -- docs/work/0_shibuya-1km/reviews/30_implementation.md` names it, and it is deliberately not written here because a commit cannot contain its own hash. It is on branch `worker/paint-review`, in the worktree `artifacts/paint-review/wt`, which is **kept** so the crops below can be opened; reclamation of it and of `artifacts/paint-review/` is the coordinator's to run once this round is accepted. The reviewer did not author the paint code, the frame code or the reference fetcher it measures.

Evidence: `artifacts/paint-review/` inside that worktree, under the ignored path. The manifest is `frames.json`; the measurements are `analysis.json`, SHA-256 `ecb989b7f774a68d297ebd8063071816215b26df355165c5adeda474db1ca068`; the crops are `crops/*.png`; the decoded reference is `reference/*.rgba` with `reference/index.json`. The lane's own files are `tools/paint-review/{playwright.config.ts,capture.spec.ts,reference.spec.ts,analyse.ts,png-encode.ts}`, added by this round and untracked until the round's commit.

## The gates, and one honest qualification

Run in the worktree at `e74375e` after the lane was added: `npm run build` passed (`dist/assets/index-DkaNcfJU.js`), and `npm run typecheck` passed with no output, which includes every file this round added. `npm run visual` was deliberately **not** run — it is the coordinator's three-hour verdict lane, it owns port 4319 and the whole CPU, and nothing in this round changes the pixels it certifies.

`npm test` is the qualification. It reported **383 passed and 1 failed**: `test/process-ownership.test.ts` > "normalizes configured Windows absolute path spelling without accepting another path or a basename" timed out at 5,000 ms. Re-run alone immediately afterwards on the same tree it passed in 3,143 ms and the file's six cases passed together in 6.77 s. The machine was running another lane's three-hour SwiftShader capture during the first run and not during the second, so this is load, not regression: this round adds no test and changes no file that test imports. **It is reported rather than smoothed over, and it is also a fact worth keeping** — a case that needs 3.1 s of a 5 s budget has under 2x of margin on a machine the fleet shares, and the next heavy lane will find that before a person does.

## The criterion, and a discrepancy about which line it is

`plan.md` line 161, checked at `e74375e`: **"Road markings match reference imagery, including the scramble's diagonals, with signals, guardrails and street furniture in place. (Phase 4)"**

Three different line numbers are in circulation for it and two of them are wrong. The assignment calls it line 151; `plan.md`'s own prose at line 181 calls it "Line 147"; the criterion is at line 161. Both stale numbers are left over from earlier revisions of the file, and `plan.md:181` is the one that matters, because it is the sentence a reader of the plan finds when looking for what is still open. Round 29 read the same criterion at `plan.md:147` and was reading the right sentence at the time. This round adjudicates the criterion at line 161 and records that its citations have drifted.

## The bound this round had to get past

Round 29's disposition gave this criterion as **partly carried**, and named exactly what was missing: the crossing's diagonal arms, the zebra bands and the tactile guidance strips are visible and correctly placed in both styles, and signal heads and posts are present, but "agreement with *reference imagery* at native resolution" needs "the crop-level comparison this review's downscale bound cannot make". The bound was stated in `artifacts/frame-inspection/report.md`: the image tool returns a **1066×600 preview of a 1280×720 source**, so single-pixel detail is outside what that review signs off.

That bound is real and it was checked again here rather than assumed. Every crop this round rests on was read back at the pixel size it was written at: `plan-core-satellite.png` at 640×360, `plan-tactile-and-east-signal-satellite.png` at 320×180, `plan-north-west-signal-satellite.png` at 240×135, `plan-core-reference.png` at 174×173. All arrived at those sizes. The downscale applies above roughly 640 px of width, not at it, so a crop kept under that is inspected at 1:1 — which is why the crops here are cut small and why a 1280×720 frame is never the thing judged.

Nothing in this round is a contact sheet. Each crop was cut as a sub-rectangle of one frame, written with filter type 0 on every row, and opened in its own read, one at a time.

## What the reference can and cannot adjudicate

`npm run data:paint-reference` fetches GSI seamless aerial photography at zoom 18, a 3×3 tile block around the crossing, into `data/decorations/paint-reference/`. It is the reference and never a basemap texture.

The ground sample distance is **not** the 0.6 m/px the brief quotes, and the difference is the kind of thing that silently scales a comparison. Web Mercator at zoom 18 has a projected pixel size of `40075016.686 / (256 × 2^18)` = **0.5972 m/px**, and that figure is the same at every latitude because it is measured in projected metres. Ground metres are that times the cosine of the latitude, so at the crossing's 35.6595 N the real GSD is `0.5972 × cos(35.6595°)` = **0.485 m/px**. Measured from the decoded tiles' own corners rather than computed: **0.4857 m/px east-west and 0.4835–0.4836 m/px north-south**, the small axis difference being the ellipsoid's own convergence between the tile grid and the plane rectangular grid. Every "can this be seen" answer below uses 0.486 m/px, and using 0.6 would have made the reference look 24% coarser than it is.

What 0.486 m/px can adjudicate: whether a crossing arm exists at all; where it is, to a few metres; its width class, because the scramble's 5 m arms are 10 px across; and the overall extent and orientation of the painted area.

What it cannot: a 0.5 m zebra bar is **1.0 px**, the 1.05 m stripe period is **2.2 px**, a 0.15 m lane separator is **0.3 px**, and the 0.3 m tactile strip is **0.6 px**. A guardrail rail is thinner still. So the reference can say that the crossing is where the render puts it and shaped the way the render draws it, and it can say nothing whatever about stripe pitch, stripe width, line width, tactile paving or any paint edge's antialiasing. That is a hard bound of the instrument, not of the renderer, and this round does not cross it.

## Method

**Frames.** `tools/paint-review/playwright.config.ts` is a new lane on its own preview port, 4331 — 4324 and 4329 were both already held by other lanes' node processes when this lane first ran, which is why it took a port no config names rather than the next number. It launches `--use-gl=angle --use-angle=d3d11` with no software fallback argument and sets `MAPS_VISUAL_GPU=hardware`, so `tools/visual/orbit.ts` rejects a software rasteriser by name. It writes only under `artifacts/paint-review/` and produces no certificate. Six frames were captured, three poses × two styles, all at noon, all 1280×720 at `deviceScaleFactor: 1`, renderer reported as **ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)**. Total capture cost 1.4 minutes.

**Poses.** Azimuth 45° at polar 0.30/0.34/0.46 rad and distance 150/80/35 m from the crossing. **The pose is fixed, and that is a deliberate limitation.** The controls were driven for real — `OrbitDriver` drags and wheels the canvas and reads back where the camera ended up — but three named poses are not a sweep, and this lane is structurally blind to anything living in the input path a person's own hand would take. What a fixed pose *is* good for is a static paint comparison, which is what the criterion asks: the mapping from frame pixel to world metre is computed from the pose the bridge reported, so a drifted pose is measured where it actually is.

**Pixel to world.** Each frame pixel is turned into a ray from the reported camera with the app's own 55° vertical field of view (`src/render/camera.ts`), intersected with a ground plane whose height is refined from `data/scene/{roads,terrain}.mesh` through the repository's own `surfaceSampler`, and given a world `(x, z)`. Reference pixels are mapped through `geographicToPlaneRectangular` and `planeRectangularToWorld` — the world frame's own projection, not a second copy of it. Every crop reports the world quad its corner pixels cover, corner by corner, so "what does this crop cover in metres" is read off the pixels rather than off the pose that was requested.

**Paint classification, and the first attempt that failed.** The first rule was "bright and unsaturated, on the road mesh", split by Otsu's threshold. Written out as an image it marked the **pedestrian apron** as paint: the crossing sits inside a wide plaza, PLATEAU's road surface carries it, and at noon it is nearly as bright as the paint. The bearing profile that came out of it was a profile of the plaza, and it was discarded rather than reported. The rule now is local contrast: a zebra stripe is not merely bright, it alternates, so a pixel counts as striped paint when its 7×7 window spans at least 60 levels of luminance and the pixel sits in the upper half of that range, with saturation below 0.25. A uniform apron has a window range near zero however bright it is. Both masks are still written beside their crops so the classification can be looked at rather than believed, and it was looked at.

**The placement side was read before the pixels.** `data/network/network.json` and the runtime `paint()`/`hardware()` records from the frozen bridge say what was placed and what was deliberately omitted, so a paint defect could be told from a recorded omission. The runtime record is the stronger of the two: it is the same list the renderer drew from. It is stored in `paint-placements.json` (SHA-256 `e3f237609a92d58d8a642438bb3dfbf2fa15691adb90530d5f5a1ea2d20ec174`).

## Verdict, line by line

### The scramble's diagonals — met, and met against the reference

Both diagonals exist, in the right places, in both styles.

The placement record gives them exactly. `authored:scramble-diagonal` is 44.6 m long at a direction bearing of **50.6°**, centred 0.1 m from the world origin, with 43 stripe parts placed and 3 refused; `osm:way:754454449:crossing` is 29.9 m long at a direction bearing of **146.9°**, centred 5.8 m from the origin, 29 placed and 1 refused. The two are 96.3° apart, which is what the real junction looks like and not a right angle. Both are drawn 5.0 m across, as 0.5 m bars on a 1.05 m period at road level + 0.06 m (`src/scene/street-details.ts:154-155`).

`detail-centre-satellite.png`, SHA-256 `053c5bdedee0288cd6143a911272486ff26380f9e7b3244afc70d0b804b3700b`, is 640×360 at 0.0576 m/px covering world x ∈ [−21.27, 16.35], z ∈ [−21.22, 16.41] — a 45°-rotated quad about 29 × 16 m. At azimuth 45° the crop's horizontal axis is world bearing 45/225 and its vertical axis is 135/315, so the two diagonals run parallel to the crop's own edges and are unmistakable: a band across the full width, a band down the full height, and where they cross, a woven lattice of both stripe sets over the middle of the junction. `detail-centre-cartographic.png` (`bbb8b2301ae8861aac0aead957c0bf4cdbda1f7bb8ae19328a6aa1179b969458`) is the same rectangle in the clean style, where the flat colours make the edges measurable and show no z-fighting and no gap at the joins.

`plan-core-satellite.png` (`08c9213fc5a3929fab6dd3418caeee7b98486b18883a91044f71b94fdacea25f`, 640×360 at 0.127 m/px, world x ∈ [−45.95, 38.14], z ∈ [−45.49, 38.05]) shows all six arms and both diagonals in one rectangle. `plan-core-reference.png` (`6070b7f0a007ae5f267240c8389d782465ffe2befb0a726633d227372124ab50`, 174×173 at 0.486 m/px, world x ∈ [−46.0, 38.1], z ∈ [−45.5, 38.1]) is the same world rectangle out of the GSI block, and it shows the crossing as a bright asterisk of arms radiating in the same directions. `wide-crossing-reference.png` (`ce874622fc67a47c5b01db5e8c2cc41447ef5f463c8c42e43b2b2d8b7aedf4ff`, 319×322, world x ∈ [−84.4, 70.4], z ∈ [−83.5, 71.8]) puts the crossing in its surroundings, with the JR tracks on the right confirming that the reference is north-up and that east is east.

**Position, as a number.** The centroid of striped paint within 50 m of the origin, on the same test in both images: reference at **(−3.58, −4.28)**, 6,924 stripe pixels; render at (1.70, 1.50) from the plan pose, (−1.46, 0.88) from the detail pose and (0.21, 0.66) from the wide pose, with 42,303, 98,917 and 15,731 stripe pixels. The render's own centroid is within 2.3 m of the world origin, which is the point the world frame defines as the crossing, and the gap to the reference's is **between 5.6 m and 7.8 m depending on which pose is used** on a junction roughly 60 m across. The bound on that number is real and belongs with it: the reference's stripe test fires on only 6,924 pixels because its paint period is at its own sampling limit, so the reference centroid is weighted towards whichever arms have the hardest edges, and this is a bound on positional agreement rather than a survey of it.

### The zebra bands — met, with the pitch measured and the reference unable to check it

The bands are present on all the arms that were meant to carry them, and the stripe geometry is right.

**Pitch, measured from pixels rather than read from the code.** A single scanline across the NE–SW diagonal in `detail-centre-cartographic.png` at row 180, thresholded at the midpoint between the row's own minimum (153) and maximum (209), gives a mean bar of 12.0 px and a mean gap of 10.4 px against a local scale of **0.0511 m/px** interpolated between the crop's 0.0576 m/px top edge and 0.0446 m/px bottom edge. That is a bar of **0.61 m**, a gap of **0.53 m** and a period of **1.10 m**, against an authored 0.50 / 0.55 / 1.05. The 1 px disagreement in a 21.5 px period is what a run-length measurement across an antialiased edge carries at this scale, and it is reported as agreement rather than as a defect. All three scanlines tried (rows 178, 180, 182) give the same answer to within 0.1 m.

The arms themselves, from the runtime placement record: `osm:way:1157451161` 21.5 m on the south side, `osm:way:355248078` 16.2 m on the west, `osm:way:355248080` 14.1 m to the north-east, `osm:way:355248081` 14.1 m to the east, and two fragments of 2.6 m and 1.6 m to the south-west and south-east. Those fragments carry three stripes and two stripes, which is what the source geometry gives rather than a rendering loss, and they are recorded here so a later reader does not rediscover them as a defect.

**What the reference cannot check about them.** At 0.486 m/px the band is 10 px across and can be checked; the 0.5 m bar is 1.0 px and the 1.05 m period is 2.2 px and neither can be. The reference's own stripe count within 50 m is 6,924 pixels against the detail frame's 98,917 — it is detecting the crossing, not its stripes. **The stripe pitch of the rendered crossing is therefore established against the placement code and against the pixels, and is not established against the aerial photograph at all.**

### The tactile guidance strips — present and placed; not establishable against the reference

260 tactile parts are placed within 70 m of the crossing and 260 in total, drawn as 0.3 m ribbons at road level + 0.07 m in `0xcabd75` along the OSM walking paths whose source carries a tactile note or `tactile_paving=yes`.

`plan-tactile-and-east-signal-satellite.png` (`af3c12232523508a397bc5d7ecffb0cb2d35a3f683390a23eb26e3b1ccc74335`, 320×180 at 0.106 m/px, world x ∈ [6.81, 41.73], z ∈ [−4.67, 31.06]) shows them at 1:1 as thin yellow lines about 2 px wide, meeting and branching on the plaza beside the eastern arm, with the arm's zebra band and a street tree in the same rectangle. The analysis finds 1,171 tactile-coloured pixels in the plan frame, bounded by x ∈ [−26.7, 41.0], z ∈ [−14.5, 44.8], so they are on the east, south-east and south sides.

**A 0.3 m strip is 0.6 px at 0.486 m/px, and Japanese tactile paving's own dot-and-bar pattern is finer than the tile that carries it.** The reference cannot adjudicate these strips at all — not their position, not their extent, not their colour. What is established is that they are drawn where OSM's own tactile paths run, at the width and lift the code states, and that they are visible in the render. What is not established, and cannot be with this reference, is that they are where the real tactile paving is.

### Signals — met for what is placed, and the placement is thin

The runtime hardware record holds 119 mapped traffic controls, of which **23 are placed and 96 are not**, in two recorded reasons: 52 refused because "no supported pavement base clear of local route corridors within the 18 m transverse search. Some candidate hardware footprints overlap road poses without four supported wheel contacts", and 44 for the first of those alone. Placement writes a post, a mast arm, a head and lenses, and turns the lenses from the shared signal clock.

Within 80 m of the crossing — which is where the criterion's "in place" has to mean something — the source has only **four** controls, and **three are placed**: `osm:node:6219685050` (source position −17.3, 20.3), `osm:node:6219685053` (27.9, 4.0) and `osm:node:6219685051` (−31.3, −4.0). The fourth, `osm:node:6219685052` at (14.0, −25.6), is unplaced for the first reason: no supported pavement base was found within 18 m of it. The placed poles themselves stand a few metres from those source nodes, which is expected — `control-hardware.json` records a base and a head separately from the source coordinate, and the count above is about the source inventory.

`plan-north-west-signal-satellite.png` (`6ac35b4454a2cea65e91c060d8d5b89a5c1953cda9ffb9332dbb34cc7a293481`, 240×135 at 0.132 m/px, world x ∈ [−45.98, −9.40], z ∈ [−28.35, 6.98]) shows one assembly at 1:1: a thin dark post with a mast arm cantilevered over the carriageway, standing beside the north-west arm's zebra band and the lane dashes. The head's 1.05 × 0.35 m box is about 8 × 3 px here and its 0.12 m lenses are 1 px, so **the post and the arm are established and the lens colours are not** — a lens colour is not a thing this crop can carry, and nothing in this round read the signal phase.

### Guardrails — not met, and the counter that should have said so cannot

**There is no guardrail within 295 m of the Shibuya Scramble Crossing in this scene, and the street-hardware path could not place one if there were.**

`src/scene/street-details.ts:230` returns `guardrailPosts: 0` as a **literal**. It is not a count of anything: the surrounding expression tallies crossings, stripes, unplaced stripes, unplaced features, signal heads and placed controls from live data, and this one member is a constant with a comment nowhere near it. The type at line 30 declares `guardrailPosts: number`, so the field reads like a measurement in every consumer and reports zero whatever the scene does.

The only guardrails in the rendered world come from a different path entirely: `data/scene/decorations.json` carries 8 barriers from OSM — 4 bollards and 4 guard rails — and the nearest of them to the crossing is at (−293.67, 26.89), 295 m away, with the rest between 380 m and 500 m out. So "guardrails in place" is not unmet because a guardrail was drawn in the wrong place; it is unmet because none is drawn anywhere near the crossing and the one field that a reader would check is incapable of reporting that.

The reference cannot settle this one either: a guardrail rail is on the order of 0.1 m thick, which is 0.2 px at 0.486 m/px. A crop cannot show an absence in any case, which is why this line rests on the placement record and on the source code rather than on a picture.

### Street furniture — met for what the source carries

Trees, greens, signal posts, mast arms and stop signs are drawn. `data/scene/decorations.json` holds 72 trees, 17 greens and the 8 barriers above, from OSM, with 11 sources explicitly skipped and named in the file. Trees are visible at 1:1 in `plan-tactile-and-east-signal-satellite.png` and in `plan-north-arm-satellite.png` (`00bb74f361250ff18dfa38f0b2e9904016d8b4d19aa1c3190502a52fd7ecf10f`, 320×180 at 0.131 m/px, world x ∈ [−23.87, 21.43], z ∈ [−54.85, −6.97]), the second of which also shows the TSUTAYA frontage and the plaza on the north side with no occluding slab over it.

Two further paint sources are in the scene and were looked at rather than assumed. `data/scene/markings.mesh` carries PLATEAU's own published lane, edge and stop-line polygons — functions 1010/1020/1030/1040/1120, crossing stripes deliberately excluded because OSM's crossing inventory owns them — and `data/scene/markings-provenance.json` records the source files, their digests and how many features were dropped for lack of support. Author-side, the bounded west-approach treatment in `tools/scene/hero-paint.ts` adds lane separators at 0.15 m on a 7 m period and turn arrows on five named OSM ways tagged `lanes=4`. Both are visible in `wide-west-approach-satellite.png` (`1ed1fcc4a2b6efe59577290283f76366e2e8ba1ff0f2de31fe215a1d05adc399`, 640×360 at 0.257 m/px, world x ∈ [−157.63, 23.18], z ∈ [−94.46, 74.45]) as a row of white dashes down the middle of the western approach with arrow heads near the junction.

**The 0.15 m separator is 0.3 px in the reference and the dashes cannot be checked against it at all.** The reference does show the western approach as a street with markings on it, and that is the whole of what it can contribute here.

## What I could not establish, and why

- **Any paint dimension below about 1 m, against the reference.** A 0.5 m bar is 1.0 px and a 0.15 m line is 0.3 px at 0.486 m/px. The render's own pitch was measured against the code instead, and agrees to 1 px.
- **The tactile strips against the reference**, for the same reason at 0.6 px, and additionally because tactile paving's own texture is finer than its 0.3 m tile.
- **Guardrails against the reference**, at 0.2 px, and in the scene because none is near the crossing.
- **Signal lens colours and phases.** A lens is about 1 px at the closest pose this lane used, and no crop here carries a phase. The bridge's `signals()` snapshot would answer the phase question and this round did not read it.
- **Anything that needs motion.** Three stills at one hour of day cannot show paint crawl, aliasing over a moving sequence, z-fighting that appears only as the camera moves, or whether paint flickers as tiles refine. The fleet's rule that one framing is not a check applies directly: three fixed poses at azimuth 45° are one framing family, and a defect that lives off that azimuth is invisible here.
- **Whether the paint survives the styles' own material paths equally.** Paint colour is derived from `style.palette.sidewalk` lerped 88% to white, so the two styles' paint differ in value. The cartographic stripe detector fires on 5,703 pixels against the satellite's 42,303 over the same rectangle, and while that is mostly a contrast difference between a flat palette and a photographic one, it is not proof that it is only that.
- **Anything about the 44-frame verdict set.** These are this lane's frames on this lane's renderer, bound by digest to these bytes. A crop of a hardware-iteration frame cannot inherit a review written for the SwiftShader verdict set, and this round does not claim to.
- **The population, the flythrough and the frame rate.** Out of scope and untouched.

## Defects

**D1 — `guardrailPosts` is a constant presented as a count.** `src/scene/street-details.ts:230` returns `guardrailPosts: 0` as a literal while every other member of the same object is tallied from live records, and the type at line 30 declares it as a number. Symptom: a reader checking whether guardrails were placed is told zero and cannot tell "none were needed" from "nothing can ever be placed". Cause: no guardrail geometry is built anywhere in `src/scene/street-details.ts`; the field was added to the interface and never wired to anything. It needs either a real count or deletion, and a scene-level statement that guardrails come from `data/scene/decorations.json` only — because a reader who finds that field will believe the opposite.

**D2 — 81% of mapped traffic controls are unplaced, and one of them is at the crossing.** 96 of 119, in two recorded reasons, both of which are "no supported pavement base clear of local route corridors within the 18 m transverse search". The reasons are honest and the refusals are recorded rather than silent, which is the right shape. What is not recorded anywhere is the consequence: the busiest junction in the scene is served by three signal assemblies, one mapped signal node at (14.0, −25.6) has none, and nothing states whether 18 m is the right search radius for a junction whose pavement is a plaza. Symptom to look for: a missing signal where a person would expect one. Placement, not paint, owns the fix.

**D3 — 175 of 1,333 paint parts were refused, in four reasons.** 13% of the crossing and tactile inventory: "vertex lacks finite support within 0.5 m of source elevation", "edge/interior sample lacks finite support within 0.5 m of source elevation", "edge/interior support differs from sampled triangle plane by more than 0.04 m", and "sampled triangle edge exceeds 0.5 rise/run". Every one is recorded per part with its source id, which is what `docs/reference/pavement-recipe.md` says the finite checks do and explicitly does not claim whole-footprint coverage. This round did not find a visible gap in the arms it looked at, and it did not look at all 175.

**D4 — the World style dropdown is composited into every captured frame.** The panel sits at approximately x ∈ [1010, 1275], y ∈ [4, 140] of the 1280×720 frame. It is not a scene defect and it is outside every crop this round adjudicates, but it is static across all six frames: the count of pixels at or above luminance 245 in that rectangle is **71 in all three satellite frames and 111 in all three cartographic frames**, identical across poses, which is what a UI overlay looks like and what a scene does not. `hero.spec.ts` and `sweep.spec.ts` capture the same page through the same path, so the 44-frame verdict set is likely to carry it too, and `artifacts/frame-inspection/report.md` does not mention it. It costs the top-right corner of every appearance frame that has a dark scene behind it, and it is worth checking on the verdict set rather than assumed away.

**Not a defect, recorded so it is not rediscovered.** The 2.6 m and 1.6 m crossing fragments on the south-west and south-east arms carry three stripes and two; that is the source geometry. The near-1:1.10 m stripe pitch measured against an authored 1.05 m is inside this measurement's own error. The apron around the crossing is bright enough at noon to defeat a naive bright-pixel paint classifier, which is a fact about the scene's lighting rather than about the paint.

## What held

The scene bytes these frames were drawn from are fixed in `frames.json` and repeated here: `data/scene/markings.mesh` `efdba9cb4532db023f18455f858cdbeae8bc76f21d419888df9544b21c42ccf4`, `markings-provenance.json` `efad82e86d1cef79bfdb439aca7d43683fb7dcb2462471c540b511fe91bd1ea8`, `roads.mesh` `3fe126cd675949daf4b337b890c99478c730a4f956c7f4241e7fe883cf967490`, `pavements.mesh` `5d2a915047b0e8719e624f14f600c81c0a6c6342c4e8ce5b383bdfa987bcbc24`, `control-hardware.json` `e6b3e1d387807f4338d5c9b2878933f5d92546a40f38b3b31cf48c94aac82b22`, `data/network/network.json` `314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677`.

The six frames, each at 1280×720 and each named by the SHA-256 of its bytes:

| Frame | SHA-256 |
| --- | --- |
| `satellite-wide.png` | `87e572e8bb3d1c954d91cc0aac17bae2936a50dedb2a8af6952949414b4af7da` |
| `satellite-plan.png` | `1a0f4216c583cee04bf924dd3ac5aef88a494438bdcfff1d41a293b6a1469629` |
| `satellite-detail.png` | `60df73086966f244d1dae2c7982f8eb0d8bd1c6d415138aeb285ea7194787d3e` |
| `cartographic-wide.png` | `0bfe1df5379c21fc5f3d1183256555b23cd0994078a036812d27ef4144988e6f` |
| `cartographic-plan.png` | `c7419ae44c53554823e362aa21fd3aed6a167f95ae8fc712b90a9cc86af417bd` |
| `cartographic-detail.png` | `6ac6c30448398f66509f7975517d38e10067b9cf0dc90196df74784da4571c20` |

The crops, with the world rectangle each covers and the SHA-256 of its bytes. **Regenerating any frame above strands every finding that rests on it**, because the crop digests will not match.

| Crop | Pixels | m/px | World covered (m) | SHA-256 |
| --- | --- | --- | --- | --- |
| `detail-centre-satellite.png` | 640×360 | 0.0576 | x −21.27…16.35, z −21.22…16.41 | `053c5bdedee0288cd6143a911272486ff26380f9e7b3244afc70d0b804b3700b` |
| `detail-centre-cartographic.png` | 640×360 | 0.0576 | x −21.27…16.35, z −21.22…16.41 | `bbb8b2301ae8861aac0aead957c0bf4cdbda1f7bb8ae19328a6aa1179b969458` |
| `plan-core-satellite.png` | 640×360 | 0.127 | x −45.95…38.14, z −45.49…38.05 | `08c9213fc5a3929fab6dd3418caeee7b98486b18883a91044f71b94fdacea25f` |
| `plan-core-cartographic.png` | 640×360 | 0.127 | x −46.04…38.06, z −45.40…38.12 | `3038a72f96a8b34b7ad49e775f3a0da1f750ff03f9614ca9f9c3108873baab0d` |
| `wide-crossing-satellite.png` | 640×360 | 0.234 | x −84.39…70.38, z −83.49…71.84 | `3d56564a0f164c5c2c724abe621ad1bf0836f8b99bffa861ddb755d2fd83870f` |
| `wide-west-approach-satellite.png` | 640×360 | 0.257 | x −157.63…23.18, z −94.46…74.45 | `1ed1fcc4a2b6efe59577290283f76366e2e8ba1ff0f2de31fe215a1d05adc399` |
| `wide-west-approach-cartographic.png` | 640×360 | 0.257 | x −157.62…23.18, z −94.46…74.45 | `d552b3eaee3cf2ee9ed37bfd18d14449a5c7da9030972f4448baec196b2d45d6` |
| `wide-north-approach-cartographic.png` | 640×360 | 0.256 | x −87.35…79.43, z −160.42…19.94 | `0478d212d8864149f1b4f6114db02c8b1cd9ae2bef43da6357f04f77f9204677` |
| `plan-tactile-and-east-signal-satellite.png` | 320×180 | 0.106 | x 6.81…41.73, z −4.67…31.06 | `af3c12232523508a397bc5d7ecffb0cb2d35a3f683390a23eb26e3b1ccc74335` |
| `plan-north-arm-satellite.png` | 320×180 | 0.131 | x −23.87…21.43, z −54.85…−6.97 | `00bb74f361250ff18dfa38f0b2e9904016d8b4d19aa1c3190502a52fd7ecf10f` |
| `plan-north-west-signal-satellite.png` | 240×135 | 0.132 | x −45.98…−9.40, z −28.35…6.98 | `6ac35b4454a2cea65e91c060d8d5b89a5c1953cda9ffb9332dbb34cc7a293481` |
| `plan-south-arm-satellite.png` | 320×180 | 0.109 | x −19.71…18.11, z 11.54…46.87 | `e3d1924a08711b68d9c88ef30a3604fdf14c8a6e6f3ddb1d0940ab25544120ec` |
| `plan-core-reference.png` | 174×173 | 0.486 | x −46.0…38.1, z −45.5…38.1 | `6070b7f0a007ae5f267240c8389d782465ffe2befb0a726633d227372124ab50` |
| `wide-crossing-reference.png` | 319×322 | 0.486 | x −84.4…70.4, z −83.5…71.8 | `ce874622fc67a47c5b01db5e8c2cc41447ef5f463c8c42e43b2b2d8b7aedf4ff` |

The reference block is bound twice over. Each source JPEG's SHA-256 is checked against the digest `data:paint-reference` recorded when it fetched the tile, and the decoded RGBA each comparison actually used is stored beside it with its own digest, in `reference/index.json` (`3982090bd2ee6ed4cca74cc16dbce30f235ef7f9f095f21aeecdcc95f7316174`). The nine JPEGs are `c276d7559ecf16d7839442b974cc8f71dbb2af7ab5b1c29cde8186bfc2ea9b72`, `83694534d52e1c2b12e7fb56d30717a9c4c23770fb6cf67b1f77e0618330062e`, `1734e604c46f5b91f478a90324255a40d88b6eb67d62b9007752de628ac868db`, `f6156eaa336a9bfa60979f91e7b3b4365786a9e03a48bc3a9651b5e61aeb4ceb`, `0befd4df2d69060d07a8190f18cff380792803e861dcc2a73926fc4a2d0919b0`, `47cfa6d0bbd35bff11adccda9039d4cf0d61ce65233c067659b8408d3538e6ff`, `c160a9980a5e0454fe6dc2a90c8079744e44a5d94ead3fefff0d5ecc7bbc5a5f`, `813c9758b72f1363e30f197129a29ed4bd9158f08f57630389fa9914946e4842` and `e9b7d429b4cd41ca74b65c047171196f6b4f65e0cfcd670b170dfbf96b6c6817`. `frames.json` is `56ceb055e4c97145c91f5ca69fa8f5a989d2f567b8121dbc024823b50b44c2d8`; `paint-placements.json` is `e3f237609a92d58d8a642438bb3dfbf2fa15691adb90530d5f5a1ea2d20ec174`; `analysis.json` is `ecb989b7f774a68d297ebd8063071816215b26df355165c5adeda474db1ca068`.

## What these frames are not, and what happened to the reference bytes

**They predate `d00c84b`.** The frames were captured at `e74375e`, before the fix that stopped an authored board drawing its black back face over the northern half of the scramble. I looked for that defect in both styles and did not find it: the northern half of the crossing, the north arm and the plaza behind it are clear in `plan-core-cartographic.png` and `plan-north-arm-satellite.png`, and no zebra band in any crop is clipped by an occluding slab. **That is a null observation at three poses and one hour of day, not a clearance**, and the honest reading is that this lane's bytes are pre-fix and any later reader should prefer a post-fix capture. If the coordinator wants this criterion's evidence to sit on a revision that contains the fix, these six frames must be re-captured and every digest in this round replaced.

**The reference imagery these comparisons used is gone from disk.** `data/decorations/paint-reference/` was deleted when another lane removed a worktree without unlinking its junctions, and `data/` was reached through them. The comparison is not inherited from a deleted file: the nine decoded tiles are stored as RGBA with their own digests, and each source JPEG's digest is recorded as it stood in `provenance.json`. A fresh `npm run data:paint-reference` reproduces or fails to reproduce those exact JPEG bytes, and `reference.spec.ts` refuses the run by name if a tile does not match. That check is what stops a re-fetched reference from silently moving the comparison.

## Disposition

**Criterion line 161 is partly met, and now the parts are separated by evidence rather than by what a downscaled preview could see.**

Met: the scramble's diagonals, in place and drawn at the bearings and lengths the placement record claims, with the reference confirming the junction's shape, extent and position to about 6 m. The zebra bands, with the stripe period measured from pixels at 1.10 m against an authored 1.05 m. Tactile strips, placed along OSM's own tactile paths and visible at 1:1. Signals, for the three of the four mapped controls near the crossing that the hardware placement could support. Street furniture, for what the source carries.

Not met: **guardrails**. There is none within 295 m of the crossing and `guardrailPosts: 0` is a literal that cannot say so.

Not establishable with this reference, and therefore carried rather than claimed: stripe pitch, stripe width, any 0.15 m line, the tactile strips, guardrails, and every paint edge. The reference's 0.486 m/px is a hard bound and this round does not pretend past it.

Carried, with the trap named: `plan.md`'s own citation of this criterion is stale by fourteen lines, and the criterion's line number has now been wrong in two different ways.

## Handoff

This round changed no application code. Its whole footprint is `docs/work/0_shibuya-1km/reviews/30_implementation.md` and the new lane under `tools/paint-review/`, which is additive and read by no build. `src/**`, `tools/scene/**` and every existing spec are untouched.

To integrate: land the review and the lane on main; then decide the four findings on their merits. D1 is a one-line deletion or a real count and belongs to whoever owns `src/scene/street-details.ts`. D2 is a placement question, not a paint one, and its fix is a decision about the 18 m transverse search at a junction whose pavement is a plaza. D3 needs a decision about whether 13% refused paint is acceptable. D4 needs a look at the verdict set's own frames, because a UI overlay in the top-right corner of all 44 of them is a review-surface problem rather than a scene one. If the criterion's evidence must sit on a revision containing `d00c84b`, re-capture and re-run, and this round's digests become the record of what the pre-fix bytes showed.
