# 359 — Independent populated crossing review

Date: 2026-09-29. **ACCEPT 357's distinction: bounded mechanical execution passes; populated appearance is INADEQUATE.** The native samples contain no recognizable pedestrian or vehicle event. This does not accept an inhabited crossing or the whole Shibuya map.

Read the actual canonical [357 report](357_populated-crossing-observation.md), raw SHA-256 `dfd340300b09d54595f904759a80defbaa02957dd3fd6f3594c6e44fa5b05aaf`, and its retained evidence under `artifacts/populated357-retry1-20260929/`. No material misleading claim in that report requires correction. Its `passed: true` explanation correctly limits success to execution and cleanup rather than actor appearance.

## Native appearance and counters

Independently hashed `representative.png` and `keyframe-1.png` through `keyframe-4.png` before and after inspection. Each is 1,398,986 bytes with SHA-256 `a9067297fd534397d4f14cdb60b2ba44fb664c39d55b9f61d2018e83215fb5d9`. Opened representative.png at original 1280×720 resolution. Inspection of the other four was deduplicated by exact byte identity; there is one distinct inspected picture, representing five disclosed sample times. No thumbnail, crop or enhancement was used. The crossing is empty of recognizable human and vehicle forms. Nothing visibly advances between these identical pictures.

Checked all five actual capture records. Their before/after canvas-copy observations agree on render frame and simulation tick. Camera position and target remain exact across samples.

| Sample | Elapsed ms | Render frame | Tick | Simulated seconds | Vehicles active/reported drawn | Vehicles waiting |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| representative | 16.0 | 1394 | 1205 | 20.083333 | 14/14 | 6 |
| keyframe-1 | 1200.7 | 1465 | 1276 | 21.266667 | 14/14 | 6 |
| keyframe-2 | 2415.8 | 1538 | 1349 | 22.483333 | 14/14 | 6 |
| keyframe-3 | 3616.4 | 1610 | 1421 | 23.683333 | 13/13 | 7 |
| keyframe-4 | 4816.8 | 1682 | 1493 | 24.883333 | 13/13 | 7 |

All five records report 150 requested, active and drawn pedestrians, zero waiting, and far/medium/near LOD counts of 150/0/0. These are whole-scene instance and LOD counters, not visible-pixel counts. Zero near/medium instances does not establish why actors are absent from this composition. The visible recognizable count is zero; route placement, distance, occlusion and rendering remain diagnostic possibilities rather than established causes.

The actual sample gaps are 1184.7, 1215.1, 1200.6 and 1200.4 ms, spanning 71, 73, 72 and 72 render frames and fixed ticks. No refusedSpawns entries occur. Recorded refusedRoutes grow from 32 reason entries/219 accumulated attempts to 34/258. Repeated planning attempts are not distinct refused actors. Actual readiness reasons retain the stated bus portal, true AOI exit, central-crossing reachability and source-support refusals. At the final recording observation, tick1499 and 24.983333 simulated seconds, pedestrians have zero completed routes and authority crossings; vehicles have seven completed routes and16 authority crossings. The zero authorityViolations counter does not prove continuous collision safety.

## Bindings, recording and cleanup

Independently checked all16 media/receipt/report entries in evidence-index.json against actual lengths and SHA-256: zero mismatches. Its raw SHA-256 is `2894263b2be122fe1f940b7fc88627452de32eadbdcf23e363bc22688aa7a7d0`. Capture.json matches `4df20fc346d8ebf98fbf7901bff7e610cdd1ebc467f2539d64937ad747985bf0`. Its complete before and after binding records are equal, and binding-readiness.json's before record equals them.

Rehashed the actual120 source files and six production files against the recorded binding: zero length or hash mismatches. The main bundle remains `0c06649a0f82ef784302e5d0785338dc9f244af359e5d31d222f4d4b7e75e84e`. Independently compared all149 recorded response-body hash/length/status rows with the166 admitted HTTP inputs: zero mismatches;148 unique URLs and35 actor-asset responses. The response observer records accepted configuration, settled capture and149 responses in both CDP and Playwright. Runtime error and warning arrays are empty. These checks inspect retained records, not historical response bodies anew.

The recorded scene binding names151 files/354,752,173 bytes and digest `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce`. I did not recompute that large scene tree or reconstruct the107-entry normalized source-map comparison. No new browser, probe or gate ran.

Motion.webm's actual1,658,273 bytes match `accfaf364782da951065c0d53f2b9f810bd50b9bd82d5ae9a11211c3ae2d7e9f`. The records show requested30 fps, track settings30 fps at1280×720, 4817.8 ms and289 fresh application-frame observations. I did not decode the clip. Encoder cadence and appearance between the five sample times remain unreviewed; no continuous motion, ground-contact, signal, flicker or performance verdict follows.

Read and rehashed the actual owned-run, process-cleanup and temporary-cleanup receipts. Recorded page/CDP/context/browser/browser-server/preview cleanup is complete. The final identity receipt has no retained, unadmitted or scoped survivor or port4324 listener. The temporary receipt records zero links, removed owned root and restored environment. These are inspected cleanup receipts, not a fresh live process census. This reviewer created no process or temporary artifact; only this permanent report was written.

## Next outcome

Continue the already assigned read-only diagnosis of one dominant startup or route-placement blocker. Then deliver one bounded correction or demonstrated existing-runtime event that puts recognizable pedestrian and vehicle movement in this same crossing composition. Done requires those forms to visibly advance at disclosed sparse times with plausible scale and no conspicuous penetration or disappearance. Preserve source-support refusals and distinguish requested, active, reported drawn and visibly recognizable counts. A higher counter or a longer empty clip cannot satisfy this outcome.
