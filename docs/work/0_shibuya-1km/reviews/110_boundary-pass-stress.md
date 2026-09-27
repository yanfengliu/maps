# S1 pass and stress acceptance review 03

2026-09-27, independent Astra/xhigh, read-only. **Accept the bounded GPU component controls, actual CPU leaf-removal/reload observation and actual invalid-section refusal. The original combined stress run remains failed at its late-disposal observation. No new product defect demonstrated by the accepted phases.** Prior reviews remain unchanged; no source/data changes, browser/GPU run, gate or Claude retry occurred in this lane.

## Exact inputs and provenance

All paths below are relative to `C:/Users/38909/.codex/worktrees/shibuya-cutout/maps/artifacts/square-cutout/`. Product source remains base `ab0bde6` plus `frozen-review-01`; all 14 manifest entries were rehashed and match. The test successor was already reviewed separately.

`diagnostic-bindings-01.json` matches SHA-256 `c939837e891f8659da5991041dc6c1532778522002082441b39471b96c19f2cf`. Its 33 entries all match: frozen source-manifest, pass fixture/spec/config/build/prover/output/logs, and original stress fixture/config/build/transforms/output/logs. See `verified-bindings.json`. `reviewed-files.json` additionally binds all 12 individually inspected PNGs to their embedded image hashes; none differs. All retained build and transform files belong to ignored diagnostics, not product modifications.

The producer explicitly collected these inventories after the runs. The stress transform checks each of its three product input hashes before making any injection, but these supplemental inventories still do not prove a complete unchanged pre/post served-build/data envelope. Treat these as bounded component/fault observations. They do not replace the required final bound integrated visual replay.

Key result hashes: `pass-controls-01/results.json` = `38bcda76b0a3ed4a981893eb5caeb30263db93692adbfba2ed42f2953f1d5960`; its red/green proof names that exact input and hashes to `e762359586d31113f895fa6c8cfb7db869cd52336811477b14bac7e3864cb0d8`. `stress-controls-01/report.json` = `b1b5de6430f53df7440c035ec3e8dbbd2c06c2b96f9f20e81370c91564e24ecc`.

## GPU pass controls

Inspected the complete producer `pass-fixture.ts`, Playwright spec, Vite config and `prove-pass-controls.mjs`. The fixture imports production `clipCityRoot` and `CUTOUT_SIDES`, plus production `installAgentNormals`. A 12 m box crosses the actual north AOI plane. Production clipping is applied to its beauty material and custom depth/distance materials. The fixture uses an orthographic camera, an independently projected inside point 3 m into the city, an outside point 3 m beyond the edge and a background point 10 m beyond it. Samples are taken from real GPU render targets, with readback rows flipped correctly only when constructing the retained PNG.

Eight draws execute on the reported RTX 4090 renderer. Every positive draws the inside point and makes the outside point equal the independent background point. Every omission still draws the inside point and also draws outside:

| Draw | Positive path | Executed omission |
| --- | --- | --- |
| Beauty | Production plane policy, local clipping enabled | Disable renderer local clipping |
| Depth | Production-clipped custom depth material rendered directly | Disable renderer local clipping |
| Normal | Production adapter installed on an actual GTAOPass, then its normal override invoked | Bypass adapter with stock scene override material |
| Shadow | Actual directional-light shadow-map render with source clipShadows enabled | Disable source clipShadows |

The prover applies the same outside-must-be-background assertion to the observed omitted results and records four failures (`true !== false`), while each positive satisfies it. The Playwright diagnostic itself passes by expecting those differences; it is not represented as a whole-city gate run that failed four times. `pass-controls-run-02/run.log` records the successful eight-draw run. The earlier run-01 server-start failure is separate and supplies no pixels.

Viewed each of the eight 256×256 PNGs at native size. Beauty red, depth grey and normal blue-purple show a half square in the positives versus the full square in omissions. The directional shadow map likewise shows only the inside half with clipping, and the full shadow without it. This confirms the recorded inside/outside distinction visually, beyond just the sample booleans.

