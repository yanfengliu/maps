# Startup milestone — independent main acceptance

Bound: the startup LUT and narrow dependency override milestone at PRIMARY main `ff7faab36b9d8e5248e48b1aed5307b7d07f337d`, using the qualified cached inputs, installed graph and production evidence. This is a read-only integrated review after the successful second fast-forward, not a new gate run or full Shibuya deliverable acceptance. Reviewer: `startup_integrated_review`; 2026-10-11. Only this report was authored.

Verdict: **ACCEPT within this bound; no blocking material finding.** I independently verified both PRIMARY and FRONTAGE HEADs at that revision and observed empty staged and working-content diffs in PRIMARY. The owner subsequently cleared the seven status markers through a separately guarded stat refresh; its actual receipt, read by me, records the same HEAD, unchanged source bytes and indexed entries/flags, and empty status. `live/integration/main-stat-refresh.json` is SHA-256 `3a7ced3d4f212b5d78200409aa04b1bad1a9989bcc18afb67bb23dc6fd3bdf81`, at `09:35:13.083Z`. I did not execute that refresh. No push is claimed here.

## Actual integration

I read `artifacts/mask632/live/integration/main-attempt2-completed.json`, SHA-256 `9b9b3a90765be47fd239dd2341c0bc2905c9a877f50113c9aa04d027d9d67a8e`. It completed at `2026-10-11T09:30:52.282Z`, records the actual `5661d0c..ff7faab` fast-forward, qualified raw buffers restored, preserved gate-input bytes and membership, and no push. Its before and after resource observations are available with empty readers and ports. The owned parked test remains retained evidence.

The previously reviewed final target in 650 remains the accepted source and documentation reconciliation: four code files against `5661d0c35761f9ccbbd906a7bd8ee4cb8a7c2cca`, the LUT default identity and numerical parity with the custom fallback intact, and only the reviewed transitive Tinypool `2.1.2` and source-map-js `1.2.2` overrides. The merge imported the exact remote AGENTS canon and preserved the resolved local rules. No additional product change arrived with main integration. The current qualified raw hashes remain signage `e39d0d2e3334877e910a9a9fc81234773458610d056ba8721a89540ca4153318`, sign-mask test `f829e3f96308fe1f67efa8712242f5808f4714f900a64856dac67106aefa1e3e`, package `e702a434fade1b82d52796c1a7085a5363c3dd2fa7d1ffc61dc863ba37271ef2`, and lock `abd8e25271671d985581c9a3363220dec5760d9f0694f1e1e302feff3509159a`. The normalized Git newline comparison in 650 and this exact raw-byte preservation are separate checks.

## Index allowance

I imported the actual existing `align-index-guard.mjs`, SHA-256 `d536f403b081aa5d74f243d496b0c28ba797ccb4ba36f10c382d84597b336cd8`, and called `compareAlignmentIndex` on the retained `main-attempt2-index-before` and `main-attempt2-index-aligned` snapshots. The computed result exactly equals both `main-attempt2-index-alignment.json` and the completed receipt's `indexAlignment` object. No new parser or framework was written.

Both snapshots are valid Git index v2 files with 1,177 entries and valid trailing SHA-1 checksums. Paths, object IDs, modes, stages, full flags, offsets, padding and the sole TREE extension remain exact. The comparison permits only the mtime seconds/nanoseconds fields for these four owned paths; the actual changes are:

| Path | Before mtime `[seconds, nanoseconds]` | Aligned mtime |
| --- | --- | --- |
| AGENTS.md | `[1791710102, 886131900]` | `[1791711049, 161699000]` |
| package-lock.json | `[1791710102, 885133000]` | `[1791711049, 161699000]` |
| package.json | `[1791710102, 885133000]` | `[1791711049, 160698000]` |
| src/scene/signage.ts | `[1791710102, 884130400]` | `[1791711049, 160698000]` |

After excluding only those four eight-byte mtime spans and the validated checksums, all remaining bytes match. This supports this exact allowance; it neither attributes its writer nor explains the first attempt's earlier index change. The before SHA-256 is `35ac33f9fd96d85582936ff4b3aa22ea4bea4fdebebd27f994e19ff5c50ad9f1`, aligned SHA-256 `adb37d48913e7ebedaeb064f8b85e6ddfdd9b181bf43864688889048bd198532`, and the receipt records the intentionally changed post-fast-forward index as `71f545e9bb6c3a42e501e4dddec8ca340988b4de8066dc61714586f57519174b`. A subsequent stat refresh may change that last hash.

