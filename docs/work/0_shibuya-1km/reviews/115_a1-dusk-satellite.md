# A1 dusk Satellite native-still review

Bound: ten original 1280x720 PNGs, each personally opened once with `view_image(detail="original")`, with the per-image observation saved immediately afterward. This is an appearance review of the captured pixels, not a motion, population, source-completeness or geographic-accuracy verdict. No contact sheet, crop, thumbnail or video was used as inspection evidence.

Assignment source revision: `13ef7e83c56202a17aa56975ef5786825bfcff2f`. Input root: `artifacts/final-flythrough-prep-20260927/run-01/dusk/`. The ten files still matched their pre-inspection SHA-256 values after all ten views. `native-inspection-ledger.json` contains the individual observations, dimensions, byte counts and hashes; `inputs.json` is the pre-inspection manifest.

Root subsequently reported successful verification of the complete capture binding, including all 41 listed files and current source/build/harness/scene/GPU. Its reported `bound-complete` SHA-256 is `6590318e3a64fe9869c42d6f4d8e23987daa79a558712d0a41d4c23c90fda077`. I independently rehashed only my ten PNGs; the whole-run binding remains root's verification.

## Bounded verdict

The aerial views show a coherent dense city cutout, and the plaza views make the crossing legible. I found no definite missing opaque world surface, detached geometry, escaped object or foliage-support failure in these ten views. That limited result does not establish that none exists elsewhere.

Do not close the supreme-visual-quality objective on this set. Two P2 presentation findings remain, plus one P2 provisional surface concern that needs identification before a repair can be specified. None is established here as an introduced D1 regression. The close-facade problem plausibly includes inherited source-resolution limits, but its visible prominence still limits the requested product appearance. No extra design requirement is inferred for the aerial frame's cropped lower corner.

Motion acceptance remains open. I did not personally view a video. Ten separated stills cannot establish smooth motion, flicker, crawl, continuous geometry stability or sustained frame rate. Empty actors were confirmed by root as the current default and are not reported as an A1 capture omission.

## A1-01 — P2: default opening obscures the scene's street-level anchor

Evidence: `default-opening.png`, SHA-256 `2d2a9bf32ba95e9f1eb87f6e76367396aa2c59467c9734015959c1d606e61f6d`.

Observation: several close towers fill the centre and foreground, with buildings cut by the lower and side edges. The crossing is hidden, most connected street space is obscured, and the opening emphasizes the soft photographic faces of the nearest towers. Approximate affected native region: x=240-1070, y=120-719. This is a framing problem in the first view, even though the skyline is recognizably dense and the later plaza captures provide a much clearer anchor.

Minimal next probe: have the capture owner record the existing default camera pose/target and obtain one controls-driven alternate landing view with a visible crossing and enough surrounding blocks to orient the viewer. Compare the two native images before selecting a camera change. No geometry or material change is implied by this finding.

## A1-02 — P2: large close photographic surfaces look smeared beside sharp authored detail

Primary evidence: `dusk-satellite-plaza-mid.png`, SHA-256 `412365088605d310062bcfe1d66b9e3a2eddbc0c4a9a67770b0708c0790bbaf5`. Corroboration: `dusk-satellite-plaza-start.png`, SHA-256 `cc572422d48740c54f3251d97f2b816f6021471a48bc2683a3e86978804cecc5`; `dusk-satellite-plaza-end.png`, SHA-256 `477983d364971c6d3d1346bdd66885833a4e7f079e9ad67c27e8d280c895b1c9`.

Observation: the large right-edge facade in plaza-mid (approximately x=1065-1279, y=145-367) resolves as broad blurred colour blocks, and the lower central frontage (approximately x=590-865, y=245-342) has stretched, indistinct storefront imagery. The added red/blue signs, paving pattern, crossing bars and foliage are visibly sharper. That inconsistent detail quality is prominent at the ordinary plaza viewing distance and weakens the photographic treatment. The close foreground roof/facade cluster in the block views supplies secondary evidence, but the primary finding does not depend on it.

Attribution: unresolved. The scene rules disclose source atlas caps and one native frontage leaf; these pixels alone cannot separate original imagery, atlas downsampling, UV stretch and post-processing. This review does not claim that D1 introduced the softness or that an atlas-size increase would fix it.

Minimal next probe: use the existing read-only surface/ray-hit inspection path at those two native regions to identify the rendered tile, atlas dimensions and source texels. Compare only the implicated patches with their original atlas at the same effective scale. If the original has usable detail, isolate filtering/downsampling or UV loss; if it does not, explicitly record the source-fidelity limit before proposing a targeted presentation change. Do not globally increase texture memory on this evidence alone.

