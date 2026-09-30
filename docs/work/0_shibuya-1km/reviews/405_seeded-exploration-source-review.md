# 405 — Seeded exploration source review

2026-09-30. Independent reviewer: `/root/fresh404`. Implementation owner:370; integration owner:root. **Vote: HOLD.** Three collected instrument findings must be corrected and refrozen before execution. No product finding or runtime verdict is implied.

## Exact inspected bound

Read the complete two ignored instruments in primary `artifacts/gpu-delight405-exploration/`, the canonical certificate, the real input and settling implementation, and the process-inventory helper. Targeted searches checked the bridge lighting API and existing canonical digest/GPU helper exports. No browser, server, GPU lane, gate, product edit, Git mutation or instrument edit ran. Only this report was written.

| Inspected file | Bytes | SHA-256 |
| --- | ---: | --- |
| `artifacts/gpu-delight405-exploration/explore.mjs` | 9,918 | `5c3a72b018815359cf148f433030ee442c3f110e37b80365df47d0679a211e61` |
| `artifacts/gpu-delight405-exploration/run-owned.ps1` | 12,001 | `9173056b569f0a13ea4234fb937ae60a2e490eca6165b0574863a10cf5031d89` |
| `artifacts/visual/complete.json` | — | `533a6778f3efeb8f3fe86b743fb8ebb19974ae4456e89685c8a35a896c5949ce` |
| `tools/visual/orbit.ts` | — | `65c321bc88098b2bc9e181bddce66d950f5657e006ea1b6e8911595aca10abaa` |
| `tools/visual/settling.ts` | — | `6d523918e3a500f20bb9feea810aa7b2192bb3e4dd0145ea4b02a4050bd5eac5` |
| `tools/visual/process-ownership.ps1` | — | `bd66b368ee652aa722b5347e36fe301d0231c4accd5cb00a61daacf731d272b8` |

The certificate names run `9174dee71f86ed7d`, the RTX4090/driver616.64, four build files, scene/harness digests and44 frame hashes. Reading it does not independently certify its original gate execution. Cartographic native review is a separate assignment.

## Collected findings

1. **P1: the first healthy startup throws before the capture loop.** `observe()` returns status, camera, style and tiles. The initial assertion subsequently reads `initial.lighting.preset`, so lighting is undefined. Include the read-only `h.lighting()` observation and retain the noon check. This is a deterministic source error; no attempt was launched to reproduce it.

2. **P2: stable inputs are not matched to the canonical certificate.** The script records current input hashes and certificate bytes, then checks only unchanged before/after hashes and the browser renderer string. It never compares current `dist` bytes with `certificate.build`, current scene/harness digests with their certificate fields, or a current adapter/driver identity with `canonicalGpu`; that recorded GPU field is unused. A stale certificate alongside stable changed inputs can pass. The ad hoc harness list also omits canonical roots such as the scene-serving helper and preview configuration. Before launching, enforce certificate/build and canonical scene/harness digest agreement using the existing exported digest helpers; bind and recheck the machine GPU through the existing identity helper. Retain the full source snapshot and unchanged-input checks. This repairs the intended binding rather than adding another capture lane.

3. **P2: final owned-resource closure is incomplete.** Retained handles are checked against exact creation/executable identities and no broad application kill occurs. However, child admission failures are merely logged, and final cleanup checks only the unique command marker and port4325. A live unmarked omitted child, including a GPU/esbuild descendant, can remain without those checks detecting it. Add an available final exact-identity census of admitted and omitted records; unresolved live records or an unavailable census must refuse successful cleanup, without killing unadmitted processes. Also check the owned TEMP root's own reparse attributes before enumerating descendants or removing it; the current reparse scan visits children only. Preserve the native page/context/browser/server close path, retained-handle fallback, exact path bounds and refusal on any cleanup error.

## Supported source observations

The instrument generates exactly four requests from the existing seeded RNG at seed405, covering close, medium, wide and close-medium distance bands. `OrbitDriver.orbitTo` and `zoomTo` drive actual browser pointer/wheel input. Its page evaluations read the frozen bridge; no camera setter, direct state mutation or render call was found. The driver requires five consecutive idle polls and preservation settling requires twelve advanced frames plus three fresh quiet intervals. The instrument checks Satellite style, renderer readiness/error/context, hardware renderer, complete final-leaf preparation and native1280×720 PNG dimensions. Each PNG is hashed and recorded with requested pose and actual coherent before/after camera observations.

