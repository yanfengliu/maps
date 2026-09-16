# 2026-09-16 — four render-layer defects the populated capture lane reported

Worktree `artifacts/render-defects/wt` off `86b5a70`, `data/` and `node_modules/` junctioned to the primary checkout. Nothing here is committed; the handoff with every frame digest is `artifacts/render-defects/REPORT.md`. The findings came from `artifacts/populated-capture/REPORT.md`, findings 5.1, 5.4, 5.5 and 5.6. Route confinement (5.2) and the vehicle queue (5.3) belong to other lanes.

## What was believed and is now false

**That the rendered signal indication is a presentation detail nobody could check.** It is checkable, and the way to check it is a pose where a head faces the camera. At the hero pose all three scramble heads in frame are edge-on (facing numbers −0.14, −0.92, 0.19 from `control-hardware.json`), so the only lens a viewer sees is the red one protruding past the head's edge; a lens change there is five pixels and reads as "red" against "dark". Standing 45 m east of the crossing at 6 m above the ground puts `scramble:vehicle:3`'s head 16 m away, facing the camera exactly, with its three lenses five pixels across at frame centre. That pose is what makes the fix's evidence legible, and it was found by projecting every mapped head through the intended camera before capturing anything.

**That the previous lane saw a pedestrian signal showing red during the pedestrian green.** It saw a vehicle head. There are 119 mapped controls, 78 of them `traffic_signals`, and **none** carries `traffic_signals=pedestrian` — the only tag `head()` treats as a pedestrian head. So no pedestrian signal lens exists in this city at all, and the 35 pedestrian groups in the network have nothing on screen. The red lens in that crop is the group-2 vehicle head, which is correctly red through the pedestrian stage. The criterion "one signal phase model drives both" is now visible for vehicle approaches and still invisible for pedestrians.

**That the 20 seconds before the renderer attaches were a first-frame or wiring problem.** They are asset loading: the population is built when the network arrives, and the renderer's three human variants (three LODs each, two VAT textures and a GLB per LOD) plus the fleet take ~20 s of wall clock to arrive while the fixed step steps the population at 60 Hz. The measured attach tick was 1,075 and 1,087 in two runs against the report's 1,189-1,238.

**That "all 200 vehicles are placed on the boundary at tick 1" (report 5.4).** `population().vehicles.active` was 18 at the attach tick in my runs and rose to 63-76 over the captured window, and 18 were drawn. The fleet is not all placed at tick 1 in this revision. Not chased: vehicles belong to another lane.

## What moved

| Number | Before | After |
| --- | --- | --- |
| Population tick at which the agent renderer attaches | 1,075 / 1,087 | 6 / 11 / 16 |
| Simulated seconds simulated but undrawn | 19.1 / 19.2 | 0.1 / 0.2 / 0.3 |
| Distinct frame digests over 30 s of phase changes, one pose, fixed cameras | **1 of 16** | **3 of 16** (green run, amber run, red run) |
| Pixels differing between the green and amber frames | 0 of 921,600 | 445 of 921,600, all in x 670-708, y 318-333 |
| `population().rendered.near/medium/far` at tick 4,026, 3,000 pedestrians | one variant's counts | `0/0/3000`, the population's |
| `npm run typecheck` on a harness calling `bridge.population()` | needs a cast | exit 0 without one |

## What was caught by testing rather than by reading

- **The `updateSignals` cache never matched an empty state list** (`if (key === signature && signature !== "")`), so a per-frame call from the app would have rewritten every lens in the city on every frame of a `?agents=`-free run. Found by asking what the app's new frame step would cost in the appearance lane, then fixed by starting `signature` at `undefined`.
- **The instance caps are per variant, not per population.** Fixing the aggregation made a 162-pedestrian fixture report `near: 162` against `POPULATION_LIMITS.nearInstances = 160`. That is the renderer's real behaviour and it is now asserted, because `nearInstances` is recorded as a hypothesis whose judge is exactly this number.
- **A quoting failure in an in-flight edit script applied nothing.** The "before" arm would have been built from the fixed tree and reported a clean before/after that measured nothing. The arm is now verified by grep before its build, because a mutation that does not apply and one that does are indistinguishable from the run that follows.
- **Three test files were written into the primary checkout by mistake** when the file tool was given absolute paths without the worktree prefix. They were moved here and the one edited tracked file was restored; the primary tree was confirmed back to its pre-existing `git status`.

## What a later session could trip over

- The start gate holds the population's clock, not the frame loop: if `createAgentRenderer` rejects, the population stays held and the app reports the error through the bridge. Nothing steps a world that cannot be drawn, which is the intent, but a future reader should not expect the population to advance on a failed renderer load.
- `bridge.signals()` and the lens colours read the same `JunctionAdmissions` snapshot, so a harness frame record and the pixels in that frame describe one moment. If someone later clones the snapshot for the bridge, that property is lost.
- A population-free run still shows every lens red forever, because the signal clock only exists with a population. That is the reviewed 44-frame appearance and was left alone deliberately.
