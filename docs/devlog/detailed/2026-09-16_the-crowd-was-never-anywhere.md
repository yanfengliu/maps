# 2026-09-16 — most of the crowd was never anywhere

A rendered lane went looking for the pedestrians and found the number that had been describing them all session was measuring slots rather than bodies.

## What it measured

**1,700 to 1,990 of the 3,000 "active" pedestrians share a position with another body**, in piles of **60 to 108 at single coordinates**, one of them frozen for 78 simulated seconds. Two runs are the experiment, and they differ only in how the camera was aimed:

- **Run 1 aimed at the densest cell in a position dump** — 211 bodies within 25 m — and its frames show a street with about five people in it. The 217 bodies inside the frustum occupied **19 distinct positions**, with 109 of them inside 18 m. Its corridor frames are starker: 131 bodies in the frustum at **5 positions**, one of them moving.
- **Run 2 aimed with a scorer that ranks candidate poses by distinct positions in frame** and by how many are moving, and the same probe reports **239 distinct bodies, all 239 moving**, inside the frustum at the closing pose.

Two independent measurements agree, which is what makes this a model defect rather than an instrument one: the app's own level counts match an offline probe's density to within two bodies at **51 of the run's 52 frames**.

So the model does have a real walking population. Body-count-based aiming was photographing an empty street, and a published count of 3,000 described a scene containing about a third of that in distinct places and one figure standing in for a pile of 108.

## Why this matters beyond the one number

`rendered.pedestrians` counts **instances**, and several conclusions this session rested on it read it as a count of bodies:

- "The crowd covers 0 of 2,073,600 pixels at the acceptance camera" is true, and the reason is partly that the crowd is not a crowd but a set of coincident points.
- "The crowd interpenetrates" is true, and the mechanism is plainer than crowding: bodies are stacked at single coordinates.
- "3,000 pedestrians drawn in every frame" was reported by three lanes and by me. It was a slot count.

The lesson is the one this repository keeps relearning in different clothes: **a counter that cannot distinguish N bodies from M positions is not evidence about either**, and it is the same shape as the population curve that measured an almost empty scene while three gates passed, and the timer query that answered zero milliseconds for every frame.

## What is being done about it

Two things, in this order, because the first has been load-bearing:

1. **The published count gains a distinct-position count beside the instance count**, in the same read-only observation, each stating in its own header what it measures. The instance count stays, because the per-level caps are per instance and a reader needs both.
2. **Then the stacking is traced to its origin.** A pile of 60 to 108 at one coordinate is a placement or lifetime defect rather than a crowd effect, and the candidates are distinguishable: several slots written to one staging point; a retirement that clears the active byte without moving the body; a route of zero or near-zero length so a slot never leaves its start; the walking step short-circuiting, which a previous lane measured — `blocked` forces `ramp = 0` and `orcaVelocity` is then never called, so a pressed walker holds velocity (0, 0); or bodies genuinely converging because nothing separates them.

The separation question is coupled to this and may be separable from it: a previous lane built a bounded separation constraint and reverted it because it deadlocked the crowd, so if most "overlap" is stacking, the overlap count should be re-measured after the stacking is fixed rather than before.
