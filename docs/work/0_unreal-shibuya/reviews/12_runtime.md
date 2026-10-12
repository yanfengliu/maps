# Independent runtime review 12 — native runner repairs

Authored 2026-10-11 by the independent Astra/xhigh reviewer. Verdict: changes required for R23 (P2), a stale source-data prerequisite admission in the performance wrapper. R15–R19 are repaired at the source/offline-control level described below. This is not native Editor/Game, controls, physics, appearance, lifecycle or performance acceptance.

## Target and validity

The exact target is `C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree`, base `33d386299ff7bd02d91bca38f655f41597ddb756`, frozen by `Artifacts/runtime-build/runner-repair-prepared-20261011-113135/inventory.json`. Its SHA-256 is `b458cfbb84ba3c70772b44409f8bfdd65a277b080b7da0bc7fb4270caf1ca3b0`. The parent identified canonical integration base `e0d33fe`. I verified all 30 live and immutable target copies against the inventory, then preserved their exact bytes and inventory under canonical `tmp/review-runs/runtime-round12/target/` and `tmp/review-runs/runtime-round12/inventory.json`.

The delta from review 9 is eight files: three added and five changed; 22 files are byte-identical. I read all changed functions, callers, interfaces, the complete new native asset inspector, the full runner, its complete tests and its mutation driver. Earlier review coverage carries forward only on verified unchanged hashes. The two-line DefaultEditor opt-out is also byte-identical to the separately examined late delta in review 9. No old main implementation was consulted. Instructions retain their exact AGENTS/CLAUDE hashes listed by the handoff; the owner-approved Unreal branch/no-main-merge exception remains in force.

Writes were limited to this new authored report and the authorized ignored review snapshot/evidence. I ran no engine, compiler, UBT, test suite, browser, network operation or external CLI review. Read-only hashing, file/JSON inspection and diffs do not constitute a native run. The worker's 1,254-byte DefaultEngine remains an old context file and must not overwrite canonical SM6, renderer or integration settings; integration still merges only the owned GameMode field.

## R23 — P2: performance prerequisites do not have to use the same source-data bytes

Exact evidence: `tools/runtime/run_native.py:452–462`. The loop requires each prior arm to be passed, have the expected phase, and match current `source_sha256` and `asset_sha256`. Here `source_sha256` is the implementation/config/DLL inventory assembled at lines 430–432, not the movement/OSM/support inputs. Only the controls arm's actual source files are rehashed at lines 458–462. The other four arms' `actual_input_sha256` dictionaries are not compared to current `source_inputs`, despite the wrapper already writing that dictionary into every receipt at line 530.

Concrete failure condition: run a valid negative-input arm against admitted movement/support set A. Keep implementation and native assets unchanged, prepare source set B, run fresh inventory and controls against B, then provide the old A negative-input receipt to performance. Its compared implementation/assets fields remain equal, and the only source-data check is against the fresh B controls arm. Performance therefore accepts an input-control prerequisite from different source bytes. The same omission affects report-write, oversize and suppressed-source-failure prerequisite receipts. Those intentionally failed-source arms retain the pre-admitted normal baseline in `source_inputs`, so exact comparison is available without claiming their deliberately oversized probe is the baseline network.

Require every prerequisite's `actual_input_sha256` to equal the current pre-admitted `source_inputs` exactly, in addition to the existing implementation/native asset checks. A missing dictionary, omitted support file or changed route/OSM/manifest digest must fail. Retain a named red control using a previously successful non-controls receipt whose baseline input binding differs, while leaving implementation and native asset hashes equal. The current 12 tests and six mutations do not exercise this performance-prerequisite loop.

Acceptance impact: blocks the wrapper's claim that every required functional/negative arm and the final benchmark use the same source-data revision. It does not reject the new native asset inventory, the per-arm source rehash, or the individual arm verdicts. This finding is a static, concrete admission-path result; no new native or test run was performed by this reviewer.

## Disposition of R15–R19

R15, root confinement: repaired in the reviewed code. `run_native.py:29–72` rejects lexical traversal, ADS/reserved components, non-absolute paths and reparse points across every existing ancestor, before resolving and comparing the real project root against the authorized artifacts directory. `digest():75–93` and `read_bytes():96–110` guard both ends of each finite read and compare opened-file identity/size to the admitted file, with a final identity/mtime check. Native temporary cleanup at lines 494–497 re-enters the same guard. The C++ `RuntimeFiles.cpp:29–39` now checks the Windows drive and every root ancestor before descending into input/output components. A real parent junction was rejected by the Python root/hash/cleanup-path checks; restoring the former leaf-only check actually went red. These checks do not claim immunity to a hostile process swapping filesystem components between system calls.

