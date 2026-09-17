# The 44-frame inspection was reading a downscaled preview; here is the instrument that reads the frame's own pixels

Date: 2026-09-16. Worker: `tools/inspect/` lane, while the verdict capture owned the CPU and port 4319.

## What was wrong

`artifacts/frame-inspection/report.md` states its own bound: every frame was opened at 1280x720 but came back as a **1066x600 preview**, so single-pixel judgement sat below native resolution and the aliasing and thin-geometry class could not be signed off. The paint lane had already got past the same bound by cutting crops and confirming each came back at the size it was written at — `tools/paint-review/analyse.ts`, whose ten crops and `analysis.json` were then destroyed with its worktree — and that instrument was hard-wired to its own six poses, its own frames and a reference-imagery comparison.

Round 30's D4 added a fourth thing nobody had looked at: the World style panel is composited into **every** captured frame at about x 1010..1275, y 4..140, identical across poses, costing the top-right corner of every appearance frame — and the 44-frame inspection does not mention it.

## What landed

`tools/inspect/crops.ts`, run as `node tools/inspect/crops.ts --frame artifacts/visual/hero/<frame>.png`. It decodes through `tools/visual/png.ts` (read, never modified, so a capture digesting that directory is unaffected), slices 1:1 rectangles with no resampling, encodes through `tools/paint-review/png-encode.ts`, and writes `manifest.json` beside the crops.

The interface is flags rather than positionals, and one choice in it is worth recording: **storing crops by default in a per-frame directory** (`artifacts/frame-crops/<frame>/`) instead of inside the frame's own directory. `artifacts/visual/hero/` is the cleanup scope of the spec that writes it and `verify-output.ts` expects exactly the ten names it names, so a subdirectory there is either deleted by the next run or read as part of the frame set.

## The region set is a grid, and that is not tidiness

The first draft of the rectangles was written freehand and **did not tile the frame**: rows 360..539 of the right column belonged to no region, which the tool's own tile check caught. The set is now derived from `COLUMNS` and `BANDS` constants — three columns (0..319, 320..959, 960..1279) and three bands (0..179, 180..539, 540..719) — with eight regions that tile the frame exactly once each:

| Region | Rectangle | What an inspector looks at |
| --- | --- | --- |
| `left-upper` | 320x180 at (0,0) | western frontage against the sky |
| `left-lower` | 320x360 at (0,180) | the western approach and facade bases |
| `left-ground` | 320x180 at (0,540) | pavement at the left edge |
| `upper-signage-sky` | 640x180 at (320,0) | signage band, skyline |
| `centre-crossing` | 640x360 at (320,180) | the crossing, its diagonals and zebra bands |
| `near-pavement` | 640x180 at (320,540) | the pavement the camera stands on |
| `right-ui` | 320x540 at (960,0) | the World style panel and whatever the app composites |
| `right-ground` | 320x180 at (960,540) | near ground beside the attribution line |

Eight and not six because the tiling is exact: opening all eight is a native review of the whole frame, and `--tile-check` proves it by reassembling the frame from the crops and comparing byte for byte.

## Three red controls, and the one that mattered

**A region cut one pixel to the right passed the first version of the tile check.** The check flagged uncovered pixels only, so a second region writing over the first could hide a bad crop behind a good one — and did: the `bottom-credit` strip tiled over the corrupted `near-pavement` rows before the comparison ran. Coverage is now **counted, not flagged**, and every pixel must be written exactly once. With that in place the same mutation fails by name: `89113 of 3686400 bytes differ ... First difference at byte 2764804 (pixel 691201, column 1, row 540)`. A check that reports a pass on a known defect is worse than no check, because it is believed.

The other two controls: a PNG header declaring 20000x20000 is refused before decoding (`more than 16x the 1280x720 capture size`), and a 2560x1440 frame is refused by shape (`every captured verdict frame is 1280x720`). The region-bounds guard is written and reachable only by editing the region constants, and is recorded here as code rather than as evidence — the same distinction `AGENTS.md` draws for the gate's three unwatched failure paths.

## What the world-scale note is and is not

`worldScale` appears only when a pose is available: `--camera`/`--target` on the command line, or a lookup for a frame whose name matches a known hero pose (`hero-*-crossing` at 45 m, `hero-*-approach` at 220 m, from `tools/visual/shots.ts`). The camera position is *derived* from the shot constants rather than read from the capture, and the manifest says so in `poseSource`.

The scale comes from the same ray-to-plane construction `tools/paint-review/analyse.ts` uses, minus its terrain refinement, so it is an estimate at the pose target height and not a measurement of the ground mesh. It is reported as a **3x3 sample range** rather than one number, because foreshortening inside a crop is real: on the crossing pose the centre crop spans 0.0144-0.0717 m/px. Rays that point above the horizon land on nothing, so `sampled` says how many of the nine did; the cartographic crossing frame reads `6 of 9` and `upper-signage-sky` reads `no ground in this crop`, which is the honest answer for a crop holding sky.

## What could not be verified

**The three frames the assignment named no longer exist.** The capture running when this work started wrote them at 19:01, 19:06 and 19:07 local; at 19:16:02 a **new run began** (`artifacts/visual/run.json`, `runId cc8bc42d2368926e`, build `index-BFH5WFVP.js`) and `hero.spec.ts` cleared its own output directory, so those bytes and the crops cut from them were deleted. The digests recorded in `docs/work/0_shibuya-1km/plan.md` (`eb7644f0…`, `5939b1bc…`, `b407a231…`) are the previous run's and no longer describe anything on disk. The tool was therefore verified on the frames this run had not yet replaced — `artifacts/visual/sweep/satellite/plaza-az000.png` and its siblings — and the crops in `artifacts/frame-crops/plaza-az000/` are from that frame's own digest.

Because no frame under `artifacts/frame-crops/` is regenerable from a frame that exists, the tool was re-run before the commit and the stale sets were deleted: a crop set whose frame is gone is a directory that reads as this run's evidence and is not.

Not verified: the tool on the current run's hero frames (they do not exist yet), and the whole visual gate. `npm test`, `npm run build` and `npm run visual` were not run — the capture owns the CPU and port 4319, and `tools/inspect/**` is outside the bundle graph and outside `HARNESS_ROOTS`, so landing this commit cannot move `dist/` bytes or the harness digest the running certificate re-derives at `--end`.
