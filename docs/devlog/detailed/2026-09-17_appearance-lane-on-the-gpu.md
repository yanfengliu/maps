# 2026-09-17 — the appearance gate moved to the GPU, and the three hours became five minutes

## What was believed, and what the numbers say now

Until tonight `playwright.config.ts` captured the 44 appearance frames on SwiftShader, and that was a deliberate, recorded trade: machine-independent certified pixels in exchange for a roughly fifty-fold tax. `docs/policies/local-rules.md` stated it as an exception and the team was sized around a three-hour command. The owner's 2026-09-16 instruction — "if you can use GPU, don't use CPU", beside "if you can use multi-core, don't just use single core" — overrode it, and this session is the change.

The measurement that made the tax legible, on one instrument run against both renderers against the same build, one pose, driven through the real controls:

| Phase of one capture | Software | Hardware | Ratio |
| --- | --- | --- | --- |
| boot (goto to first frame) | 3,644 ms | 3,933 ms | 1.1x slower |
| drawn frame interval | **1,035 ms** (0.97 fps) | **207 ms** (4.83 fps) | 5.0x |
| tileset refinement (`waitForTilesIdle`) | 64,914 ms | 1,138 ms | 57x |
| controls corrections (`zoomTo` + `orbitTo`) | 342,711 ms | 2,711 ms | 126x |
| camera settle predicate | 26,443 ms (190 frames) | 219 ms (204 frames) | 121x |
| one screenshot | 55,652 ms (27 frames inside it) | 232 ms (14 inside) | 240x |
| **total** | **499.4 s** | **10.2 s** | **49x** |

The frame-interval row is the ruler every other row is quantised by: the waits are not wall-clock sleeps, they are frames, and on SwiftShader a frame costs about a second at this pose. That is why "rasterisation" is not a phase you can subtract — it is the price of every frame the pose, the tileset, the settle predicate and the screenshot consume. The probe is `artifacts/gpu-lane/software-probe.json` and `software-probe-hardware.json`, its source is `artifacts/gpu-lane/wt/artifacts/gpu-lane/probe/software-phases.spec.ts`, and it runs the real `OrbitDriver` rather than a copy of its predicates.

Bounded end to end, on the committed tree:

| | Software (preserved) | Hardware (committed tree) |
| --- | --- | --- |
| Ten hero captures | **4,438.2 s** (74.0 min), gaps 107.4–795.0 s | **88.3–91.1 s**, gaps 1.4–3.6 s plus one 31.4–33.7 s page reload |
| Eighteen-view sweep | never reached in the stopped run | 70.9–73.4 s per style, gaps 2.2–4.3 s |
| Whole gate (`npm run visual`) | estimated 3–3.7 h at the recorded pace | **283.2 s and 309.8 s** on consecutive runs |

## Concurrency

The three specification files are independent, so the setting was measured rather than argued. Same tree, same four tests, only `--workers` differs:

| Arm | Capture lane wall clock | Per-spec durations | GPU duty cycle (nvidia-smi, 2.5 s poll) | CPU, all 32 cores |
| --- | --- | --- | --- | --- |
| `workers: 1` | 238.9 s | hero 1.5 m, sat sweep 1.2 m, cart sweep 1.2 m, style-picker 0.34 s | median 15%, p90 37%, max 98% | median 77% |
| `workers: 3` | **144.0 s** (1.66x) | hero 1.4 m, sat sweep 1.2 m, cart sweep 1.2 m, style-picker 0.36 s | median 23%, p90 41%, max 98% | median 66% |
| `--fully-parallel --workers=4` | 114.7 s (2.08x) | hero 1.6 m, both sweeps 1.3 m | not adopted | not adopted |

`workers: 3` is the configuration that landed. The critical path there is the sweep pair, which shares one file and therefore one worker: 72 s + 72 s. `--fully-parallel` removes that and was measured green at 114.7 s, but adopting it would have moved `playwright.config.ts` after the certificate was issued against this tree, so it is recorded as a measured option rather than taken.

The comment the old config carried — "several browsers fighting for a software rasteriser … would not make it faster" — was true of the software lane and false on the GPU, which is why it was worth measuring instead of repeating.

## What the frames look like now

The hardware frames are not the software frames. The certificate binds them to this adapter for that reason, and the difference is small enough that it needs saying precisely rather than dramatically:

| | Hardware vs software, same pose | A real style change (control) |
| --- | --- | --- |
| Pixels whose summed RGB difference exceeds 6 | **2.4–8.4%** across the eight hero pairs (mean abs channel difference 0.4–1.0 of 255) | **90.5%** on the hardware frames, 90.3% on the preserved software frames — cartographic vs satellite, same pose, same renderer |
| Identity control (a file against itself) | 0.000% | — |
| Pixels differing by more than 32 on any channel | 0.02–0.29% | — |
| Mean luminance | within 0.03–0.25 | — |

The threshold and the shape are the plan's own for the style round trip (0.345% of pixels beyond 6 summed over RGB, against 83.58% for a real style change); the numbers differ because they are different frame pairs, not a different metric.

Same scene, same poses, same lighting: the two arms' manifests agree exactly on `sunAzimuthDegrees`, `sunElevationDegrees`, `tokyoClock` and `tiles.cachedBytes` (630,155,033). What moves is rasterisation — edge coverage, TAA accumulation, the last bit of the resolve — which is a different picture in the sense that every pixel is this GPU's, and not a different picture in any sense a reviewer would call a change of subject. The honest conclusion for the plan is therefore: the reviews written on the software frames remain valid as reviews of the *scene*, and they are no longer reviews of these *bytes* — the renderer changed, so a frame that was inspected must be inspected again if a claim is being made about its exact pixels.

## What now dominates the gate

Not rasterisation. On the hardware lane a 1280x720 frame costs 207 ms while the tileset is refining, and the gate's 309.8 s is spread over:

- **tile refinement and page boot, per specification file**: 30–36 s of ledger time before each file's first frame (three page loads: hero reloads once per time of day, each sweep once). This is the largest single term.
- **pose, settle and capture, per frame**: 1.4–3.6 s per hero capture and 2.2–4.3 s per sweep capture, of which the settle predicate is ~0.2 s and the controls corrections ~2.7 s; the rest is the tile wait and the screenshot.
- **the frame checks after the last capture**: ~30–35 s per file, decoding 18 PNGs and computing signature distances.
- **the lifecycle lane**: 48.5–54.6 s per repeat, 2.7 min for three.
- **the build and the two scene digests**: the build is 1.5 s, but the scene digest reads and hashes 214,114,015 bytes twice, and that is the wrapper's own fixed cost.

The GPU's duty cycle during all of this is 15–41% — it is not the bottleneck, and neither is the CPU (median 66% of 32 cores, much of it Chromium's decoders and PNG encoding). The next real reductions are the ones the numbers point at: the per-file page boot and refinement (three loads of the same city), and the post-capture PNG work.

## What was fixed rather than rewritten

- **`requestedGpu` recorded `"software"` beside a 4090 renderer** in the first promoted certificate. The wrapper runs in its own process (`node tools/visual/verify-output.ts --begin`), where the lane's `MAPS_VISUAL_GPU` declaration has never been set, and the field kept the old `?? "software"` default. It now comes from `requestedGpu()` in `tools/visual/lane.ts`, which the two capture specs, `progress.ts` and the wrapper all share.
- **The `hardware-iteration` lane** existed to iterate on the GPU while the verdict stayed on the CPU. Once the verdict moved it was a second lane claiming to be the appearance gate, so `playwright.hardware.config.ts` and `npm run visual:hardware` are deleted and the one instrument that still used the lane name — the frame-budget lane, which writes its own directory and never certifies — renamed it to `frame-budget`.
- **Five other lanes' prose** claimed a renderer split that no longer exists (the flythrough and populated port lists, the paint-review header, the post-chain header, the smoke pre-flight's "the renderer is SwiftShader"). Each now says what is true; none of their launch arguments changed except the smoke lane, which moves to `--use-angle=d3d11` because its whole purpose is to answer the questions the appearance lane's first minute would ask.

## Bound

One machine, one adapter (RTX 4090, driver 616.64 by `nvidia-smi`, 32.0.16.1664 by the OS device record), one scene (84 files, 214,114,015 bytes, digest `ddd21ee1b4feb7f7…`), one build. The concurrency numbers come from a machine that was otherwise quiet and are medians of samples taken every 2.5 s; the GPU duty cycle in particular is aliased, and the second instrument (`\GPU Engine(*)\Utilization Percentage`) agrees with it in direction but reads the Chromium GPU process's 3D engine at 2–15% in the same window. The software arm is the coordinator's preserved run, captured against `22ef994` rather than this revision, so the renderer comparison carries that revision difference as well as the renderer's — the manifests' identical lighting, poses and scene byte counts are what bound that.