Scope: this is one synthetic north-boundary box and ordinary normal material. It exercises the production policy/adapter path and real shadow target; it does not independently execute VAT-selected normals, point-light distance shadows, every cap's three-plane policy, the full GTAO effect/composer or all city views. Those retain the prior source/unit/full-city evidence bounds. No production pass was removed as a fix.

## CPU removal and restored sections

The retained stress config requires exact frozen input hashes for app, buildings and section construction. In its eviction mode it calls the actual library `tiles.lruCache.remove` for data533 after the initial scene is ready. It does not merely decrement a test counter or pretend a mesh is missing. The real `dispose-model` event removes the readiness identity and section ownership. The retained event then reports `cacheContains:false`, `hasScene:false`, `sectionOwnership:false`, one formerly owned section and 43 prepared leaves.

Instrumentation is placed immediately before the existing `post.render()` call. It counts every entered draw callback, records state transitions and accumulates any case where the city is visible while the production display predicate is false. Sequence: initial visible 44 leaves at draw 139; actual eviction and hidden city with 43 leaves at draw 196; restored visible 44 at draw 389. The last logged cumulative state has 389 entered draws, 331 hidden draws and zero bad draws. These counters prove the observation ran, though the last state-change record is not a claim to log every later frame or a rendered-pixel scan. `stress-summary.json` preserves the sequence.

The held reload uses a three-second delay on the second data533 HTTP request. Its native `cpu-leaf-missing.png` shows sky and `43 of 44 ready`, no partial city. On return, loaded models advance from 67 to 68, disposed models from 0 to 1, prepared leaves return to 44, cap meshes from 27 to 28 and the connector from 0 to 1. The native returned image shows a rendered city again. This distinguishes actual CPU removal/reconstruction from the earlier GPU-only unload/re-upload control. The test confirms one named disposal and two named loads. It does not make a statement about a different source set exceeding the retention floor.

## Real invalid-section refusal

The invalid mode removes the first actual segment from data533/batch 42/west immediately before calling unchanged production `sectionRegion`: input count 71 becomes 70, and the removed coordinates are recorded. It neither stubs a thrown error nor changes the source data file. Production topology validation rejects two open components with the named tile/batch/side and recovery requirement. Its real load-error path reports the failure.

The final logged invalid state has 139 entered draws, all 139 hidden, zero bad draws, 43 prepared leaves, 27 cap meshes and zero connectors. The native error image shows the named refusal and sky/UI with no partial city. The three recorded console/page errors all belong to this intentional invalid phase; none is recorded for CPU eviction/reload. This accepts the intended refusal path, not the malformed section itself.

## Late-disposal result and remaining criteria

The original combined stress run exits 1 at its late arm: a facade continuation expected through outgoing-page console transport was not observed after navigation. The only retained late image shows a correctly hidden scene with a held 43rd/44th leaf. There is no recorded continuation/final resource event in that run, so **late-disposal execution is not proven by stress-controls-01**. The earlier CPU/invalid assertions executed and passed before that failure; the entire test is never relabeled green.

The owner is producing a separate frozen successor for the late criterion. Resource-disposal classification must follow actual ownership: installed `TilesRenderer.js:842–862` disposes textures on an aborted, not-yet-admitted scene, before assigning `engineData.scene` at line 869. An absent BufferGeometry/Material dispose event alone does not prove a GPU leak when the held object never reached renderer ownership; conversely, it does not prove garbage collection. This review does not substitute either inference for the forthcoming controlled result.

Still required: independently review the frozen late-completion successor; complete the final bound replay and all integrated gates/review. Prior 56-frame appearance acceptance remains separate from its missing pre-run producer inventory. No broader hardening or product architecture change follows from these observations. Process cleanup records retain pass run exit 0 and stress run exit 1 with their owned-process exit observations; those exit statuses are not interchangeable acceptance claims.
