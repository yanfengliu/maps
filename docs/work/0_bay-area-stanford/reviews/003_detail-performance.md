# Independent campus detail and performance review

Reviewer: independent integrated-code reviewer. Date: 2026-10-20. Base: `38eb59a5e9c9603d1861721f219dbe72b3f0fe1c`. Reviewed revision: `dc1e943e8562d763551508c8d85b80e36f218e94`, in `artifacts/campus-detail/worktree`. After the code commit, I verified HEAD, the complete seven-file code/test/package delta and the exact file hashes below. Only this authored report was written by the reviewer.

**GO. No remaining material finding in the reviewed revision.** The independently identified context-restoration defect is repaired and exercised through actual WebGL loss/restoration. The owner also repaired the initial shader setup stall and roof-edge gaps before this conclusion. Acceptance covers the inspected code, source dataset and measured machine/browser configuration; the render-event measurements do not establish physical display refresh or performance on all devices.

## Finding resolved before acceptance

**P2 — Recreate the custom layer when the native source survives context restoration.** The earlier `addCampusLayers` source-exists branch updated Stanford's data and returned without recreating the architectural layer. Reading outside the diff established that the pinned MapLibre context-loss path destroys custom layers, while style serialization retains standard sources/layers but does not serialize the custom layer. Its `onRemove` also unregisters its restoration listener. Consequently, restored native buildings could permanently lack the new details.

The final `src/main.ts:283` idempotent `addBuildingDetailLayer` helper is called both from the source-exists branch at line 296 and the fresh-layer path at line 309. It recreates the controller and reapplies the selected ID. This closes the defect. The final `visual.json` recovery check loses and restores the actual WebGL context, waits for full map readiness, detail readiness and visible geometry, and records 130 rendered buildings, two custom draw calls, preserved camera and no errors. The separate `context.json` also verifies that the selected Hoover Tower survives restoration. Its earlier sample and `final-context-restored.png` precede regional tile idle; they are not evidence of complete regional readiness. The strengthened final check supersedes that incomplete sample.

## Integrated source inspection

- Read all of `src/building-geometry.ts`, `src/building-details.ts`, `src/building-worker.ts` and their tests. Read the changed main integration and surrounding source loading, readiness/error accounting, selection, search, camera navigation, overview return, retry, cleanup and read-only observer code. Also read the repository rules, plan, lessons and detail/performance acceptance notes.
- `prepareBuildingDetails` adds a derived wall height to copied properties while preserving the original geometry, source ID, height, base and provenance. Main's native extrusion uses the lower wall height; details stay within the original vertical envelope. Building details explicitly label roof forms and facade accents as stylized estimates (`src/main.ts:153`). The original GeoJSON is unchanged.
- Earcut receives each polygon's courtyard holes. Gabled-roof clipping splits already triangulated faces at the ridge rather than filling rings independently. Final geometry includes stone fascias beneath raised roof edges and the six mapped gabled roofs' ridge/end treatment. Cornices are authored offsets; preservation of source footprints does not mean every decorative vertex lies inside the footprint.
- Worker construction is deferred until campus zoom, with transferable arrays and termination after completion. The source-keyed CPU cache supports recreated layers. Regional startup has no geometry build/upload; roofs start at zoom 14 and facades at 15.5. Geometry is batched into at most two draw calls. Pending preparation can request repaint; the completed layer does not start a permanent animation loop.
- Reviewed shader compilation, selection uniforms, matrix/local-coordinate conversion, upload exception cleanup, removal, cancellation, worker errors and context loss. Inspected pinned MapLibre `map.ts`, `style.ts`, `custom_style_layer.ts`, `draw_custom.ts` and WebGL `context.ts` outside the application diff to verify the custom-layer lifecycle and GL state contract. MapLibre marks state dirty and restores its base state after the custom draw, so the layer's VAO/program/depth/cull changes do not escape that contract.
- The owner identified a 45.2 ms synchronous setup slice in the first runtime version. The final renderer enables `KHR_parallel_shader_compile` before compilation/linking and checks completion before reading link status (`src/building-details.ts:178`). Unsupported-extension completion is deferred through cancellable idle work. Geometry upload is separate. Tests cover premature-status avoidance, idle cancellation, worker termination, resource disposal, cached retry and injected upload failure. The final runtime measurements below confirm the repaired path on the measured driver.
- The owner identified raised flat/skillion roof gaps and completed their vertical closure before freezing this revision. Final geometry tests cover those closures as well as the mapped gabled cases. These refinements and the shader stall were owner findings, distinct from the independent P2 above.
- Earcut 3.2.4 was already present transitively and is now an explicitly pinned direct dependency. No external data source, source geometry or service URL changes accompany this feature.

## Independent geometry check

I ran a read-only Node calculation against the final geometry and pinned source. For every feature, I compared the summed XY area of generated roof faces with the original polygon area minus all courtyard holes, and checked vertex finiteness and vertical bounds. Across all 648 features, there were no area discrepancies above 0.1%, no invalid vertices and no meaningful height overrun. Maximum relative area difference was `0.0000257110` (about 0.0026%, consistent with Float32 rounding); maximum height excess was `1.91e-7` metres. The current mapped flat/skillion/gabled rings contain no unsealed short edges under the generator's edge threshold.

