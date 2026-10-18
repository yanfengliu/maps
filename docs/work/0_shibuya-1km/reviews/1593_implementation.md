# Review 1593: implementation

## Target

Actual candidate1593 S0 capture on 2026-10-18 UTC using unadopted A source at artifacts/taa1582a/worktree, base16bb1f360eb1b530fb4cf92413f932b21dc11616. Capture result artifacts/taa1593/candidate-S0-run1/payload/result.json SHA-256 c5c8f60b47cb2ae17abb0a2e27b314a907a1d607262fd725719bc791cd307835;96 native1280x720 originals; frame pins f6ad8d0637d7d98273bf4382601fb79ea8ad6b491ecdfff56562b151f338cfcf. The source/protocol target and recoverability bounds are retained in [1592](1592_integration.md). These pixels are retained ignored evidence, not committed scene inputs.

## Reviewers and coverage

Two independent reviewers inspected original native frames in sequence. Native1595 covered000-050 plus eight baseline originals; native1596 covered045-095 plus eight baseline originals and one rejected1560 calibration original. Their union covers all96 candidate frames with overlap045-050. Each checked all inspected PNG hashes before/after. Original report hashes: native1595 4ae23afd22315e7dab933e751f3e7c96f2c572d366b1d46284eac6be0dc6380d; native1596 e891c38edcccd579f361940640fb1710f0dd6b45f8a8d627b26a32504c7d239a. Their substantive authored reports follow unchanged.

## Reports

### Native1595 first-half reviewer

# Native1595 — independent first-half S0 visual review

2026-10-18 UTC. Read-only reviewer; source and the other reviewer's judgment unread. Reviewed against 1552/1582 and the repository native-original rule. Verdict: **PASS for candidate frame-000.png through frame-050.png native still-detail inspection only.** No whole-S0 or A6 adoption.

Opened all 51 candidate originals in increasing index order with view_image detail=original at 1280×720. Also opened accepted baseline originals 000, 008, 016, 024, 032, 040, 048 and 050 at the same native size. No contact sheets, thumbnails, crops, regenerated encodings or playback were used. The accompanying first-half-inspected-hashes.json lists the actual 59 files and identical before/after SHA-256 pins. Each candidate pin independently matches its raw-frames record. No candidate frame in 000–050 is unviewed.

The close and middle paving joints remain defined throughout 000–050. At 000/008/016 the individual foreground rectangles and yellow tactile grooves are visible; at 024/032/040/048/050 their edges remain distinct as the camera turns. This avoids the persistent fine-detail softening disqualifier. The eight directly reopened baseline samples retain a comparable level of paving structure. The oblique thin joints toward the right still resolve into short pixel segments in places; that appearance also exists in the baseline and is not evidence of a new candidate regression or a demonstrated temporal improvement.

The near-left, central and right crossing stripes retain separate white bands and dark gaps throughout 000–050. At 016–024 and 040–050 I see no double stripe edge or retained old-pose silhouette. The large right facade retains its window grid; the lit ground-floor bays retain dark mullions and interior patches. The SHIBUYA sign and both red TOKYO signs preserve lettering/contrast in the inspected sequence without an obvious sudden brightness step. Existing soft photographic facade areas also occur in the baseline. I found no material persistent candidate softening of those areas.

The small walker at the far left remains a single separated silhouette while changing position across 000–050; no distinct trailing duplicate was visible in any inspected original. Its small on-screen size limits assessment of subpixel limb trails. The lamp posts, distant frontage, trees and roadway show no new material surrounding regression in these frames. No concrete material defect requiring a frame-specific rejection was found.

The candidate subset's raw records report frameCount 1676–1726, unchanged within each copy, over pageMs 42861.89999999851–43694.60000000149 (832.7000000029802 ms). This describes captured samples, not measured FPS or visual motion perception. The full capture handoff reports 96 frames over 1587.7000000029802 ms; this reviewer does not extend appearance claims to 051–095.

The reused baseline is a qualitative pilot comparison: pose, timing and simulation phase differ slightly, and the historical per-native-run driver was not observed. No pixel-aligned A/B, performance, whole-frame history-veto exclusion, or reduced perceived crawl conclusion follows. Sequential stills did not reveal an obvious sign/stripe/window pumping pattern, exposure jump or ghost trail, but do not establish flicker-free playback. I did not inspect the rejected1560 arm, source, new GPU contribution controls, S1, fractional-DPR held-out sequence, teardown, full population or public gates. Prior component results are not transferred into this quality verdict.

No browser, GUI, server or GPU process was launched or owned by this review. Only this retained review and its hash receipt were written; no source/index/Git mutation.

### Native1596 second-half reviewer

# Native1596 second-half review — qualitative S0 pilot only

2026-10-18 UTC. Independent reviewer native1596_second_half. Read-only review of the candidate at artifacts/taa1582a/worktree; no implementation, browser, GPU, server, build, tests or Git writes.

**PASS for the qualitative native appearance of candidate frames 045–095 only.** All 51 originals were actually opened and inspected in ascending sequence at 1280×720 using tools.view_image with detail original. I found no material persistent fine-detail softening, conspicuous trailing silhouette, abrupt sign pumping or exposure jump in this inspected portion. This is a bounded visual pilot result, not whole-S0, A6, adoption or demonstrated crawl-reduction acceptance.

