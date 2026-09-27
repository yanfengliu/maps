# Review131 — populated crossing remains visibly empty

Bound: independent native-image review of exactly 11 sparse 1280×720 PNGs from the supported `/?agents=1` entry, default seed 5970698, requesting 3,000 pedestrians and 200 vehicles. The captures cover the opening, one crossing pose and one overview over 90.033 seconds of wall time. This review establishes neither continuous motion nor contact, signal authority, actor identity, citywide population quality or performance acceptance. It reviews a completed observation, not an implementation change.

Reviewer: `populated_visual_critic`, 2026-09-27. Inspected checkout: main `e03f17da538f6fdd1b52326a9fe83f908c9a3a67`. Root's concurrent documentation edits are outside the source/build/harness/served-byte binding. Input: `artifacts/populated-observation-20260927/run-01/`. Output and CPU diagnostics are confined to `artifacts/populated-visual-review-20260927/`; product, source, data and Git were read-only. Root owns permanent promotion and final acceptance.

## Decision

The capture's narrow success is accepted. The city renders in both styles, camera controls reach the recorded views, the two real dropdown input paths preserve the recorded camera position and target, simulation ticks advance, the exact input bytes match the current checkout and retained cleanup receipts report no survivors.

Visible populated-world acceptance is not established. One material finding remains: the signature crossing looks empty in both styles. None of its five native images contains a discernible pedestrian or vehicle. The opening and overview images do not supply an identifiable actor group at native scale either. Counts and advancing ticks cannot substitute for the visible pedestrians and traffic required by the deliverable.

## Material finding

**[P1] The supported populated observation does not visibly populate the signature crossing.** At the 45 m camera-distance pose, the pavement, crossing stripes and neighboring road entries are unobstructed and readily inspectable, yet no pedestrian body, waiting crowd or vehicle can be identified. This is true at 4.097, 15.019 and 30.032 seconds in Satellite, and 30.436 and 45.021 seconds in Cartographic. The three Satellite crossing PNGs are byte-identical; their decoded RGBA pixels are identical too. The Cartographic pair changes only four pixels, confined to x=222–223 and y=285–287 near the small left roadside control. That difference supplies no discernible actor movement. The native scene reads as an empty crossing, so this observation cannot close the population's visual milestone.

This is an observed presentation failure within those views and samples, not a diagnosis of its cause. The images do not show whether actors are outside the view, hidden by geometry, waiting elsewhere, misplaced, too small, not yet arriving, or affected by some other path. They do not prove that nobody visited the crossing between captures or during later signal phases. The crossing samples end at 45.021 seconds; the remainder of the run observes the overview. No historical locator, inferred live coordinate or unobserved route is used as evidence.

The overview is not a substitute for the missing actor view. At 950 m, roads and buildings are legible, but I cannot identify a human silhouette or a group suitable for judging body shape, variation, gait or contact. Small isolated marks are below the level needed to distinguish actors confidently from street or building detail. The supported opening is farther out at 1,800 m and shows the city as a small dark island; it provides even less actor evidence. This is a limitation of this observation, not a separate claim that actors need to be recognizable at every aerial scale.

## What the pictures show, and what they leave open

**Actor quality and contact:** unestablished. There are no clearly resolved actor bodies or wheels to inspect. No actor-ground separation, foot sliding, body intersection, scale mismatch or animation defect can be accepted or rejected from these pictures. Lack of an obvious contact failure here is not a contact pass. All 22 screenshot-bracket observations report human near/medium counts of 0/0 and far counts of 2,999–3,000. Those counters do not identify a live group or its location and do not establish what is visible through the camera.

**Movement:** unestablished visually. The exact repeated crossing pixels are evidence that those three sampled views contain no visible change, despite the tick progression. The Cartographic overview pairs change 854 and 1,082 pixels, and the Satellite overview pair changes 861 pixels out of 921,600. These numerical differences prove only changed pixels. They do not attribute changes to pedestrians, vehicles, camera residual, signals or post processing, and do not establish smooth motion between stills. No video or continuous crossing coverage exists in this set.

