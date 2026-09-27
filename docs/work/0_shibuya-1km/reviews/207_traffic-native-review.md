# Review207 — actual populated traffic and integrated 195

**Do not accept the declared entry/motion/turn milestone. R207-1 remains unresolved: the required turn is not visible.** The collection mechanics pass and the first visible vehicle moves through both short bursts, but no recognizable vehicle appears in any of the seven turn frames. This is a missing native observation, not proof of a runtime collision or turn bug. No appearance acceptance or full-map acceptance is granted.

Independent reviewer 207, assigned Astra/xhigh under the fleet review runbook. One reviewer; no subagents. Read-only primary review on main `ba3a0d7412b8fbf8e9360c75a17726da1a6458fd`, exact fourteen-file 195 candidate `befd10547a02829e0b4f80b4078bdd3f9a47b337ed7ab9c37537ce37f70d0d14`. The earlier 203 executor remains unchanged. Only `artifacts/traffic-native-review207-20260927/` was written. No browser, server, GPU, gate, installation, data command, source edit, live state mutation, retarget or recapture ran in 207.

## R207-1 — P1: required visible turn is absent

Personally opened every one of the 43 original 1280x720 PNGs through `view_image(detail=original)`, individually, including all twelve frames in each real-RAF burst and all seven turn singles. `inspection-inventory.json` binds each individual observation to its path, full SHA-256, size, style, actual tick and app frame. `inspection-notes.md` is the readable roster. No contact sheet, crop, counter, projected point or image statistic substituted for seeing an image.

| Turn file | Actual tick | App frame |
| --- | --- | --- |
| turn-6960.png |6964|7100|
| turn-6990.png |6993|7128|
| turn-7005.png |7010|7144|
| turn-7020.png |7021|7154|
| turn-7035.png |7037|7169|
| turn-7050.png |7054|7185|
| turn-7080.png |7084|7214|

All seven inspected frames show buildings and terrain without a recognizable vehicle or heading change. Each has SHA-256 `be0eb75f875a7ecb885a0e8ef80022299025e224559eaf0948e0de0c4b07d4dc`,903928 bytes. The same bytes occur at progress 6844 and keyboard-before 7200. The visual review establishes that no turn can be judged; identical bytes independently confirm that these samples contain no visible turn progression. Advancing app frames, five timely observations inside 6990–7080 and positive population counters do not establish a hidden vehicle's appearance.

The visibility loss is localized. At progress 6488, only the dark roof/upper body near x550–600,y350–365 remains visible behind the small foreground building. At progress 6844 and throughout the turn window no recognizable body remains anywhere in view. Final 7250 shows a partially obscured dark vehicle front/body near x258–285,y517–555 beside the large lower-left building. The sequence cannot distinguish ordinary foreground occlusion from travel within terrain/buildings; it cannot certify smooth turning, support or a collision defect. The bridge has no individual identity/position record, so the final partial body cannot mechanically be identified as the earlier one.

The smallest next inquiry is an attributed offline check of line of sight versus body/terrain/building intersection using the frozen actual camera and cached geometry, with the already frozen CPU trajectory only as a diagnostic hypothesis. Preserve 204 as the failed-view evidence. Do not relabel CPU positions as live actor proof. A later observation design needs separate admission before recapture; this finding authorizes no changed route, demand, seed, scale, simulation step or live state. Root owns that follow-up. `R207-1.md` was handed to root as soon as the missing requirement was established.

## What the native images do establish

The entry context at 5762/5823 contains no recognizable vehicle. At 5857 a dark vehicle with a light roof detail appears near the right AOI edge, roughly x900–940,y311–340; subsequent entry singles show it moving left. This supports a visible arrival and early travel. The sparse entry timing does not prove a smooth spawn transition or exclude a pop.

All twelve Satellite burst frames 5950–5961 show a recognizable dark body and roof detail moving left by a few pixels, near x875–932,y313–341. All twelve Cartographic burst frames 6124–6135 show the same type of recognizable body, windows and small wheel silhouette continuing left, near x773–832,y323–351. No abrupt body jump or camera shift is apparent within those short visible segments. These bursts do not show the later turn. The measured intervals are 183.7/185.3ms for eleven frame intervals, approximately 59.88/59.36fps. This is burst cadence, not the full-population performance target or continuous two-minute footage. Future review should follow the user's sparse-keyframe/short-clip preference and 30fps default when sufficient; no further image inspection or recapture was added after that steering.

The pointer before/after images visibly change from Satellite to the brighter Cartographic treatment with a stable building/ground composition. The final image returns to Satellite with the same composition. The vehicle moves during the pointer interval; it is not expected to stay at one screen point. The empty keyboard-before image and partially visible final body cannot establish individual preservation visually, though aggregate continuity passes.

Road/ground contact remains unresolved. The right-side approach is a broad pale olive/pale surface with discontinuous darker road patches; the car is too small/dark in Satellite for trustworthy wheel-contact judgment. At6488 most of its body is hidden by the foreground building. These are explicit appearance limits, not a claim that the actor is proven underground or inside that building. No observed native turn remains on which to judge the CPU record's sharp heading changes.

## Mechanical audit and exact bindings

`native-audit.json` independently reruns the frozen collection policy over the actual manifest, hashes all 43 PNGs and checks their native dimensions. It records the compact controls, clocks, per-image frame IDs and actual lateness without dumping the large signal snapshots. The record has failure=null, errors=[], contextClosed=true and the exact 19 singles + 24 burst denominator.