R16, dedicated performance duration: repaired in code and offline controls. `benchmark_duration():117–122` defaults performance to 30 seconds and rejects shorter requests; functional phases retain 10 seconds. `validate_arm():189–192` additionally checks recorded duration between benchmark snapshots and the native requested duration, both at least 30 seconds. `RuntimeProbe.cpp:288` independently includes `BenchmarkSeconds>=30` in its performance predicate. Reintroducing a ten-second performance minimum actually fails the named duration test. No actual thirty-second full-population benchmark has been accepted here.

R17, native asset identity: repaired in mechanism, pending native observation. The added `RuntimeAssets.cpp:11–40` reads the current persistent world's map package and actual file-backed `UPackage::GetLoadedPath()` records, including existing uexp/ubulk/uptnl sidecars. It does not load candidate assets or report a mere potential asset catalog. Paths must lie under the project or installed engine, have native header extensions, and exist; the actual map must be among the records. `asset_set():195–215` and `validate_assets():242–263` reject absent maps, repeated/invalid identities, new unbound files and changed package identities, and require actual agent mesh/material packages to belong to the admitted set. The inspector and byte-binding implementation have not yet been compiled/exercised in Unreal for this revision.

Inventory preparation is explicitly separate from gameplay. It observes a ready population, takes native package snapshots before and after five seconds of game drawing, and emits the separate INVENTORY marker (`RuntimeProbe.cpp:97–103,292–301`). The external runner refuses to treat `inventory_only` as positive/negative gameplay. Before a subsequent arm it requires a same-implementation inventory receipt, verifies the original native receipt bytes, rehashes its bound source inputs and actual asset files, and preserves package identity. Within each arm it hashes project Content before/after, checks actual loaded packages against the admitted set, rehashes all admitted assets and source files, and requires exact full package identity for controls, negative input and performance (`run_native.py:433–450,505–527`). Failed-source arms can report an admitted subset rather than pretend runtime agent assets loaded; new unbound packages still fail. Report-write failure intentionally has no native result, so it can prove unchanged pre-admitted package bytes and project Content but cannot produce its own actual-loaded-package snapshot. That absence remains a failure-arm bound, not gameplay evidence.

The actual-byte mutation changes a small real fixture asset and makes the byte test fail when hashing is disabled. The package-set mutation bypasses set admission and goes red when the test adds an unbound package. These are meaningful I/O/verdict tests, not native assets loaded by Unreal. R23 is the remaining distinct cross-prerequisite source-data identity defect.

R18, process ownership from creation: repaired in implementation with a real Windows control. `SuspendedProcess` at lines 318–391 uses CreateProcessW with CREATE_SUSPENDED, CREATE_NO_WINDOW and an explicit inherited stdin/stdout handle list. Attribute/duplicate handles are closed in a finally block. `launch_owned():394–404` assigns the suspended process to the Job, observes its PID there, and only then resumes the primary thread. Assignment failure terminates the still-unresumed process and waits at most five seconds. The main finally path closes the owned Job, checks it is empty, and closes the root process handle after a bounded wait. The immediate-child/root-exit test actually observes the marker absent before and after assignment, resumes the process, sees its child remain in the Job after root exit, and verifies cleanup. Removing CREATE_SUSPENDED reproduces a specific assertion failure; its deliberately escaped test child is explicitly cleaned. This is a Python-process Windows ownership proof, not an Unreal shutdown proof.

R19, did-not-run negative input: repaired in the reviewed verdict. `complete_probe():125–134` requires the exact 14 ordered stages, ordinary viewport entry, ready worlds and actual native populations. `validate_arm():160–177` rejects inventory-only results, missing/true input movement flags and a failed independent simulation; it requires native movement/support/separation/counts/animation, stable inputs, progressing warm simulation, unpaused stages and zero pawn handler events. Final per-arm source and asset checks also apply to negative input. `suppressed-source-failure` is its own deliberately oversized-input phase: it must be a startup-size failure, must suppress input, and must be rejected by the ordinary negative-input verdict. It cannot masquerade as that prerequisite. Removing the new negative-input requirements went red. The source-failure fixture is synthetic receipt validation at this stage; an actual native failed-source arm remains required.

