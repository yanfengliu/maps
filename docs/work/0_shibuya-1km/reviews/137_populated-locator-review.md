# Review137 — visible actors, unresolved crowd packing

Bound: independent native review of exactly 12 sparse 1280×720 images from two fresh default `/?agents=1` contexts. The camera was driven with real pan, orbit and wheel input to two frozen CPU replay hypotheses. This establishes visible actor appearance and changes between these samples. It does not establish live actor identity, continuous motion, physical non-intersection, exact contact, signal authority, performance, or activity at the signature crossing. Two camera locations belong to two separate simulations, not one continuous camera journey.

Reviewer: `populated_visual_critic`, 2026-09-27. Main was `0ec3dd03831b605235302212b7d140cb35297071`, a documentation advance with source/build bytes matching the prior `e03f17d` capture. Input: `artifacts/populated-locator-observation-20260927/run-01/`. All reviewer output is confined to `artifacts/populated-locator-review-20260927/`. Root owns permanent promotion and final acceptance. AGENTS, local rules, current lessons, Review132, the frozen protocol, pose plan, probe, runtime manifest and completed receipts were read. No product, source, data or Git mutation was made.

## Verdict

**The locator observation succeeds at exposing actual rendered actors. It does not pass crowd visual quality.** Human heads, torsos, arms, legs and clothing are recognizable in the first pose. Vehicle bodies, windows and wheels are recognizable in the second. Actor positions and limb silhouettes visibly change across the sparse same-style image sequences. This is materially more actor evidence than Review131's empty crossing.

**The primary material finding is dense pedestrian clumping with merged body silhouettes in both views and styles.** Repeated clothing and figure shapes reinforce the artificial column-like appearance. Apparent body overlap is visible, but exact physical penetration and its cause remain unestablished from these projections. The next task should diagnose that finite observed grouping with the current replay and actual rendered body bounds. The central-crossing absence remains open; these peripheral locator pictures do not repair it or validate the separate 24-person startup design.

## Findings

**[P1] Pedestrian clumps do not read as individually separated walking bodies.** In the human pose, the rear of the group forms a narrow, tightly compressed column. Adjacent heads, shoulders, torsos and legs merge into a single dark mass. The rear cluster around x=617–686, y=410–535 in `human-cartographic-5700.png` is especially clear. The same problem is already visible in `human-satellite-5400.png` around x=615–672, y=270–365. Some leading figures have readable gaps and complete silhouettes; the dense cohort behind them does not. This difference makes the clump more conspicuous than a uniformly crowded street would be.

The vehicle pose supplies a second view of the same visual class, not proof of the same people. In `vehicle-satellite-5400.png`, several separate pedestrian bunches sit along the visible pavement. The central bunch around x=856–944, y=444–519 reads as interleaved heads over fused dark bodies. In `vehicle-cartographic-5580.png`, the brighter pavement makes similarly compressed shoulders and legs around x=758–847, y=387–465 easier to distinguish from the ground. The effect survives style changes and visible progression. The problem is not merely that Satellite is dark.

Those screen regions identify the pictures being criticized, not world coordinates or measured physical penetration. Dense bodies can overlap in projection without intersecting in 3D, and the high viewing angles shorten the apparent spacing. This review therefore reports unacceptable visible packing and apparent body overlap. It does not label the cause as initial overlap, broken avoidance, an incorrect collision envelope, model deformation, queueing or bad spawning. Those alternatives need the current simulation and body bounds to distinguish them. Hiding the group, reducing its reported count or changing a camera cannot establish a corrected crowd.

**[P2] Repeated figure and wardrobe silhouettes make the resolved crowd conspicuously synthetic.** The near view includes recognizable dark formal clothing, blue denim/workwear-like clothing and brighter blue casual tops, so the sample is not a single material. However, the same dark-haired, blue-clad and black-clad shapes repeat next to one another along the column and inside the side-view clumps. `human-cartographic-5580.png` and `vehicle-cartographic-5580.png` make this repetition plain. The density magnifies it by placing similar models shoulder-to-shoulder. After the packing issue is understood, review the visible distribution of existing variations in a comparably sized resolved group before deciding whether new assets are needed. These two views do not establish the diversity or correctness of the entire asset library.

## Appearance and limits

