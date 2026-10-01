# 436 — preserve trains and prepare the smaller visible increment

2026-09-30. Mechanical implementation owner split436; root owns integration and acceptance. Base revision `e060d3059ef607f10dcfbbce174d842da5fbb315`. Read the actual instructions, local rules, lessons, progress board and reviews420/422/433/435. Root released this scoped split after accepting 435's exact source contract. Only one checkout is writable; this worker used its assigned disjoint paths, with no other product owner writing them.

**Prepared, not verified or committed:** the unqualified train candidate is preserved, and only its runtime integration/types/tests were removed from the active graph. The surface/error/camera increment can now enter its own qualification. This does not fulfill the ordinary visible-train requirement, accept the train model or qualify the wider Shibuya deliverable.

## Exact preservation and split

Before product edits, all ten train split files and the two adjacent lifecycle/camera tests were copied as exact raw bytes using CreateNew under `artifacts/train436/deferred-20260930T234414945Z/before/`. Each source and copy was rehashed after writing; all twelve matched. The six interfaces pinned by 435 matched its reviewed hashes. Root independently checked the twelve copies before release. `before-pins.json` is SHA-256 `c44b088a8bc0ce8ba46fee466871f86ac7ac858856438831822f056c22aeff22`.

The five inactive paths below were removed individually only after rechecking their active and preserved hashes. No recursive move/delete, dependency change, cache edit or data edit occurred. `removed-hunks.json` records every exact removal/extraction, with shared-file context. The five shared active files preserve CRLF; the extracted app test preserves the original mixed test's LF.

| Active path | Before bytes / SHA-256 | After bytes / SHA-256 |
| --- | --- | --- |
| `src/app.ts` | 22502 / `1ab90598f754c53695a23566b218288efd1a691f95cebb47b6734409da2786fa` | 22164 / `66aa438e85775bbb1908c5071f310288553cfc9678dc381a34c9cfa5067279ee` |
| `src/harness/bridge.ts` | 14742 / `28b3baf3d13faa77fb50285fcfb620be42f5893e00e7ee113f357f3e43ff4eb6` | 14229 / `da98b4005b857081754e72522ce74261ecc39faab6c4d2503385856efcc4b9ad` |
| `src/scene/rail-trial.ts` | 18847 / `3539a3afeefd2429a7f6a0fc4b44b524f981618317702de1d852c1cc6494f457` | 17582 / `b5eaa7dbb2e6473789a648d6fa55c7968b4a840c83e81e5fa5a4a7f71879d845` |
| `test/harness-bridge.test.ts` | 10228 / `150c04d28f51a98173353427c3d0ee061201a6a5b965358b8def0e863d2b6374` | 9382 / `20d09b325a9ac14a8c91fe58395f50a5db943d9b3df5ce3dcbdcbb1220a3ddc7` |
| `test/rail-finish.test.ts` | 6157 / `9596c9445d16b61ce42c781f1b2d502a83fe0983e87ba20c1e065ad600addbdc` | 5965 / `18f7f22587d2991be623ea9d5ffdd7d1fd0db61c42df791dfefc53cc305a1071` |
| `test/app-shader-failure.test.ts` | New extraction from the preserved mixed test | 6080 / `f81a74721a9a5186cc270a9db61501b8e8b2de46c07e18282a7997d1bb1a032e` |

| Inactive original path | Preserved bytes / SHA-256 |
| --- | --- |
| `src/scene/rail-trains.ts` | 12176 / `e31739062a103007212f46b89d9dabea547db6b75e3a0aad5623993e0a86e128` |
| `src/scene/train-path.ts` | 7324 / `571a1ebe270898b0f3f4207412eadb828a8919119d6147dbef100d54d101744f` |
| `src/scene/train-schedule.ts` | 2423 / `30fa4511393de0be39efba723976a42b689e22de20f414ee32bb631570d70b6e` |
| `test/running-trains.test.ts` | 8501 / `e16b83643f7f08268dc5ba05f482d800a68ce38167e6e03992ab462f385892bc` |
| `test/app-running-trains.test.ts` | 7287 / `39760c6aca6a73bae933249c6a959aa6cf6e30710de32fb7f119b00e18866dc9` |

App loses only the train scene type/storage, motion term in post stillness, third train factory argument, mount assignment and bridge source. Its static rail promise still uses loadOwned, mounts the root, applies styles and disposes the resource. Bridge loses only the train type import, its two optional declarations and frozen train-reading spread. Rail-trial loses only train imports/data parsing and fields/options/local/style/dispose/construction/observation members. Its admitted manifest and asset fetch/hash checks, complete static replacement/parser transforms, layer geometry, clipping, finish materials and idempotent disposal remain intact. The static manifest still fetches and verifies the provenance/recipe assets through trialAssets; only additional train-specific parsing/validation is deferred.