**Scene integration:** the city itself presents a coherent shared scene. Buildings, crossing paint, pavement pattern, trees and the camera framing persist through the two style changes. Satellite's photographic frontage is visibly soft and smeared in places; the near pavement, tree and signs are comparatively clean. Cartographic removes that photographic softness and presents clear repetitive facade bands. Those are background observations, not a population fix. Existing source-blur and unfinished railway concerns remain separate and are not promoted into new actor findings. No actor integration judgment is possible without a discernible actor.

**Actual style continuity:** accepted only for the observed city framing and state brackets. Pointer selection of Cartographic and keyboard return to Satellite both visibly change the selected label and city treatment. Recomputed camera position and target drift are exactly 0 m across each recorded switch; ticks advance 1869→1877 and 4570→4577. The preserved crossing and overview geometry is consistent with that record. These stills and global tick counts do not establish per-actor identity continuity or the appearance of a continuously animating transition.

**Runtime and population claims:** the manifest names literal `/?agents=1`, default dusk, seed 5970698 and requested 3,000/200. The opening is captured before camera/style input; real wheel and left-drag controls then reach the crossing and overview. The first image starts at 0.012 seconds and the final image at 90.033 seconds after the capture window opens. Drawn counters across all 22 before/after screenshot brackets range from 2,999–3,000 pedestrians and 18–64 vehicles, ending at 3,000/42; the handoff's 18–63 vehicle range omits the before-bracket reading of 64 at `crossing-satellite-30.png` (its after reading is 63). Requested 200 is not observed 200. Sampled ticks and counts do not establish continuous activity, correct signals or the separate 60 fps/1920×1080 target. The page-error list is empty, but that does not change the visual finding.

## Exact integrity and current-byte checks

`diagnose.mjs` independently rehashed all 12 files listed by the completion receipt, all four assigned receipt/handoff pins, and the completion receipt's before/after bindings. All matched. It decoded all 11 PNGs with the repository's PNG reader and confirmed 1280×720. Before and after bindings are exactly equal for project root, runtime, source, build, harness, served inputs and recorded GPU. The script also made fresh full inventories of every supplied source/build/harness root and both served mounts; every record, file count, byte count and digest matches the capture's `after.json`.

| Current inventory | Files | Bytes | SHA-256 tree digest |
| --- | ---: | ---: | --- |
| Source, tests, configs and selected offline tools | 253 | 2,716,779 | `acc2a14e52240f8fc6a430b347177476155e2be83b829773cf9d3fed3f1e07a7` |
| Build | 4 | 6,042,802 | `5e6e8ca49b87d06e38d79cf9af937aa1c0e095b1056af69cfeb87540282100f2` |
| Harness and capture runtime | 44 | 555,652 | `fe2b1b39efb8d20d238a0907a0d548509d8b0fbbd0cf0106114bd02ff638327a` |
| Served scene and network | 117 | 301,782,754 | `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c` |

The recording names ANGLE/NVIDIA GeForce RTX 4090 over Direct3D11, driver 616.64. Root's separately retained `root-current-bindings.json`, checked at 2026-09-27T11:34:26.236Z, also exactly matches the recording's GPU entry. This reviewer verified that receipt against the capture but did not repeat a GPU probe. Disk binding covers the declared roots at the observed instants; it is not a new continuous mutation monitor or a claim about every possible dependency outside those roots.

| Receipt | SHA-256 independently matched |
| --- | --- |
| `bound-complete.json` | `ca11fb0a9ec058557bf0b20353d5350885b4715c53171670eefb90eaa3eb8370` |
| `manifest.json` | `fbc55e696bbf21fba598020d4c5090513c3c149dfd5ba005415a3c24a1f7acaa` |
| `owned-run-receipt.json` | `7170eef7a258f3fad13f768087a23f1eaebd317cfc106fb8cca742e4535ec4e7` |
| `HANDOFF.md` | `6213c89987e3a2e353327a32468074b1834ed7f3e5acc3dbad87f81846ad0b75` |

## Native inspection ledger

Each image below was opened in a separate `view_image` call with `detail: original` and inspected at its full native 1280×720 resolution. No contact sheet or reduced preview substitutes for any row. The exact hashes below are independently recomputed, not copied without checking. `native-inspection-ledger.json` adds pixel hashes, dimensions, times, camera brackets and counters.

