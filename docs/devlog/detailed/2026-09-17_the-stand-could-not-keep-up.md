# 2026-09-17 — the flythrough's approach leg stood the camera 19 cm above the ground, and it took a trace to find out why

## What the check saw, and what the mechanism turned out to be

`judgeSequence` was right and its message said exactly what it knew: two recorded moments in the approach leg sit under the 1.5 m clearance floor — `approach-009`'s stand reading 0.19419 m before its own vertical control ran, and `approach-010`'s 1.07751 m — while the captures beside them read 2.68534 m and 3.10093 m. This session was the repair, and the first three hypotheses were all wrong.

What was believed first: the stand drives the polar angle, its correction is capped at `standStepRad` 0.2 rad a step, and the ladder's descent outran the cap over rising ground. The plan's numbers say otherwise — the angle left to correct at those steps is 0.0062 to 0.0132 rad, well inside a 0.2 rad cap — so the cap was never binding. What was believed second: the pan drags the camera down over the hill, and a deeper convergence loop would out-climb it. A two-minute run with a trace in the driver killed both, and the trace is the reason this did not become a week of plan tweaking.

The measured mechanism, in the order the step runs:

1. **The zoom is exact and it is what lowers the camera.** `OrbitControls` does `_spherical.radius *= _scale` in `update()` (`node_modules/three/examples/jsm/controls/OrbitControls.js`), and the offset it reconstructs from that radius is the camera's whole offset from the target — the vertical term with it. The approach's step 10 closes the distance by 0.788, so a 4.5 m vertical offset becomes 3.55 m: 0.95 m of descent in one gesture, at every step of the descent.
2. **A drag does not deliver the angle it asks for.** The same `update()` does `_sphericalDelta.phi *= (1 - dampingFactor)` every frame, so a drag's rotation is applied gradually. The trace's step 10 asked for 0.03128 rad and the camera's polar had moved 0.0165 rad when the next step's zoom ran. The rest lands later, which is why a reading taken right after a drag is a reading of a gesture still in flight.
3. **The ground rises along the path while all of that happens.** Between two captures the camera crossed ground that climbs about 4.85 m (21.56 m to 26.41 m in the archive's `groundBelowM`), so the descent and the rise compound: one capped drag a step could not keep the offset above what the terrain needed, and the camera arrived under it.

The trace that settled it: `step:start` / `after-zoom` / `after-floor` / `after-pan` / `stand:read` for every step of the approach, with the camera's position, polar, distance, offset and the ground under it. It was added to `driver.ts` behind an env flag, used for four runs, and removed before the commit; what it printed is quoted in `docs/learning/gate-proofs.md`.

## The fix, and the two things it deliberately did not do

`runVerticalCorrection` iterates `standConverge` to its aim inside the step (`MAX_STAND_DRAGS` 8, `STAND_CONVERGENCE_M` 0.05 m), so the drag's damped delivery is simply the next round's error rather than a permanent shortfall. The aim is clamped to the leg's floor, carried per step as `standFloorM` from `APPROACH_FLOOR_M` 2, and `raiseToFloor` answers the floor **between the zoom and the pan** — the pan's two axes are horizontal (`screenSpacePanning` is false), so a camera clear of the floor after the zoom is clear for the rest of the step. The rescue's aim is held above the floor by `max(0.1, 0.03 * distance)` metres, because a drag's return is read mid-gesture and the tail keeps moving the camera after it.

It did not raise the floor (the check's own number stands at 1.5 m) and it did not skip the descent (the ladder still asks for 4.5, 3.5 and 3 m, and the camera still reaches the closing rung). The route's intent is unchanged; what changed is that the control finishes its correction inside the step instead of starting the next one short.

## Numbers, old beside new

The frozen tree, 46 frames, `npm run visual:flythrough`, port 4323: `judgeSequence` **zero failures**, no `failures` key in the manifest.

| leg | lowest recorded moment, before | after |
| --- | --- | --- |
| overview | 68.084 m (captured) | 57.241 m (captured) |
| approach | **0.194 m** (stand before) | **2.908 m** (captured) |
| crowd | 3.640 m (stand before) | 2.899 m (stand before) |
| ascent | 4.400 m (stand before) | 3.550 m (stand before) |

`approach-009` and `approach-010` now read 4.626 m and 3.431 m at their captures, and their stands read 4.339 m and 3.333 m before the correction rather than 0.194 m and 1.078 m.

## What a later session should not have to rediscover

- **A mutation that was never applied reports green.** The first attempt at the red control used PowerShell's `Set-Content -NoNewline`, which this shell rejects with "A parameter cannot be found that matches parameter name 'NoNewline'"; the cases ran against the **unmodified** file and passed, which reads exactly like a mutation that does not catch the defect. The second attempt is `artifacts/stand-repair/mutate.mjs`: it counts the marker, writes the file, and **re-reads it to confirm the bytes changed** before running anything. A mutation harness that cannot tell "applied" from "not applied" is the same defect class as a gate that reports "did not run" as "passed".
- **The `less than 0.002 rad is left` exit in `standConverge` is dead at a real stand tolerance.** The height error that a 0.002 rad angle corresponds to is `|d cos p1 - d cos p2|`, which is at most `d * 0.002`; at the lane's distances (the controls run from 25 m to 1,994 m) that is 0.05 m or more, so any angle under the 0.002 rad bar is a height already inside the 0.05 m convergence bar and the helper returns "already within" first. The branch was written as a guard and no case in `test/flythrough-stand.test.ts` reaches it. It is stated as unreached in the gate record rather than asserted as though it had been exercised.
- **The unit case originally could not catch a mutation in the shipped loop**, because its simulator ran its own copy of the loop. The loop now lives once, in `runVerticalCorrection`, and the test drives that function with a camera and a ground profile — so disabling the shipped loop is what the red control disables.
- **The worktree's `data` junction serves the primary's `data/`**, and mid-session that directory had lost `terrain.mesh`, `pavements.mesh`, `markings.mesh`, `buildings/` and later `control-hardware.json`. The 404s are named by the app (`/scene/terrain.mesh returned HTTP 404`), and the repairs are `npm run data:scene`, then `data:pavements`, then `data:network` before `data:markings` (its own error names the ordering), then `data:vehicles`, `data:vehicles:verify` and `data:hardware`. A run whose scene data is short two producers fails at boot, not in a frame.
- **A flight run was killed and re-flown because the tree was edited under it.** The first "clean" run was started and then the driver was edited for the mutation experiment; the run was reading a tree that changed underneath it, so its result would have measured two revisions. Edits and a long gate do not overlap.
