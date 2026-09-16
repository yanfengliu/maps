# 2026-09-16 — the invisible crowd was the whole frame cost

Phase 9's gap was not the simulation. The renderer was writing the same `Matrix4` once per drawable part per pedestrian per frame — six parts per level across nine levels of three variants — so at 3,000 pedestrians it made **18,000 `InstancedMesh.setMatrixAt` calls a frame, each writing the same sixteen floats into a different buffer**, plus the instance uploads that forced. Measured at 1920x1080 on the RTX 4090: **11.7 ms of a 45.25 ms frame, and the frame delivered 17.3 to 22.0 fps.**

One shared per-instance attribute per level, assigned to all six parts and written once per pedestrian, takes the frame to **17.33 ms and 56.5 fps at 0.976 simulated seconds per wall second** — 18,000 writes to 3,000, 54 buffers to 9, and uploaded bytes from 10.4 MB to 0.576 MB a frame. Three's built-in instancing path is kept, so no shader changed. The render-input digest — camera, per-level counts, and the raw bytes of every part's `instanceMatrix` and every level's `agentMotion` — is byte-identical between the two builds, so the picture did not change; only the buffer count did.

The simulation was never touched: the acceptance digest is `4a8e5169…` before and after.

## The finding that matters more than the number

**The crowd covers 0 of 2,073,600 pixels at the acceptance camera.** Measured by hiding its group inside one page load, with a control: hiding the `buildings` group moves 1,364,198 pixels through the same mechanism, so the instrument works. `poseExtent()` says why — the 3,000 pedestrians span plus or minus 490 m with a centroid 108 m from the crossing, and none is within 60 m of it at any tick from 2,400 to 5,400.

So the 11.7 ms that this commit removed was **CPU spent composing a crowd that was not in the picture**, and the "56.5 fps with 3,000 pedestrians" figure describes a frame that contains 3,000 pedestrians only in the sense that they are being animated off-camera. Both statements are true and the second is the one a reader needs. The criterion says "3,000 animated pedestrians and 200 vehicles"; the app animates 3,000 and draws about 81 vehicles, and at the acceptance camera neither contributes a pixel. That is recorded as a defect in the population's spatial distribution and the vehicle shortfall, not as an achievement.

## Why no byte-level visual gate is possible on this app

**Two runs of the unmodified build differ by 13.82% of pixels** at the same frozen tick, maximum delta 40, and 13.86% with the crowd switched off entirely. All of it is on building facades: the tileset's appearance is stable within a run and differs between runs. The before-and-after difference this session measured is 13.74%, the smallest of the three.

That is a bound on every visual claim made about this repository, and it should be read beside the plan's long-standing sentence that gate frames are not byte-reproducible — which was measured for camera settling, not for the tileset. The practical consequence is that the final acceptance capture must be inspected frame by frame by a person, and that a hash difference between two captures means nothing on its own.
