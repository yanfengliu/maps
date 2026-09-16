# 2026-09-15 — the gate was slow because its budget counted the wrong thing

Owner directive this session: anything slow on the critical path is a defect to identify and fix, not a cost to schedule around. Keep only the slowness a verdict depends on. This is what that directive found here.

## What was believed

That `npm run visual` is a three-hour command and that three hours is the price of the 44-frame verdict. The budget was attributed to the renderer: SwiftShader shades every fragment on the CPU, the scene carries 551.9 Mpx of source texture, and the frames are captured on software by design so that a pixel set cannot inherit a review written on another renderer. Every part of that is true, and none of it was the defect.

## What is false

**The settle budget is denominated in wall-clock milliseconds, but every input to the predicate that consumes it is denominated in frames.** Measured in `artifacts/gate-timing/REPORT.md`, same predicate, same pose, same build: 12 frames and 200 ms on the RTX 4090 over D3D11, against 58 frames and 134.6 s on SwiftShader. One whole crossing pose costs 3,343 ms on hardware and 570,572 ms on software, a factor of 171. Frame interval p50 is 16.7 ms hardware and 2,416 ms software — and the software lane spreads 16.6 ms to 6,150 ms *within a single run*. A fixed 300-second deadline cannot track a per-frame cost that moves 370-fold.

That mismatch failed a real gate run tonight, after 1 h 46 m:

```
Error: The camera never settled for capture after 301660 ms: 71 frames advanced,
last world movement 0.34162708595092023 m, 0 quiet intervals.
```

Seventy-one frames advanced, so the renderer was working; the predicate simply could not be satisfied inside a wall-clock deadline on a loaded host. The message cannot tell a reader whether the renderer stalled or the budget expired, which is the difference between a broken build and a busy machine.

## What was measured, term by term

- **The settle wait is the largest fixable term.** On hardware the same predicate needs 12 frames for a zoom correction, 76 for an orbit correction and 13 for a post-drag settle: 200 ms to 1.3 s. On SwiftShader at 2.9 s/frame those become 35 s to 220 s.
- **A screenshot is not 30 s of PNG encoding.** It is 71.7 s on SwiftShader, and 25 frames are drawn inside it at ~2.9 s each. The application keeps rendering while the capture waits, so the comment in the specification understates it by about 2×.
- **A capture event costs 220 s median in the sweep** (11 intervals, min 172.4 s, max 303.7 s), and a style switch costs 489 s because it re-applies the style consumers and refines the tileset again.
- **TAA never engaged before any shutter.** All eight hero frames of the completed run report `taaAccumulating: false, taaSamples: 0`, reproduced on both arms. `src/render/post.ts` is designed so that a settled frame is *cheaper* — `TAARenderPass` stops drawing the scene at 32 samples — and the lane never reaches that state, so every captured frame redraws the scene with GTAO and bloom on top. This is named rather than costed, because the frozen bridge exposes no observation that prices it and the diagnosis lane correctly refused to add one.

## Why the 4090 was not already in use, and what changes

The software lane exists for one reason: the 44 frames are compared across machines, so a pixel set captured on one renderer cannot inherit a review written for another. That argument covers **the scored verdict**. It does not cover iteration, and treating it as though it did is what turned every check into a three-hour check.

So the answer is not to move the verdict. It is to stop paying the verdict price for work that is not a verdict:

1. **A hardware iteration lane** at identical settings, in its own ignored directory, that never feeds `complete.json` and can never be mistaken for verdict evidence. Measured prize: about three minutes for a 44-frame pass against three hours.
2. **A budget that tracks the work**, denominate in the frames or quiet intervals the predicate actually consumes, with a wall-clock backstop for a genuinely stuck renderer, and a message that says which of the two failed.
3. **The verdict set runs less often.** With the commit-eagerness rule's byte-identity transfer, most landings need no verdict at all, and the lane that does need one is now the only three-hour step.

Rejected, and recorded as rejected rather than ranked: capturing the verdict set on hardware, lowering its resolution, or disabling the post passes. Each strands the entire 44-frame review.

## The rule this leaves

`docs/policies/local-rules.md` gains the split the diagnosis justifies: a fast iteration lane whose result is never evidence, and the slow verdict lane that is. The separation is the whole point — the fast lane earns its speed by being unquotable, and any future change that lets its frames be presented as a verdict has broken the only property that makes the slow lane worth running.

The same reasoning applies to the frame-rate claim Phase 9 owes. A hardware performance lane is needed and it is a *third* lane: it needs `EXT_disjoint_timer_query_webgl2`, which both arms advertise, because `requestAnimationFrame` intervals on hardware are vsync-clamped and cannot report cost — 60.04 fps measured, p50 16.7 ms, max 16.8 ms over 201 frames, which is a statement about vsync and not about the scene.
