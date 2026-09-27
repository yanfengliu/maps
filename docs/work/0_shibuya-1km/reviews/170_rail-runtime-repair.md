# Review170 — bounded successor to the refused rail runtime158

**Six findings repaired; ready for focused independent172 review, not native admission.** Product writes were confined to the quality worktree at detached base `0ec3dd03831b605235302212b7d140cb35297071`. Root reports current primary `6f8947789400260924345ec3088a50e2a1bf4600`; changes after delivered599 are documentation only. No commit, push, browser, GPU, server, capture executor or full gate ran.

The full164 report was read and its report/HASHES pins verified before edits. Its immutable controls establish the named old reds: root startup fails on ArrayBuffer-as-JSON; source and facade rejection leave all original resource counters at zero; projection, interleaved updates, misaligned material groups and after-render callbacks can falsely clear. These recorded failures are not reclassified as passing product tests. Original edited files were copied under `original-source/` before mutation. All158/164/run12 evidence remains unchanged.

## Exact repair scope

Four existing files changed: `src/scene/buildings.ts`, `src/scene/facade-textures.ts`, `src/harness/rail-camera-clearance.ts`, `test/rail-camera-clearance.test.ts`. Two files added: `src/scene/tile-transaction.ts`, `test/rail-runtime.test.ts`. `integrity-after.json` gives exact before/after byte hashes. The old diagnostic-writing trial test was not edited or run in place: the owned copy redirects only imports and its output path here. Its regenerated parser diagnostic is byte-identical to frozen158.

No geometry, source cut, admitted material/finish, AOI calculation, source transform contract, camera roster, clearance threshold, floor, actor or simulation change was made. The admitted run12 source-to-AOI candidate, intentional terminal sections, all counterevidence and static-only body bounds remain as documented in156/158. The six delivered599 checkout files remain byte-identical.

## R164-L1: caller fetch contract

Unhandled fetches now return the existing facade result or an intact `Response`, preserving the installed root and nested JSON decoder contract. The three exact source binary leaves still pass through byte/hash verification, composed with the existing facade-sign source checks. HTTP errors remain named failures.

The new caller test creates the actual `createBuildings`, invokes the installed root loader, checks a nested JSON `Response` through the registered fetch path, and drives `update()` until `ready` resolves with all44 final leaves prepared. Root JSON and binary requests use the actual cached bytes; only B3DMLoader model decoding returns an empty fixture scene. This proves caller wiring and readiness, not real full-city decoding or appearance. The separate13 real three-leaf parser/source tests retain their existing Draco/image adapter bound and independently exercise original source bindings. A corrupted pinned binary still rejects.

## R164-R1: explicit parse ownership and transfer

Trial loading installs a local wrapper around the existing `TilesRenderer.parseTile` and `disposeTile`; dependencies are not patched. Each parse gets a private staging tile and engineData, so an older cancelled attempt cannot write over a newer attempt for the same original tile. The facade hook captures the complete returned parsed root before awaiting the trial promise or running source validation. It retains original and newly added geometries/materials/textures, including unattached neutral returns. Optional facade lifetime callbacks register newly rebuilt textures and retire originals through the same owner. Non-trial processing retains its original method path and defaults.

Ownership states are concrete: **pending parsed root → fulfilled installed parser → transferred original tile**, or **pending → rejected/cancelled/disposed → released**. The transfer callback is the fulfilled wrapper's `Object.assign(original.engineData, …)` plus the deferred section/rail bookkeeping callback. It runs only after the actual installed parser finishes, the real abort signal is clear, the buildings owner is live, and the original tile has no undisposed scene. It is not inferred from elapsed time or visual readiness. Scene objects are restamped with the original tile. On failure/cancellation no engineData or bookkeeping is published.

The installed parser's own cancellation branch disposes only textures and may repeat shared references. The wrapper therefore gives that *private staging parse* a live local signal, waits for its actual completion, then settles the caller's real abort signal. It does not claim to interrupt already-running decode work. Concurrent old/new attempts remain isolated; the cancelled old root is released without clearing the newer transferred root. Rejection preserves the original error.

Release uses unique sets for geometries, materials, textures and parser ImageBitmaps. Texture views sharing one bitmap close it only when no owned live texture needs it. A retired map still referenced by another material slot remains live until tile release. Facade-created originals already closed/disposed are not released twice. Successful disposal releases the owner's unique union once, then gives the installed renderer empty resource arrays while retaining its normal visibility/metadata/event cleanup. Repeated disposal is harmless. The owner starts with the complete parsed root supplied to `processTileModel`; a decoder/parser failure before producing that root remains upstream and is outside these controls. This is not a general third-party loader lifecycle rewrite.

The13 new runtime cases cover caller startup; source, facade and rejected-trial-promise failures; ordinary successful transfer; abort and whole-buildings disposal while facade work is pending; partial facade replacement rejection; real facade rebuilding with a retained same-texture slot; real rebuilding with distinct texture views sharing a bitmap; a source bitmap already retired before later tile disposal; and overlapping cancelled-old/successful-new parses. Counters cover shared geometries/materials, original textures/ImageBitmaps, detached return additions, rebuilt textures and duplicate-disposal refusal. Controlled facade failures exercise the real installed parser hook, not a copied ownership algorithm. Actual facade tests replace only CPU pixel readback. No GPU-memory leak or browser lifecycle verdict is claimed.