## A1-03 — P2 provisional: a broad bare-looking corridor needs surface identification

Evidence: `dusk-satellite-block-mid.png`, SHA-256 `7383795c25bc5100a5e054226a9544aa962207374984edd6cb8a1fb57fc2e139`; `dusk-satellite-block-end.png`, SHA-256 `1ecb4918fea0467e5c10cc30a06be1d6f38f46c5f05ec9c095a1a650322b6acb`.

Observation: right of the crossing, an olive/grey strip extends between building rows from approximately x=820-930, y=370-394 toward x=940-970, y=242-273. A representative interior sample is around (889, 318). It reads as nearly featureless ground beside the much darker surfaced cross street at its near end. The same strip remains visible in block-end. It is opaque: I did not observe a transparent hole. Its intended type and source authority are not established; it must not yet be called a missing road, missing railway, absent pavement or terrain defect.

Minimal next probe: at the frozen block-mid camera, identify the visible draw surface and source feature at (889, 318), plus near-end and far-end samples inside the strip, through the read-only scene inspection instrument. Determine its mesh/material and whether the source class is road, rail, pavement, land cover or another feature. Then compare that classification with the authored rendering policy. This is the smallest probe that can turn the visible concern into a repairable defect or a justified source limitation.

## Per-file native inspection record

All ten entries below were opened individually at their native 1280x720 resolution. Full prose observations are in the ledger.

| File | SHA-256 | Native inspection result |
| --- | --- | --- |
| `default-opening.png` | `2d2a9bf32ba95e9f1eb87f6e76367396aa2c59467c9734015959c1d606e61f6d` | A1-01; close facades soft. |
| `dusk-satellite-plaza-start.png` | `cc572422d48740c54f3251d97f2b816f6021471a48bc2683a3e86978804cecc5` | A1-02; continuous foreground support. |
| `dusk-satellite-plaza-mid.png` | `412365088605d310062bcfe1d66b9e3a2eddbc0c4a9a67770b0708c0790bbaf5` | A1-02; fine paint edges cannot prove crawl. |
| `dusk-satellite-plaza-end.png` | `477983d364971c6d3d1346bdd66885833a4e7f079e9ad67c27e8d280c895b1c9` | A1-02; no separate geometry finding. |
| `dusk-satellite-block-start.png` | `a72cb6a5f684e4fa6732277eb6a720d369a1bdf424a394150f393988fb1ffda6` | Coherent block view; close dark/stretched surfaces. |
| `dusk-satellite-block-mid.png` | `7383795c25bc5100a5e054226a9544aa962207374984edd6cb8a1fb57fc2e139` | A1-03; crossing stays legible. |
| `dusk-satellite-block-end.png` | `1ecb4918fea0467e5c10cc30a06be1d6f38f46c5f05ec9c095a1a650322b6acb` | A1-03 persists; no proven transparent hole. |
| `dusk-satellite-overhead-start.png` | `8240b534657c7b879ee641426eeff91f5758bda31a0e945fa3f35b9bda81f046` | Coherent cutout; no definite escaped geometry. |
| `dusk-satellite-overhead-mid.png` | `c470488cf9470ec710560e95894f657be661cb6097a2e2b7e86130ff61d40b4f` | Coherent rotation and street network; no new blocker. |
| `dusk-satellite-overhead-end.png` | `92b543ec6ee14756f7b0bc6c3ae7f6243209b95a977abf8cc06f588e39e0a3af` | No additional material finding. |

## Resource and verification record

The inspection instrument was the original-size image viewer; no browser, server, GPU capture, build, source/data mutation or test was launched. Exactly ten image calls were made. Only this review directory was written. The final ten-input hash recheck and ten-unique-ledger-entry check completed without a mismatch. A read-only `Win32_Process` ownership inventory was unavailable with `Access denied`; this reviewer created no browser/GUI/server process to terminate. The capture worker retains responsibility for its separately owned process tree. These artifacts are retained for root's active review handoff.

## Authored follow-up — 18 extracted dusk Satellite motion witnesses

This follow-up preserves the original still findings above. I personally opened exactly 18 additional original-size 1280x720 PNGs, one at a time, for 28 personal native image calls in total. Each observation and its expected SHA-256 were persisted immediately afterward in the separate `motion-inspection-ledger.json`. The final check independently rehashed all 18 samples and all ten original stills, checked the 18 PNG headers for 1280x720 dimensions, and found no mismatch. No additional image, contact sheet or video playback was viewed.