## Independent primary-source and unchanged-scope checks

I read installed native sources outside any project diff. `Engine/Source/Runtime/CoreUObject/Public/UObject/Package.h:702–706` documents the actual load path, which may differ from package name and may be unset for non-disk packages. `CoreUObject/Public/Misc/PackagePath.h:284–293` specifies that `GetLocalFullPath()` includes path/basename/extension and returns empty for unknown local paths; the implementation in `CoreUObject/Private/Misc/PackagePath.cpp:261–263,764–768` selects the header segment. `Core/Private/Misc/Paths.cpp:1092–1114` confirms that removing an extension with an empty replacement does not retain the dot, so the sidecar construction is consistent with the native API.

The inspector iterates current loaded file-backed packages, not a reference dependency traversal and not transient render allocations. Requiring exact package sets may intentionally fail if a future functional camera path loads an additional native package after inventory preparation; such a failure means preparation is insufficient and must not be weakened into a pass. Its actual package names/paths, map identity and render-agent membership need confirmation on the compiled native run. The unchanged renderer-resource helper remains read-only diagnostics and carries no gameplay acceptance.

Core simulation, boundary admission/lifecycle, source transforms, seeded placement, ordinary keyboard/mouse bindings, walking/refusal/recovery, source support parsing, rendered vehicle poses and discrete physics instrumentation are byte-identical to review 9. The accepted source review 7 still binds network `0575c220ad42b889600cb47840d3d04300a454b884c4e2428dc84f664304cbfc`, movement manifest `7c24389ecf95278d0e9ae521a0a0d01285d64adf764b23b66ef4cf3eff5c49ea` and source manifest `c33926aa35a3a6d08b764cac8bd935a060dfbd0830a94f7d7c6ad854f7c82ee8`. This review does not replace their exact source binding with a generic fresh-download claim.

The unchanged `Config/DefaultEditor.ini` is 58 bytes, SHA `9141f6ae31db1b130a37273eef06cffe335fbf79409aa411519df55674489b7d`, with `[ConsoleVariables]` and `EnhancedInput.bEnableAutoUpgrade=False`. Review 9 read the primary engine configuration load/late-CVar registration/EnhancedInput opt-out code. The parent reports actual CVar 0, legacy classes and unchanged authored DefaultInput in the separate native coverage run, but also an abnormal shutdown under investigation. I did not independently approve that whole coverage receipt or infer normal cleanup/native gameplay from its startup observations. Authored DefaultInput remains SHA `994b196f1b560dbaa2a87ee7c74a3bf1f73c55074dbf013ca99c73a29f2c0015`.

## Retained evidence and its bounds

I verified and copied both named receipts plus the baseline and six mutation fixtures/logs to `tmp/review-runs/runtime-round12/evidence/`, preserving their project-relative evidence paths. All fixture/log digests match their receipt. The reviewer did not rerun these checks.

The fresh actual-core receipt `Artifacts/runtime-core/20261011-112850/report.json` has SHA `2aa0a41cd4b54d574cc0f52beb9189a06de304cf9917cac8b1aedbc7100d5295`. It binds unchanged core `911aa43773ff897f5c365a8638b841bcc89972e912cc774268da1a29f1b04359`, test `b3db515db6de92c95464b7bf3cf80a78d897bbb2fe540d05756fd6ca8b876d0e`, executable `5de94395c444aababb8895b6f2217fe920a5b933491e9243d31f40c309a8831d`, exit 0. Its retained stdout SHA `3cc683e3e1e996e33ee2e528aea8a069f28c2862187b0f698b09d4b8439a53d8` states `PASS: 5741 actual-core assertions`. This proves synthetic actual-core behavior, not real-source native physics/input.

The runner receipt `Artifacts/runtime-runner-mutations/20261011-112757/report.json`, SHA `ef95ec0f2ebdce01e1f6b6476264d009ad38e7da1b88ec7e6dd00d5352705752`, records an unchanged original runner/test and a green 12-test baseline in 0.501 seconds. I read the baseline log and every named red assertion. The baseline assignment-failure root PID 15204 produced no marker and was stopped. The suspended-root proof observed root 57080, child 22068, and remaining owned PIDs 22068/74004 after root exit before Job cleanup. The test logs explicitly record known child cleanup. The mutation removing suspension failed at the pre-assignment marker assertion and logged controlled child cleanup, with one assertion failure rather than an unrelated compile/import error.

