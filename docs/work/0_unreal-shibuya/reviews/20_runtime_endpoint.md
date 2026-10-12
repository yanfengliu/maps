# Review 20 — source endpoint roundoff and native resolution request

Independent Astra/xhigh read-only review, 2026-10-11, of the five frozen files in the runtime worker based on `33d386299ff7bd02d91bca38f655f41597ddb756`. The canonical branch has not thereby accepted these five files or their native behavior. The owner branch exception and fresh Unreal rules apply. No engine, compiler, test, network or browser was run by this reviewer; work was static reading, direct source comparison, light JSON parsing and hashing, plus authorized report/evidence retention.

## Verdict

The source endpoint normalization and `-ForceRes` change are supported within their stated bounds. The promoted route fixture independently matches the actual pinned source coordinates and endpoint values, and the retained actual C++ red/green results exercise the reported roundoff defect. Native route initialization and measured 1920×1080 behavior still require a new native gate.

Two P2 findings remain in the changed core-test tool: **R25, fixture membership is not preserved by the post-run comparison; R26, core proof input/output paths are not protected against reparse traversal.** The integration owner accepted both for repair. This is a finding-bearing review of the exact frozen target; it does not approve a later repair or certify the new harness as fully verified.

## Exact target and coverage

The frozen inventory is worker `Artifacts/runtime-build/native-endpoint-repair-prepared-20261011/inventory.json`, 2146 bytes, SHA-256 `e2c973caf10c11daaa4cead7c32a569cf65b647dee7c9f7d2143a9e731e5c6ef`. All five exact target files are retained under canonical `tmp/review-runs/runtime-round20/target/`, together with the inventory, offline proof, core red/green receipts/logs, process records and previous native report/log/data. `review-inventory.json` binds the retained bytes. Copies were hashed against originals.

| Target | Bytes | SHA-256 |
| --- | ---: | --- |
| `Source/ShibuyaRuntime/Public/CitySimulation.h` | 25852 | `d3d7921d6c409cd040d09479121af065abb3411d5fcd8ed8cfa10136f7621c65` |
| `tests/runtime/test_simulation.cpp` | 21417 | `d46f48e38dd7b6774dbf277bd6f8bf8f944f50564a5993fd506c466049c5ad8d` |
| `tests/runtime/fixtures/source_endpoint_foot_204019090.h` | 1270 | `2d2fbcecad0ae3e91a2514b1083fd6aeb23095ada6376124566df3e520c224a3` |
| `tools/runtime/test_core.ps1` | 4313 | `42bacfa1e114ea5631fa3f4954c63437c8551f3d57607b5067327fb934ee3de8` |
| `tools/runtime/run_native.py` | 40950 | `1abd74552bac8a61f6a136b2563512056bd5c1e491e74dc7acd6d9eabd440588` |

Direct diffs against the retained round-13 target were read for all four previously existing files, along with the complete new fixture, complete core PowerShell tool and relevant changed-function/caller context. Unchanged simulation, runner and Windows CNG implementations retain their prior review bounds; this assignment did not repeat an unrelated full audit. Line citations below refer to the frozen target, even if a later authorized repair changes live files.

## R25 — P2: a removed fixture escapes the post-run identity check

**Location:** [test_core.ps1:44](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/tools/runtime/test_core.ps1:44), with initial capture at lines 19–20 and receipt construction at line 45.

The new code records hashes of the initial fixture files, then verifies only files returned by a second `Get-ChildItem`. If an initially present fixture has disappeared, no iteration checks its old name. A successful core process can therefore produce a passing receipt with the old `fixture_sha256` map even though the file set changed during the gate. More strongly, a fixture can change between the initial hash and compiler consumption and then be removed before the second enumeration; the receipt can bind the initial digest to an executable that used different bytes. The existing comparison catches changed surviving files and newly added names, but not missing initial members.

**Required repair:** capture an explicit admitted fixture inventory including names, byte counts and hashes; after the process, require exact set equality as well as unchanged size/hash for every original member. Missing files, added files, read/stat errors and changed bytes must fail before a passing receipt is emitted. Preserve an actual negative control demonstrating removal cannot escape and a changed/missing-file diagnostic that identifies the affected input. No such mutation was run by this reviewer, and the current 5749-assertion receipt is not evidence that this failure path is guarded.