## Evidence transfer

Using the existing manifests, I independently rehashed every listed current PRIMARY input. All lengths and SHA-256 values match; the source, data and dist inventories also match, with no added, missing or symbolic-link entry in those traversed graphs.

| Existing bound | Files | Current bytes | Mismatches |
| --- | ---: | ---: | ---: |
| Qualified source | 452 | 4,884,490 | 0 |
| Cached scene/network/rail data | 151 | 354,752,173 | 0 |
| Installed input pins | 8 | 11,714,393 | 0 |
| Production dist | 6 | 6,595,470 | 0 |
| Supplemental input pins | 20 | 111,856,370 | 0 |
| Retained qualification helpers | 7 | 48,557 | 0 |

Source membership includes the exact 431-file src/test/tools graph. The manifests are `live/after-visual.json` SHA-256 `c118a2114bb1d83e301deb7b492afd238362929cb6e91b2b308462c047bb7a52`, `live/prepared.json` `48f2bf363f73d2cc843c6951e04bb924f443f20796d7e440a5c1a1df922373d1`, and `live/integration/main-extra-inputs.json` `39845043973fdfc7dbfebcb098870aaaaeb49cc48507641beeb0c01fc7195d56`. All eight supplemental archive candidates and 41 presence entries also match, including the selected `artifacts/post-chain/motion` archive. Those supplemental pins were made after qualification: they demonstrate current preintegration-to-main preservation, not historical sealing through the CPU and visual runs. The eight installed pins do not independently hash all of node_modules.

The accepted CPU evidence remains build, types, 120 unit files / 1,065 tests, and high-level audit on Node `24.12.0`; the audit retains two moderate findings and no high/critical finding. The original CPU cleanup race remains a red receipt, closed by the separately reviewed fresh zero-resource observations and exact owned TEMP/cache removal supplement. The gates were not rerun by this reviewer after the fast-forward; their transfer rests on the preserved qualified graph, not HEAD equality alone.

I independently rehashed the current visual certificate and all 44 frame originals with zero mismatch. `complete.json` remains SHA-256 `fd60f3e80870c2de3ac57108d1414417f24dce92e4534bc4df60e12acc4936f0`, run `5810760abd3db903`, RTX 4090 / driver `616.64`, from `08:41:29.109Z` to `08:45:29.985Z`. Its three retained hardware lifecycle records still match their pinned bytes, report empty console/page errors, and completed teardown. The certificate binds scene digest `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce` and harness digest `8f22bf47a0fe20f9c040010e11de6010834a33505feee07848f064da52e9c3c8` to the preserved graph.

The current native visual judgment remains exactly the scope of 648 and 649: I personally opened eight heroes and six Satellite plaza originals; the independent outer reviewer opened the other twelve Satellite block/overhead originals. Together that is all 22 current Satellite originals plus four Cartographic heroes, individually at native 1280×720 with digest binding. This acceptance does not expand that judgment to a new native review of all Cartographic sweep originals. No blocking visible startup regression was found; existing soft facades, sparse streets, isolated bright pools and the tower-obscured block view remain limitations.

## Closure and remaining bounds

The original first fast-forward failure, its index-change uncertainty, qualified-buffer recovery and the original cleanup failures remain preserved. Neither the successful second attempt nor its exact parser comparison rewrites those records as successful or attributes an unknown index writer. Main integration is now observed, replacing the pending-main bound in 648/650; the source admission in 651 remains historical admission rather than proof that the first dispatch succeeded.

The startup milestone is accepted on main within the cached-data, four-code-file and bounded visual evidence above. Full-map coverage, broader native visual acceptance, new cold-start measurement, moving pedestrians/vehicles at target population, tree-pilot/seeded replay acceptance and measured 60 fps performance remain outside it. No quality gain or paired-pixel proof is claimed.

I created no browser, GUI, server, watcher or persistent process and changed no runtime, source, dependency, Git or retained evidence input. Live index and all dependency/source reader leases were explicitly released before the owner's separately guarded metadata refresh. Only this permanent LF report remains for the documentation checkpoint.