I compared the original baseline frames 045, 053, 061, 069, 077, 085, 093 and 095 from artifacts/taa1569/baseline-S0-run2/payload. I additionally viewed rejected1560 candidate frame095 from artifacts/taa1569/candidate-S0-run1/payload for calibration only. Total actually inspected: 60 original PNGs. No contact sheets, thumbnails, crops, video or compressed substitutes were used. I did not read the other critic's judgment.

The foreground paving joints remain separable in the candidate throughout 045–095, including the receding low-contrast joints beside both yellow tactile arms. The longitudinal tactile grooves and transverse tile divisions remain visible, notably at 045/053, 061/069 and 085/093/095. All eight baseline comparisons show comparable retained detail; none shows the persistent loss of these details apparent in the rejected1560 calibration frame095.

The left diagonal and centre crossing stripes retain distinct edges and gaps at 045, 053, 061, 069, 077, 085, 093 and 095 and through the adjacent candidate frames. The far thin stripes are inherently less resolved. The TSUTAYA facade grid, lit shopfront divisions and merchandise texture remain identifiable. The blue SHIBUYA sign and both red TOKYO signs retain their main lettering and contrast. Small sign subtext and distant grid/stripe edges vary at the pixel scale as the viewpoint changes; this still-by-still review does not establish whether that variation reads as crawl at playback speed or whether it has decreased relative to baseline.

The right-hand trees, lamp/sign poles, building silhouettes and shadowed roads remain coherent across the inspected frames. The small blue-clothed pedestrian on the far-left pavement changes position and limb silhouette without an obvious detached duplicate or trailing smear. It is only about two dozen pixels tall and moves toward the image edge. No substantial nearby moving vehicle or train is visible, so this is weak evidence for actor disocclusion and says nothing about train preservation.

The comparisons are qualitative. Camera pose and simulation phase differ slightly between arms; these are not pixel-aligned pairs. Historical per-native-run driver was not observed. I did not infer quality from component1591 PASS, history counters or the capture's SUCCESS label.

Raw candidate metadata for the inspected portion records before-copy rendered frames1721–1771 with every step adjacent; page43611.70000000298–44448.39999999851ms, span836.6999999955297ms, adjacent page gaps8.800000004470348–25.5ms; azimuth0.6968767299040206–0.591759676918435; local walk ticks149–199. These are captured metadata, not measured interactive FPS or temporal perception. Viewing stills in order does not reproduce timed playback.

The companion second-half-receipt.json records all60 inspected paths, sizes and SHA-256 values before and after inspection; every byte pin is unchanged. Candidate capture identity was independently rehashed: result c5c8f60b47cb2ae17abb0a2e27b314a907a1d607262fd725719bc791cd307835; handoff bda5cb24f4c745a9c5dc3665bccd75e455c318f90d25e0e0beac86acc6d7b17e; frame-pin manifest f6ad8d0637d7d98273bf4382601fb79ea8ad6b491ecdfff56562b151f338cfcf.

Unobserved here: candidate000–044, all other baseline originals, timed motion perception, S1/train, held-out approach/fractional DPR, invalid-history events, lifecycle/source correctness, full population, performance/cost, other map regions and complete A6. No new material visual finding in the assigned51 frames; the full frozen contract remains for root to assess. This task launched no browser or GUI resources and retains only this review and its hash receipt for the active handoff.

## Findings and disposition

No material still-detail finding in the inspected population. Root accepts the combined bounded native still-detail PASS. Both reviewers withhold reduced perceived crawl, flicker-free playback, whole-frame history-veto exclusion, S1/train preservation, held-out fractional-DPR, cost/FPS and A6 acceptance; root retains every gap. Flags or capture SUCCESS do not fill those gaps.

## Verification

Capture has96 adjacent frame observations over1587.700ms of page time; this is not interactive FPS acceptance. The actual57.474s capture record and60.457s external supervised run finished without reported errors, failed requests or timeout. Both acquired resources closed, pending0, and normal plus fresh known/omitted/late process census passed; port4369 and exact owned profile were absent after cleanup. Root additionally opened setup, frame000 and frame095 at native size; this does not replace the reviewers' complete coverage.

Both hash receipts are retained under artifacts/native1595 and artifacts/native1596: ab16be5ec387bf8c5d0255f196aead27931e9064d33998e5bb63bc6a08e97b1a and3383aa97cadf2d62d831a1c2e61876da76a7df63711e519160249ca8146f44cf. Baseline reuse is qualitative only; historical per-native-run driver was not queried, poses and phases differ, and no pixel-aligned A/B or performance comparison is claimed. New source's full gates, S1 and held-out were NOT RUN.

## Round outcome

The prototype passes this still-detail pilot and warrants the next fixed-contract scenario. It is unmerged and unadopted. Accepted executable e1097edd4f0d65f41e6d6c157def4d51fa877318 and A1/A4/A12 remain unchanged; the other11 criteria remain OPEN. Elapsed review bounds: native1596 completed within seven minutes; exact aggregate model work/elapsed are unknown. No browser, GUI, GPU or server was launched by either reviewer.
