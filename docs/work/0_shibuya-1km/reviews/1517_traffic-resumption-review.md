# 1517 — Third-arm traffic verification review

Date: 2026-10-18 UTC. Independent reviewer: verification1517_fresh_review, using the fleet review model pin. Root owns integration; verification1516_traffic_resumption owns this explicitly new verification-only assignment. Shared-worktree exception: this reviewer writes only this unique report in the retained codex/traffic1499 worktree. No source, test, index, cache, gate, browser, GPU or process mutation was performed by this reviewer.

## Verdict

PARK / native acceptance incomplete. Historical native arm 3 produced six qualified event originals, but zero boundary originals. It failed with `early boundary navigation exceeded 50762ms within owned deadline`. Payload started 02:20:10.049 and finished 02:32:10.891 UTC; the supervisor started 02:20:09.425. This is an observed instrument deadline failure, not a demonstrated new product defect. The required true boundary exit remains unproved, so the candidate is not approved for executable adoption. No fourth arm or acceptance reduction is authorized.

The last retained sample is population 399.866667 seconds at 02:31:18.269, before boundary navigation. It is not the exact failure tick. cameraReady still records the initial crossing pose at population 6.266667 seconds; it is not the final attained camera. No boundary time, pose or retirement may be inferred from either value. The earlier run1/run2 failures and PARK remain intact history.

## Prelaunch instrument review and its bound

PASS was issued for source qualification before root granted the lease, expressly not runtime or visual acceptance. I read the complete actual helper, supervisor, process-safety predicates and nested OrbitDriver waits. The old untilTime assumed simulation seconds equalled wall seconds; the corrected call reads actual ticks under the supervisor's absolute deadline. Work stops at owner minus 30 seconds: 02:32:09.425 for this selected 750-second dispatch, with owner cutoff 02:32:39.425. Individual setup, Start, navigation, observation and capture waits are clipped to that work deadline. Start readiness uses Playwright's third options argument. Each complete screenshot call is capped at 45 wall seconds, retaining local fresh-frame 15 and screenshot 30-second limits. Camera operations retain 60-second caps inside a 120-second view call, subordinating OrbitDriver's 320-frame/30-minute settle and 400-poll tile wait. Screenshot before-copy target..target+0.5 and after-copy<=target+1.25 simulation seconds remain strict.

Cleanup and after-input pinning use the same owner deadline. Promise.race does not cancel outstanding RPCs; payload closing and the retained supervisor remain the backstop. The supervisor checks at 500ms intervals with intervening CIM work, then can spend up to five seconds acknowledging each retained handle's termination and run its final census. Thus 750 seconds is the supervisor's intended capture cutoff, not a guaranteed process-absence instant. The reviewed cancellation route targets only the recorded payload identity and leaves descendant cleanup to the existing supervisor; it was not used in this arm.

Prelaunch run2 samples advanced 211.316667 simulation seconds over 222.604 wall seconds, approximately 0.9493; run1's late segment was approximately 0.590. Completion was explicitly conditional. During this arm, the six images advanced from 218.450 to 244.433 over 44.566 wall seconds, approximately 0.583 including screenshot work. I alerted root and the owner that continued pace would miss the endpoint. No clock, deadline, source, view, count or seed was changed. The actual shared work cutoff then fired during navigation, with only 50.762 seconds left for that operation.

Exact reviewed SHA-256: capture-run3.mjs `7ef3665e0173e9aa27f40630b63e0f395f43222b363daa789c967f49004ff7d0` (12,752 bytes); run-owned-run3.ps1 `97005787f39bdeda9ca4e805b425a48ec7d71109610c8f2b0c85471055cf7706` (12,577); run3-preparation/instrument-diff.patch `5f6355871bbaa1e02ba77158ad7928d97cb48783582ffb54a737f3fce7873a04`; deadline-inventory.md `1604ca63c1de9357c827db6d6ff7518ce01396ee067ad5cb8627f27601bd996d`. The literal previous-run2 payload/supervisor/recipe copies independently match the full pins in [1513](1513_native-corrected-review.md). Paths are under ignored primary artifacts/traffic1499.

Outside the helper diff, I directly read tools/visual/orbit.ts:144,274,387,485,514 and tools/visual/shots.ts:34 for first-frame, tile, settling, input and established-pose contracts. No new instrument framework, live timing probe or CPU replay was run.

## Native event evidence

All six new originals were opened individually at native 1280×720; every actual byte length/SHA-256 matches finalized frames.json. The first 218 image resolves the disclosed tree-edge risk: the grey kei body, roof, front, side and wheels are legible near the right roadway at approximately (1109,331), below/left of the foliage. Root retained the exact 45 m crossing pose before launch; no alternate view or post-result rescue occurred.

The body occupies the same visible position in the 218/226 samples while the actual scramble observation reports pedestrian stage. It moves into the crossing in 234/237 while vehicle:0 is active, changes heading visibly in 240.5 and departs toward the right in 244. The 240.867–241.533 observation interval is within the retained production turn interval 240.317–241.817. This qualifies the bounded visible stop/release/turn/departure sequence. No material body/road clipping or visible scene regression appears in these samples. The current native harness does not expose per-actor IDs, so identity association also uses appearance/path continuity and the independently retained CPU chronology.