**Acceptance impact:** the new source-fixture binding claim is incomplete until this repair and its control pass. The independently compared frozen fixture and the specific retained core outputs remain useful evidence within their measured identities; this finding does not assert they actually changed during those runs.

## R26 — P2: lexical proof paths can traverse a junction outside the owned tree

**Location:** [test_core.ps1:13](C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/tools/runtime/test_core.ps1:13), especially the lexical prefix check at lines 14–16; new fixture reads at line 20 and the output creation/write paths at lines 4–5, 22, 41–46 are affected operations.

`GetFullPath` and `StartsWith` normalize/check a path string, but they do not reject a Windows junction or other reparse point in its ancestors. For example, `Artifacts/core-probe` can be a junction to a different directory while an absolute `HeaderDirectory` under that lexical prefix still passes line 15; the compiler then consumes that outside `CitySimulation.h`. Similarly, an `Artifacts/runtime-core` junction redirects creation of the batch file, object, executable and receipts outside the intended output tree. The new fixture enumeration and hashing also follow their actual filesystem paths without checking the fixture directory's ancestors or leaves.

This contradicts the fresh branch's explicit no-reparse source/output admission rule and the tool's own message that a mutation header must remain inside the task-owned Artifacts folder. The issue is not a proposed cross-platform architecture change: it concerns this Windows proof tool's existing input and output boundary. The current frozen tree is not alleged to contain such a junction; the missing rejection is established by the code path, not an executed escape experiment.

**Required repair:** inspect the normalized real project root and every existing ancestor/leaf for the fixture, alternate header and owned output paths without following reparse points; reject reparse, missing required input, inspection/stat/hash errors or a path outside its designated root before the corresponding read, hash, write or compiler use. Preserve the same boundary for any owned cleanup added by the repair. Test real parent and leaf junction cases under disposable owned paths and retain their exact red/green outcomes. Existing runner/source guards can inform the bounded repair; no old-main setup or unrelated paths should be imported.

**Acceptance impact:** core proof confinement is not complete until those boundaries are guarded and the negative controls are observed. This does not invalidate the previously reviewed native runner's separate path guards; the only runtime-runner change here is `-ForceRes`.

## Endpoint semantics and independent source fixture

`Route::Prepare` at `CitySimulation.h:120–129` retains finite-value and direction checks, allows the existing nominal one-micrometre endpoint tolerance, and replaces near-start/near-end distances with exact 0 or the computed route length. It does not invent route points, extend geometry, alter the supported path, move ordinary interior stop lines or relax signal direction. The native loader already validates pedestrian entry stops against the directed source endpoints using the one-micrometre policy. The strict zero-tolerance comparison in the core was inconsistent with that admitted source precision.

The normalized endpoint values feed the existing `GapToRedStop` calculation at lines 245–257 and forward/reverse endpoint re-entry logic at lines 303–320. Snapping them avoids leaving a reverse stop an arithmetic ulp beyond the actual endpoint. Source geometry, stop signals and actual positions remain the basis for the checks; the fix does not substitute a travel counter for physical motion.

The reviewer independently hashed canonical `data/prepared/surface/movement-network.json` to `0575c220ad42b889600cb47840d3d04300a454b884c4e2428dc84f664304cbfc`, selected the unique `foot-204019090-0` record, and compared all 33 parsed coordinate doubles in its eleven points with the promoted fixture. Every coordinate matched exactly as a double. The source width is 1.2 m. Source stop distances/directions are 0/+1 and 13.965242938064176/−1, matching the fixture; both refer to the same source crossing signal. The fixture maps that signal to its isolated test index 0. Its geometry and stop values are fixed input copied from the actual admitted source, not generated by the normalization function it tests.

The 1270-byte fixture includes the original movement-network digest and source attribution pointer. It is a small promoted regression input rather than an imported old cache or a newly downloaded source. Its bound is one actual sampled crossing and its endpoint arithmetic, not analytical proof of the continuous support of every city route.