| Image | Actual seconds | Individual native inspection | SHA-256 |
| --- | ---: | --- | --- |
| `populated-opening.png` | 0.012 | Small dark city island; no actor group discernible. Buildings and roads resolve, but actor scale is insufficient. | `f7b3dd3e215f649bb76acb0e8462704483a59152c822319b06f1011eba11d9d9` |
| `crossing-satellite-start.png` | 4.097 | Clearly visible empty crossing, pavement and road entries; no identifiable pedestrian or vehicle. | `137d0ac12b8cab76f29f3c23d6d728368a29dea8d0097e626eea47f71bf0ce18` |
| `crossing-satellite-15.png` | 15.019 | Same empty view; no body or vehicle emerges. Individually opened despite equal hash. | `137d0ac12b8cab76f29f3c23d6d728368a29dea8d0097e626eea47f71bf0ce18` |
| `crossing-satellite-30.png` | 30.032 | Same empty crossing and approaches; no visible actor change. Individually opened despite equal hash. | `137d0ac12b8cab76f29f3c23d6d728368a29dea8d0097e626eea47f71bf0ce18` |
| `crossing-cartographic-30.png` | 30.436 | Style changes, geometry and empty crossing remain; clearer facade bands do not reveal a crowd. | `c82341c5ef5b726d6eec563c86859fae7de7f17b62fb48f598de899bba11c5e5` |
| `crossing-cartographic-45.png` | 45.021 | Empty crossing persists; no discernible body, car or group movement. | `e2c49216ccbb4febd8d66523ede1c0b263f1240fd59e573aa4c550edf3c53466` |
| `overview-cartographic-start.png` | 49.266 | City fills most of frame; roads visible, no confidently identifiable actor group. | `b0f1852741d108c4eae10aebb19faa0a571b97b0fcd81644257cb2f5436d773c` |
| `overview-cartographic-60.png` | 60.047 | Same city framing; tiny marks cannot support body/contact judgment or a motion claim. | `fcf312d24c384211c8dc0ed2c1f230d6899d185d23c6422b95e9b4ef989a9840` |
| `overview-cartographic-75.png` | 75.033 | No readable crowd appears; architecture remains the dominant visual content. | `6d62540ef7ec477a4bbedc8ddbcbcd348b32dcffeeb6f9ae103887c01ed96b97` |
| `overview-satellite-return.png` | 75.447 | Photographic city treatment returns at the same pose; no resolved actor group for continuity review. | `f44c16978c9fa79b661baa50f9055f6e076a090e17fc6cebb612098f34c0bdf7` |
| `overview-satellite-90.png` | 90.033 | Same dark overview; no actor body or vehicle trajectory can be tracked between these sparse images. | `b09a4968932481bf7c7d9284c50afcbc744fdeb99f82bb84ab74a29d0843d21c` |

## Next concrete task

Make the ordinary supported default population produce visibly legible pedestrians and traffic at the signature crossing, while retaining its real source/support/authority constraints. First diagnose the gap with the repository's current instruments: reconcile current actor state, actual visible locations, rendering and the crossing view. A fresh CPU replay may provide a hypothesis or locator, but it is not a verified live actor position. Any later live observation must establish its own same-run evidence through the real controls. Do not scatter cosmetic actors, relabel a count as visibility, or move the camera to an old assumed anchor and call the original empty crossing solved.

The next acceptance should include recognizable pedestrians and vehicles in a bounded crossing view in both styles, visible progression across an explicitly observed time window, and images close enough to judge scale and obvious pavement contact. These visible outcomes should be reviewed independently; detailed whole-city simulation research and unrelated railway work are not prerequisites for this bounded task.

## Execution and cleanup

The only executed diagnostic was `node artifacts/populated-visual-review-20260927/diagnose.mjs`, which completed exit 0 in about 0.7 seconds. It hashes and decodes existing files and writes this review's own ledger and numeric diagnostics. No browser, GUI application, server, GPU workload, full test suite, build, network request, asset generation or product mutation was launched by this reviewer. The capture's retained owner receipt has `completed: true`, exit 0 and empty retained-survivor, unadmitted-live, scoped-live and port-listener arrays; the separate independent cleanup receipt agrees. This verifies the recorded cleanup outcome, not a new process census. This reviewer owns no browser/server process to leave open.

Retain this report, `native-inspection-ledger.json`, `diagnostics.json`, `diagnose.mjs` and the referenced original captures while the material finding or the parent handoff remains open. No full acceptance claim is made and no material actor finding is waived.