| Original under run3/payload | Actual population seconds before–after | SHA-256 |
| --- | --- | --- |
| event-218.png | 218.450–219.117 | 6468b2574c7297953fa1bb130d6f047e4abb0e90e2e67e87b996b4d6e63b9b9a |
| event-226.png | 226.333–227.033 | 0cea69c4fe2b83b5db858e6c19a1e2a19fd8c46fb67f270c06778b0de7553574 |
| event-234.png | 234.400–235.150 | 97b6eab6d80e09abaabdcf8242dd3c38ab126abffda1c546a633fb4087a70671 |
| event-237.png | 237.400–238.150 | 0074a40d297fbeab9408bb82cf0f28f404ce2575d80f1482e6593f052d1c3bc3 |
| event-240.5.png | 240.867–241.533 | c56fa4e700a935af4afce497878db147ea3cf3a4f8f7201f1c927bfd20e41f17 |
| event-244.png | 244.433–245.133 | 24f4e28826521a054cf35326312fb6fb1e172d488bba815aa06d01e064d2aa77 |

All strict timing predicates pass. Output timestamps have successive gaps 12.894, 13.701, 5.559, 5.981 and 6.431 wall seconds; the before/after intervals bound screenshot work, not exact exposure instants. Sparse states do not prove continuous stopping, motion, interpolation, safety or contact. Zero boundary originals means no actual native exit acceptance.

Before launch I also inspected run1 central-turn-232 and central-approach-215 and fresh1515 crossing-close at native size and verified their hashes against their retained manifests. The fresh 65 m view's foreground wall does not characterize the selected 45 m pose. The old 220 m approach was too distant/obstructed to qualify this actor. Their only role here was disclosing view risk; none was relabeled as new-arm evidence.

I reopened and hash-matched the five retained run1 walker-Near-1/2/4, cartographic-basic and satellite-return originals. They still show advancing gait/position, the basic style change and photographic return at the same camera, as recorded in [1510](1510_native-traffic-review.md). Current event metadata also keeps walker generation 1 with ticks advancing from 13030 to 14589, and the distant figure changes position in the new originals. Run1 still lacks its final all-input certificate; these remain bounded historical controls, not a new full style-control run or continuous contact proof.

## Source/input binding and polling limit

Candidate3-freeze.json remains `461a3e2deed114a29f290e7e36b974516072816fdeb7c7a37e2e8359f991e91c`; all 23 source/test files match lengths and raw hashes independently before and after this arm. [1509](1509_source-integration-review.md) remains applicable to those unchanged bytes based on 0681715632e66ad825a3d78ac7d9282c5cb038b5. No redundant whole-code audit was performed. I also compared all 322 current source/build/data/harness entries with run2's before manifest and all three run1 recipe build pins: no mismatch. Final run3 before/after groups independently agree: source 139, dist 6, scene 121, network 1, rail 34 and harness 21. These are endpoint input comparisons, not a filesystem race lock.

Root requested one bounded source-only polling check. untilTime calls the complete observe snapshot every poll (capture-run3.mjs:20,27), then sleeps 1000ms when more than 120 ticks away or 50ms near the target. It reads status/camera/tiles/style/post/population/signals/localWalk/trains and serializes them to Node. tiles reaches app.ts:405 and buildings.ts:454,540, traversing visible meshes and cached geometry bounds; bridge.ts:200,357 queries GL renderer extension/getParameter. The inspected local-walker and train status paths return retained snapshots (local-walk-draw.ts:60; rail-trains.ts:157), with no getUniform/readPixels or GPU draw collector in this poll path. Verification overhead exists structurally, but its share of wall time versus production work is UNKNOWN. No profiling or correction followed.

## Cleanup and outstanding acceptance

The payload reports no browser errors and RTX4090/D3D11. Page, context, browser, browser server, preview and esbuild cleanup all completed. The independent readback of process-cleanup.json records exit1 and a successful fresh final census at 02:32:11.4399283 UTC, with no known, omitted or late descendants. The later temporary-cleanup.json census at 02:33:06.8436726 also passes with no task marker processes; only the exact owned external TEMP directory was removed after seven ancestor, zero descendant and zero-reparse checks. No task-owned browser/server remains in those receipts. This reviewer launched none.

Final evidence SHA-256: run3/payload/capture.json `283542053c2ce4fc610a87ab041fb578f76ee0db42c1fc2a7126fee0f25982ba` (10,207,108 bytes); frames.json `37ddb4c8891d2c783f666366b67e76071c1de134971d6d7d96267d4c2e857ec6`; run3/process-cleanup.json `cfb9f45a6d8765fb1819187973b2dec3a04b266384f82ad37a799cc696cd4ffa`; run3/temporary-cleanup.json `ce0a9bdb4d890fc5ed70819a34255e85793e0b2f30989d714e7d29c2068966b4`. Raw receipts and originals remain ignored for the unresolved candidate; no large evidence blob is promoted into Git.

The final five-gate bundle, public 22-frame Satellite review, executable commit, main integration/readback and remote verification DID NOT RUN. Source remains unmerged in the retained worktree. Native true exit, full fleet fill, unsupported buses, long queues, continuous contact/interpolation, A7–A10 and the 3,000-pedestrian/200-vehicle/60FPS target remain OPEN. This report preserves useful partial evidence without closing those bounds or granting another attempt.
