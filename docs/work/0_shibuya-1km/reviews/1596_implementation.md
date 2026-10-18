# Review 1596: implementation

## Target

Actual candidate S1/train capture1601 on2026-10-18 UTC, uncommitted A source at artifacts/taa1582a/worktree, actual base16bb1f360eb1b530fb4cf92413f932b21dc11616, source freeze80f003149b1dbb1b075d5eeeea06e1b24a4924a8c23c44afc80730c06ff01bd4 and retained complete patch3648ae7bed00625e6e11e4ec78d6ab781c96f67ce2ad359dcd03908db738277e. The96 original1280x720 candidate images remain ignored at artifacts/taa1601/candidate-S1-run1/payload; fresh accepted-baseline qualification is [1595](1595_implementation.md).

Candidate result5da5e3f0e74ad728eb39ac59592c36ea919ede11777909572a4e0c6cd94c5f21; raw metadataac4f2431a65ef3e56b8d5c8844a9f648d957184b75ef0c827b1273f503c5a3f4; frame pins138cbfb37d62ed55233b55065c7d74bd95725c378794cef040efbe9995d3b9b0. Handoff78eba75db673cf47c26c24c1d0172f8a26b5d0919c3c7f3863d601a6862781de binds actual capture, pre/post source checks and resource closure. No source adoption.

## Reviewers and coverage

Native1603 independently inspected candidate000-050 plus eight specified fresh baseline anchors; native1604 independently inspected045-095 plus eight anchors. Together all96 candidate originals were opened at native resolution with overlap045-050. They separately checked all59 inspected images per assignment before/after. Their substantive reports follow unchanged; SHA-256 c59433222e990571bbba0e558995cb56c718bcb9a6cfd638449864acb14705dc andbd373f6233537f74ca0328f73c19131e1e3290a25c0c4f2d5d2c5a44b57d119e.

## Reports

### Native1603 first-half reviewer

# 1607 — Candidate S1 appearance, frames 000–050

Independent read-only comparison on 2026-10-18 UTC by native1603_baseline_first. PASS within the preservation scope: no material regression identified in the inspected candidate segment. This is not candidate adoption or temporal-quality acceptance.

I opened every candidate original frame-000.png through frame-050.png sequentially at original 1280×720, plus fresh baseline originals 000, 008, 016, 024, 032, 040, 048 and 050. Coverage is 51/51 candidate and 8/8 required baseline, zero gaps. No contact sheet, crops, thumbnails, encoding, rejected train1473 pixels or other critic report was used. An initial missing node fs binding prevented the first hash attempt; after importing it, I pinned all 59 files and reopened the first five images before completing the ordered inspection.

All four cars remain fully visible, with car joints, pale roofs, dark roof modules, a thin green band and repeated dark side windows. The train remains about 260 native pixels long and roughly a dozen pixels high. This scale supports the visible band/window-row/silhouette comparison, not a claim about fine individual window frames or undercarriage detail. Candidate 000 versus baseline 000, candidate 024 versus baseline 024, and candidate 050 versus baseline 050 retain those elements. The intervening candidate frames and all other required baseline anchors were also inspected.

The parallel tracks retain their fine repeated structure. Nearby roofs, rooftop gardens, small rooftop equipment, facades and the large right-hand building retain comparable visible detail. I found no persistent blur wash, material replacement, opaque occlusion or gross softening against the eight baseline anchors. Candidate 023→024→025 and 048→049→050 show no obvious detached train ghost trail or abrupt scene exposure change; none was observed through the other inspected adjacent transitions. No gross sign/brightness pumping was evident. These are visual observations from ordered stills, not playback-speed proof of flicker, stripe/window crawl or AO stability.

The baseline and candidate event phases are nearby, and exact pose/pixel alignment is not assumed. Small positional and sampling differences cannot establish improvement by themselves. This review establishes no perceived crawl reduction or substantial visible quality gain.

