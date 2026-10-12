# Round 31 — native hardware profiler queue format

Independent focused read-only review, 2026-10-11, assigned Astra/xhigh pin. Workspace: `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`, branch `codex/shibuya-unreal-5.8`, HEAD `e0d33fe504d103b83b39aa0b2d2efc8bb0b2ccec` plus reviewed uncommitted continuation. Scope: the narrow parser format delta, complete parser/admission consumer, three new evidence/check scripts, actual retained native table and necessary installed-source definitions. No reviewer test, compiler, engine, build, browser or network operation ran. Only this review and ignored retention were written.

## Verdict

**Accepted within the offline parser-compatibility bound; no material finding.** Recognizing the observed `Display:` prefix and installed `Compute`/`Copy` queue names preserves the unique capture hierarchy, single Graphics owner frame, immediate `LumenScreenProbeGather` parent, positive exclusive dispatch and prior synchronization requirements.

Original native trial `85885767...` remains failed, with `readiness_gate=did-not-run`. Its hardware crossing was visually rejected by the integration owner. Parsing its retained bytes successfully does not rewrite that receipt, certify a new native execution, complete the six-camera gate or accept appearance. This review inspects the parser and retained data; it does not independently repeat the image review or grant Game/performance acceptance.

## Exact change and retained native evidence

Compared with reviewed contract `ec9dc284...`, the executable delta only removes an initial `Display:` verbosity prefix from the `LogRHI` payload and replaces the incorrect `AsyncCompute` queue spelling with `Compute`. Removal occurs before the first table delimiter, so it does not strip the event cell's one padding space or three-space depth. Recognized queue transitions still clear frame, header and hierarchy state. `GPUProfiler.h:70–79` returns `Graphics`, `Compute` and `Copy` as actual profiler labels; `GPUProfiler.cpp:1393–1409` gives Graphics a numeric profile header and emits other queues without one. The repaired spelling follows the installed formatter rather than an RHI enum alias.

The remaining complete parser is unchanged. It requires two dispatch columns, reads the first exclusive count, validates numeric cells and indentation, and requires an exact hardware event whose immediate parent is `LumenScreenProbeGather` with the exact request/submission scope above it. Exactly one Graphics profile frame must contain that scope. Witnesses with a numeric frame must match that owner. Compute's numeric profile frame remains absent; no equality with Python `GFrameCounter` is invented. `verify_profile_attribution` still requires the expected current component/token, later same-frame submission, exact before/after/current scope, frame79-to80, observed one-pixel finite readback and callback unregistration. Diagnostic, driver and readback tests retain their round29 hashes.

I independently hashed the full native log and reconstructed the byte interval `[650538,822844)`: its 172306 bytes match the retained profile digest `e67c0174ce227d73f9dcb358e8c0014fbf027f25af3096f6d6b54464585c6fad`. Metadata's completion object exactly matches the original pinned receipt. It records trigger2935, submission2936, the unique capture80 scope, one finite readback pixel, unchanged current component/scope and callback cleanup.

The raw table begins `LogRHI: Display: Compute pipeline 0 - GPU 0`. It contains the exact capture scope, a `LumenScreenProbeGather` branch, a nested radiance-cache hardware leaf at line86, and the distinct direct screen-probe hardware leaf at line99. Only the latter meets the immediate-parent condition, with exclusive dispatch1. The Graphics header at line131 is frame3042; the exact owner scope appears at line155. The table therefore supplies real queue spelling, prefix, hierarchy and counters rather than a synthetic positive invented for this repair. Its observed owner3042 is retained separately from submission2936.

## Controls and limits

The new tests pin the original report/full log/profile hashes, require the extract to equal the original file slice, and derive attribution from the actual recorded completion. They execute the exact retained old parser, which rejects the native format, then the repaired parser, which admits one direct screen-probe Compute dispatch beneath the exact scope and Graphics owner3042. Negative controls alter the actual table: wrong submission and unrelated Compute scopes while retaining the correct Graphics owner; zero exclusive with positive inclusive count; radiance-cache-only hierarchy; missing or ambiguous Graphics owner; and an unknown queue label. Existing malformed-depth, missing-witness and R30 readback controls remain included. This tests the defect and adjacent admission conditions without weakening the positive witness.

