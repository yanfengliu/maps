# 435 — Fresh visible-city strategy and camera repair review

Independent reviewer: fresh435. Date: 2026-09-30. Assigned context: documentation checkpoint `e060d30`, accepted product `b4b8755`, and the preserved train/material/truthful-error/opening increment. Root owns integration. This lane owns only this authored review, reads existing evidence, and runs no imports, tests, builds, gates, Git, browsers, servers or GPU work. No long-lived process or temporary artifact was created.

**Verdict: accept the exact 433 source repair for execution; split the still-unqualified train work out of the next surface/error/camera milestone.** No material source finding remains in the two 433 files. The finite train comparison remains a useful later diagnostic with the correction below. This is source admission, not a passing test, live camera qualification, visible-train acceptance or permission to commit before the required gates.

## Exact camera repair

I read AGENTS, local rules, lessons, the current progress board, reviews 423/432/433, the actual 423 red unit log, current planner/test/driver and 433 before/after snapshots. Current planner/test bytes equal the assigned 433 hashes and retained after copies. The current camera, input test and driver match 433's unchanged pins.

The actual red log reports approach azimuth −0.2618 against crowd entry +0.1309, a 0.3926990816987239 rad shortfall against the unchanged 0.05 rad criterion. From the approved −3π/4 opening to the fixed 7.5° crowd bearing, the required short turn is 142.5°. The actual driver defaults to 40 px and converts horizontal input at 2π/720 rad per pixel. Six such gestures supply 120°, leaving exactly 22.5°, matching the observed failure. This establishes the planner-capacity cause without changing input delivery or the acceptance tolerance.

The repair changes the swing expression to `index < 4 ? 0 : (index - 3) / 8`. It uses eight existing approach rungs, beginning at 78 m/23 m height. Each request is 17.8125°; the unchanged cap is 20°. The last existing rung reaches the unchanged crowd bearing. The ladder, targets, crowd push, ascent implementation, twelve approach samples, capture cadence, explicit waits, fixed clock and gesture limits stay intact. Runtime duration is not established as identical: two existing steps now dispatch a turn, and live delivery/damping can change their cost.

The added test checks delivered versus requested angle and the shortest-path sign through the actual unchanged driver helpers. It does not assert the new start index or reproduce the eight-step formula. The retained endpoint test supplies the independent route outcome and 0.05 rad bound, and it is the case observed red in 423. The added test is useful source coverage but has not itself been executed or proved with a failing control. The retained ascent assertion still applies; it must pass in the next full unit run. Earlier turning can change the terrain and foreground crossed, so actual-controls approach/crowd arrival and ascent return still need native pose/clearance evidence.

| Reviewed bytes | SHA-256 |
| --- | --- |
| `tools/flythrough/plan.ts` | `b56cd3717142b6398e07df5510bfc5f7a00dddd233775a87993f2c8dd9838319` |
| `test/flythrough-plan.test.ts` | `b2c5004aa8121294c7e722400ecb2bc90fff2398df4c3bf3534f7ab9573a75ee` |
| Unchanged `tools/flythrough/driver.ts` | `d97c1951d26b494a01a0a7669565899d6658672a2c462e531611cdb7b21a4b4d` |
| Unchanged approved `src/render/camera.ts` | `2319a949fcf2a54525f52a3a8e2530a3dab714cf83f5a3ec7a6fe6d590f63ecc` |
| Unchanged `test/camera-input.test.ts` | `f7ffc5985d45c68cbd4d4f3348d981980d8efcd6a250f5f489248fe349cb6a3c` |
| Actual 423 red `final-cpu-20260930T231213750Z/unit.log` | `6bbc21b2a578a9245ec58ec34cd24f727fc9980b9b5a6144174ccd1798715fcf` |

## Three material strategy findings

1. **A smaller blocker total is insufficient to choose a useful train view.** In the preparation draft 434 I read, the selector accepted an alternative with any lower total component-blocked count and no unknown-alpha hits. That could admit one fewer blocked feature while every carriage remains unreadable, or improvement outside the image. Before admitting a native pose, root must inspect the per-car/per-sample body/window/end matrix, first blocker identities and projected screen extent at separated recorded positions. A coherent carriage sequence must become a plausible native-scale hypothesis; a roof slit does not. Root acknowledged this finding and passed the correction to 434. This review does not admit the unfinished 434 instrument's exact source.