Observed attachment was tick 5, pageMs 23906.59999999404. Final tick 7250 has pageMs 144995.30000001192, 121088.70000001788ms later; simulatedSeconds 120.83333333332776 remains aligned to ticks/60. The two bursts have adjacent app frames 6097–6108 and 6265–6276. Entry samples span the 5853 reference threshold; turn observations satisfy the design's clock window but fail its required visible content.

Pointer Cartographic control: ticks 6054→6096, frames 6196→6238. Keyboard Satellite return: ticks 7208→7245, frames 7336→7373. Both actual control records show expanded then closed, selected DOM/bridge/URL agreement, fixed demand and unchanged document; camera position/target displacements are exactly 0 in both records. Final population is 2 active / 4 waiting / 0 pending; 10 spawned / 8 retired / 8 reused / 10 generations, 20 crossed, 8 completed, 4497 grants, zero authorityViolations and retiredInPlace. All refused routes remain in the native manifest. Bus delivery remains unaccepted; the prior 0/78 eligible-start census is not an observed bus success.

`packet-verification.json` checks all 66 records in 204's sealed packet, not just its report, plus its before/after binding equality. Exact packet report SHA-256 `685df97f3ea649ffa730892844c3d55a76bbf059cdadbc1fa4b73972c44cd430`; seal `463a506c9fdc7c7924ed360e8e91a53e87b4a425105329bae6605591312bff88`; native manifest `e490ce1a2aec4e5b0f81ca04ccb79e1ed36b743f194fbcfa9ac0ed2694afe5a2`; collection marker `5f7aaa112f5f3644188d861b5e5b8a70404780433bf32847a4025964c8eec53b`. The marker correctly says appearanceAccepted=false.

| Bound graph | Files | SHA-256 |
| --- | --- | --- |
| source/test/tools/config |370|`20e38fcd9535f52cb2e8bc350c645e040781560009e725deca4c677b0c18e4dd`|
| actual 200 dist |4|`00e5172cb33d1656109a7a3306ca243bed7a7f450eb6496e49dec0c36a7dd0d9`|
| executor/harness/reference |43|`634fd9616e85d4a3a8672747d125e558264e6e6245587d54fc8a768dcb1c08c4`|
| served scene/network |117|`dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c`|

207's own `before.json`/`after.json` confirm those full inventories, all 31 preparation records, prior 200 certificate/build/frame/lifecycle bindings and declared shared caches remain byte-identical. Root-owned canonical docs are excluded because root owns their status updates. All fourteen actual 195 files still match integration195.json; no integration edit was found. The actual 200 certificate remains `61924ea306d099cdfcd3f4131d5aeaa4801157908e73e3035c0743a03a7bf715`.

## Integrated source scope and limits

Read 184's bounded clearance/halts source admission, 196's exact 21-byte local 20 second test-budget insertion, 200's five-gate evidence and 202's static native review. Their distinctions remain: source 184 admits the width-fitting kei/taxi increment ; 196 changes only one test's execution allowance ; 200 reports 92 files / 802 tests, 44 hardware frames and 3 clean lifecycle repeats ; 202 accepts the 44-frame static regression scope only. 207 did not rerun those gates or adopt them as populated appearance proof. The build chunk warning and two moderate audit items remain inherited disclosures.

Reviewed the actual candidate diff and current planning/request/integration/lifecycle paths, including shared route pose/width screening, fresh authority halts, entry/passage clearance and refusal preservation. `src/agents/population/routes.ts:787–798` uses source route position/Y with the existing lane offset and expressly does not fit ground support. `vehicle-clearance.ts:43–97` checks actor envelopes against current active/pending actors along source segments, not rendered buildings or terrain. Therefore these checks cannot settle R207-1's occlusion-versus-intersection question. `tick.ts:1244–1269` refreshes actual halts before integration; `:1528–1555` observes published-body authority, retains failed obligations and counts release only after observation; `:1850–1877` executes the fixed phase order with real tick counters. No new source finding was established from the hidden turn.

Outside the diff, `src/agents/agents.ts:106–128` advances only the attached population and refuses rebuilding it in place. `src/app.ts:278–301` mounts the renderer before releasing held simulation steps; `:397–408` changes presentation without rebuilding the population. `src/main.ts:75–79` updates style through the real app and history URL; `src/harness/bridge.ts:209–210` clones aggregate population/signals. The diff is empty for those public attachment/control/rendering paths, scene/render code and actor rendering. That validates source continuity of the reviewed flow; it does not supply the missing turn pixels.

The literal default scene remains unpopulated. No pedestrian, bus, selected-body full lifecycle/exit, whole-city contact/support, continuous collision safety, 3000/200 capacity or 60fps population-target acceptance is implied. Population counters do not turn rendered instance counts into visible body counts. With R207-1 unresolved, the end-to-end traffic milestone remains incomplete even though its source and mechanical scopes retain their earlier bounded admissions.

## Cleanup and handoff

The actual run's retained-owner receipt ended at 19:16:16.4568315Z with retainedSurvivors=[], unadmittedLive=[], scopedLive=[], portListeners=[], protectedUnchanged=true and exit 0. 204's sealed independent postcheck at 19:17:33.9793949Z likewise reports no owned survivors/listener and zero terminations. Protected foreign Edge 29932 retains creation 2026-09-26T20:40:54.268535-07:00 and its exact executable path. Its owned outside-Git temporary/cache directory was removed. These are verified 204 records, not a new live process census by 207.

207 created no browser, GUI, server, daemon, outside temporary directory or persistent helper; all foreground read/hash commands completed. No process termination was attempted. Live process enumeration was not repeated in this read-only image review; root retains final resource ownership. `cleanup.json` makes that limit explicit. Existing images and this review's observations, scripts, preservation records and final seal remain intentional evidence for root's attributed diagnosis. No disposable output was left and no old counterevidence was deleted.