Harness-bridge loses only the train roster entry and detached/frozen train case. Rail-finish loses only its two train fixture fields; the actual static geometry/material/disposal assertions remain. No hidden flag or dormant train import was introduced.

## Retained class coverage and unchanged boundaries

The same-draw shader case from the original mixed app test remains byte-for-byte in active `test/app-shader-failure.test.ts`, SHA-256 of the exact retained case `828ae82e45154186f43a8ec299b9cf0dab66e1c24fd049f665c1a9677826aaea`. Its mock rail scene is now static. The case still establishes an initially ready city, raises the named shader error during the post draw, checks nonready/error/visible alert in that same frame, and checks persistence after a style change. Only its train case, train mock observations and train motion stub were deferred. It has not been executed by this worker.

The adjacent app-local-walk-lifecycle and camera-rest tests contain no moving-train additions and remain unchanged: 6999 bytes / `5aae22471f5bcec8c78c41e2d27e6fefba7f558123108c568d9f1676f6acfd25`, and 9560 bytes / `37a75ec986776343ec3556f9840031dc25d687a8df746dc29a91d08889bfe880`. Renderer-failure, material/structure/shader, camera input and flythrough endpoint/class tests remain active. The accepted 433 plan/test hashes remain `b56cd3717142b6398e07df5510bfc5f7a00dddd233775a87993f2c8dd9838319` / `b2c5004aa8121294c7e722400ecb2bc90fff2398df4c3bf3534f7ab9573a75ee`. The approved 431 camera remains `2319a949fcf2a54525f52a3a8e2530a3dab714cf83f5a3ec7a6fe6d590f63ecc`.

Twenty-three excluded source/test/toolchain paths were hashed before the split and rehashed afterward with zero mismatch. `unchanged-pins.before.json` and the after receipt bind the renderer, camera, surface materials/structure, terrain/roads/vegetation, rail finishes/source contract, signage/buildings, 433 planner/test and unchanged driver, material/error/camera tests, package files and Node pin. Shared app failure/readiness/alert code remains byte-identical because the after app reconstructs exactly from its before copy with only the six recorded train edits.

## Source inspection and acceptance handoff

The finite census across `src`, `test` and `tools` found zero active train module imports, types, data fields, third options contract, scene storage/status or bridge references. Its rg exit1 is the expected no-match result. Independent raw-hunk reconstruction reproduces all six active after files exactly, with operation counts6/4/14/2/1/6. The first census receipt attempt raised six PowerShell errors from bare `true` metadata expressions and omitted its reconstruction rows; no product byte changed. That invalid receipt is preserved and superseded by `source-census-corrected.json`, which records six successful exact reconstructions under stop-on-error handling.

| Packet record | SHA-256 |
| --- | --- |
| `after-pins.json` | `bc45e0c2fa08855a6b20cfac24ed61be0712345730816e202f1140e2ed09efe1` |
| `removed-hunks.json` | `c8faaac95dbaad117dcce50e47a65a08c26f7599e54d7e7d4f3be019fad08f88` |
| `unchanged-pins.before.json` | `6d6c460ccc4169e186baf34d1f98f64c3fbfa90097a9f60f49c706d2845162fc` |
| `source-census-corrected.json` | `ec333607e9ce16ce2b9b79fe130aeb225c17ef4a6df1a707e0096757bbd42e35` |
| `retained-evidence-index.json` | `c63f03b36d030353eeff55f8d2babac0c2ebc9cfe4652c6c33e4a68ce64b85c1` |

Existing 411/411b execution records and 429's four originals/inspection remain untouched at their original paths, with exact index pins. The inactive 434 diagnostic is stale after this split. Packet RESTORE.md explains reintegration onto later clean main: recreate absent train-only files without overwrite, merge only train hunks against later shared files, extract the train app case without duplicating or deleting the retained shader case, and obtain fresh source/production/native evidence. Full old app/bridge snapshots are evidence and must never overwrite later renderer/material/camera work.

This worker ran only file preservation, scoped byte edits, hashes and source/dependency reconstruction. No import, test, build, types, audit, Git, browser, GPU, server or live probe ran. No task-owned browser/GUI/helper/server process or live process lease was created or retained. Independent exact split review, one required build/types/full-unit/audit sequence, current native static rail/material/camera/error qualification, the canonical44-frame/three-lifecycle visual gate, independent integrated review and main integration remain with root.
