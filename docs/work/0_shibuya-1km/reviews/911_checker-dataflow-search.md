# 911 — Live bridge projection route

Source-only independent branch, 2026-10-12 local. Assignment base is PRIMARY main `815d9c3d792eb5d548c1cec323144342b284419b`; the six866 changes and both retained866 builds remain frozen. No product, data, Git, browser, GPU, port, build or gate was changed or run. The fixed reproduction and disqualifiers are [909](../909_checker-search.md). Selected input digests and the arithmetic receipt are retained in `artifacts/checker911/receipt.json`.

**Result: BLOCKED under the fixed source/build contract.** A new live projection on the frozen bridge is a concrete way to remove redundant API work without caching dynamic state. The retained866 builds do not provide that API. Installing it changes the observed bundle and source population, which909 refuses. Source inspection proves the interface gap, not a speed gain, the impossibility of a faster private observer, or invalidity of0.25ms.

## What the raw records establish

Current903 `run-diagnostic-7fd509217fdd787fec648c679dbd73e4/A1-observer.json` retains30 inert and30 tracked rows, no drain rows, and no observer errors. All30 tracked rows contain27 groups and348 draws. Nearest-rank statistics over the tracked rows give hook+poll mean0.720000013ms, p951.300000191ms and max1.500000238ms. The recorded before/read mean is0.133333325ms, GL observation mean0.133333341ms, return/read/finalize mean0.4ms and poll mean0.053333346ms. Return/read/finalize p95 is0.599999905ms. These spans include multiple operations and quantized clocks; they do not identify an individual getter's cost or establish a lower bound on an optimized implementation.

The independent earlier raw897 record retains the same30 tracked rows,27 groups and348 draws per row. Its hook+poll mean is0.773333367ms and p951.200000286ms. It supplies another failed control, not a candidate timing or a causal experiment. Current903 `run.json` retains130 request/body witnesses, `httpBodyIdentityVerified: true`, `unchanged: true`, completed diagnostics, the original overhead assertion failure and successful caller cleanup fields. Qualification remains false. The889 final seal names the assigned PRIMARY revision and does not grant runtime admission.

## Actual dependency boundary

In903 `readFrame()`, `h.status()` constructs the full `RenderStatus`, but only `frameCount` reaches the caller. `bridge.status()` asks for readiness and source error, gets the actual renderer context, reads both buffer dimensions and queries the actual renderer string. None of those other leading values is consumed. The trailing `read()` consumes all of them and must keep doing so.

The trailing guard consumes live status, five post scalars, the complete camera pose, style id, time preset and four generic population counts. `h.population()` first calls the actual agent source and then `structuredClone`s its complete status. The source status can throw on conservation failure when a population exists; bypassing that source reader would suppress a failure path. The singleton actor is a different source: `localWalk()` is read at the before/after boundaries, including its exact identity, refusal, started state and advancing draw serial. Tile leaf sets and refinement identity are also boundary checks. Their actual sources and timing stay intact.

Neither `__frameBudgetProbe` nor a render counter is an alternate complete guard API. The existing probe publishes frame timestamps, tick costs, installed state and failure. It does not publish the current readiness, context, renderer, post, pose, generic population or singleton identity. The bridge closes over `BridgeSources`, exposes no source object and is frozen. A private wrapper can project an existing getter's returned object, but it cannot avoid that getter's upstream construction. Publishing raw source references or debugger closure access would also abandon the bridge's structural observation boundary and is not this route.

## Concrete bounded design

Add two observation functions to `HarnessBridge` and its successful/failed installers; do not expose the underlying objects. `frame()` returns a fresh `{ frameCount: sources.loop.frameCount }`. `costFrame()` returns the exact currently consumed trailing tuple, computed live in the call. Its essential body is:

```ts
const s = bridge.status(); // Actual live readiness, source failure, context and renderer.
const p = sources.post();
const n = sources.population(); // Keep source conservation checks and thrown failures.
return {
  epoch: performance.timeOrigin, frame: s.frameCount,
  ready: s.ready, error: s.error || p.error, lost: s.contextLost,
  renderer: s.glRenderer,
  dimensions: [s.drawingBufferWidth, s.drawingBufferHeight],
  post: { active: p.active, level: p.taaSampleLevel,
    accumulating: p.taaAccumulating, samples: p.taaSamples,
    buffers: p.bufferBytes },
  camera: bridge.camera(), style: sources.style().id,
  time: sources.lighting().preset,
  population: [n.pedestrians.requested, n.pedestrians.active,
    n.vehicles.requested, n.vehicles.active],
};
```

The903 reader would call `h.frame()` at its existing leading measured boundary and `h.costFrame()` at its existing trailing measured boundary. Frozen-bridge admission remains at both reads. `read(true)` remains unchanged for full scene boundaries. No read or allocation moves beyond the existing hook spans, and polling/drain accounting, all GL query and shader observations, every original group record and all summary assertions remain unchanged. The guaranteed source-level change is one fewer full status construction per callback and no whole-population bridge clone for the trailing projection. Post, lighting, actual status and population source readers still run. No elapsed saving follows from that operation count.

This is a read-only source API change rather than another rewrite of the private GL ledger. It would need a failed-installer implementation that reports unavailable state, a type declaration and a class check comparing the live projection to the existing readers, including source exceptions. It is not implementable by decorating the retained frozen bridge: `Object.freeze(bridge)` prevents adding these methods, and the bridge's closed-over sources are unavailable through its published members.

## Score and false-pass audit

The design retains the0.25ms bound, all30 control rows and180 measurement rows, every actual completion/drain interval, raw GPU query semantics, source/body/build pins, dynamic frame/pose/status/context/hardware/post/population guards, boundary actor/scene checks and owned cleanup. It cannot currently pass909's unchanged source/build identity requirement. Therefore it has no benchmark score and is not a performance-qualified candidate.

- **Changed assertion or benchmark:** neither budget nor denominator changes. A new bundle silently substituted for retained866 would falsely pass source identity; refuse it. A source/build-contract correction needs actual requirement-preserving evidence and independent review before any rescoring.
- **Dropped/stale guard:** call every live source above per trailing row; cache no dynamic value. Keep generic population source exceptions, exact singleton and tile boundaries, actual hardware reads and frozen bridge checks. Reject an API that returns a remembered tuple.
- **Measured less or relocated work:** both API calls, all wrapper bookkeeping, original GL observation and all poll work stay in the measured hooks/intervals. A new opt-in module computing the tuple outside those spans would falsely pass and is excluded.
- **One tuned input:** the raw45m control only motivates investigation. Any admitted API later needs the fixed45m control, held-out bridge fault cases, all17 windows and paired appearance/full gate acceptance; no source arithmetic substitutes for them.
- **Quiet failure, late completion or cleanup:** retain thrown source failures, query errors/deadlines, full late poll ownership and current cleanup refusals. Do not turn unavailable methods into zero cost or an empty result.
- **Warm service, retries and total cost:** reuse903's warm-service bound. This branch ran no browser or retry. The cost of investigation and later source integration/review belongs to the search accounting; getter counts are not a savings claim.

## Exact remaining gap

The new API route stops at the current retained build, before timing. Its missing contract cannot be filled while preserving that build's bytes. Reopen it only after a reviewed source/build-contract decision with preserved old controls; then its first discriminator is actual complete hook+poll p95 at the unchanged0.25ms bound, including all drain intervals. Without such a decision, the remaining task is still a faster observation mechanism using the existing frozen API, and this branch supplies no claim that that mechanism exists or cannot exist. No further API implementation or search loop was dispatched.
