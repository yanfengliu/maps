# 2026-09-16 — the frame is not the problem, the simulation is

Phase 9 asked for 60 fps at 1920x1080 with 3,000 animated pedestrians and 200 vehicles. The measurement says the renderer has about sixteen times the headroom it needs and the CPU simulation is what misses, and the shape of the failure is not a slow frame but a catch-up loop.

## What was measured

At 1920x1080 with 3,000 pedestrians drawn, the camera driven by synthesised pointer and wheel input: frame cost **p50 1.100 ms, p95 2.100 ms**, pooled p50 0.700 / p95 3.600 / max 8.600 ms over 4,754 frames. That is 6.6% of the 16.667 ms interval at the median and 12.6% at p95, and no frame in the run reached half the interval. Hiding the entire agent group moves the frame by 0.1 ms in the *cheaper* direction, inside the noise; hiding the city does not move it either. The frame is the post chain's full-screen passes over 470 MB of render targets.

The population curve is flat: 1,000 pedestrians 1.200 ms, 2,000 1.300, 3,000 1.100, 4,000 0.900, with instance slots going from 8,171 to 26,163. So **3,000 is not the largest population that fits and at 1080p on this GPU there is no largest population** — the population is not the term that consumes the interval.

The term that is: the whole-app interval at the acceptance state measured **98.0 ms**, about 10 fps, of which the simulation spends **69.2 ms a frame**, pinned at the render loop's five-step catch-up cap. The fixed step costs about 12.8 ms headless, so it sits near the interval; once it does, the loop tries to catch up, spends several steps inside one frame, and the frame time becomes a multiple of the step. This is a feedback loop, and a marginal improvement to the step does not escape it — the step has to come down far enough that catch-up cannot engage.

Both figures were taken under heavy process load, so they are contended measurements rather than frame rates. The 98 ms is six times the interval, so it is not vsync.

## Two instruments that lie, and one existing claim that was true and useless

**`EXT_disjoint_timer_query_webgl2` is advertised on this machine and does not work.** `gl.createQuery()` returns `INVALID_ENUM` (1280) on all three ANGLE backends in a bare context. In the app's own context the query is accepted and resolves thousands of times, and **every result is 0 ms** while the frame interval is 35 ms. Any lane that checks `getExtension() !== null`, or that a query resolved, reports 0 ms per frame as a measurement. The instrument now treats a query as usable only when a resolved duration is non-zero. The perf-ceiling report's statement that the extension "is advertised on both renderers" is true and is not evidence that it works — the same species as the stale gate header this session already had to correct.

**A population curve that measured an empty scene.** The first attempt reported cost *falling* with population, from 1.100 ms at 1,000 down to 0.100 ms at 6,000, because the scene was nearly empty: draws p50 was 1 and instances 0. All three existing population gates passed while this was happening, because **the renderer draws what has spawned rather than what was requested**. The gate now waits on `rendered.pedestrians`, and the stale file is kept as the evidence.

## What this changes about the plan

The performance criterion is not a renderer problem and should not be worked as one. Moving the per-frame instance composition to the GPU, which the perf report proposed as the place the "anything on the GPU" direction pays, is **not worth doing for frame rate**: it costs 0 ms at the median and 14.1 ms at p95 of main-thread time, and it is invisible in the frame.

What the criterion now needs is the fixed step far below the interval, and the named levers are the allocation in `orcaHalfPlane` and `linearProgram` — one `Line` object per neighbour per call, roughly 24,000 a tick — and the fact that after the ORCA region-selection fix nearly all 3,000 walkers run the solver every tick where before most skipped it.

Two population facts sit beside this and are not performance questions. The app requests 200 vehicles and draws **59**, because 2,859 bus spawns are refused: no AOI entry portal's junction sections are long enough for the bus class's 5.541 m footprint radius, so a third of the fleet's slots are dead demand. And a `hasReceivingSpace` check that decides capacity is vacuous for vehicles, because 59 active vehicles hold 59 distinct route objects and its identity test matches nobody.