**Recognizability and model quality:** the human locator shows real body-shaped models rather than distant dots. Several separated leaders have readable head/torso/arm/leg structure, with no obvious exploded limbs or grossly stretched bodies in these samples. Facial fidelity, full-mesh reference-pose correctness and subtle deformation remain unverified: the camera looks down strongly and faces are small or hidden by heads in front. The medium-distance crowd in the vehicle pose is less individually legible; its dark, repeated silhouettes and noisy tan head/hand details merge most strongly inside the clumps. This is not a whole-model fidelity pass.

**Vehicles:** black, light-roof-marked boxy vehicles and a grey boxy vehicle are readily recognizable. Their windows and near-side wheels resolve; the grey vehicle remains clear enough to follow visually across the sequence. Forms and materials are simple and angular, and Satellite's bright upper front surfaces have a strong pale highlight. They are adequate to establish recognizability here, not final photoreal vehicle quality or coverage of every fleet type. There is no clearly established gross scale mismatch between the resolved humans, cars and paving in these views; this is a visual plausibility judgment, not a world-metre measurement.

**Obvious ground contact and body intersection:** exposed human feet and vehicle wheels appear near the visible pavement/road surface, with no unmistakable large levitation gap or deeply buried body in the inspected unoccluded examples. That limited observation does not accept foot planting, continuous wheel contact, the walking surface selected by the simulation or inter-actor collision safety. Moving legs legitimately leave the ground. Dense packing hides many feet and body boundaries. Several leading human figures reach or cross the bottom image edge, especially by the later human frames. Foreground building faces obscure parts of the vehicle pose, including left-side cars and later parts of the crowd. Full bodies and contact are unjudgeable where clipped or occluded.

**Visible change:** in the human sequence, the separated leaders and the dense rear group progress downward along the pictured pavement; visible arm and leg silhouettes also change. In the vehicle sequence, the grey vehicle and pedestrian groups move toward the upper left relative to the static background. The black vehicles progressively become occluded by foreground building faces; disappearance behind those faces is not evidence of a rendering or lifecycle defect. These observations support visible changes between samples. They do not prove actor identity continuity, physically correct trajectories, normal gait throughout the interval, smooth animation or the absence of transient clipping. No video or consecutive-frame contact record exists here.

**Style coherence:** the same pavement/building layout and camera framing remain visible when Cartographic replaces Satellite. Actor shapes and clothing remain recognizable; they do not disappear on the style change. Cartographic's brighter ground reveals the packing more clearly. Recomputed camera position and target drift are exactly 0 m across all four recorded dropdown changes. Human-session ticks advance 5537→5551 on pointer Cartographic and 5719→5725 on keyboard Satellite; vehicle-session ticks advance 5541→5552 and 5722→5736. The keyboard returns have state records but no final PNG, so their visual appearance is not independently inspected. Stills taken at different ticks do not prove that the same individual actor survived a switch.

**Framing:** the human camera gives a useful resolved crowd view but devotes much of the right side to a near building and eventually clips the leaders below the frame. The vehicle camera looks through large foreground building strips. Those are evidence limits, not a new diagnosis that actor rendering is broken. No attempt was made to infer hidden feet or to judge an occluded car's full body.

## Exact evidence checks

`diagnose.mjs` independently rehashed all 13 files named in `bound-complete.json`, the four assigned receipt/handoff pins, both completion binding files, the six frozen runtime files, four diagnostic-reference files and shared binder. All matched. It decoded every PNG and confirmed native 1280×720. The two sessions are recorded closed, errors are empty and the owner receipt reports successful cleanup. The requested defaults are 3,000 pedestrians, 200 vehicles and seed 5970698; all 24 screenshot brackets report 3,000 rendered pedestrians and 41–43 rendered vehicles. These are whole-scene counters, not visible-body counts. The human-pose near count of 100 and vehicle-pose medium count of 105 are not used to count or identify the people in the pixels.

The actual screenshot brackets run from tick 5405 to 5717 across the two contexts. Image labels name requested tick thresholds, not exact shutter ticks. Capture spans are 131–197 ms and 10–13 simulation ticks. The shortest same-style pairs start 266–317 ms apart; the longer adjacent pairs start 1,666–1,784 ms apart. This is sparse sampling. No image is promoted into a frame-accurate animation/contact record.