2. **Qualification must have one exit to main, without a second renderer or duplicate CPU runs.** Requiring every other scene family to be resolved offline before even one exploratory capture would turn this finite diagnosis into renderer reconstruction. Root's revised component-only bound is appropriate: recover the observed building obstruction with production replacement/parser/material/clipping semantics, compare only east +π/2/.62 and steeper west −π/2/.28 at the actual target and 220 m distance, retain all other families as unknown, and admit at most one exploratory native pose. Unknown components prevent a full-scene-clearance claim; the native renderer can settle their effect. Keep one child, 1,152 maximum rays and an external 120 s cap. No angle grid, all-family construction or general visibility framework is needed. Likewise, after 433 source admission, run the next required build/types/full-unit/audit sequence once; a separate seven-file focused run followed by the same full gate adds no necessary acceptance evidence here. The existing actual endpoint red is already preserved.

3. **Train sightlines need not hold the now-requested self-contained surface/error/camera chunk.** The human's later steering explicitly asks for frequent meaningful VERIFIED commits and vibrant building textures that avoid a wallpaper appearance. Root proposes this split, and I agree: the remaining train problem is a separate visible-passage qualification, while material/error/camera work can reach its own current-source acceptance. Preservation and a scoped removal, following 420's convention, retain the unfinished train unit without changing the already-qualified material/error logic or approved opening. The chunk is not verified merely because its components were previously accepted; the split itself requires source review, actual current rendering and the required final gates.

## Smallest safe train split

I read the current integration points and tests, then searched `src`, `test` and `tools` for the train-specific names/imports. Preserve all ten current 411 source/test files with lengths and raw SHA-256 before editing. Record each removed hunk, every moved path and the exact active after bytes. Shared app/bridge snapshots remain evidence; reintegration applies the recorded train hunks against the later files rather than overwriting them. Keep existing411/429 evidence and the ignored434 draft. Cached rail data and the static source packet remain untouched.

| Current path | Required scoped split |
| --- | --- |
| `src/app.ts` | Remove `railScene` storage/assignment and its now-unused `RailTrialScene` type import, the train term in `post.setStill`, the third train-options argument to `createRailTrialScene`, and the `trains` bridge source. Retain the ordinary static rail promise, mount, style consumer and disposal. Keep renderer failure, readiness, visible alert and all camera/material behavior. |
| `src/harness/bridge.ts` | Remove the `RailTrainStatus` import, optional `trains` declarations in both interfaces, and only the frozen train-reading spread in `installBridge`. Preserve other observations and truthful renderer/error readings. |
| `src/scene/rail-trial.ts` | Remove train imports, `trainProvenance`/`trainRecipe` fields and parsing/validation, the third options parameter, train local/style/disposal/construction branches, and `moving`/`trainStatus` members from the scene return/interface. Retain existing static manifest asset fetch/verification, replacement/parser transforms, clipping, materials, mount and idempotent static disposal. |
| `src/scene/rail-trains.ts`, `src/scene/train-path.ts`, `src/scene/train-schedule.ts`, `test/running-trains.test.ts` | Move their exact preserved bytes out of active source/test trees into the owned ignored packet. They must not remain active imports or test discoveries for the smaller chunk. |
| `test/app-running-trains.test.ts` | Preserve the complete original. Extract its same-draw shader readiness/visible-alert regression into an active app shader test with a static rail mock. Defer the train mount/ready-clock/post-motion case. Moving the whole file without retaining the shader case would remove a required check for the chunk being kept. |
| `test/harness-bridge.test.ts` | Remove only the `trains` optional-member addition and detached/frozen train test. Preserve all other bridge contract cases. |
| `test/rail-finish.test.ts` | Remove only the two train fields in the `RailTrialData` fixture after the interface shrinks. Keep its actual static overlay/material/disposal checks. |

Do not defer `src/render/renderer.ts`, its failure tests, surface material/structure/naming changes or 433. No query flag, hidden dormant train import or rewritten static rail recipe is needed. After the split, a finite dependency census must find no active train module import, train factory argument or train bridge interface. The actual build/types/full units check the reduced graph; native static rail views and the canonical gate check that the prior static scene still renders. Expected train-test removal is disclosed scope deferral, while the red flythrough outcome and shader failure regression stay active.

