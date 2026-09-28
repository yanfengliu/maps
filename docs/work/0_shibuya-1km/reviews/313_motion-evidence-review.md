# Motion-evidence and acceptance review 313

Verdict: preserve appearance HOLD309 and independent recorder FAIL304. Redirect from another pose-sampling or gait-parameter sweep to the already assigned source-to-draw comparison. The available evidence does not show that a faulty sampling instrument explains away the near-view concern. It also does not justify treating weak frontal arm visibility as proof that the upper-body animation is absent or unnatural.

## Scope and independence

Read-only review of walking304 run1, source freeze 46f6c5e072670abcd61b165964100c1c10dd4767be22ff966f14df7e1f7b237e. Primary HEAD is 5c1a4a772cd57cb4abda14e1c227db530553d05b with the source303 union uncommitted. No source, tracked documentation, build, browser, server, GPU, installer or controller-history change was made. No test, gate, new capture or recorder diagnosis ran. Initial judgment was saved in INITIAL.md before reading 299 or 309; no conclusion was exchanged with branch314.

I opened three originals and sixteen sparsely decoded frames individually at native 1280x720. No crops, resizing, recomposition, visual enhancement, contact sheets or generated images were used. Decoding used the installed FFmpeg4.0.2 VP9 decoder headlessly, then lossless PPM-to-PNG serialization with Pillow. This is sampled-still inspection, not continuous playback. The initial note's statement about needing playback is an epistemic limit on continuous-motion claims, not a proposed new certification requirement. Bounded pose findings remain possible without playback.

## What the pixels say

The three initial originals were near1118 and1170 at sampled times1.183866667/1.502866667s and medium3994 at20.0115s. Their hashes are in INITIAL.md. The near pair presents a roughly145-151px person, and the medium view a roughly48px person. The near lower legs exchange their bent/extended arrangement, but the arms remain down and the torso has a very similar upright outline.

The denser near samples at encoded PTS0.000,0.102,0.216,0.303,0.399,0.512,0.601,0.700s add intermediate leg arrangements. In particular, index0 has the screen-right shoe raised; index6 extends it lower while the other leg begins its change; indices15-21 present the opposite lower-leg arrangement. The torso, head and shoulder line remain very similar in all eight. Small arm/hand differences are visible but do not open into a strong whole-body walking silhouette. This reproduces the concrete near readability concern outside the original three selected poses. It does not prove a frozen torso, absent arm animation, bad temporal smoothness or a particular source defect.

The medium samples at PTS0.000,0.098,0.198,0.298,0.399,0.498,0.608,0.699s show a clear sequence of extended and passing-leg silhouettes: indices0/15/18 are more extended and3/6/12 are narrower. The small profile therefore retains a stronger walking read despite having about one-third the near actor's height. Fine shoulder/pelvis motion and sole locking are not reliably resolved at that size. This is useful evidence against interpreting the near frontal stills as a universal frozen-actor failure. It is not continuous naturalness acceptance.

A bounded geometry check explains why the two cameras carry different evidence. Using captured root displacement as travel direction and the recorded root-to-camera vector, the eight near associations are only2.826-3.135degrees off the actor's travel axis. Medium associations are111.848-113.824degrees. Fore/aft limb displacement is therefore strongly foreshortened near and exposed in the medium profile. These are horizontal camera/route angles, not a model of rendered joint motion. Requiring a large frontal arm swing would risk authoring motion for the camera, which contract311 forbids. Keep both existing cameras; neither a new flattering camera nor a larger arbitrary sway is supported.

## Decoded timing facts

Both clips fully decoded without FFmpeg error. These rates are (decodedFrames-1)/(lastPTS-firstPTS); they describe retained encoded presentation intervals, not simulation FPS, isolated GPU time, a constant-rate promise or final frame duration.

| Clip | Input SHA-256 | Decoded frames | First/last PTS | Mean inter-frame rate | Decoded interval min/median/max |
| --- | --- | --- | --- | --- | --- |
| near-walking | 601fb56063a40d4cf078189412cc73deabbdb3605ee33307685585d262d34bc9 | 73 | 0.000/2.408s | 29.900332fps | 17/34/45ms |
| medium-walking | e326cb815b78d1280ca2dd18191d4586c2315a7c5ea58254e1199fd5c172b0f7 | 49 | 0.000/1.599s | 30.018762fps | 13/35/52ms |