Final output is 85,928 roof/fascia triangles plus 14,586 facade triangles: 100,514 triangles and 15,680,184 bytes. This remains within the implementation's 150,000-triangle and test memory bounds. The calculation independently checks this dataset; it is not a proof for arbitrary future OSM geometry.

## Runtime and visual evidence inspected

Evidence is retained under the primary checkout's `artifacts/campus-detail/`. I read the recorded results and executed browser assertions, including the final production benchmark's real-control script. Browser checks use the frozen observer for reads and actual controls for navigation.

| Final observation | Result |
| --- | --- |
| Development regional readiness | 562.4 ms in `visual.json`; zero initial geometry triangles, bytes or draws |
| First Stanford flight | 168.32 moving render events/s; p95 interval 7.6 ms, maximum 21 ms, none over 33.4 ms |
| Development preparation | Worker 156.5 ms; maximum measured main-thread setup/upload slice 5 ms |
| Production regional readiness | 429.2 ms in `detail-final.json` |
| Production steady rotation | 1,599 moving render events, 172.21 events/s; p95 6.7 ms, p99 7.5 ms, maximum 8.7 ms, none over 33.4 ms |
| Production detail preparation | Worker 157 ms; GPU upload/main-thread setup slice 4.3 ms; parallel compile elapsed 37.7 ms |

Production rotates through 90 actual Alt+Right inputs over approximately ten seconds, excludes 250 ms at each end, and computes intervals from moving render events. The asynchronous compile elapsed time is not a 37.7 ms main-thread stall. The recorded GPU is an RTX 4090 through ANGLE/D3D11 at 1920×1080, DPR 1. The baseline's 171.45 moving render events/s and 7 ms p95 show no apparent cadence regression in this bounded comparison. Single runs with remote tile services cannot establish a repeatable speedup percentage. These intervals support the 60 fps frame-budget goal on this machine; headless render events are not presented display frames.

The final flow also passes actual Explore Stanford/Main Quad controls, right-mouse rotation/tilt, Hoover Tower search, identical overview return, and 390×844 mobile exploration. A click on the visible Hoover cap selects `way/1346548889` and opens Hoover Tower's heading. Aborting the worker request produces an actionable error; restoring requests and pressing Retry restores full readiness and clears errors. The final context-restoration check described above passes. The flow records all three observed workers closed after cleanup.

I inspected the nine updated final captures at native resolution: `final-region.png`, `final-campus.png`, `final-quad-front.png`, `final-quad-oblique.png`, `final-quad-north.png`, `final-hoover.png`, `final-hoover-north.png`, `final-mobile-region.png` and `final-mobile-campus.png`, under `output/playwright/`. I also inspected the final production Main Quad image and the roof-picking/context-restoration images. The accepted views retain the pale water/land palette and sandstone/terracotta treatment while adding visible roof forms, tile shading, windows and arcade accents; courtyards remain open. Earlier baseline/detail captures supply the visual comparison.

The owner and implementer report passing all 23 tests, typecheck, production build and audit with zero vulnerabilities for the frozen revision. I inspected the tests and ran the separate geometry calculation, but did not rerun the full gates or launch a browser/server. No reviewer-owned browser/server resources require cleanup. Physical mobile hardware, Safari, low-end GPUs and runtime performance without `KHR_parallel_shader_compile` were not tested; that fallback's cancellation/lifecycle is covered by the inspected unit tests. Roofs and facades remain procedural visual estimates, not surveyed architecture.

## Exact reviewed bytes

SHA-256 values identify the complete code/test/package change.

| File | SHA-256 |
| --- | --- |
| `src/main.ts` | `bbce0420994a1cce9467f7ebf886c4c629c39b1a82f63a92ea0d23f63d1f6a7c` |
| `src/building-details.ts` | `b5f26ce133fd74c25c7239c1c10113a12f85bcd594d0ffb284fe4418557aa5a7` |
| `src/building-geometry.ts` | `21f6c314dd49a61cb5c2b894bcbe4139ca4d34c2e09c35579699b569d676db79` |
| `src/building-worker.ts` | `d5c09a75880fcbe6e51b76b682ec8c54768c613fdac668b4d0fdf59c51c76678` |
| `test/building-details.test.mjs` | `ab2b8d3be1fb31629bda0a1217ffae7ca8930adfa28a1941583c51ae4011048b` |
| `package.json` | `a680c4a8d8292e145b272aa30f9512f3f297cf5f200e44348a78e03487035e14` |
| `package-lock.json` | `ec370d928a5b6420c5ab38e3f19c0c7250f926dd7c40d69e569e5da2a144b628` |

Unchanged source hashes: buildings `a27c564f8c7472bfddafd28e3328cffdf12acadb2f9854da1f1e429fd1d41d2f`; campus boundary `e8890575c26f83f0b6eec7beb710520b74fb400d7e8509b0814d64ead67ed9dc`.

| Inspected final result | SHA-256 |
| --- | --- |
| `visual.json` | `9d5779762ee6b6e8d878cd9440768cfc17a9af5cdbcc2d107799338456745726` |
| `context.json` | `3ec43e19d066f6ad7ce15be2ef44c1412e78328d24352bf4e64a938d2a80735d` |
| `detail-final.json` | `3738caf5790e70f50a338fdf733d009f47b9dcda8596de0cd9b48ee0fa3bbe56` |