Independent before/after SHA-256 and byte counts match for all 59 inspected originals. PNG headers read 1280×720. All 51 candidate pins match raw-frames.json, result.json and the final candidate frame-pin manifest. The candidate metadata segment records frameCount 2931–2981 and pageMs 63512.79999999702 before frame000 through 64346.79999999702 after frame050. Candidate result/raw bytes also remained unchanged. The accompanying hash receipt retains all individual pins, native dimensions and final handoff/frame-pin file hashes.

Result SHA-256: 5da5e3f0e74ad728eb39ac59592c36ea919ede11777909572a4e0c6cd94c5f21. Raw-frame metadata SHA-256: ac4f2431a65ef3e56b8d5c8844a9f648d957184b75ef0c827b1273f503c5a3f4. Final frame-pin manifest SHA-256: 138cbfb37d62ed55233b55065c7d74bd95725c378794cef040efbe9995d3b9b0.

Candidate frames 051–095 were not inspected by this reviewer. Ordinary-scene history contribution, perceived crawl, held-out views, cost, lifecycle, full gates, A6 and full population/FPS remain outside this verdict. Capture SUCCESS and post flags cannot fill those gaps. No source, index, Git, browser, GPU, server or external model CLI work was performed. Only this new report and receipt under ignored artifacts/native1607 were saved; original frames and the prior native1603 report remain unchanged.

### Native1604 second-half reviewer

# 1608 — Candidate S1 native preservation, frames 045–095

2026-10-18 UTC. Independent reviewer native1608_second_half. PASS within assigned preservation scope: no material visual regression identified. Temporal improvement and A6 are not established.

I opened every candidate original045–095 sequentially at native1280×720, and reopened baseline045/053/061/069/077/085/093/095 alongside their candidate ordinal. All59 files were actually viewed with view_image detail=original. No crops, thumbnails, contact sheets, downsampling, substitutes, rejected train1473 pixels or encoded playback were used. I did not read the other critic's judgment. No candidate coverage before045 is claimed.

All four cars stay fully visible and unobstructed. Pale roofs and bodies, dark separate windows, car divisions and the narrow green side band remain distinguishable. The045/053 baseline comparisons preserve the train silhouette and feature contrast. The061/069/077 comparisons retain separate windows and pale roof edges without obvious doubled outlines or long trails. The085/093/095 comparisons preserve the green band, window rhythm and four-car divisions. No persistent material softening that erases these features was identified.

Fine parallel rail patterns remain visible. The central building row and large right-hand tower preserve rooftop structures and facade-window patterns. The rounded dome and green foreground roof preserve their forms and texture cues. I found no material scene-detail loss against the eight reopened baselines. Across all51 adjacent candidate stills I found no obvious brightness pumping, exposure jump, material disappearance, opaque obstruction or persistent ghost trail.

The distant train occupies roughly265–270px in length, and individual side details only a few pixels. Close-detail quality and wheel/contact behavior remain outside this bound. Fine rail/window-edge sampling varies as the camera and train move. Still inspection cannot establish reduced perceived crawl or shimmer. Shared intended controls/event selection do not make the arms phase-, pose- or pixel-aligned A/B evidence, so small raster differences are not automatically defects or gains.

Candidate subset frameCount2976–3026; before-copy pageMs64264.59999999404–65099.09999999404, span834.5ms. Last after-copy pageMs65100.69999999553 gives836.1000000014901ms through final copy. Adjacent before-copy gaps14.400000005960464–19.5ms. Train simulation47.49833333333193–48.33163333333187s; station490.75754658224264–481.2808796671928; direction−1 and four cars throughout. Full96-frame1587.9ms is outside this subset's coverage.

All59 inspected image SHA-256 digests and byte lengths remained identical before/after inspection. Filename, bytes and digest match each arm's raw/frame-pin metadata; raw and pin frameCount/before-copy pageMs agree. The accompanying inspected-hash-receipt.json contains all59 hashes and independently verified metadata digests. Candidate045 digest08d54b0ac849d0c5f81df5cee8c4828a39b042e8e88cf387a5a94ebf38ba1059; candidate095 fb490f20954bff67613baba547d2060ad76df2a6db5594967ce15d2b85806efc.