Fresh full inventories of the declared source/build/harness roots and both served mounts exactly match capture `after.json`; capture before/after inventories are also equal. Source and build retain the delivered e03f17d bytes.

| Inventory | Files | Bytes | Exact tree SHA-256 |
| --- | ---: | ---: | --- |
| Source, tests, configs and selected offline tools | 253 | 2,716,779 | `acc2a14e52240f8fc6a430b347177476155e2be83b829773cf9d3fed3f1e07a7` |
| Build | 4 | 6,042,802 | `5e6e8ca49b87d06e38d79cf9af937aa1c0e095b1056af69cfeb87540282100f2` |
| Harness and frozen locator runtime | 45 | 560,614 | `aaecaa0179337b90056869f2b7bac42a84413d9d23cd91e8b056595515d3f6b6` |
| Served scene and network | 117 | 301,782,754 | `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c` |

The capture records ANGLE/NVIDIA GeForce RTX 4090 over Direct3D11 and driver 616.64. Root's `root-current-bindings.json`, checked at 2026-09-27T12:03:27.312Z, agrees with the recorded GPU and content inventory. This reviewer revalidated that receipt against the capture but did not run another GPU probe. These bindings cover their declared roots and observed instants; they are not a new continuous mutation monitor.

| Bound receipt | Independently verified SHA-256 |
| --- | --- |
| `bound-complete.json` | `55b84a7341e6d0862535590bb559e87851e23736b6998a5b579a6fc3c51dfcaf` |
| `manifest.json` | `349da204a67310dac29a0d4b2dab7b0aab871caea74971127689b7095785bfbd` |
| `owned-run-receipt.json` | `a5912270b9acefc077159620b2a22ce291a49ebb4146cfd0f1f1226fdba203d3` |
| `HANDOFF.md` | `109097ea5c8916b415fa5284bd0e083d447c97c6da4dfae9271ecd78a7f844b6` |

## Individual native inspection ledger

Every image was opened individually in its own `view_image` call using `detail: original`, at its full native 1280×720 size. No contact sheet, thumbnail, crop or another image substitutes for any row. Hashes were independently recomputed. The machine-readable `native-inspection-ledger.json` additionally records pixel hashes, exact camera and capture brackets, counts, dimensions and byte lengths.

| Native image | Actual ticks | Individual inspection | SHA-256 |
| --- | --- | --- | --- |
| `human-satellite-5400.png` | 5405–5416 | Separated leaders recognizable; dense rear column has merged silhouettes. Feet of isolated leaders visible. | `77a55971901ed8e31e587eb88a850172ee6425aff1b25f14d01a66a061db602e` |
| `human-satellite-5415.png` | 5421–5432 | Leaders move downward and limb poses change; dark rear packing persists. | `cdb05d58983c2a189bd0dd9198461ecb54aff693444a7c747c0883e3a034631b` |
| `human-satellite-5520.png` | 5521–5533 | Group has visibly progressed; closest leading body reaches the lower frame edge. Rear clump remains compressed. | `8a83f9fcae870ae6631cae42ea24b191b1c10b107267a5f2f97a51cda147d639` |
| `human-cartographic-5580.png` | 5584–5594 | Brighter pavement reveals bodies and clothing; strong adjacent repetition and dense rear grouping. Leading bodies partly clipped. | `7f39a57c75ff29ae56aab053c654fda5541b3c6d0d8b7bab45ec3e5ccab66352` |
| `human-cartographic-5595.png` | 5600–5610 | Clear short-pair changes in legs and positions; compressed rear heads and shoulders remain. | `42d10b097a176fed5c8f914323799c514f51dbf078550e037e339202046906d4` |
| `human-cartographic-5700.png` | 5704–5715 | Most pronounced near-view clump; rear cohort advances as tightly merged shapes. Bottom clipping limits front-body review. | `98834ddbc252b05f68c4e9fee5f9ba4016e27d46b3d2e9ee61b2cb854df0b7d0` |
| `vehicle-satellite-5400.png` | 5405–5418 | Recognizable black and grey vehicles; several dark pedestrian bunches. Foreground building strips obscure left portion. | `ad14484df47a3feb3f6d89e24c0dcf74858a48bbb75155cf5d6e04ba7601ae02` |
| `vehicle-satellite-5415.png` | 5424–5436 | Grey vehicle and crowd shift upper left; left car becomes more occluded. Crowds remain visually fused. | `a8d19fdd9da21eb960784fe5e1ce95055330e4f695701d15207e4760c49204cb` |
| `vehicle-satellite-5520.png` | 5525–5537 | Continued clear change in grey vehicle and crowd location; foreground occlusion grows. Vehicle wheels remain readable where exposed. | `b31edee09c0007606d6366d42056341794e9a6d166b7547f289c1b348369bfa1` |
| `vehicle-cartographic-5580.png` | 5582–5593 | Brighter ground shows severe crowd silhouette compression; grey vehicle recognizable; black vehicle partly hidden. | `5a74a069e6c2abf2d32f9b2526499d7342976f52614521a7618555e90617cf97` |
| `vehicle-cartographic-5595.png` | 5598–5609 | Grey vehicle progresses left; packed people also progress. No basis to judge hidden wheels or full bodies behind facade strips. | `595c62488d35c8e7257f1cbb220808dd6b93de51e3d33b1ba51a58785fd95f8c` |
| `vehicle-cartographic-5700.png` | 5705–5717 | Grey vehicle still resolved, black vehicle hidden; crowd partly behind central building face. Remaining exposed bodies stay tightly grouped. | `40c30130f665349f2ae65a7f59cd7f0e6fabb91c5f263caaced9d9234c50b845` |

