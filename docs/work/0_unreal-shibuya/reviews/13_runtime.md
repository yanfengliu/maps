# Independent runtime review 13 — exact prerequisite data binding

Authored 2026-10-11 by the independent Astra/xhigh reviewer. Focused verdict: R23 is repaired in the exact reviewed runner, with the expected specific offline red controls. No new material finding. This verdict closes the stale-prerequisite admission defect; it does not approve native compilation, actual loaded assets, input, physics, lifecycle, visual quality or performance.

## Exact target and scope

Workspace: `C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree`, base `33d386299ff7bd02d91bca38f655f41597ddb756`; parent-identified canonical base `e0d33fe`. Frozen target inventory: `Artifacts/runtime-build/prerequisite-repair-prepared-20261011-114032/inventory.json`, SHA-256 `e53ed31fc570fdc25e6bca52d38268480ac4b5e8aa799701db234a7352c195e0`. Its sibling handoff is SHA `15cb91b474f468c235bc567cefe7d2603680fb6038de4abdeedcfc4504045cb5` and names the same 30 files, previous inventory and evidence. The handoff census SHA `35ee47e499643373e648846e082ae1fab6cc3a1cbf8f65aaffb3528a9dfb04fb` was verified and retained as historical handoff evidence, not a claim about currently running worker compilation.

All 30 live files and immutable worker target copies were independently verified against the inventory, copied to canonical `tmp/review-runs/runtime-round13/target/`, and rehashed. The inventory, handoff, census and evidence are retained beside them. Comparison with the exact review-12 snapshot (`b458cfbb84ba3c70772b44409f8bfdd65a277b080b7da0bc7fb4270caf1ca3b0`) confirms only three changed files: `tools/runtime/run_native.py`, `tests/runtime/test_runner.py`, and `tools/runtime/prove_runner_regressions.py`. The other 27, including every C++ file, config, model/module declaration, core fixture and renderer inspector, are byte-identical. Review-12 coverage and limits carry forward only for those verified bytes.

I read every changed function, the production caller and surrounding source-input admission/output/launch/final-receipt paths, the complete new fixture, and the mutation selection and result logic. The production caller and baseline preservation were read outside the changed diff. No unrelated review was expanded, no implementation or existing review was changed, and no engine, compiler, UBT, tests, browser, network or external CLI was launched by this reviewer. Writes were restricted to the authorized ignored snapshot/evidence and this new report. The branch-only Unreal scope and no-main-merge exception remain in force.

## R23 disposition

The new `validate_prerequisite()` at `tools/runtime/run_native.py:266–270` first preserves the previous passed/phase/implementation/native-asset equality checks. It then requires the entire prior `actual_input_sha256` dictionary to equal current `source_inputs`. Missing, omitted, additional or differently hashed source entries fail exact dictionary equality; the error identifies the prior phase and instructs rerunning it against the admitted data.

Its sole production call is at line 463 inside the loop over all five required phases: controls, negative-input, report-write-negative, oversize-negative and suppressed-source-failure. The current baseline was already taken from the verified native inventory receipt at lines 442–458, requires at least five input bindings, and is rehashed before comparison. The comparison precedes evidence directory creation at line 469 and engine launch at line 487. A stale prerequisite therefore cannot start the performance arm or leave a new performance output directory.

Deliberate failed-source arms use the same pre-admitted normal baseline: the later replacement of `source_inputs` from a successful native world applies only to inventory, controls, negative-input and performance at lines 511–517. Oversize/suppressed-source-failure does not replace that baseline with the intentionally invalid probe file. Their actual native failure result remains separately retained and bound by `native_report_sha256`; it is not relabeled as successful source loading. Report-write-negative likewise carries the pre-admitted baseline while deliberately leaving no accepted native terminal report. The wrapper rehashes the baseline at lines 531–532 and writes it as `actual_input_sha256` at line 536, enabling the new equality check for every prerequisite.

The remaining controls-specific rehash at lines 464–468 is additional evidence and no longer the only source-data check. Existing same-implementation and same-native-asset checks remain intact. The fix adds one narrow validator and one call; it does not weaken arm verdicts, duration, source/path admission, native asset identity or ownership cleanup.

R23 is closed at code/offline-control scope. The final native chain must still actually run on the same compiled revision and source/asset bytes; this review does not convert fixture receipts into those runs.

## Observed regression evidence

The retained receipt `Artifacts/runtime-runner-mutations/20261011-113949/report.json` has SHA `e8f20821fbb781c09cb90f7a6e2c7eb14e40f0a5f2c6d36d251f4d53c19b5590`. Its runner and test digests exactly match the reviewed target. I verified every baseline/mutation fixture and gate-log hash, read the baseline result and every R23 subtest failure, and copied the receipt plus all eight fixture/log pairs into `tmp/review-runs/runtime-round13/evidence/` under their original project-relative paths. These checks were already run by the worker; I did not rerun them.

The baseline log SHA is `2b794e8e5f3003fe0e4dd30df520d815a3757780174aee2699d4d6b05e1dd35f`; it reports 13 tests in 0.578 seconds, OK. The new test at `tests/runtime/test_runner.py:108–126` creates and hashes five real local fixture files. It independently changes the network, support and OSM files, holds the supplied implementation and native-asset identities unchanged, writes/reads each prior receipt, and requires rejection for each of the five prior phases. It also accepts the corresponding receipt with the current exact data dictionary. Each changed file is restored before the next source case, so the three data mutations are independent.

