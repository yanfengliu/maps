# The flythrough's crowd anchor named the scored camera as if it were the camera that flies

Session: 2026-09-18, branch `fix/flythrough-anchor-constant` off `dbb7e3d`, worktree `artifacts/anchor-constant/wt`. `tools/flythrough/`, `test/` and docs only: no `src/`, no `index.html`, nothing the certificate pins. `npm run build` in the worktree produced `index-_LQ7yEQN.js`, byte-identical to the primary's build of the same revision, and the changed files are outside the bundle graph.

## What the inspection found

Frame inspection of the passing flythrough run (`artifacts/inspection-flythrough2/REPORT-crowd.md` finding D1) found that the crowd leg did not open at the camera `plan.ts` names: flown `(462.439, 442.423)` against target `(459.056, 416.724)`, exported `CROWD_CAMERA = (456.0, 389.7)` with `CROWD_TARGET = (459.394, 415.478)`. Targets 1.30 m apart, cameras **53.1 m apart on opposite sides of the target**. The same report noted the constant's own comment says "the camera stands at `target + (sin, cos) * distance`" while the code below derives the target from the camera with that formula, which is 180 degrees out.

## The convention, from the run's own records

The manifest `artifacts/flythrough2/manifest.json` settles it with two poses, and both are quoted in the case that now pins it.

1. **The app's opening pose.** Target `(0, 15.2, 0)`, `azimuth` 0.7853982, `polar` 0.5160775, `distance` 620, camera `(216.341, 554.452, 216.341)`. `target + (sin az, cos az) * distance * sin(polar)` reproduces that camera to under a centimetre. So `CameraSnapshot.azimuth` is `controls.getAzimuthalAngle()`: the direction from the target **to** the camera. `src/render/camera.ts` builds the opening pose the same way.
2. **The crowd leg's opening frame.** Camera `(462.439, 17.232, 442.423)`, target `(459.056, 15.200, 416.724)`, `azimuth` 0.1308997, `distance` 26.000001. The camera is 26.0000 m from that target at a target-to-camera bearing of exactly 0.1308997 rad - the controls' formula again.

So the flight's camera is `CROWD_TARGET + (sin, cos) * 26` at `CROWD_AZIMUTH`, i.e. `(462.788, 441.254)`, which is 1.24 m from where the run opened - the approach's own pan residual (`panErrorAfter` 0.909 m on its last step). And `CROWD_TARGET`, not `CROWD_CAMERA`, is the point the flight pans to: the approach's 12 steps and the crowd leg's 6 all carry `panToX/Z = CROWD_TARGET`, and their recorded targets land 0.4-1.3 m from it, inside their own residuals.

The other tool agrees. `tools/flythrough/aim-score.ts` builds a candidate's target as `camera + (sin az, cos az) * distance` - its azimuth is the direction the camera **looks**. Re-scoring the six `artifacts/crowd-aim-fix/dump-t*.json` at `(456.0, 389.7)` reproduces the anchor devlog's documented numbers exactly, at tick 3,000 through 7,200: **152 / 99 / 95 / 100 / 100 / 10** walking bodies inside 45 m, a **3.9 degree** axis, **131 / 36 / 55 / 55 / 39 / 25 px** figures. `(456.0, 389.7)` is also a walking-way point to 0.04 m (`walk:682314235`), which is where `aim.ts` can put a camera at all.

So there is one number, `CROWD_AZIMUTH` 7.50 degrees, meaning the scorer's look direction when `aim.ts` scored the pose and the controls' target-to-camera bearing when `plan.ts` hands it to `turnTo`. Because those are opposite ends of the same ray, the scored camera and the flown camera are 53.1 m apart, and the flight's own bearing (camera to target) is 187.50 degrees.

## Why the constants were not "corrected" to the flown pose

The task that found this asked for the constants to describe the pose the driver flies, with a stop-and-report if that would change the flown pose. It would. `CROWD_TARGET` is the approach's and the overview's pan target and the origin of the crowd leg's push direction (`(CROWD_TARGET - CROWD_AIM_CAMERA) / CROWD_ANCHOR_DISTANCE_M`), so moving it onto the far side of the aim camera - which is what making the pair's own bearing equal `CROWD_AZIMUTH` means - carries the approach's target 53.1 m across the crowd and flies the crowd leg from the aim camera instead. That is the opposite of what the passing run photographed: the flown pose holds ~100 walking bodies inside 45 m and the aim camera's own stand height is 1.91 m of clearance, under the leg's 2 m floor, so the driver cannot even stand there without raising it. The constants keep their values, the flight is unchanged, and the tension is stated in `plan.ts` and in the case.