Ordinary-scene history contribution, perceived crawl, held-out preservation, cost, full gates and A6 remain owed. Metadata flags are not pixel proof. No browser/GPU/server/external reviewer CLI/encoding/runtime gates/source/index/Git writes occurred. Only this report and receipt are retained under ignored artifacts/native1608; native1604 is untouched.

The independently hash-bound retained candidate cleanup record reports PASS: known5/omitted3; no remaining known/omitted/current late edges; marker0; port4371zero; profile absent. This is capture-resource evidence, not quality evidence or a fresh reviewer census. No persistent review-owned process was created. First report-save command exceeded Windows process-command length and failed before process creation; this save reduces serialization only.

## Findings and disposition

No material preservation finding in the complete candidate population. Root accepts the combined distant train/detail PASS. The four cars, side band/window rhythm, roofs, rails and surrounding buildings remain useful at this scale. Root retains both reviewers' limits: no substantial visible improvement, perceived crawl reduction, playback stability, close wheel/contact, ordinary-scene contribution, held-out, cost/FPS or A6 acceptance is established.

## Verification

Actual event matched within the same40s/15s-reserve predicate at simulation46.6983333s/station499.332855/speed10.3991352/direction-1; wait22.916s. Frames2931-3026 are adjacent over1587.9ms of page time. Capture74.506s/controller76.077s/external77.262s completed with exit0/no timeout or reported render/request failure. Both acquired resources closed, pending0 and both cleanup promises fulfilled. Fresh known5/omitted3/late0 census PASS, marker0,port4371zero, exact115-entry/nonreparse profile removed and absent. Root read the actual closure artifact and natively opened setup,000 and095; those spot checks do not replace the complete independent reviews.

All12 preparation files,8 source bodies, both builds/runtime caches, harness/certificate/protected files and102 accepted-baseline evidence pins remained unchanged. Reported direction and near event times do not make the arms pose/phase/pixel-aligned. The later driver query is labelled post-run. Full candidate gates, held-out, cost/FPS and code adoption were NOT RUN. Exact aggregate model work/review time are unknown; the reports retain their file-binding and serialization failures without disguising them as visual failures or waived checks.

A separate read-only instrument investigation by native1605 found no existing command that establishes perceived temporal improvement or ordinary-scene accepted history. Current tools/flicker/judge.ts:273 deliberately returns sceneVerdict not-established; its integer translation residual confounds rotation, parallax, fractional sampling and actors. The public default is12 agent-free frames at another pose, capped32; it cannot replace the96-frame contract. Post ready/frames and final canvas stills do not exclude every visible history pixel being rejected. [1591](1591_moving-aa-component-result-review.md) establishes contribution in controlled scenes only; no actual Shibuya failure was observed by the investigator.

The bounded proposal is to reuse the existing readRenderTargetPixels observer in artifacts/taa1582a/worktree/artifacts/taa1586/browser.js:12-21 around the original production ReprojectedHistoryPass.render and native pre-AO input. On ordinary real-controls app frames, independently identify a nonempty mask/depth-consistent set with prior/current separation above quantization, distinguish the actual half blend from current-only output and retain native-transfer checking. Hook the app's canonical source modules; importing the observer alongside a compiled preview patches another class. This is a separate instrumented diagnostic, with no production setter/export, new capture/proof/player framework or timing/quality substitution. It is proposed, not implemented or dispatched. Perceived crawl still requires temporal viewing; view_image/metadata/residuals do not establish it.

## Round outcome

S1 preservation pilot PASS, alongside S0's bounded detail PASS. A remains unmerged and unadopted; accepted executable e1097edd and A1/A4/A12 remain unchanged, other11 criteria OPEN. Next bounded work is held-out preparation and the ordinary-scene contribution question; no full-gate repeat before those necessary evidence decisions. Both capture sessions and reviewers retain no browser/server/GPU resources. No retry or source change occurred.