The evidence extractor saves raw bytes and offsets, without modifying the native receipt. Its fixed image-verdict metadata is an authored observation, not an automated appearance check. The offline runner freezes all eleven targets, invokes the actual tests and syntax check, compares final target/control/native-input hashes, records owned child termination and emits a receipt in `finally`. I inspected the author-run log: 17 tests passed in 0.299 seconds; the receipt records syntax success and children22900/25292 stopped0. These results are not reviewer reruns. The original trial still records `passed=false`, clean exit0, no remaining owned descendants and final integrity passed; clean cleanup does not change its failed gate or rejected appearance.

## Digests and retention

Freeze receipt `artifacts/unreal/lighting-next/hardware-offline-20261011-142704/report.json`: SHA-256 `35ce72c396ad909933016945f3f75b9e6f3bf61f1791b0fb37fa08abc56c6c59`. Every live target and frozen/retained copy matched at entry and final checking. Copies, logs, native inputs and relevant installed source are intentionally retained under ignored `tmp/review-runs/hardware-round31/`.

| Target under `artifacts/unreal/lighting-next/` unless stated | SHA-256 |
| --- | --- |
| `DefaultEngine.hardware-candidate.ini` | `e9723c4ca4e4e8fd24e174ef0bdda5f332de9037cb0984a703664b02adb5630c` |
| `shibuya_tools.hardware-candidate.py` | `b764aa3a8e39832883680242a61f360d18ff377e1621a5f025639abfdb1e7744` |
| `hardware_diagnostic_tools.py` | `a5292717650a2ce627f932f7c259dea3031c105a9c6fa51df851230aa9230d0e` |
| `hardware_contract.py` | `05569e42fbd28d740b7b52ba3ddc4abb6ec9fc6d42f5787535da1d0e10545cce` |
| `run_native_hardware.py` | `379a4f98282057bbbf435a02985aa411746add93ea534773f6930ccaf17dad55` |
| `test_hardware_candidate.py` | `a07e73373d685cd909110d2ac7ac7360741bc9748f678154bac64363d6b4e5e4` |
| `visual-hardware-candidate.md` | `bcdbbf4a64deec88a3b82f1652960468f5e2ee80f89b2ad61af0968674000763` |
| `tools/unreal/mcp_run.py` (workspace relative) | `8478643d5125e57a6e92aa68f34bdeae9c4a327eef406a7bf14428e8ff89031e` |
| `test_native_hardware_profile.py` | `cef210fcd850d43160575ab3dcecffa9468363eec624d7a76b9fcffcb8038250` |
| `prepare_r31_evidence.py` | `5ac0a8a8a3b9789d1ddff32898ec84f866ce69921067eb5e57d7f36ad838bc6a` |
| `run_hardware_offline.py` | `19bd47f21a90aad23909a58b11213b94526ea4b257094b4169b4b3a3f2eba020` |

The retained native report/log SHA-256 values are `85885767590bc6c4e950e754aeab6354427496afedd4ca45920f8fda86fa644f` and `5fc4a5084dbeb4e8dd31356fe867c4ef4ab7299e585c31305fea367a5f9517f4`; metadata is `27ad771b4c3949874cf7dff05784061eca5cea76a94d0e806605a61229ce4ac5`. All six native inputs match their freeze pins before and after review. Their retained inventory is `9f1597f13fb545663e86e678b1ea2fd92f177c55f00f97d43414d1e9c2f65c99`; independent slice verification is `34866764df9179e2db72aafbae98cce5c3c5c178824aed0d3efe7e42daeb7835`.

Initial target inventory: `531908fc185a839ac0e9b94a8e41f493e865168cd50de85c03c6dddd2005b5cf`; final target/evidence inventory: `8115157a4f5b327590de44986a408c53d3ca361a2471a7c2fdaea2a8c355802b`. All24 primary-source hashes match; source inventory is `7f3f2784770fbda633ea9fb950eb8f0c34385e9185955ce0bacc8a78ed872335`. Installed `GPUProfiler.h` is `a3465f869a88b5cdd711b42b4e6122d78febfd00cd0ee003fc904ec2187f6a43`; `GPUProfiler.cpp` is `491d174fe878e8dac49af70063a8cffe14bf13d9fda9d196f1e35c4df3c0f942`. Test log: `43a409242413d2bd0fab1828b00791c9f9167bfd126f39749fc93591d53eb817`.

Canonical helper41da6c74, init8d1a2202, Config4d35e4b5 and map4203bd60 remain at the freeze's full digests; control inventory is `f29480491ce4b66ec08e0bd587452d11ec022045ca92baf54e30b5db7f717256`. Unchanged earlier review conclusions carry only within their hash-bound scope. No product edits or native resources were created by this review. The reviewer releases the slot with parser compatibility accepted, the original native failure preserved and appearance unresolved.
