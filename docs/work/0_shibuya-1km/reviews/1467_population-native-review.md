# 1467 — Independent native population review

2026-10-17. Native read-only reviewer `review1466`. Reviewed executable base `59fbb1ce7fedaaa9e43d6747fb35994790d093b5`; root reports docs-only main `32cb73f58510c8852ea9028c9f83e1f2b44a8349`. This is an independent visual review of the sealed [1466](1466_population-native-discriminator.md) eight-frame walkers capture, not a two-CLI code review or a population acceptance certificate. No runtime, browser, server, GPU, build, test or Git operation was launched by this reviewer.

**Verdict: recognizable drawn humans are established in this peripheral view; generic crowd appearance remains HOLD.** The blue T-shirt woman's pronounced head/neck posture is a material unresolved appearance concern. Do not enable generic population by default or qualify its assets from this packet. A localized read-only pose/bake diagnosis is the useful next step. A new central capture would answer a different question and would not resolve the current visible concern.

## Actual native observations

I opened all eight original PNGs individually with `view_image` at `detail: original`, 1280×720. They show a populated street with people on both sides. Heads, torsos, arms, separate legs, footwear and clothes are recognizable. Suits/ties, dark blue shirts/jeans and blue T-shirts/jeans remain distinct. Perspective and scale are plausible relative to the pavement and building edges. I did not observe exploded triangles, grossly stretched bodies or an entire missing body class. This establishes a much narrower success than believable finished crowd quality.

**1467-F1 — HOLD: the blue T-shirt woman's head posture needs explanation before appearance qualification.** The nearer examples in `walkers-02.png` around (647,451), `walkers-03.png` around (648,519) and `walkers-04.png` around (779,570) show a head strongly downturned/tilted toward a shoulder while the torso is upright. The face is largely obscured by dark hair, and the apparent neck/head relationship is conspicuous. I noticed this in my initial inspection before root requested a focused assessment. Several more distant blue-shirt figures show the same tendency, but their few head pixels cannot resolve anatomy. The stills establish the odd appearance; they do not establish whether it is an authored pose, baked deformation, a renderer error or a transient animation pose. No causal or continuous-motion finding is claimed. Preserve the images and inspect the existing source pose/bake path before considering a correction; a major asset/baker or simulation redesign is outside this review.

**1467-O1 — visible quality limitation:** repeated face/clothing models and long, orderly streams are readily apparent. Near bodies often overlap in projection. Those occlusions alone do not prove physical interpenetration. The sparse images and variable perspective do not establish natural crowd avoidance. This observation is not a new algorithm assignment.

Feet generally appear near the surface at this scale, with no confidently identified gross floating or deeply buried group. The right-hand pavement is dark and contact shadows are weak or indistinct, so exact sole support is unresolved. A crossed-leg pose in one still does not establish a gait defect or sliding. I cannot confidently identify a visible vehicle in any of the eight frames; recorded vehicle render counters do not supply vehicle appearance evidence.

| Original | Native observation anchor | Recorded tick bracket |
| --- | --- | --- |
| walkers-00 | Near suited men and dark-shirt man have coherent human silhouettes; both pavement streams are visible. | 2556–2621 |
| walkers-01 | Near suited and dark-shirt models remain recognizable; repeated faces and projection overlaps are conspicuous. | 2679–2734 |
| walkers-02 | Blue T-shirt woman at lower centre has a strongly downturned head; jeans, shoes and arm silhouettes remain readable. | 2789–2849 |
| walkers-03 | Near blue T-shirt woman's tilted head is clearer; the two clothed body classes behind her remain coherent. | 2904–2964 |
| walkers-04 | Front-right blue T-shirt woman's pronounced head tilt is the clearest static concern; nearby suited bodies are recognizable. | 3043–3098 |
| walkers-05 | Large suited foreground heads/torsos are intact; dark-shirt pair overlap in projection behind them. | 3153–3213 |
| walkers-06 | Near dark-shirt pair and suited man remain coherent; no vehicle is confidently visible. | 3268–3328 |
| walkers-07 | Near dark-shirt pair and suit remain readable; repeated queues persist on both sides. | 3383–3443 |

## Evidence and limits checked

The selected manifest requests `?agents=1&seed=9137&style=satellite&time=noon`, hardware rendering, 1280×720 and configured 3,000 pedestrians/200 vehicles. Its actual requested-counter field is not retained. Per-frame active/rendered counters rise from 1,146 to 1,469 pedestrians; vehicles range 74–79 and end at 74. These are app counters, not counted visible bodies. `pedestriansCrossed` is zero in every recorded sample, `vehiclesCrossed` rises 99→119 and recorded authority violations stay zero. None establishes an observed governed crossing, safe contact or full population.

The actual camera target is approximately (377.000,15.200,484.800), distance25.000m, azimuth−2.672500rad, polar1.465402rad. This is the existing peripheral walkers pose. The pre-shot ticks cover 13.7833 simulated seconds. Adjacent pre-shot gaps are 123,110,115,139,110,115,115 ticks (1.8333–2.3167 seconds). Screenshot brackets span55–65 ticks (0.9167–1.0833 seconds); the screenshot cannot be assigned the exact pre-shot pose/actor tick. Different positions and leg poses across these stills are not proof of continuous walking, planted feet, no sliding, collision safety or FPS.

