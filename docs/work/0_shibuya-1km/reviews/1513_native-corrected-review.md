# 1513 — Corrected native traffic capture review

Date: 2026-10-17 local / 2026-10-18 UTC. Independent reviewer: traffic1504_authority_review. Capture and implementation owner: shibuya1498_visible_activity_feasibility. Integration owner: root. Source remained read-only for this reviewer. This report is the only newly authorized write in this round; the reviewer ran no browser, GPU capture, replay, test, gate, source mutation or cleanup.

## Verdict

PARK. The one corrected native arm failed before its first screenshot. Native acceptance remains incomplete against the original criterion, with no proved visible stop-to-release sequence, complete turn or true boundary exit. There is no third arm or reframing under the approved stopping rule. The retained run 1 review [1510](1510_native-traffic-review.md) remains an 18-image partial appearance review, not native acceptance. Neither the passing bounded CPU flow nor narrow source reviews replace the missing native evidence.

The actual failure was an instrument timeout, not a demonstrated product simulation failure. run2/payload/capture.json records startedAt 02:01:37.543 UTC, endedAt 02:05:47.027 UTC, passed false, frames [], and the error: `Population fixed ticks did not reach 218s under ordinary real time`. Its last retained sample is 02:05:45.211 UTC at population tick 12954 / 215.900 seconds. This is the last sampled time, not an asserted exact tick at the later throw. The 750-second outer supervisor deadline did not cause this failure.

## Concrete cause and review correction

The actual capture source retained an inner wall-clock bound in untilTime: `Date.now()+Math.max(30000,(seconds+5)*1000)`. On the first target of 218 simulation seconds, that grants 223 wall seconds from the call. Increasing the outer owned deadline from 300 to 750 seconds did not change this inner assumption. The simulation advanced, but more slowly than that inner limit allowed, so the payload threw before capture was called. The stack points to capture-run2.mjs:25 in untilTime and its event loop at line 34. No screenshot timing assertion was reached and no image was relabeled or promoted.

The independent instrument review approved early navigation, unchanged source/defaults/views, and the six actual-clock event bounds plus four exit bounds. It missed this inherited inner timeout despite reviewing its diff. That approval was too broad about deadline adequacy; this report records the miss explicitly. The causal lesson is to audit every nested deadline against the clock it measures when a capture crosses simulation time and wall time. This round did not implement or validate a retiring gate for that class, and does not claim one.

The source stop-position projection near the far-right tree/façade remains only an occlusion hypothesis. With zero corrected originals, this run neither confirms nor clears it. The reason for PARK is the failed measurement and unmet native criterion, not a claim of observed occlusion or unsafe physical crossing.

## Exact reviewed recipe and scope

The dispatched combined recipe is artifacts/traffic1499/run2-recipe.json, SHA-256 5d7fd4a5a60ac62c207b4f21f8b22f25176d9b19bb5e40f077f32178e561f712. capture-run2.mjs is 11,379 bytes, SHA-256 0feeb33b99441191d0cc2a1889cd9086c9c4be095051eb778aca7e1111f4d476. run-owned-run2.ps1 is 12,494 bytes, SHA-256 5d373ceccbb44c9c4d4004c5eee1d856ae544653a95afc417abd9382da03b056. The inspected diff is SHA-256 cef5481444d0074ff9658b211e72b0a13d5523d20e39a6dbfb3dc58f10f7631e. The earlier six-event 300-second proposal was never launched and is retained separately under run2-prepared-300; it is not another failed capture.

Candidate 3 freeze remains SHA-256 461a3e2deed114a29f290e7e36b974516072816fdeb7c7a37e2e8359f991e91c, with 23 source/test paths based on 0681715632e66ad825a3d78ac7d9282c5cb038b5. The recipe keeps ordinary http://127.0.0.1:4319/, default seed 5970698, no URL overrides, 24 requested vehicle slots, zero generic pedestrians and the retained walker. It clicks Start walking and navigates through the existing OrbitDriver controls. It does not set simulation or camera state.

The crossing view is the same target (0,0), azimuth pi/4, polar 1.5 and distance 45 m. It is ready at actual population 4.566667 seconds, with walker started true. The recorded camera is position (31.740097,18.383185,31.740097), target (0,15.2,0), distance 45.000001 m. Only the Start click and this fixed-view input were reached. The six intended times are 218/226/234/237/240.5/244 seconds, with before-copy time in target through target+0.5 and after-copy no later than target+1.25. The later planned fixed boundary navigation at 400 seconds and images at 480/498/502/506 were never reached.

Those times were selected from the retained actual CPU chronology for vehicle 16: zero speed at (18.435743,15.707806,-37.974174) in samples 215/220/225/230, first green grant tick 13920 / 232 seconds, geographic entry tick 13987 / 233.117 seconds and first turning occurrence tick 14419 / 240.317 through 14509 / 241.817 seconds. Source chronology justifies the intended sample windows; it is not evidence that the corrected capture observed them.

## Actual observations and bounds

The capture reports ANGLE on NVIDIA GeForce RTX 4090 / Direct3D11 and no browser error entries. At the last retained sample there are 24 requested, 21 active and rendered vehicles, 15 queued, 108 crossed, zero retirements and zero authorityViolations. The retained route refusals concern unsupported bus eligibility and entrance space, not the uncleared-admission semantic failure diagnosed in 1504. The walker is generation 1 with tick 12908 and drawSerial 8832. These are metadata observations only; zero screenshots were available for native inspection in this arm.

The completed capture receipt records unchanged true with no pinFailure. The reviewer independently compared each retained before/after manifest group: source 139/139 entries, dist 6/6, scene 121/121, network 1/1, rail 34/34 and visual harness 21/21, all equal including byte lengths and digests. This proves those 322 recorded local input entries stayed unchanged across this arm; it does not certify unrecorded inputs or turn a failed capture into a pass.

The separate 600-second CPU receipt and focused clearance/authority/queue reviews retain their own bounds. They do not establish final ordinary native behavior, supported bus admission, full 24-vehicle filling, acceptable queue delay, continuous collision/contact behavior, interpolation or FPS. The full 3000-pedestrian/200-vehicle target and A7–A10 remain open. No source was changed to hide this failure and no acceptance criterion was reduced.

## Retained evidence and cleanup

All artifact paths below are relative to the primary maps checkout. run2/payload/capture.json is 1,126,065 bytes, SHA-256 745b6d6ebff7f29863e7694bb96906f3f87863a33c0f91ea64065497e556f09f. It contains the failure, zero-frame list, inputs, actual samples, renderer, source manifests and cleanup results. It remains ignored task evidence; this authored report preserves the conclusions and provenance without promoting the large receipt into ordinary Git.

The payload finally records page, context, browser, browserServer, preview server and esbuild cleanup true. run2/process-cleanup.json SHA-256 is 86ad650927aa09fed687d65a71760cb5c2b2e18ca669d12700c2b12811782ccd. Its fresh outer census at 02:05:47.204 UTC passed with remainingKnown, remainingOmitted and lateCurrentEdges empty, and exitCode 1. run2/temporary-cleanup.json SHA-256 is f9c97f017882e941fb362cfbd8a4952f5ee10543441399ad9b8ceca5380ac6ee. Its later fresh census passed and it records removal of the exact owned external temporary directory only. The reviewer read both receipts; it did not perform broad process or filesystem cleanup.

The implementation owner and root were notified immediately of PARK, zero images, the inner-timeout cause and the review miss. This report does not authorize another run, instrument repair, source change, adoption or merge. Root retains the parked candidate, failed receipts and repository integration decision.