| Case | Observed result | Gate-log SHA-256 |
| --- | --- | --- |
| BASELINE | 12 tests, OK | `2281855ccf83e82416b89c89009c8afde205325c42aa827d7f47b2143a447517` |
| R15_ANCESTORS | red: actual parent-junction root/hash/cleanup check | `273e5952f64d29a8e1679b24f3bca5e0b9a53486d7fd1593d3a773c413830deb` |
| R16_DURATION | red: thirty-second performance requirement | `5317f0455ee95f4026248ff42493816716b05db73193886636dd2e6e36785764` |
| R17_BYTES | red: actual fixture asset bytes changed | `b133c11a2752efdc1a5662a1c3ea27ce58470ec17d610bc3b01f78838f6291b3` |
| R17_PACKAGE_SET | red: unbound native package set | `c6bb486e90681e8d3f42228fd4ff26db802de93f74d1258dacd4a63007bd3044` |
| R18_EARLY_EXECUTION | red: immediate child appeared before assignment/resume | `f93efea121fd8892ef8804ad98ee5e210de6c7aad7cbcd22a782fbc158ded506` |
| R19_DID_NOT_RUN | red: incomplete negative-input receipt admitted | `a0de4e0e30adae15d6a18e8c44ef004d3bbcd0588305437b49bced2b2120f234` |

The mutation driver substitutes one exact mechanism in ignored copies, retains production authorized-root semantics, requires the specific named test failure, and rehashes unchanged production source. It does not exercise the new native asset C++ API or the complete performance-prerequisite admission path that contains R23. Its syntax note is not a native compiler result.

## Outstanding acceptance

Repair R23 and obtain a focused exact-revision re-review with its stale-prerequisite red proof. Then the integration owner must bind the final compiled Editor/Game outputs, preserve canonical config integration, and inspect actual native inventory, ordinary input, suppression/source failure, persistence/size negatives, required boundary-generation events, native asset/source identities, supported animation and full-population performance. Inventory preparation alone is deliberately insufficient. The source support checks remain discrete sampled evidence; continuous swept physics, actual visual quality and whole-city performance are not inferred from test counts or successful compilation. The separate visual/coverage work and its material findings are outside this report.

## Exact authored inventory