The preview uses strict127.0.0.1:4325; Chromium is headless with a unique marker. Normal JS cleanup closes page, context, connected browser, browser server, preview and esbuild in `finally`. The PowerShell wrapper holds exact process identities, has an outer timeout, confines owned TEMP beneath its artifact directory, restores environment variables and writes cleanup evidence. These are source observations, not proof of four successful captures or actual resource closure. Source acceptance after correction remains separate from observed run acceptance and native review of those four images.

## Round 2 — focused correction review

2026-09-30. **Vote: ACCEPT SOURCE within the three collected findings and their direct correction interactions.** Root supplied base `b3b02a05a2766e73c8ded036067611259d82a162`; no Git or product review was repeated. Both corrected hashes matched the supplied frozen bytes. The retained `source-r1` copies also matched the original Round 1 hashes. No runtime, browser, server, GPU lane or gate ran, and no instrument or product file was edited.

| Corrected file | Bytes | SHA-256 |
| --- | ---: | --- |
| `artifacts/gpu-delight405-exploration/explore.mjs` | 11,982 | `bda42f928c8233540fc6bc8b78006d13510c01f52258930240196fdc5ce75546` |
| `artifacts/gpu-delight405-exploration/run-owned.ps1` | 15,597 | `341b2ef6408b3a72274ffb02b5979290dcd0e35fddbbdf7ba276d24bd8b277db` |

The focused read covered both complete corrected files and the directly imported canonical scene/harness digest and GPU identity/binding implementations. `tools/visual/verify-output.ts` was inspected only for those implementations and its guarded CLI entry, SHA-256 `127e49c645d3798d638956ec73e892a3b6610f8a47640d6cd297e3ae3f891b79`. The relevant `tools/visual/gpu-identity.ts` implementations were inspected, SHA-256 `77055aef41f1524b16040fda0dfbd7ecfa7fc79ebd6096291ba3614fe28e3261`. The canonical certificate retains Round 1 SHA-256 `533a6778f3efeb8f3fe86b743fb8ebb19974ae4456e89685c8a35a896c5949ce`. This read bound does not extend either the product review or the Cartographic review.

**Finding 1 resolved:** `observe()` includes the read-only lighting observation. Initial and per-capture checks require noon, preserving the selected Satellite/noon input rather than removing the failing assertion.

**Finding 2 resolved:** the complete current JS/CSS/index build snapshot must equal the certificate's build list. Existing canonical `SCENE_MOUNTS`/`HARNESS_ROOTS` and digest helpers compare served scene and harness contents, file counts, byte counts and root identities with the certificate before launch and after cleanup. Both passes probe the machine GPU/driver and require equality with the canonical identity. Per-capture browser renderer checks retain exact certificate agreement and use the existing adapter-binding helper. Full `src` and the two ignored instrument bytes are also snapshotted before/after. The imported verifier's CLI body is guarded by entry-module identity, so importing its helpers does not run or rewrite a visual gate.

**Finding 3 resolved within the closure/refusal bound:** the final available census exact-matches admitted and omitted creation/executable identities against current CIM records, reports unresolved ownership queries, and binds any port 4325 listener to its current process identity. Live admitted/omitted records, descendant candidates, marker/listener survivors or ownership uncertainty refuse cleanup success; census query failure writes `available:false` and refuses success. Descendant candidates use conservative PID lineage only to refuse closure. They do not establish ownership or authorize killing; every fallback termination still requires its retained exact identity, with the direct launched root handled separately. The TEMP check covers the root, every ancestor and descendants before removal, retains the lexical artifact-directory bound and preserves TEMP when closure is refused.

The seeded four-pose shape, actual pointer/wheel control path, idle/preservation predicates and native PNG/actual before-after pose records remain present. No new material source finding remains within this correction scope. This acceptance admits a bounded run for root to assess; it proves neither successful captures nor actual owned-resource closure. Root must read the run exit, input bindings, four frame records and exact cleanup/census records before runtime acceptance, then inspect the four originals separately.

