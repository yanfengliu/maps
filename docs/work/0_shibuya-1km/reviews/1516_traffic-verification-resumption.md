# 1516 — Bounded third traffic verification arm

Date: 2026-10-18 UTC. Verification owner: verification1516_traffic_resumption. Integration owner: root. Independent timing/native reviewer: verification1517_fresh_review. Workspace: artifacts/traffic1499/worktree, branch codex/traffic1499, base 0681715632e66ad825a3d78ac7d9282c5cb038b5.

## Outcome

**PARK; no code adoption, commit, five-gate bundle or main integration.** Six native originals now establish a bounded visible stopped vehicle, release, turn and departure at the crossing. The required source-boundary exit remains unverified: this arm produced zero boundary images and no native retirement witness. This is the third historical native arm, explicitly reassigned after 1515; the 1506/1512 park and both prior failures remain retained. There is no fourth arm or production repair under this assignment.

The code, tests, fixture, data and dependencies were unchanged. All 23 paths still match candidate3-freeze.json SHA-256 461a3e2deed114a29f290e7e36b974516072816fdeb7c7a37e2e8359f991e91c. All 322 source/build/data/visual-harness before/after input entries match. The retained 600 s CPU result was not repeated. Existing source/authority reviews retain their bounds; they do not establish this missing native exit.

## Fixed reproduction and timing correction

The reproduction remained ordinary http://127.0.0.1:4319/ with no query override, source default seed 5970698, 24 requested vehicles, zero generic pedestrians and the retained walker started through the real button. The renderer was NVIDIA RTX 4090 through D3D11. The planned 45 m crossing camera and boundary camera were unchanged, driven only through the existing OrbitDriver and real pointer/wheel input. No camera, simulation, actor or renderer state was assigned.

Before editing, literal old run2 payload 0feeb33b99441191d0cc2a1889cd9086c9c4be095051eb778aca7e1111f4d476, supervisor 5d373ceccbb44c9c4d4004c5eee1d856ae544653a95afc417abd9382da03b056 and recipe 5d7fd4a5a60ac62c207b4f21f8b22f25176d9b19bb5e40f077f32178e561f712 were copied under ignored run3-preparation/previous-run2. Neither failed run was overwritten.

The inherited untilTime used target simulation seconds as a new wall-second allowance. Run2 expired at its223-wall-second inner wait before218 simulation seconds, with zero originals. The third helper instead received the supervisor's single absolute 750-wall-second ceiling, reserved the final 30 seconds for cleanup, and compared actual population ticks against the unchanged targets. All setup, control, camera, observation and capture waits were subordinated to that common work ceiling; existing operation bounds and the target..target+.5s before-copy / target+1.25s after-copy predicates remained. Node and PowerShell syntax passed. The complete nested-wait inventory and exact helper diff were reviewed independently before root granted an exclusive GPU lease. Final payload SHA-256 is 7ef3665e0173e9aa27f40630b63e0f395f43222b363daa789c967f49004ff7d0; supervisor 97005787f39bdeda9ca4e805b425a48ec7d71109610c8f2b0c85471055cf7706.

The known tree-edge risk was checked against retained originals before launch. The 1515 close view was 65 m; it was not the planned 45 m view. Root kept the 45 m contract and used the first 218 original as the visibility discriminator. The car was legible beneath/left of the canopy. No framing rescue, seed/count reduction, forced clock, actor reset, relaxed criterion, new capture framework or deadline extension occurred.

## Actual run and inspected originals

The supervisor ran 02:20:09.425117–02:32:11.517023UTC, 722.092 wall seconds. Its work ceiling was 02:32:09.425UTC and owned capture ceiling 02:32:39.425UTC. Payload ended 02:32:10.891UTC with exit 1. Exact failure: early boundary navigation exceeded 50,762 ms within owned deadline. Boundary navigation started after the actual 400 s condition; the last retained pre-navigation sample was 399.866667 s at 02:31:18.269UTC. That sample is not the throw tick, and the navigation recipe in inputs records an attempt rather than a completed view.

