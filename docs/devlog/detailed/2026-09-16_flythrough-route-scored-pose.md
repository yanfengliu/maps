# The flythrough's route stood 59 m from the pose the scoring tool picks, and aimed the other way

Session: 2026-09-16. Branch: `worker/flythrough2` in `artifacts/flythrough2/wt`, rebased onto `main` at `0535ea4` while the verdict capture ran. No frame of this route has ever been captured: the lane that built it was stopped before it could fly, and the capture owns the machine. What follows is route arithmetic and two gates, not a flight.

## What was believed, and what was true

The route's crowd anchor, `CROWD_TARGET = (-431, -466)` with `CROWD_CAMERA = (-455, -412)`, was written when the tool that scores camera positions could not run. The plan called the pair "aim anchors" and said the frames would say where the camera ended up, which was honest about the pose being unverified and quiet about the pair being **59.1 m apart** where the tool's own constraint puts the subject at 26 m, and about the camera standing 108.8 m from where the scoring puts it.

`node tools/flythrough/aim.ts --dump artifacts/flythrough2/reference-dump-t5400.json` scores 611,904 candidate poses over 3,187 walking-way positions. Its three anchors, each a standable pose with its way id:

| Anchor | Camera | Target | In frame | Vehicles | Way |
| --- | --- | --- | --- | --- | --- |
| most moving pedestrians | `(-386.198, -496.297)` | `(-406.825, -480.469)` | 415 moving of 487 positions | 0 | `walk:665322366:0:0:ground0:f` |
| best overall (moving + 4 x vehicles) | `(344.1, 396.5)` | `(365, 381)` | 395 moving | 12 | `walk:1086844875:0:0:ground0:f` |
| most vehicles | `(292.8, 426.4)` | `(319, 426)` | 313 moving | 22 | `walk:1228977019:0:0:ground0:f` |

The route now stands on the first. The reason is the leg's own criterion: the crowd leg judges whether figures hold their shape, whether they interpenetrate and whether a crowd reads as a crowd, so moving pedestrians are the subject and a vehicle in frame buys nothing for it. `FRAME_FLOORS.vehiclesDrawn` is 1 across the whole route rather than per leg, and the legs over the district carry the traffic. That anchor is also the dump's highest moving-pedestrian count, and it leaves the route's shape alone — the flight already aimed at this knot, so the scored pose corrects the bearing and the distance instead of re-aiming the approach and the ascent at the other side of the map.

## The convention trap, which would have flown the route backwards

The tool reports "az 307 deg" and the route must turn to 127.50 deg for the same pose. Feeding the tool's number to `turnToAzimuth` would have put the crowd behind the camera, and the numbers are close enough to look like a rounding disagreement rather than an inversion, which is why this is worth recording rather than fixing silently.

`aim.ts` defines `forward = (sin(azimuth), cos(azimuth))` and calls `camera + forward * distance` the target, so **its azimuth is the direction a camera looking at the crowd faces**. The controls' azimuth, which `FlythroughDriver.turnTo` takes and which `CameraSnapshot` publishes, is `OrbitControls.getAzimuthalAngle()` — the direction **from the target to the camera**, read off the plan's own `INITIAL_VIEW`: the app opens at `azimuth = PI / 4` and `camera.position` is `target + distance * (sin(polar)sin(azimuth), cos(polar), sin(polar)cos(azimuth))`. The controls' azimuth is the tool's plus half a turn, and `atan2(camera - target)` reproduces the 127.50 degrees the route now turns to. `artifacts/flythrough2/verify-route.ts` asserts the half-turn relationship rather than the number, so the two conventions cannot drift apart again unnoticed.

## Two distances that disagreed, and the latent defect they hid

The scored pair is 26.000 m apart — the tool's ray endpoint is 26 m from its camera position, not a rounded waypoint, and its two reported coordinates measure 26.0000 m. The route as first edited had the approach ladder's last rungs written by hand at 26 m while the crowd leg's separation was the exact figure, so the approach landed 0.43 m short of the pose the crowd leg opens on, and the crowd leg's own push divided by a hard-coded 30 against a 26 m pair.

Deriving `CROWD_DISTANCE_M` from the tool's coordinates and making the approach ladder's last two rungs `CROWD_DISTANCE_M` fixed that, and exposed the defect it was hiding: the ascent leg's `ASCENT_LADDER` zooms were computed as `rung.distance / previous` with `previous` initialized to a hard-coded 24 while the ladder's first rung was also 24. That is self-consistent only if the leg opens at 24 m. It opens where the crowd leg left it, 18.8 m, so every one of the eleven zoom factors was scaled by 24/18.8 = 1.277 and the leg finished at **485.7 m instead of 620 m** — a flight that never comes home, which no frame's pose would have named as an error. The first rung is now `CROWD_END_DISTANCE_M`, which is derived from the scored distance less the push, and the chain closes at 620.0 m.

## What is verified, and what is not

Verified in the worktree: `npx tsc --noEmit` exit 0; `npx vitest run test/flythrough-frames.test.ts` green at twelve cases; and `artifacts/flythrough2/verify-route.ts`, which re-derives the anchor's coordinates to the millimetre, the 26.0000 m separation, both azimuths, the 11/12/12/11 step counts and the three legs' distance chains from the plan's own exports and the tool's JSON, reaching the closing 620.0 m through the ascent's eleven zooms. No sequence check was changed, because the re-aim moves a pose and a distance without adding, removing or reordering a step.

Three failures of that instrument were its own before the route's: an assertion that the two azimuths differ by a quarter turn (subtracting them without normalising first), an approach-distance chain read from the wrong side of the ladder (`step.zoom` is a ratio between rungs, not a running distance), and a check that the crowd leg's held steps carry no `zoom` when the plan writes `zoom: 1` for them. Each was corrected in the check rather than in the route, and the route defects the script then found were the two real ones above.

Not verified, and not claimable: nothing flew. The route has never been captured, no frame of it exists, and the flight waits for the verdict capture to release the machine and for `npm run data:agents` to restore the human agent set — without which no `?agents=1` run loads, and the population is the thing the crowd leg is for. The ladder's new opening height of 18.8 m is arithmetic against `groundBelow` = 26.44 m under the scored camera and a target at 15.2 m; whether that framing reads as a street at eye level is a judgement only the frames can carry.
