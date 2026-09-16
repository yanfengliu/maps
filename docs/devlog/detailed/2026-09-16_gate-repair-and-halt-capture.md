# 2026-09-16 — the lifecycle gate's unreachable red path, and the halt capture

Worktree `artifacts/gate-repair/wt`, branch `worker/gate-repair`, off `86b5a70`. Not merged.

## What moved

**The lifecycle gate could not fail on the path its vehicles retire through.** `populationInvariants.leakRetiredBody` guarded `retireSlot` in `finishVehicle` and in `retirePedestrian`; the boundary retirement path in `lifecycle()` called it unguarded. Every vehicle retirement the fixture reaches goes through that envelope — `retiredInPlace` is 0 in every run taken, so `finishVehicle` never runs a retirement at all.

Measured, with a census probe driving the shipped population at 40 vehicles and no pedestrians: 24 vehicle retirements through the envelope in a 4,800-tick window with the mutation on, identical to the control's 24, no failure at any tick. The mutation was a no-op. The gate was green, and on `main` it was green for a reason unrelated to vehicles: with 60 pedestrians in the fixture a walker leaks at tick 1330 first, and the message it produces names no body — `71 of 72 slots agree between a present body and a planned route`.

**The obvious fix does not work.** The reachability lane's change — `if (!populationInvariants.leakRetiredBody) retireSlot(...)` on the boundary path — is inert. `JunctionAdmissions.retireBoundary` clears the slot's active byte itself at `src/network/admissions.ts:161`, so that call is already a no-op on the shipped path. Measured with only that guard in place: the same 9 and 24 retirements, no failure, no leak.

**What does work is two changes, and the second one is not obvious either.** The mutation restores the presence the authority just cleared (`table.poses.vehicles.active[slot] = 1`), and the boundary path stops pushing the retired slot onto `planQueue`. Without the second change the leak heals in the tick it is made: `lifecycle()` drains its plan queue in the same phase it retires, so the slot is re-planned and the conservation reading sees a consistent population.

**The gate's red case now covers the path.** `test/population-lifecycle.test.ts` gained a third case that drops the pedestrians — leaving the boundary envelope as the only vehicle retirement path — turns the mutation on and requires the failure to name the retired vehicle by slot. Reverting the seam makes it fail in 6.6 s with `the leak mutation retired a vehicle through the boundary envelope and nothing noticed: expected null not to be null`, while the two cases above it stay green. That green pair is the finding: the old red case could not see this path.

**The halt capture landed.** Taken from `artifacts/reachability/wt/src/agents/population/tick.ts`, without that lane's diagnostics, planner change or vehicle-freeze work: an integrating body whose halt is within 1.5 m and whose speed is at most 1.5 m/s is moved exactly onto that halt and reported at speed 0, instead of creeping toward it on IDM's braking curve.

| At 3,000 pedestrians, 200 vehicles, 3,600 ticks | before | after |
| --- | ---: | ---: |
| Vehicle requests the authority was handed | 28,035 | 147,420 |
| Vehicle slots that ever asked (of 200) | 55 | 101 |
| Requests built by slot 20 | 0 | 2,929 |
| Active at the end that never asked once | 42 of 65 | 2 of 84 |
| Active and motionless for the last 10 s | 12 | 75 |
| Median displacement over the last 10 s, m | 0.0485 | 0 |
| Digest | `3b4b7a34…` | `9bd9d16b…` |

The 12 bodies in the before column are active, have never asked the authority at all, and have moved less than a centimetre in ten simulated seconds. The after column's 75 are parked at their own stop lines with requests outstanding, which is what lawful waiting looks like. The before column's median body is still *moving* by 4.85 mm/s at the end of the run, because IDM's equilibrium against a stationary halt is a relative speed of zero and it never quite arrives.

## What was believed and is now false

**"Guarding the boundary retirement path" is a real change.** It is not. The authority owns that write, and the population's `retireSlot` there is dead code on the shipped path — which is worth knowing on its own, because it means the two ownerships overlap silently.

**A green lifecycle gate meant lifecycle conservation was checked.** It meant a walker leaked when asked to. The gate could not distinguish "the mutation reached the path" from "the mutation reached a different path", and it reported the first while doing the second.

**The reachability report's digest is reproducible from the halt capture alone.** Their `9bd9d16babf29eebd8c7603d8f3fd551c983420af18bff9b490fd18f00c5df4f` is exactly what this tree prints, and this tree contains no diagnostics from that lane. That is independent evidence the diagnostics never moved a body, and that the halt capture is the whole of their motion change.

## What this does not establish

The halt capture moves more bodies into the same junctions: grants fall from 14,067 to 9,884 and vehicle completions from 54 to 33 over the same 3,600 ticks, while active vehicles rise from 65 to 84. Whether the network carries more or less traffic with bodies that actually reach their stop lines is unmeasured — this change was taken to fix arrival, not throughput, and the throughput question needs its own bound.

`retiredInPlace` remains 0 and the `finishVehicle` path remains unreached by any fixture, so its leak guard is still unproven in the same way the boundary one was.

The 3,000-pedestrian acceptance run reads conservation from `status()` with no mutation, so nothing there proves the mutation could reach the paths it exercises.
