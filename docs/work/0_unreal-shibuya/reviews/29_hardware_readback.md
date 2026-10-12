# Round 29 — observable hardware capture readback

Independent focused read-only review, 2026-10-11, assigned Astra/xhigh pin. Workspace: `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`, source HEAD `e0d33fe504d103b83b39aa0b2d2efc8bb0b2ccec` with reviewed integrations. Scope: R30 repair, complete changed callback and admission functions, their driver/cleanup consumer, actual-source controls and installed readback API. No reviewer engine, compiler, test, build, browser or network request ran. Only this report and ignored review retention were written.

## Verdict

**R30 is repaired within the code/offline bound. No new material finding.** The exact eight-target freeze below is accepted for the bounded native experiment. Successful readback now requires an observable one-element result from an API whose failure result is empty; valid red pixels remain admissible. R29's capture token, frame, native hierarchy and cleanup contract remains unchanged from round28.

Native positive readback, compatible attributed hardware dispatch and all six-camera appearance criteria remain **did-not-run**. This review grants no ordinary Game, input, performance or photoreal acceptance. A native run must still obtain the required actual witness; settings, labels and these offline controls cannot substitute for it.

## Repair and boundary evidence

Installed `Engine/Source/Runtime/Engine/Private/KismetRenderingLibrary.cpp:295–363` returns `PF_Unknown` for an unavailable target/resource, unsupported format or failed surface read. Its single-pixel wrapper at `:434–450` converts failure to finite red, which caused R30. `ReadRenderTargetRawPixelArea` at `:454–479` uses that same helper but returns an empty array on failure. The reflected header at `Engine/Classes/Kismet/KismetRenderingLibrary.h:179–180` exposes the array API. For `(0,0,1,1,False)`, the installed implementation requests exactly one pixel without normalization; successful LDR/HDR paths return that sample, while failure cannot masquerade as one red sample.

The complete `profile_active_capture` callback now calls that area API with the active state's world and target, records the returned length and rejects every length other than one before reading channels or marking synchronization complete. It then requires finite channels and the existing same-submission-frame/name checks. Exceptions, empty/multiple results and invalid channels retain failed status and run callback unregistration in `finally`. The independent `verify_profile_attribution` consumer requires `synchronization_pixel_count` to be an integer exactly equal to one plus four finite numeric channels. Boolean and floating counts cannot pass. There is no red-color blacklist.

The unchanged driver consumes only completed status through this validator before accepting attribution and later matching the actual profile tree. Failed or missing completion raises or times out. Its hardware branch does not submit another frame80. Pending callback cancellation before capture teardown, process-local cvar restoration, native shutdown/owned-process cleanup and final input/asset/parent hashes retain their reviewed paths. The delta does not weaken R29's exact request/component/scope, frame79-to80, current component, cleanup or immediate `LumenScreenProbeGather` hierarchy conditions.

The tests execute extracted actual old and new callback functions with independent mocked Unreal frame, property and read APIs. The old callback is pinned to `ab2d679a2f8b769998eace4d36d990cea6c0cf75928fcd3c46e9eab225676e34`; the old admission is pinned to `95b04f69b999f13065ab3318b105f2a7e9e64366e81aa986f04cdcf37b081d91`. Reintroducing both accepts the installed single-pixel API's finite-red failure value as completed synchronization. The repaired callback rejects the actual array API's empty-array convention, extra samples, nonfinite channels and exceptions, and unregisters in each case. A valid one-element red array passes. Exact target and rectangle arguments are asserted; the consumer separately rejects missing, Boolean, zero, multiple and floating counts. Installed-source assertions bind the two failure conventions. These controls exercise the repaired boundary and its original defect; they do not prove native API execution or rendering.

## Exact target and retained evidence

Receipt `artifacts/unreal/lighting-next/hardware-offline-20261011-140604/report.json` has SHA-256 `c3e467d7b5e34808464f84e25203947af16442d9f0773679b200443b97619058`. Live targets, frozen copies and reviewer copies matched at entry and exit. Exact copies, receipt, logs and installed readback source/header are retained under ignored `tmp/review-runs/hardware-round29/`; prior round28 evidence remains retained.

| Target | SHA-256 |
| --- | --- |
| `artifacts/unreal/lighting-next/DefaultEngine.hardware-candidate.ini` | `e9723c4ca4e4e8fd24e174ef0bdda5f332de9037cb0984a703664b02adb5630c` |
| `artifacts/unreal/lighting-next/shibuya_tools.hardware-candidate.py` | `b764aa3a8e39832883680242a61f360d18ff377e1621a5f025639abfdb1e7744` |
| `artifacts/unreal/lighting-next/hardware_diagnostic_tools.py` | `a5292717650a2ce627f932f7c259dea3031c105a9c6fa51df851230aa9230d0e` |
| `artifacts/unreal/lighting-next/hardware_contract.py` | `ec9dc284cacf82b93052c6493bbc87aad457ab714e39f63cb3436a51e29de43a` |
| `artifacts/unreal/lighting-next/run_native_hardware.py` | `379a4f98282057bbbf435a02985aa411746add93ea534773f6930ccaf17dad55` |
| `artifacts/unreal/lighting-next/test_hardware_candidate.py` | `a07e73373d685cd909110d2ac7ac7360741bc9748f678154bac64363d6b4e5e4` |
| `artifacts/unreal/lighting-next/visual-hardware-candidate.md` | `6c95680bb875944a11cc8a07649d3f3af5d11c9a6e01bb40702f6cc7b451be4a` |
| `tools/unreal/mcp_run.py` | `8478643d5125e57a6e92aa68f34bdeae9c4a327eef406a7bf14428e8ff89031e` |

Initial target inventory SHA-256: `d673e785c9ea1d2757ea4c4d4943c63dcf10dd1327cd176122675a7863be96f0`. Final target/evidence inventory: `60e89a7e1eb27b271a9771ca3e5de562aa2fd14bbff7d775d828b952e32e18ef`. All 23 installed-primary-source hashes match the receipt; source inventory SHA-256 is `87f0e266bb686b246273f69e0b0bfac1bf900daf3ecf892a201afac10079e582`. The readback implementation/header hashes are respectively `deb0c8a86956983b9b86e693d8c7cb935dce26a0c4f4c0e07e54f9871c231e02` and `47f47c7bd0deae7f647ec08baf38d42f33eaeb3e6230d55cc5c6bee2bb53f4fa`.

Author-run log SHA-256 `829f764ec56af960ccfceda70e01b4919f0596536975a1f78368d09a795c206f` records 14 tests passing in 0.199 seconds. The receipt records syntax success and Python children71804/2432 stopped with exit0; the syntax log is empty, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. These are inspected author-run results, not reviewer reruns.

Canonical helper41da6c74, init8d1a2202, Config4d35e4b5 and map4203bd60 remain at the receipt's full digests before and after review. The canonical-control inventory has SHA-256 `f29480491ce4b66ec08e0bd587452d11ec022045ca92baf54e30b5db7f717256`. Candidate helper/config/runner/driver bytes are unchanged from round28; earlier fixed-view, physical-condition, material/parent, final-integrity and cleanup observations carry only within their existing hash-bound scope. The candidate note in this freeze is intentionally the ignored path in the table. The driver binds the actual runtime bytes at launch; this review does not infer acceptance of any future runtime integration. Evidence remains intentionally retained for the pending native experiment. The reviewer owns no native or GUI process and releases the review slot.