Every file below is retained byte-for-byte under `tmp/review-runs/runtime-round12/target/`. CRLF is intentional where present.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `Config/DefaultEditor.ini` | 58 | `9141f6ae31db1b130a37273eef06cffe335fbf79409aa411519df55674489b7d` |
| `Config/DefaultEngine.ini` | 1254 | `05b98074db37680b799cf5f5be180c90d397ea154c7c22e5af163ba3c98ad417` |
| `Config/DefaultInput.ini` | 1273 | `994b196f1b560dbaa2a87ee7c74a3bf1f73c55074dbf013ca99c73a29f2c0015` |
| `ShibuyaUnreal.uproject` | 706 | `f6eb752942dab805d542f9c7df06ab8ab44be44f76106ebea9f6115e9b36129d` |
| `Source/ShibuyaRuntime/Private/AgentGeometry.cpp` | 18482 | `0f97a8528b7e2f2320180c20d2f498d80df205e6d82dae00968b9971a55c2440` |
| `Source/ShibuyaRuntime/Private/BoundaryAdmission.h` | 14273 | `93dd5a0b54d9cadf46933ced449f20e1711da8035d3d2e4f1f7ae8af1d1512fe` |
| `Source/ShibuyaRuntime/Private/RuntimeAssets.cpp` | 2960 | `666113ccaf3336e532318ef1ca53560e93a601d829d4f2e567e76123b9070980` |
| `Source/ShibuyaRuntime/Private/RuntimeFiles.cpp` | 3682 | `27ca306967d5844cb43f4b2e746e50e71911d59e7aad064230f02b1d33b302c4` |
| `Source/ShibuyaRuntime/Private/RuntimeProbe.cpp` | 25054 | `2e3a7765b40deafeacf00ffc5ec882add1d75099c25aec4b04debe2e660db17e` |
| `Source/ShibuyaRuntime/Private/ShibuyaRendererLibrary.cpp` | 7310 | `c7af870a333d3bbb7a1e7fbbcef8fbe583b2598e129a73685e5d31c67f41f6ff` |
| `Source/ShibuyaRuntime/Private/ShibuyaRuntime.cpp` | 125 | `77b565024ebf1379d8125b36a90ec87fb497e737c6a336254cb2b13d711661d2` |
| `Source/ShibuyaRuntime/Private/ShibuyaWorld.cpp` | 35701 | `519e87dda255ce0c1ed35cada662ba333b5828be0949cbd2ba7d098653bdd0fd` |
| `Source/ShibuyaRuntime/Public/CitySimulation.h` | 25363 | `911aa43773ff897f5c365a8638b841bcc89972e912cc774268da1a29f1b04359` |
| `Source/ShibuyaRuntime/Public/RuntimeFiles.h` | 607 | `21f189cf0d298ce7010d634439e20ff6ac83ba958d1adc117f9ef8c6acc0b409` |
| `Source/ShibuyaRuntime/Public/RuntimePath.h` | 1279 | `94649128bf8f305498eeae5e60eafa7868b920492a0c9f2a0e9f65c51a6ecd2c` |
| `Source/ShibuyaRuntime/Public/RuntimeReadLimit.h` | 533 | `8b41ff12f62c3e754889e59a2103ee963854ee3074f2cc5c6037ef8cf5dcd007` |
| `Source/ShibuyaRuntime/Public/ShibuyaRendererLibrary.h` | 476 | `4ade754d4f15c0bb4ee4e3363e99bb38da8e56bb3eb14e1e1889f209af5957ee` |
| `Source/ShibuyaRuntime/Public/ShibuyaWorld.h` | 4901 | `c2f89d6ef9c9f088a10f77421a1355842e7e672ba950be8fcd1910ae68cea57a` |
| `Source/ShibuyaRuntime/ShibuyaRuntime.Build.cs` | 414 | `65a962e873ec7305f91296ee5777c2f7ee8255319ec4d8a4018c51054ec8d4e3` |
| `Source/ShibuyaUnreal.Target.cs` | 355 | `15d8f100b917028603c38c7a2a30936c56394fbe4853114889e1c3c5d0f655cc` |
| `Source/ShibuyaUnrealEditor.Target.cs` | 369 | `09cc25db48b7476683610ff4dc67f6ad567a3801138ce2ed1235708c7602441c` |
| `tests/runtime/test_runner.py` | 11894 | `b6c92692cbd1019770446ad08a2aa053a2e3e64567e38ca547c309e967146992` |
| `tests/runtime/test_simulation.cpp` | 19447 | `b3db515db6de92c95464b7bf3cf80a78d897bbb2fe540d05756fd6ca8b876d0e` |
| `tools/runtime/build_native.py` | 5943 | `69fc775869afa498483651df75e3ba9691229a17e346ddcf7f5b1cc03f93de04` |
| `tools/runtime/prepare_assets.py` | 3424 | `d8377d9f1fb4eff15e3ed0e4d8c10aa9e0b76b41133652f4782547e71481e1a4` |
| `tools/runtime/prove_core_regressions.py` | 4789 | `7f6f684bf8eb2a17c3a7f694ab25614301f4aff41c522a58c24c2e69a53f92c9` |
| `tools/runtime/prove_runner_regressions.py` | 4379 | `0c5e72a5137f06198af6e85285a49dd0a84c86be17813c4614816c37a0d01888` |
| `tools/runtime/prove_sdk.py` | 4470 | `f1aadff3062638e0346727662e2e278d474ae35d684df0be3129788bda877dd1` |
| `tools/runtime/run_native.py` | 40543 | `402c0337501ca2398d4b078f065d4ddef80133eaf7ebe3d6d9a9d018921cf547` |
| `tools/runtime/test_core.ps1` | 3700 | `c31dcb19b6ab44cf64115af2d150f83a648a03e154ea2155be73775bfa3ce381` |

Final check at 2026-10-11T18:38:44.2026670Z verified all 30 retained targets against the original inventory. These live files changed after the preserved freeze and are not approved here: tests/runtime/test_runner.py=102de444ffd66af3c8fb20e57b4d8dd2706e2b5f8546c0a3cc3301c57a26b5fe; tools/runtime/prove_runner_regressions.py=5810c86e0129e77ed1c5f9b9ae15e7311d53dbeab188b220493edb994636ea4e; tools/runtime/run_native.py=10833547668674625863cad61bbc64c7a2d0af64193dad44b42d0b903794b93c. No reviewer-owned engine, GUI, browser, server or persistent process was launched or left running. The snapshot, evidence and this report are intentionally retained.