## The edit

- `CROWD_CAMERA` is renamed `CROWD_AIM_CAMERA`: it is the camera the scoring tool accepted, not the camera the flight carries. Its value is unchanged.
- `CROWD_TARGET` is unchanged and still derived from it by the scorer's own formula; its doc now says whose target it is - the scored frame's centre and the point the flight pans to.
- `CROWD_FLOWN_CAMERA` is added and derived from the pair in the controls' convention. The plan's header carries both conventions with the manifest numbers above, and says which derivations read which value.
- The crowd leg's push now divides by `CROWD_ANCHOR_DISTANCE_M`, the pair's measured separation, where it divided by `CROWD_DISTANCE_M`; the two are equal to 4e-15, so the unit vector is unchanged.
- `aim-score.ts`'s `Candidate.azimuth` docstring said "the controls' bearing: the azimuth from the target to the camera". It is the scorer's own, the other way round; it now says so.
- `aim.ts`'s usage line named `artifacts/flythrough2/reference-dump-t5400.json` - the 2026-09-16 dump the register records as unreproducible - while the anchors were re-scored from the six fresh dumps under `artifacts/crowd-aim-fix/`. It now names those and points at the register's still-owed provenance gate. That gate - a dump carrying its revision and a population digest, refused by a consumer that cannot reproduce them - belongs in `tools/populated/probe.ts`, which writes the dump, and is not invented here.

## The mistakes this session made, and what caught them

- **The first draft of the case copied the wrong controls formula.** It put the camera at `target + (sin, cos) * distance` and dropped `sin(polar)`; the opening-pose check failed at **314.05 m**, which is what a 45 degree pose looks like when the horizontal radius is not scaled. The formula is `target + (sin az, cos az) * distance * sin(polar)` with `distance * cos(polar)` as the height.
- **The first draft derived the flown camera as the target minus the scorer's offset**, which returns the aim camera exactly; the "the two cameras are 52 m apart" case failed at **0.00 m**. The controls' offset from the target to the camera is the negative of the scorer's offset from the camera to the target, so the flown camera is the aim camera plus twice that offset.
- **An edit was written into the primary checkout instead of the worktree.** `tools/flythrough/plan.ts` in the primary was restored to `HEAD` (`dbb7e3d`) with `git checkout HEAD -- tools/flythrough/plan.ts` after confirming, with `git diff --name-only`, that it was the only modified path, and the corrected file was carried into the worktree. The primary's later two commits (`6907963`, `dbb7e3d`) touch only `docs/`, so nothing else was at risk. The primary is clean.

## Gates

All in `artifacts/anchor-constant/wt`, on the tree that is committed here.

| Gate | Command | Exit |
| --- | --- | --- |
| Build | `npm run build` | 0 (`index-_LQ7yEQN.js`, byte-identical to the primary's build of the same revision) |
| Types | `npm run typecheck` | 0 |
| Unit tests | `npm test` | 0 - **69 files / 495 tests**, including the new case and the 7 `facade-emission` cases that need the cached `data488.b3dm` |
| Audit | `npm run audit` | 0 - 2 moderate, no high |

`npm run visual` was not run: a sibling lane holds the browser and the GPU, and nothing here changes the bundle or the flight.

The unit gate ran against a worktree that carries **no junction**: `data/` holds copies of the eight files the unit tests read (`network.json`, `terrain.mesh`, `roads.mesh`, `pavements.mesh`, `agents/vehicles.json`, `buildings/data/data488.b3dm`, the two `tran` GML files) and nothing else, with the reparse-point count under `data/` enumerated as **0**. `node_modules` is the only junction in the worktree.

## Bound

The case proves that the exported pair, the derived flown camera and the route's own pans and pushes name the same two ends of one line, using the passing run's recorded numbers. It cannot prove which pose holds the crowd, and it says nothing about what a frame looks like; `node tools/flythrough/aim.ts --dump artifacts/crowd-aim-fix/dump-t3000.json` is that measurement, and its own bound is that it is an offline aid rather than evidence. The stale-dump class is still ungated: the register entry of 2026-09-17 owes a dump that carries its revision and a population digest and a consumer that refuses one it cannot reproduce, and that mechanism belongs in the probe that writes the dump.