The exact selected-file manifest is `artifacts/final-flythrough-review-prep-20260927/dusk-satellite-manifest.json`, SHA-256 `31f65aba3c4eef2439368062d41dda3e59e14799670ba23ed237053e128adff8`. Its metadata file SHA-256 was independently confirmed as `338268e05d037c9ffaa43e535ff327f64b3ccf121bc033a5a1b9c104e98404a7`. Those records bind the sampled saved dusk video SHA-256 `9db7491798e6278a2a2a8905d1196e5c2e8751649f74cc770a9cd1fd9b8036ef`; I did not independently rehash or play that video. Root owns the whole-capture binding verification. The decoded PNGs are lossless files of lossy VP8 video frames, so they do not recover uncompressed rendering detail.

Coverage is exactly two selected interior witnesses per labelled drag, wheel and released phase for each of plaza, block and overhead. The labels rely on approximate wall-clock alignment: video creation precedes the manifest anchor by 43 ms, and that offset does not establish exact synchronization with encoded timestamps. The table records actual encoded presentation timestamps (PTS) from the supplied extraction record and the separately estimated phase bounds. These are 18 separated frames within 25.12-73.96 s of a recorded 158.44 s video. Paired witnesses are 2.20-2.68 s apart; none is an adjacent-frame pair. The reported 25 fps belongs to the video record, not a measurement of app rendering performance.

| Cell | Approximate phase | Actual encoded PTS, seconds | Estimated phase bounds, seconds |
| --- | --- | --- | --- |
| Plaza | Drag | 25.12, 27.40 | 23.962-28.727 |
| Plaza | Wheel | 30.08, 32.76 | 28.727-34.276 |
| Plaza | Released | 35.36, 37.56 | 34.276-38.403 |
| Block | Drag | 43.20, 45.52 | 41.978-46.895 |
| Block | Wheel | 48.20, 50.88 | 46.895-52.407 |
| Block | Released | 53.52, 55.72 | 52.407-56.564 |
| Overhead | Drag | 61.40, 63.72 | 60.212-65.065 |
| Overhead | Wheel | 66.44, 69.08 | 65.065-70.642 |
| Overhead | Released | 71.76, 73.96 | 70.642-74.859 |

The sampled plaza views retain the major crossing groups, continuous foreground support, central facades and right tree row. They reinforce A1-02's close-facade detail mismatch. They show no additional large missing object or support defect. Paving and edge sharpness varies across the encoded witnesses; this review cannot attribute that to rendering versus compression or judge whether it crawls in motion.

The sampled block views retain the crossing and roof masses and repeatedly show A1-03's opaque bare-looking strip. `dusk-satellite/dusk-satellite-block-drag-5.png`, SHA-256 `3ec1b6afb1283778a3e23be7ee2eda437d1b6b2953df9153ca1a87ed08ec5d01`, at PTS 43.20 s also places a very close, soft photographic facade across roughly the right quarter of the frame. By the paired sample at 45.52 s it has shifted toward the edge as the view changes. That is an additional witness of the close-framing/fidelity limitation, not proof of camera penetration, a disappearing building or a new implementation defect. Source classification for the bare strip remains with the worker assigned by root; no duplicate diagnosis was attempted here.

The sampled overhead views preserve the dense square-cutout arrangement, major towers and broad street network. I found no additional large disappearing city section, clearly escaped fragment or missing opaque support in these six samples. The drag witnesses contain coarse bright detail along fine roofs and road markings; `dusk-satellite/dusk-satellite-overhead-drag-5.png`, SHA-256 `8c9d83350f3c1370bdf6aa0a7a03adf8423492a9fd91b9739c9a4ec5784dd73a`, at PTS 61.40 s is an example. This is an observed image-quality limit of the encoded witness, not an attribution to renderer aliasing or evidence of temporal flicker. It must not be described as a clean fine-stability result.

Combined bounded verdict: no additional material defect is established by the 18 samples, while A1-01 and A1-02 and the provisional A1-03 concern remain open as recorded above. Sparse witnesses do not resolve their investigations. They also do not establish full playback, absence of intervening popping, continuous support, fine temporal stability, quantitative flicker/crawl, simulation or population performance. Motion acceptance remains open. This follow-up launched no browser, GPU capture, server, build or test and changed only this review directory.