## Round 3 — observed loader failure and focused correction

2026-09-30. **Final vote: ACCEPT SOURCE for the frozen loader correction and resolved-source binding.** The Round 2 acceptance remains tied to its original source-review scope. One subsequent actual dispatch failed before explicit server/browser/GPU initialization because native TypeScript loading could not resolve `./settling.js` imported by `tools/visual/orbit.ts`. No four-frame runtime success is established by either source vote.

Read and verified the retained `attempt1/run-errors.log`, SHA-256 `43f08c0e5b8863d230b43d78475d6063e381fa4cc30019fbeec6a0f1e69f5a8b`, which reports `ERR_MODULE_NOT_FOUND` for `tools/visual/settling.js` under Node24.12.0. `attempt1/explore.mjs` retains the exact Round 2 SHA-256 `bda42f928c8233540fc6bc8b78006d13510c01f52258930240196fdc5ce75546`; the wrapper retains its Round 2 hash. The preservation manifest, SHA-256 `456494c35a768c8153a61b93c62c0c5c465f5682b382850d4e0f92fd535ff61c`, records the original sources, empty stdout, stderr and owner/cleanup/census records.

The original cleanup receipt, SHA-256 `b74314aa386e1a74b9c2b5229e17266ce318e00dd420dc4ae78ba7eb0a9ec7fa`, reports exit1 and `temporaryRemoved:false`. Its census, SHA-256 `82eb1886f3bad9bec19ffe0519c561815ea9d04793e444af70aa1b0094988b75`, was available with no admitted/omitted/marker/listener survivor, but retained an ownership-unavailable record for an already-exited process. The wrapper consequently refused TEMP removal. Root owns the separately supplied supplementary closure; it was not reviewed here and does not turn the original failed receipt green.

The first loader freeze, SHA-256 `9ff267604bed303446b3c174766058c3a51e78303614da8dfbe5144d542fd16f`, correctly installed the existing398 `registerHooks` resolution pattern before the five TypeScript entry imports. It tries normal resolution first and falls back only from a relative `.js` specifier to an existing file `.ts`. The imports-only route checks six helper function exports and the actual config plugin array, hashes the resolved TypeScript trace and exits before GPU probing, preview or browser calls. Its normal input snapshot initially omitted that trace, so I sent one bounded HOLD: the imported rail-serving helper falls outside the canonical harness roots and full `src` snapshot.

The final freeze resolves that gap by including the resolved file URLs in normal `codeFiles`. Both before/after input snapshots retain de-duplication and all previous canonical build, scene, harness, GPU, source and instrument comparisons. Removing exactly that one binding line in memory reproduced the intermediate `9ff267…fd16f` hash. The full loader diff against retained Round 2 was inspected; no camera/capture predicate or cleanup-wrapper change was part of it.

| Final reviewed artifact | SHA-256 |
| --- | --- |
| `explore.mjs` — 13,525 bytes | `196364fb083b0e57f7ad1c543e94905541a2135ba0c452c85872b2240c0d69c3` |
| `run-owned.ps1` — unchanged | `341b2ef6408b3a72274ffb02b5979290dcd0e35fddbbdf7ba276d24bd8b277db` |
| `module-load-final.json` | `63f11e93cd73e5a10cfa49d0ad615ee4c6fca341845c483674dd7422bcd24973` |
| `module-load-final-receipt.json` | `8f185af20307fab9e320f8449843694b1e40ce7689f36e1ef0fbd5ad03f55ff6` |

All final artifact hashes matched. The retained command receipt reports syntax-check exit0 and `--experimental-transform-types ... --imports-only` exit0 against the final probe hash. I read the module-load result and rehashed all14 listed resolved TypeScript files without mismatch, including `tools/vite/serve-rail-trial.ts`. I did not rerun either command or invoke GPU, browser, server, gate, product or historical class review. Only this report append was written. No material source finding remains within this loader/binding correction; actual four-pose execution, native inspection and owned-resource closure still require their separate acceptance.
