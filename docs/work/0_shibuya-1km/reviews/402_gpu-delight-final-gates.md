# 402 — Integrated GPU de-light final gates

Bound: automated build, types, complete unit suite, high-threshold dependency audit, and canonical hardware visual/lifecycle qualification of the nine adopted candidate files on PRIMARY. This record does not supply a native image appearance vote, matched startup arm B, original localhost5319 defect classification, or full-population 60 fps evidence.

Author: camera388, assigned gate runner. Date: 2026-09-30. Workspace: `C:/Users/38909/Documents/github/maps`. The source bindings record the actual main HEAD before commit; the candidate remains an adopted working-tree change for root to accept and commit. Root accepted the nine-file raw-byte adoption before dispatch. No source, test, configuration, dependency, data, index, or commit writes were made by this gate assignment.

## Results

All five required gates have successful actual results. The original audit attempt exited red because the advisory HTTP endpoint was unavailable inside the sandbox; the explicitly admitted network-only retry passed. Its original failed evidence is retained rather than replaced. Build, types, and unit tests were not repeated for that transport failure.

| Gate | Actual command from PRIMARY | Exit and result |
| --- | --- | --- |
| Build | `npm run build -- --configLoader native` | 0; 2026-09-30T11:41:40.893Z–11:41:43.989Z |
| Types | `npm run typecheck` | 0; 11:41:44.030Z–11:41:48.160Z |
| Complete units | `npm test -- --config C:/Users/38909/Documents/github/maps/artifacts/gpu-delight397-final/vitest.config.mjs --configLoader runner` | 0; 116 files, 1,040 tests, reported 57.80 s; 11:41:48.188Z–11:42:46.745Z |
| Audit, initial | `npm run audit` | 1; registry advisory bulk endpoint failed with FetchError/EACCES; no vulnerability verdict |
| Audit, admitted retry | `npm run audit` | 0; 11:45:53.293Z–11:45:54.946Z; unchanged `npm audit --audit-level=high`, two moderate advisories reported |
| Canonical visual | `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File artifacts/camera388/final/run-owned-visual.ps1 -Output artifacts/gpu-delight397-final/visual -TimeoutSeconds 900` | 0; appearance 4/4, lifecycle 3/3, all 44 fresh native-resolution frames certified |

The CPU launcher was invoked with the installed `pwsh.exe -NoProfile -NonInteractive -File artifacts/gpu-delight397-final/cpu-gates.ps1`. Both CPU and audit receipts name `C:/Program Files/nodejs/node.exe` and its npm CLI; the measured Node version is v24.12.0. The owned Vitest configuration retains the entire `test/**/*.test.ts` population, disables Vitest cache, and uses four workers. CPU TEMP was a fresh system-temp child outside Git and outside any `artifacts` ancestor. This satisfies both the startup watcher fixture and the checkout-identity fixture; no tests or filters were weakened.

The canonical visual wrapper invoked the unchanged `npm run visual` chain, including its own required production build, reset/begin/end certification, appearance lane, and three lifecycle repetitions. `MAPS_VISUAL_GPU` was absent. There was one visual dispatch, with exclusive 4319/GPU ownership; no browser or server was left running.

## Exact adopted source bytes

`artifacts/gpu-delight397-final/source-bindings.json` has SHA-256 `5d257c7cdcfce69037b86f3b1a8382b6b3ec788a95cce22b06a8cd78d7ac8c38`. It records the actual HEAD, raw byte lengths, and these nine paths. A post-gate reread found zero source hash mismatches.

| Path | Raw SHA-256 |
| --- | --- |
| `src/render/atlas-delight.ts` | `a387dbcdee9baea7e34987f8a480a01bc11e7dfb726430ff2968d37ddc381396` |
| `src/scene/buildings.ts` | `cc8675eb865f00a5c3710a8b45dd367670ec2cbd1034f32c9ed913627991dd33` |
| `src/scene/facade-textures.ts` | `862fadec32c7d60bab01fb9f7fe708de25ea66f17d99f6e5d63140af7d8fa2ca` |
| `src/scene/tile-transaction.ts` | `cb8c136cfc9ce2ad8ccb7e24351572f87491ca06d7f01cc991a6485cda27c7ef` |
| `test/atlas-delight.test.ts` | `8e25c68f8d1d776d862626d7017a437340e30d9b7a1f72bd5eecd84a26f822b4` |
| `test/facade-gpu-owner.test.ts` | `830e9667bf5380298e29caf27584efd661b6d30174e679ba0e9a1e1130d05e2b` |
| `test/rail-runtime.test.ts` | `75cd9e6ba7e2aeb2d485b776b2863ba2c7b2f657257c6322c5f5474d82f650b1` |
| `test/crossing-corner-material.test.ts` | `edc9295bb70aa38357a35689ed0b55386885b75f2877d3c890d96790aa3f7a2c` |
| `test/facade-emission.test.ts` | `b9ec9d96bc07536fded266c7686c18c1382003a5bc9586fabc7f01682f46daf0` |

The reviewed CPU launcher SHA-256 is `3827693f15aeb6ce1e2af9ed8dd1d81456dfd6575cb29358fbda7cc3d48d1672`; its configuration is `c487097a4dd90ab77f424e14d87b682c8c8c873fd87bf8635f61b2c7d7147df5`. The earlier reported configuration digest `902657…` was inaccurate; root inspected and accepted the actual `c487097a…` bytes before execution. The unchanged visual wrapper is `12a8e8f5c8e0ce6c8b0c2e66eef041149f4884f98a4c166fb3bd08729bc61f52`.

