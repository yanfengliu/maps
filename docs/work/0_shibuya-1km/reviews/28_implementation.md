# Round 28 — the passage-window fix is right, and it cannot land alone

Owner: coordinator. Base revision `47386ef`. Recording a change that was **not** taken, with the evidence for why, because the reason is the next unit's brief.

## What the lane found, and it is a real defect

`src/network/passages.ts`'s scan for `lastConflictIndex` walks the whole route and keeps the last index naming the same junction. A walking plan that crosses a compound, walks 300 m of sidewalk and crosses the **same** compound again on the way back therefore reads as one passage. Measured: `pedestrian:308` held `junction:walk:1009982019` from tick 4,649 to 21,600 — **282.7 s of lease for an 8.6 m crossing** — and every other ask at that compound was refused for 16,952 consecutive ticks. 34 of the 58 delivered walking passages re-enter their own junction.

The fix ends the window where the visit ends. Passage windows at that junction go from 317.6 m and 240.2 m to **8.6 m each**, releasing 4,571 m of route distance, and the lane measured frozen walkers **922 → 862**, pedestrian crossings **813 → 1719** (+111%), tick cost down (p05 11.280 → 8.033 ms) and `authorityViolations 0`.

The contract supports it. `docs/reference/network-contract.md` says "`lastConflictIndex` is the last occurrence of this compound before the next distinct authority", and a route that leaves and returns meets a *distinct* authority on the second visit.

## Why it was not taken

**`check-boundaries` went red, and it was right.** The narrower window makes `lastConflictIndex + 1` land on another section of the same junction, and the guard immediately below the scan then rejects the passage:

```
Error: Route passage for junction:walk:1464521700:0:0:ground0 needs an outside exit
section or a true AOI terminal with explicit boundary retirement.
```

That guard requires a contiguous section after the last conflict occurrence that is not itself governed. The **broader window was silently satisfying it with the 300 m between two crossings** — the lane says exactly this in its own report, and it is the same sentence that justified the fix. So the guard was never checking what it says; it was accepting a route whose only outside section is the gap before it comes back.

A first attempt to take the lane's diff also exposed a second, smaller error in it: the lane's loop starts at `entryIndex` where the shipped scan starts at `entryIndex + 1`, so a walk that *begins* on a junction counts its own entry as a conflict occurrence. `check-boundaries` asserts the opposite. That one is a one-line correction and is noted here so the next attempt does not repeat it.

## What the next unit has to do

Two things together, and neither alone:

1. Close the passage window at the end of its visit, as the lane did.
2. Answer the exit-section requirement honestly for a route that re-enters the junction — either by requiring the route to carry a genuine ungoverned section after the visit, by making the route planner produce bounded one-visit passages instead of round trips that return, or by stating that such a route is not admissible and refusing it by name at planning time rather than at passage build.

Then both offline instruments must pass on the changed tree, not only the unit tests: `node tools/network/check-admission.ts` and `node tools/network/check-boundaries.ts`. They are the frozen contract's own instruments and they are what caught this.

## Also established, and it stops a whole line of work

The lane measured the crowd rather than reasoning about it, at t = 360 s: the **mean walker has 57 neighbours within 2 m**, **2,444 of 3,000 walkers have 8 or more within 2 m** — against ORCA's own 8-neighbour cap — and mean walker speed is **0.298 m/s against a 1.1 m/s cadence**. Admission cannot fix a crowd that is already overlapping: the residual 862 frozen walkers are crowded rather than gated, and one of them, `pedestrian:308` after the fix, stands capped at nothing and moving at 0.0968 m/s. Any further throughput work that refuses more bodies at compounds is aimed at the wrong mechanism, and one such attempt was tried and refuted (bounding the signal batch moved nothing and lost 41 completions).

The 288 s figure a previous lane attributed to signal clearance is also corrected: all four named compounds are `controlKind: "reservation"` with zero vehicle groups, so no signal stage can refuse them. The authored 116 s cycle is real and drains — the scramble measured at exactly 116 s on the real controller, pedestrians opening at 88, 204 and 320.

## Disposition

The throughput change is **not in the deliverable**. Its two judged numbers that moved are recorded; the two that did not move (`completed` 1106 → 1050, longest wait unchanged at 337.7 s) are recorded as not met by the lane itself. The window defect stands open and is the next unit's subject, with the instrument that caught it named.