434 currently imports the active train modules and binds the unsplit source. Keep it inactive during this milestone. A later train task must bind the preserved packet/reintegrated source and obtain a fresh production proof before executing that diagnostic or photographing train pixels; its existing imports and bindings cannot be assumed valid after this split.

| Split interface inspected | SHA-256 |
| --- | --- |
| `src/app.ts` | `1ab90598f754c53695a23566b218288efd1a691f95cebb47b6734409da2786fa` |
| `src/harness/bridge.ts` | `28b3baf3d13faa77fb50285fcfb620be42f5893e00e7ee113f357f3e43ff4eb6` |
| `src/scene/rail-trial.ts` | `3539a3afeefd2429a7f6a0fc4b44b524f981618317702de1d852c1cc6494f457` |
| `test/app-running-trains.test.ts` | `39760c6aca6a73bae933249c6a959aa6cf6e30710de32fb7f119b00e18866dc9` |
| `test/harness-bridge.test.ts` | `150c04d28f51a98173353427c3d0ee061201a6a5b965358b8def0e863d2b6374` |
| `test/rail-finish.test.ts` | `9596c9445d16b61ce42c781f1b2d502a83fe0983e87ba20c1e065ad600addbdc` |

## Pixel bound and finite handoff

I opened 429 originals 01, 02 and 04 individually at their original 1280×720 size, within the local three-image strategy-review budget. They show narrow pale fragments at changing rail positions, with the foreground row hiding the connected bodies. I cannot identify a coherent passenger-carriage sequence from these views. This supports a sightline experiment; it does not justify moving, lifting or shrinking the train, hiding source structures, or asserting that the body model has independently passed rendering. Original 03 was not opened in this lane, and no continuous-motion claim follows from this sparse selection.

| Native original inspected | SHA-256 |
| --- | --- |
| `artifacts/verify429/01-corridor-0.png` | `f0ddf36850ff2a270d2b7647cc7a3e76bbe59285c684751b413346c3a3b4254e` |
| `artifacts/verify429/02-corridor-1.png` | `673033096e7ec4838d4d79a4e605b04513041de6877a3c6fe62a56926162bcd8` |
| `artifacts/verify429/04-corridor-3.png` | `c2910b436f26e65faee71ff723f10a80e5a381735876e25c5a9d8fb963239956` |
| Bound `artifacts/verify429/train-inspection.json` | `fb010d1333459f26a49945d90e856974e599300c7c691fb598dc8cad8b26d433` |

The current route to main is finite: preserve/split the train unit, review the exact split while retaining 433's accepted bytes, run one required CPU gate sequence, and qualify current default/affected real-controls camera behavior, materials and truthful errors. Inspect current fixed and modest seeded Satellite views with every seed/actual pose recorded; complete the canonical 44-frame/three-lifecycle visual gate and independent integrated review. Basic Cartographic switch/shared-rendering regression remains required, while detailed Cartographic polish stays deferred. Historical component captures cannot become a current final certificate by recollection. Land the meaningful surface/error/camera unit once these checks close. Recognizable train pixels, lighting 413, whole-road treatment, the rejected generic 600 s crowd candidate and 3000/200/60 fps qualification remain separate and explicitly open.

The next bounded facade direction can follow that commit. In the three 429 images I actually inspected, broad building walls look pale, soft and flat; this is one repeated corridor view, not a whole-AOI finding or a proved shader/lighting cause. The user's vibrant-texture requirement is compatible with the existing place-specific photography, but a global saturation change alone cannot establish credible window depth, glazing response or architectural relief. Source the next task from ordinary close and block Satellite views at fixed noon/dusk baselines plus modest recorded seeded exploration. Judge retained sign/color identity, facade detail and light/material response in the native render, with the user's wallpaper concern as an explicit visual criterion. This review prescribes no facade implementation or new proof framework.

When the separate train task resumes, admit 434's corrected finite component comparison once, then either return its named obstruction or admit one current-source exploratory passage. Recovering the baseline must identify foreground obstruction consistent with the originals; generic opaque/clear synthetic controls alone do not establish that correspondence. Keep ordinary source/support, real controls and the live fixed clock unchanged. Native inspection decides recognizable connected carriages and movement; fewer blockers or advancing stations cannot substitute for it.