## R164-O2/O3/O4/O5: narrow observer boundaries

All four cases now explicitly report `unknown` before broadphase. No observer thresholds or camera were changed.

- O2: zoom other than1, film/view offsets, or projection bytes differing from ordinary unshifted perspective are refused. Tests cover all four mutations. The captured projection remains in the immutable result; the observer does not change the app camera.
- O3: interleaved position/index/batch storage is refused before its cached box is used. The remote-then-near changed backing-buffer fixture stays unknown. Ordinary versioned BufferAttribute behavior remains supported and tested.
- O4: drawRange and buffer counts must align to complete triangles. Material arrays must have a complete ordered, non-overlapping, triangle-aligned partition with valid material indices. Offset, gap and overlapping-group cases refuse rather than inventing a different draw sequence. This deliberately does not implement general unusual group semantics.
- O5: non-default object `onAfterRender` is refused along with the existing before-render boundary, even for a remote box. The callback is never executed by the observer.

The14 observer controls include the prior five controls and nine new boundary cases. Unknown configurations cannot disappear behind an invalid far-away bound. No claim is made that these unsupported paths existed in the frozen native scene. Complete live decorative-geometry eligibility, source-interface appearance and native review remain unrun.

## Checks and failures

Final scoped gate: **55/55 across six files**,5.50s, `focused-final.txt`. Includes13 real trial/source cases,13 caller/transaction cases,14 observer cases,13 default facade-emission cases, one existing tile-memory case and one scene-cleanup case. Affected TypeScript passes in `types-final.txt`. Owned Vite trial build passes in `build-01.txt`,1.47s. Its standard >500kB chunk advisory remains. `git diff --check` passes. Node used v24.12.0. No audit, dependency install, full repository gate or native run was substituted for these bounds.

The first check attempt retained in `focused-01.txt` had two fixture setup failures: plain stubbed fetch lacked mockImplementationOnce; the synthetic tile lacked its installed renderer traversal object. `types-01.txt` records fixture-only type annotations. These were corrected without changing the acceptance assertions. Source/facade/abort/observer controls in that first run already passed. Subsequent focused-02/03/04 results are retained; final adds the explicit already-retired-bitmap control. The source retirement sharing rules were completed within this one bounded repair increment. No old output, criterion, tolerance or source scene was rewritten to pass.

Exact commands, from the quality worktree, with TEMP/TMP set to absolute `artifacts/rail-runtime-repair-20260927/temp`:

- `node node_modules/vitest/vitest.mjs run --config artifacts/rail-runtime-repair-20260927/vitest.config.mjs --configLoader runner --maxWorkers 1`
- `node node_modules/typescript/bin/tsc --project artifacts/rail-runtime-repair-20260927/tsconfig.json`
- `node node_modules/vite/bin/vite.js build --config artifacts/rail-runtime-repair-20260927/vite.config.mjs --configLoader runner`

The isolated test configuration sets cache:false and owned cacheDir. Build uses its own cache/outDir and reads the same immutable158 whitelist/overlay. Cache/temp directories were removed after completion, absolute containment and reparse checks; recreate only those owned paths if reproducing. Data/node_modules junctions were read-only.

## Frozen successor and next owner

`runtime-freeze.json` SHA256 **090f6a680a92638768985175f0bebe1ccccb94a8bd4deac8f6b03718d2a1681f** binds:

- source `fd1bfbea9248dbfb18686934134860d1d4a8bf1b4392520c600701f1142a79cc`
- build `f88f0162b73a6348715ac1768b5ac5978db40bb49dd52d1f22c2ec0c0c8eb01c`
- harness/preparation `58214ecd7ede9770f3aa348c6289d75b2d668a70ddf502be80649ac864cf0696`
- unchanged overlay `c7a65f1a4abe5c1fb9385911f591f7a580b98cdef55bca1153c60bf3c062b701`
- unchanged baseline117 `dfee0f12bb2e87c1defa7c41c0400e0df4f98ab829fd346d5d689da0c406873c`

`integrity-after.json` verifies647 old evidence/input records, excluding only the four named source repairs from the old source comparison, and permits exactly the two added files. All195 sealed158 evidence files,164 evidence,79 admitted candidate files, old build/harness/overlay, roster, six599 files and immutable old binder stay unchanged. `dependency-check.json` verifies the six exact installed loader/renderer dependency pins reviewed by164. Old158's source binding is superseded; it is not claimed to match the repaired product. `successor-bindings.mjs` reads the new record while preserving the old binder and data authority. Full per-file identities are in the successor freeze; HASHES.json seals this report and retained evidence.

Next:172 exact focused re-review, then the separately assigned capture owner may prepare and bind its executor for root's approval. The fixed62 stills/four motion records, retained ineligible views and later44-frame gate remain unchanged. No capture executor exists yet, and no native lease is assumed. Final shipping pipeline/default adoption and final integrated gates remain root decisions.

`cleanup.json` records zero task-scoped processes and zero port4333 listeners, with no process killed. The quality worktree remains uncommitted and frozen for172. All required review evidence is retained; implementation slot released.
