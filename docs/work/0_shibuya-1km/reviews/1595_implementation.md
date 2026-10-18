# Review 1595: implementation

## Target

Actual fresh accepted-baseline S1 capture1601, produced from unchanged accepted executable e1097edd4f0d65f41e6d6c157def4d51fa877318 on2026-10-18 UTC. The96 original1280x720 images remain ignored at artifacts/taa1601/baseline-S1-run1/payload. Result SHA-256 80ed84b57468f6641a4b027ff3d2129b40596f00d4d8d68b49d9813cf517c5c8; raw metadata c9c1f8d5ab481206924c8d55f950a4fe0eecf0148da2ed8f2c65d2e555d8b143; frame pins2bd7d4030201dad7a1c59c9545164afdda16fef71406608c732414bfa77e05a5. [1594](1594_integration.md) retains readiness and the frozen input/cleanup contract. This review qualifies the baseline, not the new smoothing candidate.

## Reviewers and coverage

Independent native1603 inspected000-050; independent native1604 inspected045-095. Together all96 originals were opened at native resolution, with overlap045-050, without using rejected historical pixels. Both independently checked every inspected hash before/after. Their reports follow unchanged; source SHA-256 values7e5c5dc969ac97c893d50112c0fcb74d7074e6c59f2ba0652c4878e2c649f843 andbc276431b27fe477b0a9c72efd08b8a5a1297696e9e7f2c479e244640f4b68ba.

## Reports

### Native1603 first-half reviewer

# 1603 — Baseline S1 native visibility, frames 000–050

Independent read-only appearance review, 2026-10-18 UTC. PASS for native baseline subject visibility in this assigned segment. I opened every actual original frame-000.png through frame-050.png in order, at original 1280×720 resolution with view_image detail original. Coverage: 51/51, no gaps. No contact sheet, crop, thumbnail, candidate image, old source1560 image or rejected train1473 candidate1 pixel was used. No other critic report was read. Accepted executable e1097edd and docs base a4dcc79232f8e22fa1d6e2c1844d5f96d0ab527c are root-provided context, not a new source audit.

All four cars remain wholly visible on the tracks, with distinct car joints, light roofs, dark roof modules, a thin green side band and the repeated dark window row. No opaque building or overlay obscures the train. Its approximate native footprint is 260 pixels long and roughly a dozen pixels high; this qualifies the silhouette, row and band as useful comparison content, not individual window-frame or undercarriage detail. Frames 000, 025 and 050 anchor the beginning, middle and end; every intervening original was inspected.

Nearby building facades, rooftop objects, rooftop gardens and parallel tracks remain legible as the camera changes. Frames 024→025→026 and 048→049→050 retain those features without an obvious exposure step, material swap, blur wash or opaque disappearance. Across all 50 adjacent transitions I observed no obvious detached train ghost trail or gross brightness/sign pumping. Fine track/window sampling remains small-scale; ordered still inspection cannot prove absence of playback-speed flicker, subpixel crawl or AO shimmer. No material appearance issue was identified within this scope.

Independent pre/post SHA-256 and byte counts match for all 51 inspected PNGs and result.json/raw-frames.json. The inspected image pins also match both actual metadata frame lists. PNG headers independently read 1280×720. Metadata names baseline/S1, SUCCESS and captured=true with 96 total frames. This segment records frameCount 2932–2982 with every adjacent delta exactly 1; pageMs 63451.60000000149 before 000 through 64286.5 after 050. Metadata exposure remains 1.4664071074506513. Pixels and metadata are separate evidence.

result.json SHA-256 80ed84b57468f6641a4b027ff3d2129b40596f00d4d8d68b49d9813cf517c5c8; raw-frames.json SHA-256 c9c1f8d5ab481206924c8d55f950a4fe0eecf0148da2ed8f2c65d2e555d8b143. Companion baseline-first-000-050-hashes.json lists every inspected file and independent pre/post values plus freshly hashed handoff/frame-pin metadata. The final payload/ancestor fs.lstat check found ordinary paths; the final hash sweep found no changed bytes. This is not an atomic filesystem lock.

Bound: frames 051–095 were not viewed by this reviewer. No full 96-frame verdict, candidate improvement, phase-matched A/B result, A6 acceptance, temporal-history correctness, lifecycle acceptance, full train feature acceptance or population/FPS claim is made. No browser, GPU, server, external model CLI or child application was launched. A narrow shell write was authorized only after the node writer hit sandbox EPERM. Only this report and its hash receipt are written under ignored artifacts/native1603; source and original frames are untouched. Root owns full-sequence qualification and operational closure.

### Native1604 second-half reviewer

# 1604 — S1 baseline native visibility, frames 045–095

2026-10-18 UTC. Independent read-only reviewer native1604_baseline_second. Verdict: PASS for the assigned baseline visibility and comparison-usability scope. No material visible finding in these 51 originals. Root retains integration and candidate-lease authority.

I opened every original frame-045.png through frame-095.png sequentially at native 1280×720 with view_image detail=original. No contact sheets, crops, resizing, substitutions, encoded playback or rejected train1473/candidate1 pixels were used. I did not read the first critic's judgment. Comparison was between adjacent current-baseline originals. No claim covers frames 000–044.