All six originals were opened individually at native 1280×720 by this owner and independently by 1517. At 218/226 the same-position kei body is visible during the pedestrian stage. At 234/237 it advances during vehicle:0. The 240.867 image shows changed heading, followed by rightward departure at 244.433. Before/after intervals all satisfy the unchanged strict windows. Sparse originals do not prove continuous motion, body contact, interpolation, every actor's behavior or eventual service.

| Original under ignored run3/payload/ | Actual population interval, seconds | SHA-256 |
| --- | --- | --- |
| event-218.png | 218.450–219.117 | 6468b2574c7297953fa1bb130d6f047e4abb0e90e2e67e87b996b4d6e63b9b9a |
| event-226.png | 226.333–227.033 | 0cea69c4fe2b83b5db858e6c19a1e2a19fd8c46fb67f270c06778b0de7553574 |
| event-234.png | 234.400–235.150 | 97b6eab6d80e09abaabdcf8242dd3c38ab126abffda1c546a633fb4087a70671 |
| event-237.png | 237.400–238.150 | 0074a40d297fbeab9408bb82cf0f28f404ce2575d80f1482e6593f052d1c3bc3 |
| event-240.5.png | 240.867–241.533 | c56fa4e700a935af4afce497878db147ea3cf3a4f8f7201f1c927bfd20e41f17 |
| event-244.png | 244.433–245.133 | 24f4e28826521a054cf35326312fb6fb1e172d488bba815aa06d01e064d2aa77 |

Actual Scramble cycle samples advanced 0→1→2→3; these are observed controller wraps, not wall-time estimates or a replacement for the absent exit. The fixed 400 s boundary navigation did not finish before the shared work ceiling, so 480/498/502/506 captures did not run. No actual boundary retirement was observed in this native arm.

Historical supervised native cost is 601.190 s for run1, 250.198 s for run2 and 722.092 s for run3: 1573.480 s total. This bound excludes preparation, CPU diagnostics, reviews and any project-wide elapsed time. The unlaunched 300-second proposal is not counted as a failed capture. The correction admits the formerly missed crossing event; it does not solve the overall remaining capture cost or complete the product milestone.

## Cleanup and retained gap

Payload finally closed page, context, browser, browser server, preview and esbuild. The retained-identity supervisor's fresh final census passed at 02:32:11.439928UTC with no remaining known, omitted or current descendant processes. A later successful native census at 02:33:06.843673UTC also passed; the exact recorded external GUID TEMP was removed after 7 ancestor, 0 descendant and 0 reparse checks. No broad application kill or shared deletion occurred. An initial sandboxed CIM read was access-denied and treated as unavailable; the authorized escalated prelaunch census succeeded before dispatch.

The unmerged worktree/branch, reviewed cache, fixtures, all three failed arms, source freezes and six new originals remain intentionally retained for the unresolved candidate. Gallery evidence stays private and ignored. No server, browser, GUI, watcher or owned TEMP remains.

Full native acceptance, five gates, independent integrated review, code commit/main push and worktree retirement did not run. 24 requests remain distinct from supported/filled traffic: final CPU active 20, unsupported bus routes and 211.583 s queues retain their disclosures. Generic crowd, 3000 pedestrians, 200 vehicles, 60 fps and A7–A10 remain open. The exact remaining gap is a qualified ordinary native source-boundary exit under the frozen reproduction; the third-arm budget is exhausted. This report does not authorize another mechanism or continuation.

Retained ignored receipts: capture.json 283542053c2ce4fc610a87ab041fb578f76ee0db42c1fc2a7126fee0f25982ba (10,207,108 bytes); frames.json 37ddb4c8891d2c783f666366b67e76071c1de134971d6d7d96267d4c2e857ec6 (6,921,083 bytes); process-cleanup.json cfb9f45a6d8765fb1819187973b2dec3a04b266384f82ad37a799cc696cd4ffa; temporary-cleanup.json ce0a9bdb4d890fc5ed70819a34255e85793e0b2f30989d714e7d29c2068966b4. This authored report preserves conclusions and provenance without promoting those blobs into Git.
