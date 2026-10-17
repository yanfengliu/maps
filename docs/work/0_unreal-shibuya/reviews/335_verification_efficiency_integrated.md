# Review 335: integrated verification correction

**ACCEPT** the nine-file staged milestone represented by `verification-efficiency-staged-final-v2.patch`, 100,900 bytes, SHA-256 `2e89167061a8128f5cd7d4042307a54055c38565bd54b20face3455df875f0b3`, against base `883a3254051cc1d153ee1f571326911123550692`. No material finding remains in this change. This is code/integration review and bounded observed-inventory acceptance, not completion of the Shibuya goal or a claim that a clean staged-only checkout reproduced the native run. Commit/push are Root's remaining integration steps.

## Scope and code

The staged files are the runner, its tests, DDC config, plan, defect register, devlog, the narrow policy correction, and exact copies of authored reviews 333/334. The four new-file payloads reconstructed from the staged patch match their actual files. Review 333's accepted runner remains unchanged except for one guarded `-ShaderWorkingDir` launch argument. Tests retain exact accepted bytes. The native control/support/population/performance predicates, full Content/asset bindings, fresh terminal source reads, finite engine wait and owned-job cleanup remain unchanged.

The DDC-only staged config replaces the obsolete graph stanza with `[DerivedDataCacheGraphs] Shibuya=(EnginePak=InstalledEnginePak, ShibuyaLocal)` and a project-local FileSystem store. Installed UE5.8 source confirms exact graph-name lookup in `DerivedDataConfig.cpp:365–379`, alias/store resolution at 477–510, the installed read-pak alias in `BaseEngine.ini:2772,2878`, and `%GAMEDIR%` expansion in `ConfigCacheIni.cpp:218`. The filesystem store has no Base/environment/editor/command-line path override. Its existing cleanup policy is retained. The installed pak is optional and read-only; no engine/global config or memory-cache bypass was added.

The extra launch argument passes `confined(root,'Intermediate/Shaders',False)`. Installed `Paths.cpp:1976–1988` parses and normalizes that absolute override, and `ShaderWorkingDir()` at 501–510 uses it before the platform default. This preserves the existing project/reparse boundary and places temporary shader work within the actual project. No native C++ source changed in this milestone.

Staging deliberately preserves the unrelated working-tree GameMode/SM6 settings and Android-setting removal as unstaged work. The tested config is 996 bytes / `15f2b73545e91dff1b485d6568ad4d0c7a95b4e13abbc5be368fb2abb339ad74`; the DDC-only staged config is 1,141 bytes / `99514da1d8f1221ca751cd47a94706efa61622dd574dd5d8c48fd8ff8ec34754`. Thus native evidence applies to the actual configured working tree, not to a clean index checkout. The local-rules staged delta contains only the intended verification paragraph; broader policy WIP stays outside it.

## Evidence and claims

Raw unit output shows the intended early-admission red failures, causal subset/extra-map reds against PRIMARY, and all 16 candidate tests green without skips. Wrong-hash PRIMARY already refused under its former message. Root reports another 16-test green run after the one-line shader correction (0.653 seconds); this reviewer did not execute tests.

The retained exact-file profiler records and stderr support the missing-receipt pair: OLD 3.3521333 seconds with 351 digest calls/one Content traversal; NEW 0.1469964 seconds with neither, both failing with the intended missing-inventory error. The 95.6% lower wall claim is confined to that ordered pair. No positive-run/dedup speedup is claimed. Local `profile.py:61–68` does catch SystemExit; the earlier profiled inventory's process exit zero was not runner success. The plan and policy correctly require direct native execution and preserve the failed native receipt/engine exit.

The first direct retry actually reports ShibuyaLocal Writable, then fails at the external shader transfer directory. The final direct run `eb9e90256f704628ac8b7743bbc26bcd` binds the final runner and actual config, logs ShibuyaLocal Writable and `SHIBUYA_RUNTIME_INVENTORY PASS`, and supplies runner/native success, ready state, 506 identical native/runner source bindings, 552 loaded asset files and 326 Content entries. Native fields report D3D12, RTX 4090 and 1920×1080. Its receipt verifies assignment before resume and an empty owned job after terminating remaining owned PID 20204.

The final native report also records 27 centre-support failures and `native_support_verified=false`. Input attempts and performance sample counts are zero. The final plan now preserves those distinctions explicitly. Inventory PASS therefore supplies no ordinary controls, support, appearance, motion or full-population performance acceptance. Prior failed probes remain failures; their cost is not erased by the successful run.

The historical integration receipt binds the original two-target successful build receipt. Its 19 compilation bindings equal the build's source map and the fresh native runner's implementation map; the observed Editor DLL digest also equals that successful build output. This finite receipt join supports use of the unchanged C++ module for this inventory. I did not rebuild, rehash the large Game executable, or reinterpret compilation as behavioral acceptance.

## Pins and review bounds

- Final runner: 42,137 bytes / `ef39446457df76b3bb75c86830b9b29e2d46c9807679eb01ec4f23096f71bf69`.
- Tests: 17,973 bytes / `297c87cd0e0f6fa6265097f84436d19c433d59523ba030c40bd35dc3994e5b96`.
- Final runner receipt: 330,914 bytes / `2dc8c36a2e98ea5eebba3e1f6159b23fead5963631d9739def964bf34e813df1`.
- Native receipt: 974,647 bytes / `d1dfaba17f2d6d248fecbfcf6235ccdc943e725bcd837c49375f15b5592dafda`.
- Native startup acceptance: 2,201 bytes / `756d992498fc9e05bdd0a0983a8a09eb32dba40d2f7ef93129afc941b65259c1`.
- Build receipt: 5,096 bytes / `2d9530f5de50162ab4e3d0c79f474db8ef1e4a993651743e001853b93da584a9`; integration receipt: 8,231 bytes / `a55957761ad6abcac9b86e25965d3a663ccd58186636bbcd36358e65f86e1f2b`.

Review used finite stable file reads, full non-reparse ancestry checks, passive diffs, installed engine source and raw receipt fields. JSON numeric IDs remained raw tokens. No test, engine, build, selected import, DLL, GUI, browser, network, Git command or protected source-body census ran. Canonical files were not changed. This fresh review report is the only output; no persistent process was launched. Historical Source/Native paragraphs remain bounded context, not fresh acceptance from this review.