All122 decoded frames are1280x720. Neither clip has a non-increasing PTS or an adjacent identical decoded YUV checksum; that checksum observation does not prove actor motion because the rest of the frame can change. Clip metadata reports no duration, so the last-frame display end is not inferred. Counts match73/49 capture-track records. Every decoded PTS agrees with its same-index track timestamp to below1ms: maximum0.970ms near and0.898ms medium. This is positive evidence that requested30fps produced approximately30 encoded frames per second. It does not repair FAIL304.

Inspected near gaps are102,114,87,96,113,89,99ms. Inspected medium gaps are98,100,100,101,99,110,91ms. Sixteen of122 decoded frames were visually inspected;106 were not. The eight near associated draw-time records span0.846366667-1.526866667s and medium20.023633333-20.714933333s. Retained liftoff events repeat the same side every0.633333333s in these windows, so the samples span about one recorded leg cycle rather than repeatedly selecting the same phase. These are associated observations, not exact encoded-pose labels, for the reason below.

## Concrete instrument counterexample

Medium decoded index18 has PTS0.608s and PNG SHA-256 fad1a1886be550bfce709b9c7b03223325b0d384e1f1dcc1e4e6c01e3bd3077a. Its pixels visibly retain the clean Cartographic facade/window grid, matching the original medium3994 treatment. The same-index capture-track record has timestamp608502us and associates observed.style="satellite", observed.frame4097 and draw.sampledSeconds20.64343333333344. Decoded index21 atPTS0.699s, SHA-256 c9de7704adc33500ba3da367beea3d0d7eb2dae6d8eda0406c276503197f84a5, visibly has the photographed Satellite facades.

Thus accurate encoded/track timestamps and matching frame counts do not establish exact correspondence between an encoded frame's visible state and the RAF observation paired with that track frame. At least at this style boundary the observation has the new style while the encoded pixels retain the old one. No cause or delay size is inferred. This is a concrete counterexample to using these observation fields as authoritative per-encoded-frame style or gait-phase labels. It does not invalidate the original PNGs' own same-task bindings, show that gait is good, or excuse the console error. Decode-ledger.json retains every PTS, selected image digest and associated observation needed to check it.

## Acceptance assessment and remaining gap

Review309 is defensible as a scoped judgment that the near poses have weak whole-body walking readability. Its own text explicitly limits the conclusion to inspected samples and excludes continuous motion. The extra sparse decoded samples do not overturn that finding. Neither309 nor this branch establishes that actual played motion is stiff, smooth, natural or unnatural. Static upright posture plus small frontal arm displacement is also insufficient to diagnose the animation path.

The exact unresolved product question is whether the rendered whole-body cycle, at both retained cameras and in both styles, gives convincing natural walking rather than merely visible leg alternation. This branch adds eight Satellite near samples, six clearly Cartographic medium samples and the medium transition; it does not independently cover a full native near Cartographic cycle or continuous playback. The encoded pose-to-observation mismatch also prevents elevating the associated numeric phase labels into an exact pixel-level phase proof. Numerical root/contact checks and30fps decoding cannot answer naturalness.

Recommendation: do not change the acceptance bar or add another recorder architecture merely to seek a pass. Compare the independent source-to-draw result against this bounded evidence first. If it finds a concrete whole-body composition defect, one correction can be judged at the unchanged near and held-out medium cameras with the same controls and contact bounds. If no such defect is found, keep this opt-in experiment explicitly held rather than repeat foot-height, sway or sample-time tuning without a mechanism. The whole-map goal is better served by the next already approved visible city-quality unit while that scoped hold remains clear. The large building/pavement surfaces dominate all inspected views; a mechanical gait pass by itself would not establish supreme whole-map quality.

## Retained evidence and cleanup

INITIAL.md, REPORT.md, decode-ledger.json, the two FFmpeg decode logs, decode.py/facts.py, and sixteen native decoded PNGs are intentionally retained only under artifacts/gait313-20260928 for this unresolved handoff. The original walking304 packet was read only. All temporary PPMs were deleted after lossless serialization. Every decoder child was waited in a finally cleanup path; the ledger records their PIDs and exited status. No browser, server, GPU or GUI resource was started. No product change is proposed or integrated, and preserve=false remains unchanged.