New test lines 97–116 require the actual source endpoint to prepare successfully and normalize exactly; exercise a small negative start value and `nextafter` beyond the end; reject stops two micrometres outside either endpoint, NaN and direction 0; and check that forward and reverse pedestrians held at their normalized red-light entry points do not move. Those checks address the reported class without treating the helper's own return value as the expected route geometry. The unchanged `isfinite` and direction checks remain visible in production code. Native signal behavior still needs the actual Game gate.

## Real red/green core and prior native observations

| Retained evidence | Bytes | SHA-256 | Observed bound |
| --- | ---: | --- | --- |
| `offline-proof.json` | 1162 | `5444bc6974eceb9d171b0cebb1d8fff8713c975850c7de32f138b3fe1581a0e6` | Records source value 13.965242938064176, actual MSVC geometric length 13.965242938064174 and 1.7763568394002505e−15 m difference |
| Core `20261011-123532/report.json` | 657 | `2fb27ec7ea0ede9f7906c16374ea13f73fe1b7501dff1658bb479af5bdc97082` | New core, exact test/fixture hashes, exit 0; stdout says 5749 actual-core assertions |
| Core `20261011-123543/report.json` | 658 | `29087452957ac7614190d846a6d72c81ea86a58b054ebf47c967ed44f17aa14f` | Previous strict core `911aa437…`, same new test/fixture hashes, exit 1; stderr says source-pinned endpoint roundoff was not admitted |
| Native `ddeb6b958dfc4f0daeed339559ef3b03/report.json` | 183567 | `c7f87216b578c44645c9fbc102b54945120d97064ca706656b8f8214d70b49d0` | Failed world readiness with out-of-range `foot-204019090-0` stop; no population/control acceptance |

Both core receipts were read with their actual stdout/stderr. The red core is the previous strict implementation exercised with the same promoted fixture, not a fabricated failing assertion. The review did not repeat these runs. R25/R26 remain independent gaps in the surrounding proof tool and are not claimed covered by this numerical red/green pair.

The prior native attempt logs `SHIBUYA_NATIVE_SHA256_KNOWN_VECTORS_PASS provider=WindowsCNG` at stdout line 1783, then the source stop failure at line 1784. Its native `load_state.actual_input_sha256` contains 506 measured input bindings, with the expected network/source/movement manifest digests; its world remains `ready=false` and no actual agent population is accepted. Its native viewport readback is 888×500. The process exit was 0 but the external receipt correctly reports `passed=false` because the loaded world/population criterion failed. This distinguishes the now-observed CNG execution from unfinished native source readiness and gameplay.

## ForceRes mechanism and unchanged measurement

The entire `run_native.py` diff is the addition of `-ForceRes` at line 473 beside `-windowed -ResX=1920 -ResY=1080`; process ownership, native-result freshness, source/asset bindings and performance verdict handling are unchanged.

Installed `Engine/Source/Runtime/Engine/Private/GameEngine.cpp:326–328` reads the requested dimensions. Lines 413–440 apply a desktop-size clamp and choose a convenient smaller window unless `ForceRes` is present and command-line window overrides are enabled. The actual installed file was read directly outside the authored diff and hashes to `5725223d99aa838a0cae7c916527f8a759ac7d23204a7b4303642dedee16ebaa`. This supports the new flag's intended mechanism; it does not prove the next native viewport will have the requested dimensions.

The unchanged native probe obtains actual dimensions through `GameViewport->Viewport->GetSizeXY()` at `RuntimeProbe.cpp:170–171`. Its performance predicate at lines 287–289 still requires exactly `FIntPoint(1920,1080)`, at least 30 seconds, actual hardware/native counts, 3000 pedestrians/200 vehicles and the stated frame/GPU timing requirements. No resolution assertion was reduced to accept 888×500, and no command-line flag is substituted for that native size measurement.

## Handoff and outstanding verification

The retained process census lists the worker's eight owned core/proof roots and no remaining processes. The reviewer created no persistent process and touched only the new report and ignored retention. The endpoint and resolution changes have a bounded static verdict; R25 and R26 require their narrowly scoped repairs, actual failure controls and focused re-review before the harness is accepted. Then build the final integrated native target and observe successful source initialization, actual populations and the requested viewport size. Native controls, physics/support, appearance and dedicated full-population performance remain pending, regardless of this core assertion count.