The run log reports one passing populated test. The source's console/page-error assertion is at `tools/populated/populated.spec.ts:446`; the log supports that assertion passing, not an independently retained exhaustive error stream. Every manifest frame records `post.error:null`, tiles idle with zero pending, and the NVIDIA RTX4090/D3D11 renderer. Stderr contains only the two retained Node colour-environment warnings. Refusal details are not retained, so there is no no-refusal claim. Total supervised wall106.758s is not a frame-rate measurement.

I read the before/after input records and compared their rows:173 source,6 dist,121 scene,1 network,34 rail and4 Draco entries, plus two protected entries, are identical across the pair. Before SHA-256 `7d8b4d7c7875bc8e4dec3466bb62f904712178c4cbdf16ae2bc8966f36b66023`; after `dc4234a35e4c86cd69408f7ff7410c727a77f07aa69d46e8c8c102c7ecb402b5`. This is a comparison of the captured pin records, not a new whole-cache rehash. The served readback records15 HTTP200 inputs with matching disk digests; it explicitly does not intercept every page response. Its SHA-256 is `67c433c47710bea482477de8fa4ad54eae393ac12a145ea1be7e4782e5bd29e1`.

Manifest/build record: `dist/index.html` SHA-256 `ed3ea8e0c79edfab24767728cd954ebbf6cabbcb93f3bf1c05dd3f625eba9f39`; `dist/assets/index-DPZKZL87.js` `a48b40eb971130619c419bcca925ba4baea7367b9fc636b03a464f17c0d90f0c`; CSS `11dd032c51b536a500e2265a9acdcdda9070f73e6c0a8f31e75b6ad5ab7ba929`. The15-input HTTP readback agrees on all three. Source plan SHA-256 `ae76b6a676391f15d2fa83dc9c1f5147e78c735f58abb3329f2b9ff48f8fa7c7`; populated spec `91999bbe3df95be44e10f7b567f6585120e1a30b65be706b93e058b8322ae0b0`.

## Inspected-byte binding

All originals live under ignored `artifacts/population1466/selected/frames/walkers/`. I checked the evidence ancestors/files for reparse points before opening the originals. The following SHA-256 digests matched before and after native inspection; each PNG header also declares1280×720. This is an observed stable-file check, not an atomic filesystem lock.

| Original | SHA-256 before and after |
| --- | --- |
| walkers-00.png | `b36f7c752e206450c92cbc111b6de43e57e10dabe573a6e3003ad5ea9cf3241e` |
| walkers-01.png | `5f8446e8c29ec595f6978bc7263ab133744561a3ba48aefd7cef7a9ba995a251` |
| walkers-02.png | `883872af4ddda2d01343760a5479b67ad1cea11f9a25f211971bfbfc8755f8af` |
| walkers-03.png | `2907ccfbfd5a2d3f394b7f539d091036873fa976ae12d7e8154f211a0f104a0e` |
| walkers-04.png | `e3940088af25cff3774da158ff190b9ebbdeb76605bbcffd4c51120fa79a8a3f` |
| walkers-05.png | `12b185616d6486b3cec4d80541002678d4d227e112430997470a8db97a171624` |
| walkers-06.png | `5bb6cfb26e095aca5f3e4ae9891c6b50a6d0efac534aa8c609f8098f79161549` |
| walkers-07.png | `45ab9634c4a89bb90bc08e3ba4bf785eeac1974f3d11de434c31da1767779215` |

Selected manifest SHA-256 `d6271f680ee191da10260318626234879fb84bd49c75222fb9af17c1ddd56749` and capture ledger `a4e8d4b63c017521b78221cf6aad1ead368927f55be59d010ec20f9bbbdef3c0` also match before/after. Result JSON inspected at SHA-256 `06a75df31a3cadf8dc5c8310ef06751523a8c216661d6d80527ae40fd2a5a605`. Reviewer receipt `artifacts/review1466/native-inspection.json`, SHA-256 `0ca4a13bed4ff77a1d5471a15972cb43080cbcb20ae0a1e1e7b71fa9f74377d2`, retains the eight actual before/after checks. No crops, contact sheet or synthetic image substitutes were used.

## Next bounded decision

Defer an immediate central run until the localized head-pose question has a disposition. I checked the existing `crossing` sequence in `tools/populated/plan.ts:95`: target(0,0), distance45m,14 frames, earliest tick5100,120-tick intervals and phase alignment. It could later answer whether this early selected central view contains visible actors. It cannot qualify the current head posture, continuous signal behavior or final population. The old505m/boundary-only expectation in its prose is stale. Conversely, an early empty crossing after roughly88–116 simulated seconds would not prove the current central routes unusable: a fresh population still needs time to walk from distant entries. Do not turn this into a new capture framework or simulation research program.

All14 final criteria remain open. Runtime/code unchanged. The only reviewer-created evidence is the small ignored inspection receipt; this authored report is the retained review. No owned browser/GUI/process existed to clean up. Source diagnosis is separately owned by1468; its eventual conclusion cannot retroactively change what these pixels establish.
