# The aim tool scored the crowd at a height the crowd was not at

Session: 2026-09-17, on `main` at `368f92c`, worktree `artifacts/crowd-aim-fix/wt` on branch `crowd-aim-fix`.

This is the fix for item 2.2 of the read-only quality audit, `artifacts/quality-audit/register.md`. It touches `tools/flythrough/` and `test/` only: no `src/`, no `index.html`, nothing the certificate pins.

## What was believed

The audit's finding, taken at face value: `tools/flythrough/aim.ts` scored every visible pedestrian at `TARGET_Y_M + bodyHeightM` — a constant 16.1 m in world Y — so the tool ranked a knot on the AOI's margin ring first, where "the scorer's bodies sit 12.2 m above the real ones — 90% of the frame's vertical half-extent", and that is why the passing flight's crowd leg pointed 34.7 degrees down at pavement.

The first sentence is exactly right and I reproduced it. The second is right. The third is where this session's work went, because the constant body height is **not sufficient** to explain the frame, and fixing only it changes nothing.

## What was actually wrong, measured

I took the real anchor, the real scene data and the real captured frame:

- Camera `(-386.198, -496.297)`, recorded pose at tick 2996: `(-390.8, 30.000, -493.4)`, target `(-407.8, 15.2, -480.4)` at 26.0 m — exactly `distance = 26`.
- `groundBelow` at that camera: **26.36 m** (radius 8). Camera eye height above its own ground: **3.64 m**. So the eye is at 30.0 m world, looking at a target pinned at 15.2 m: the optical axis is **34.70 degrees down**, which is the audit's figure and is real.
- The 311 pedestrians in 30 m of that target: I walked the true ground out of the mesh for each one. **No body was floating.** `(-422.5, -468.6)` sits on terrain 23.40 within 8 m and the dump says y 22.81; `(-421.9, -468.6)` sits on 23.40 and says 22.84. The bodies are where their own ground says.

So the audit's "12.2 m above the real ones" is a comparison between the tool's constant **16.1 m** and the knot's **ground**, not a case of bodies floating above the terrain. The bodies are instead 2.7-7.3 m above the constant the tool used, and the tool's ray was drawn somewhere else again.

That second part is the defect the audit did not name, and it is the one that made the leg photograph pavement. The old scorer computed the ray a body was checked against as

```
rayY = cameraY + ((TARGET_Y_M - cameraY) * depth) / distance
```

which is the ray from the camera to the **pinned target height**. But it compared that ray with `bodyY = TARGET_Y_M + 0.9` — a constant — rather than with the body's real height. On the margin-ring anchor the real axis and the scorer's own comparison were therefore two different rays: the ray the renderer uses descends 34.7 degrees, and the constant it was compared against sat at 16.1 m, which is 12.3 m below the actual crowd. The tool reported a **level** view of a pose whose frames put every counted body on rows 636-710 of 720.

I checked that claim against the pixels rather than the arithmetic: projecting the tick-3000 bodies into the recorded crowd-000 pose puts all 311 of them between rows 636 and 710, and opening the frame at native size shows clean paving there. The count was real and the picture was of the ground.

## What the numbers were, before and after

The old tool, run from `368f92c` over the retained tick-5400 dump, ranks three anchors. The margin-ring knot is first by moving count at **415 moving of 487 distinct positions**, camera ground 27.5 m by its own 40 m-box reader, 34.7 degrees of real axis. The tool's own best-overall anchor sits on 15.1 m ground.

The corrected tool, over the same dump and then over a dump regenerated on this revision:

| | old rule | corrected rule |
| --- | --- | --- |
| margin-ring `(-386.198, -496.297)` | 415 moving counted, ground 27.5 m by the 40 m box, axis 34.7 deg down | refused: axis steeper than the leg's 20 deg, and **0 walking bodies inside 45 m** |
| `(452.071, 353.949)` | 107 moving at tick 5,400 | **225 near / 330 moving / 330 positions, 17 vehicles**, ground 14.49 m, axis 5.0 deg down, nearest body 5.5 m, median 43 m, figure 27 px |

The corrected tool also reports where the counted bodies are, which is the number the old one had no way to print: at the old anchor the median body is 70 m away and the nearest is 22.7 m; at the chosen one the median is 43 m and the nearest 5.5 m.

## The measurement that had to be redone first

The two retained dumps are **stale**. Measured: the same probe command on this revision gives 42 vehicles against the retained dump's 56 at tick 5,400, and 2,998 of 3,000 pedestrian rows differ by more than 1 cm, up to 1,331 m. Commits `5e8c266`, `7e703cd` and `42f5639` rewrote the tick's route arithmetic after those dumps were written.

So both dumps were regenerated on this revision, with the command and the revision named beside them:

```
node tools/populated/probe.ts --ticks 3000 --dump-tick 3000 --dump-file artifacts/crowd-aim-fix/dump-current-t3000.json
node tools/populated/probe.ts --ticks 5400 --dump-tick 5400 --dump-file artifacts/crowd-aim-fix/dump-current-t5400.json
```

Both at 17:34 on 2026-09-17, against `data/scene/terrain.mesh` SHA-256 `FEF57D09…` (4,413,112 bytes, identical to the file the audit measured) and `data/network/network.json` unchanged since 2026-09-13. The tick-3000 dump reproduces a tick-3000 dump taken earlier in the session **exactly**: 0 of 3,000 rows differ by more than 1 cm.

## The environment nearly cost the session

At about 17:20 the primary's `data/scene/` was emptied — only `agents/` and three JSON files remained, with no `terrain.mesh`, `roads.mesh` or `buildings/` — because a sibling lane rebuilt it through a junction. Between 17:20 and 17:23 every tool that reads the scene failed on ENOENT. It came back at 17:23 with the same terrain bytes. The worktree's `data/` junction was then replaced by one junction per item with a real `data/scene/` of its own, so a rebuild in the primary cannot strand the worktree again.

## The clock: measured, and left alone

The crowd leg captures at tick ~2,996, and the anchor is measured at 3,000. I checked whether a `holdToTick` would buy a better crowd, because the flight's own record was ambiguous about it, and the answer is no:

| | tick 3,000 | tick 5,400 | tick 7,200 |
| --- | --- | --- | --- |
| moving positions, AOI-wide | 1,979 | 1,607 | — |
| chosen anchor, bodies in frame | **316** | 12 | 14 |
| chosen anchor, within 45 m | **214** | 3 | 4 |
| margin-ring anchor, bodies in frame | 457 | 339 | 290 |
| margin-ring anchor, within 45 m | 101 | 4 | 3 |

The chosen anchor's crowd is at its liveliest at tick 3,000 and has dispersed by 5,400; a hold that delayed the leg would arrive at an empty frame. **No `holdToTick` was added.** The flight keeps the clock it has, and the plan's header now says why in the same place it says what the anchor is.

## Two things this session could not verify

- **The browser run.** No flythrough was run: the coordinator reserved the next one for the stand-repair lane and asked this lane to stop after code, tests and gates. The re-planned anchor is therefore a measurement over offline dumps, not a captured frame. Whether the leg opens where the plan says depends on the drive, which only a run can show.
- **Building occlusion.** The independent investigation's caveat applies to this anchor too: at 5.5 m the nearest body in frame is close enough that a wall between it and the camera would hide it, and no cached per-building footprint is on this machine to test it against. What was checked is weaker: the camera and the target both sit **0.00 m from a road triangle** in `data/scene/roads.mesh`, so the pose is over built ground rather than over bare terrain in the margin ring. The frames decide the rest.