The new mutation at `tools/runtime/prove_runner_regressions.py:25` removes only the actual-input equality predicate. Existing driver logic requires a unique textual mechanism, runs the same fixture tests against an ignored copy, requires the specific named test failure, and rehashes unchanged production source afterward. The retained R23 mutated fixture SHA is `ef6cd0c5d045aa5f52f995e4b1d448feed2a97bc0932083508ac8f102a52615d`; its log SHA is `66f9c2410fe8575af7303e804d95638d311dc7f242f509e6a7df1181bd658484`. That log contains exactly 15 named `ValueError not raised` failures: three changed actual files multiplied by five prior phases. It reports 13 tests, 15 failures, nonzero exit; the red is admission failure, not an unrelated import/compiler error.

| Retained case | Observed outcome | Gate-log SHA-256 |
| --- | --- | --- |
| BASELINE | 13 checks, green | `2b794e8e5f3003fe0e4dd30df520d815a3757780174aee2699d4d6b05e1dd35f` |
| R15_ANCESTORS | one specific red test | `ac6444f1ace936b507f1b579839fc144eee6714cb95a6a24e90469821d84839c` |
| R16_DURATION | one specific red test | `69b56046f9a84a65ba78265ca8b71bcb2a9687149a14628b24759a77959415f3` |
| R17_BYTES | one specific red test | `6ec7d9d168e6809da407b073edb5de67d0b8bf28aeb96a5e3eacf9ae603de817` |
| R17_PACKAGE_SET | one specific red test | `91495936eb33eda109bf5717d7521fd3818c1e2b94f7030b77703534146167eb` |
| R18_EARLY_EXECUTION | one specific red test | `51f6cbf480688f67cddde7967858b91471e6f33739d44e2aa4453c3e79d3cf9e` |
| R19_DID_NOT_RUN | one specific red test | `1c60b467f11c6661d11d85b0d18e73f21719ef4f8f2bcb3b8600e2d80fe9a02c` |
| R23_DATASET | 15 specific red subtests | `66f9c2410fe8575af7303e804d95638d311dc7f242f509e6a7df1181bd658484` |

The fixture uses real changed files and real hashes, but its receipt metadata is deliberately synthetic. Its bound is the exact validator and the statically inspected production call. It is not an actual old/new OSM download, a native package loading run or a performance measurement. The inherited real Windows junction/ownership controls retain the narrower bounds recorded in review 12.

## Remaining native and integration bounds

The compiled native revision was still awaiting acceptance when this review was assigned. A concurrent build, even if it succeeds, cannot by itself prove that controls, source-ground physics, animation, required boundary replacements, same loaded assets or the 30-second 3000/200 performance target ran. The integration owner must inspect those actual final receipts and preserve every failed, unavailable or unmet criterion. Source review 7 and runtime reviews 9/12 remain the references for unchanged data/lifecycle/physics limits; this report does not duplicate or broaden them.

The isolated DefaultEngine file remains older than canonical SM6/renderer integration. Do not copy it wholesale. The exact DefaultEditor input opt-out and authored DefaultInput retain their prior hashes and review bounds. No visual/coverage change or its acceptance is included in this focused R23 verdict.

## Frozen 30-file inventory

The following paths are relative to the isolated runtime project and are retained verbatim under `tmp/review-runs/runtime-round13/target/`.

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
| `tests/runtime/test_runner.py` | 13414 | `05e4a17a97249838dcbf80e73a0590a02736d4d5531dc2b2907bbf9a28dc70cc` |
| `tests/runtime/test_simulation.cpp` | 19447 | `b3db515db6de92c95464b7bf3cf80a78d897bbb2fe540d05756fd6ca8b876d0e` |
| `tools/runtime/build_native.py` | 5943 | `69fc775869afa498483651df75e3ba9691229a17e346ddcf7f5b1cc03f93de04` |
| `tools/runtime/prepare_assets.py` | 3424 | `d8377d9f1fb4eff15e3ed0e4d8c10aa9e0b76b41133652f4782547e71481e1a4` |
| `tools/runtime/prove_core_regressions.py` | 4789 | `7f6f684bf8eb2a17c3a7f694ab25614301f4aff41c522a58c24c2e69a53f92c9` |
| `tools/runtime/prove_runner_regressions.py` | 4560 | `5810c86e0129e77ed1c5f9b9ae15e7311d53dbeab188b220493edb994636ea4e` |
| `tools/runtime/prove_sdk.py` | 4470 | `f1aadff3062638e0346727662e2e278d474ae35d684df0be3129788bda877dd1` |
| `tools/runtime/run_native.py` | 40937 | `10833547668674625863cad61bbc64c7a2d0af64193dad44b42d0b903794b93c` |
| `tools/runtime/test_core.ps1` | 3700 | `c31dcb19b6ab44cf64115af2d150f83a648a03e154ea2155be73775bfa3ce381` |

Final hash check at 2026-10-11T18:47:39.9029952Z verified all 30 retained files against the original inventory. All 30 live files still matched; no authored target bytes changed while reviewed. No reviewer-owned engine, GUI, browser, server or persistent process was launched or left running. Only intentionally retained evidence and this authored report were written.