## Focused round: exact 436 prepared train split

2026-09-30, independent source-only re-review. **ACCEPT the exact 436 split for the next single required build/types/full-unit/audit attempt. No material source finding remains.** This round does not execute the extracted test, qualify native static rail/material/camera/error behavior, provide the canonical visual certificate, accept the train requirement or authorize a commit before those checks close. I did not read or change the policy file under the other lane's ownership.

I read 436's report, the preserved before/after files, removal records, corrected census and actual active sources. Independently applying each recorded removal/extraction at its exact recorded text offset reconstructs all six active files and their after copies exactly. Operation counts are 6/4/14/2/1/6 for app/bridge/rail-trial/harness-test/finish-test/extracted-shader-test. All twelve before copies match their declared raw hashes and lengths. All six active after files and copies match their pins and lengths. The five deferred source/test paths are absent from the active tree and their preserved bytes match. All 23 excluded source/test/toolchain paths match their unchanged hashes and lengths, including the renderer/material/error tests, 431 camera and 433 plan/test/driver.

The exact app removals leave its static rail loadOwned promise, mount, style consumer and owned disposal intact. Only train type/storage/options/motion guard/mount assignment/bridge reading disappear. The app's renderer failure, readiness and alert code reconstruct unchanged. Bridge changes remove only train declarations/import/reading. Rail-trial retains static manifest validation and complete asset fetch/hash verification, including the provenance/recipe assets already listed by trialAssets; only extra train-specific parsing/validation is deferred. Replacement/parser placement, static layer buffers, clipping, finish/style application and idempotent static disposal remain unchanged. The finish test loses only two train data fields, and the bridge test loses only its train case/optional roster entry.

The active app shader test uses a static rail factory mock. Its complete 1340-byte same-draw case equals the original mixed test's case byte-for-byte and independently hashes to `828ae82e45154186f43a8ec299b9cf0dab66e1c24fd049f665c1a9677826aaea`. The case still observes ready/no error before the draw, injects the named error during that draw, requires nonready/error/visible alert immediately afterward, and requires the failure to persist after a style change. No assertion was weakened or moved to the deferred packet. It is prepared source coverage until the actual full unit run executes it.

My separate rg search over active `src`, `test` and `tools` finds no train module/type/data/options/storage/status/factory or train bridge reference; exit 1 is the expected no-match result. This is a textual source bound, not a substitute for the real build/type graph. The original `source-census.json` contains an empty reconstruction array and is invalid evidence. I accept only the corrected receipt, whose six rows are also independently reproduced above. Its superseding status does not relabel the first attempt as a pass.

| Exact round bytes | SHA-256 |
| --- | --- |
| `src/app.ts` | `66aa438e85775bbb1908c5071f310288553cfc9678dc381a34c9cfa5067279ee` |
| `src/harness/bridge.ts` | `da98b4005b857081754e72522ce74261ecc39faab6c4d2503385856efcc4b9ad` |
| `src/scene/rail-trial.ts` | `b5eaa7dbb2e6473789a648d6fa55c7968b4a840c83e81e5fa5a4a7f71879d845` |
| `test/app-shader-failure.test.ts` | `f81a74721a9a5186cc270a9db61501b8e8b2de46c07e18282a7997d1bb1a032e` |
| Packet `after-pins.json` | `bc45e0c2fa08855a6b20cfac24ed61be0712345730816e202f1140e2ed09efe1` |
| Packet `removed-hunks.json` | `c8faaac95dbaad117dcce50e47a65a08c26f7599e54d7e7d4f3be019fad08f88` |
| Packet `source-census-corrected.json` | `ec333607e9ce16ce2b9b79fe130aeb225c17ef4a6df1a707e0096757bbd42e35` |

Packet root is `artifacts/train436/deferred-20260930T234414945Z/`. The next step is one required CPU gate attempt on these frozen bytes, followed by current native qualification, the canonical 44-frame/three-lifecycle visual gate and independent final integrated review before main. 434 stays inactive and stale. No runtime, import, Git, browser, GPU, server, product or instrument write occurred in this review; only this authored append was written.