The entire four-car train stays visible and unobstructed. Four connected pale car bodies and their dark window rhythm remain distinguishable throughout. The thin green side band and pale roof surfaces remain visible. This is a useful distant comparison: the train spans approximately 265–270 screen pixels in length, while individual side features occupy only a few pixels. It does not establish close-detail quality or resolve wheel/contact behavior.

At frames 045–047 the train is clear against the tracks near the center-left. Frames 060–065 retain the same roof, window and green-band cues as the camera and train progress. Frames 075–080 and 090–095 preserve those cues without an opaque foreground obstruction. I see no obvious doubled train silhouette, long ghost trail, alternating whole-car brightness, exposure jump, material disappearance or sudden building-detail loss in these adjacent stills. The multiple fine rail lines, surrounding roof structures, facade window patterns, right-hand tower and rounded dome remain present and legible at their original scale. Fine rail and thin-edge sampling changes are visible as the view moves; these stills do not certify an absence of temporal crawl or shimmer at playback cadence.

The inspected metadata runs from frameCount2977 to3027. Before-copy pageMs64202.90000000596 to65035.10000000149 spans832.1999999955297ms; the last after-copy observation is65035.80000000447, giving832.8999999985099ms through final copy. Adjacent before-copy gaps are14.700000002980232–19.799999997019768ms. Train simulation advances47.51496666666526 to48.34816666666521s; station490.5738182997002 to481.08723484350327; direction−1, four cars throughout. Camera azimuth advances1.4802751385919461 to1.3711970180531234 at approximately220m distance and polar0.620000252477231. Full-burst1584.2ms uses the final after-copy boundary; it must not be confused with the last before-copy pageMs.

All51 inspected PNGs were independently SHA-256 hashed before and after inspection; every digest and byte length remained identical. Each filename, byte length and digest matches both the raw-frame record and frame-pin record. Each recorded frameCount and before-copy pageMs also matches between those metadata sources. The accompanying inspected-hash-receipt.json binds all51 image hashes and independently verified handoff/result/raw/frame-pin/resource digests. First image SHA-2562e0b51930a297a4b179d3ddc1e2820499c33107ede9d796ef375cdef98f55cf0; last ea66466ac5b4aa3c501ccba9be00c2544742a7568d88525ee6f619dc52f3539a.

This qualifies this half of the fresh accepted-baseline S1 evidence for subsequent comparison only. It does not establish candidate improvement, future phase matching, previous-rendered-frame contribution, history rejection, whole-route train acceptance, continuous playback quality, A6 or FPS acceptance. No runtime gates, browser, GPU, server, reviewer CLI or encoding were launched.

The capture's retained final-resource record is independently hash-bound and reports PASS: known5/omitted4/late edges absent, marker0, port4371zero and profile absent. I created no browser/GUI/server resources; all short read/write shell operations completed. The retained capture census is a resource-closure fact, not a quality result or a fresh system census by this reviewer. Only this authored report and its hash receipt are retained in ignored artifacts/native1604. Git/source/index were not modified. The ordinary read-only git check-ignore initially refused sandbox ownership; a command-local safe.directory retry confirmed the output path is ignored, with an unrelated inaccessible global-ignore warning. artifacts/.gitignore independently contains the applicable wildcard.

## Findings and disposition

No material baseline-visibility finding in the inspected96 originals. Root accepts this complete sequence as a useful distant four-car train comparison. Approximate260-270px train length and roughly12px height do not establish close window, wheel, contact or whole-route acceptance. Ordered stills do not establish playback flicker, candidate improvement, ordinary-scene history contribution or A6.

## Verification

Actual event matched after20.691s at simulation46.6982667s/station499.333548/speed10.3990819/direction-1. Frames2932-3027 are adjacent; page63451.6ms through65035.8ms spans1584.2ms. The74.623s capture record,76.271s controller and77.514s external run completed without reported render errors, failed requests or timeout. Both acquired resources closed; pending0 and both cleanup promises fulfilled.

Root read the actual closure artifacts and additionally opened setup,000 and095 at native size. Fresh known5/omitted4/late0 census PASS, marker0, port4371zero; exact115-entry/nonreparse profile removed and absent. Final resources SHA-256 ffa3729ac0113291b3b5e971d72470bfbbc6cd625af6d1f9fa0b2826eb54220b; external0a0137a6e37d0f8fb3aae96aa94a49642c1cdd405427c72880357dc981185307. Source8, both existing builds/runtime caches, retained packets, harness/certificate/protected files stayed pinned. The later driver query is labelled post-run, not per-copy driver evidence. Full candidate gates and held-out were NOT RUN.

## Round outcome

Fresh baseline native visibility and actual operational closure accepted. Root subsequently issued one candidate S1 lease only after reading both substantive reports and checking the result/closure pins. No retry, source adoption, phase-matched A/B, performance or final acceptance follows. Both reviewers used only completed short shell/image operations and retained no browser, server or GPU process; native1604 reports about7m20s, aggregate model work/time unknown.