## Small exact pixel check

The decoded-pixel check confirms that each same-style pair differs. It does not itself identify actors or establish why any pixel changed; visible actor change is the separate native-image judgment above. Full numeric results, changed bounds and maximum channel changes are in `diagnostics.json`.

| Same-style pair, abbreviated | Start-to-start ms | Changed pixels of 921,600 |
| --- | ---: | ---: |
| Human Satellite 5400→5415 | 268 | 33,673 |
| Human Satellite 5415→5520 | 1,666 | 45,296 |
| Human Cartographic 5580→5595 | 266 | 41,082 |
| Human Cartographic 5595→5700 | 1,731 | 45,324 |
| Vehicle Satellite 5400→5415 | 317 | 68,797 |
| Vehicle Satellite 5415→5520 | 1,681 | 111,060 |
| Vehicle Cartographic 5580→5595 | 268 | 34,558 |
| Vehicle Cartographic 5595→5700 | 1,784 | 41,792 |

## Concrete next actor task

Diagnose the visible compressed groups with the current actual replay and displayed body bounds. Distinguish initial placement from later queue formation, and distinguish genuine body-envelope overlap from projected overlap or a model-envelope mismatch. Bind a finite diagnosis to current inputs and the approximate observed tick window; replay correspondence remains a hypothesis for a live identity unless separately established. Repair the demonstrated cause while retaining support, spacing and authority constraints. Then independently review comparable native groups in both styles for readable body separation, full-body model appearance and obvious contact. Keep any additional observation bounded and justified by that diagnosis.

This is separate from the central startup placement prototype. Real spacing for its proposed 24 people would not repair the other boundary clumps shown here. It is also separate from the earlier empty-crossing finding, the accepted limits on requested vehicle counts, the railway/source-blur concerns, and full Q1/Q5/Q6 research. No old whole-city gate is reopened or declared green by this review.

## Execution and retained evidence

The only diagnostic run was `node artifacts/populated-locator-review-20260927/diagnose.mjs`, exit 0 in about 0.8 seconds. It reads existing files, hashes and decodes PNGs, and writes this review's own JSON ledgers. No browser, GUI application, server, GPU workload, full test suite, build, network request, model generation or product/data write was launched. No new capture was made. The original owner receipt records completed=true, exit 0 and empty retained/unadmitted/scoped/port arrays. The separate read-only cleanup receipt agrees and identifies the older unrelated Edge process as preserved. This reviewer owns no browser/server process; the file diagnostic exited.

Retain `REPORT.md`, `native-inspection-ledger.json`, `diagnostics.json`, `diagnose.mjs` and the cited original capture evidence while these findings or root's handoff remain open. Native recognizability and sampled visible change are established. Crowd quality, exact contact, continuous motion, whole-map population quality and the central crossing remain unaccepted.