## Visual certificate and lifecycle

`artifacts/visual/complete.json` certifies run `9174dee71f86ed7d`, started 2026-09-30T11:50:28.758Z and certified 11:54:19.028Z. Its SHA-256 is `533a6778f3efeb8f3fe86b743fb8ebb19974ae4456e89685c8a35a896c5949ce`. Both lanes reported `ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)`; the pinned adapter is NVIDIA GeForce RTX 4090, driver 616.64 from nvidia-smi. The 44 frame entries bind the actual 1280×720 PNG bytes.

The certificate binds four served build files, scene mounts `/scene/`, `/network/`, and `/rail-trial/` with 151 files/354,752,173 bytes and digest `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce`, and the 24-file/220,413-byte harness digest `8f22bf47a0fe20f9c040010e11de6010834a33505feee07848f064da52e9c3c8`. This is the canonical gate's served-runtime/data/harness scope, not a new whole-repository or 291-input audit.

| Hardware lifecycle run | Preparation ms | Navigation ms | Replacement ms | Teardown/errors |
| --- | ---: | ---: | ---: | --- |
| `lifecycle-2026-09-30T11-52-19-457Z.json` | 24,374 | 137 | 11,521 | completed; none |
| `lifecycle-2026-09-30T11-52-56-414Z.json` | 27,143 | 209 | 13,769 | completed; none |
| `lifecycle-2026-09-30T11-53-38-742Z.json` | 27,137 | 149 | 10,466 | completed; none |

Those lifecycle timings are the canonical gate's behavior checks and do not substitute for the matched fresh-context default-production A/B startup measurement. Baseline398A and its runner remain immutable; B has not run in this assignment. Native-resolution appearance review is separately assigned to the integration reviewers; this author does not infer visual quality from the automated certificate.

## Retained raw evidence and cleanup

All paths in this table are under `artifacts/gpu-delight397-final/`, except the visual certificate above. Raw logs and failed transport evidence remain ignored, intentionally retained for acceptance.

| Evidence | SHA-256 |
| --- | --- |
| `cpu-gates.json` | `15780fb2f436a1921377b888a43eca86973828506e3c3e8f4111018863500b40` |
| `build.log` | `f8addcc9499e93b97b58e164f0fb501db375e087bfc79923bfcdffa032ae1db0` |
| `types.log` | `574b2f9210f83ac061111bf950243610b0796763c946914ead368d160605c90c` |
| `unit.log` | `9f26780bd04d99644a122cff7cba6c7ff631a0c61d457b42e186612f3453c021` |
| Original `audit.log` | `b633cb33169f35153658d908f0223a290b1d1277632f2386d3d9d8668e7eb035` |
| `audit-rerun.json` | `0260708cce0c415d43e6a7a39fe01f340b1cbc5238c3e9c8b9b77c95ed4259db` |
| `audit-rerun.log` | `1931411c3149e174036c4511a93ccfaef05c21a2df97afa2573a54f010b5ec26` |
| `visual/run.log` | `ce346765ecb72c9867972d70a33646cb5c75cfe640d53c57a7f615275a8dd848` |
| `visual/run-errors.log` | `17429a77112e39038360a5e6c1d3bdf3ff7c2fac1ac247fbc1773c5d930e4d34` |
| `visual/process-owner.json` | `ce5c4069d02dbea97a7f3fc7d88abae47d8d382504d168e15c9742385cbe855b` |
| `visual/process-cleanup.json` | `32022518adf50b71ee7fccbad0da0b4e49e00e15a8980bf363c9701016cf5e11` |
| `visual/native-absence.json` | `cd0dc7e12e3f5af47761b37030d3fb5702b44b21f13739ea2140f7c9c95738d5` |
| `temporary-cleanup.json` | `bf561dc09f19618822594369b4f0060f6bf9b10c450264b9ec606cdb8bf5da3d` |

The visual wrapper retained 44 admitted process identities. All 44 were already exited in finally; no fallback termination was needed. Its 24 omission records included the observed conhost and transient children. The final available CIM census checked all 48 unique admitted/omitted PID+creation-time+name+executable identities: zero remained, zero PID reuse observations, and zero 127.0.0.1:4319 listeners. The original ownership helper hash is `bd66b368ee652aa722b5347e36fe301d0231c4accd5cb00a61daacf731d272b8`.

CPU TEMP `C:/Users/38909/AppData/Local/Temp/maps-gpu-delight397-final-b0868efcc5e64b9faed8e94ea511fe15` was removed only after verifying the receipt's exact direct-child resolved path, an available zero-match process-reference census, and a non-following census of 1,062 entries with zero reparses. It is absent afterward; no processes were killed. This CPU cleanup bound is exact TEMP GUID and launcher command references, not a retained CPU descendant identity inventory. Source files, intentionally retained evidence, immutable398 baseline, and unrelated user processes were preserved.

## Acceptance handoff

The automated five-gate requirement is green on the exact adopted bytes within the recorded instrument bounds. Root still owns integrated source/review acceptance and commit. Separate numerical hardware qualification is recorded in401/397 evidence, integrated independent source and native Satellite review in403, and matched startup qualification in398. No startup speedup, complete-map quality, historical0/44 root cause, or full simulation performance claim is made here.
