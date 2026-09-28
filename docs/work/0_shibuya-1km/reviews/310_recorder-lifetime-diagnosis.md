# 310 — VideoFrame lifetime diagnosis

Bound: read-only diagnosis of the failed walking304 attempt and its frozen observer. No browser, server, GPU, test probe, runner or product edit was performed. Candidate303 and every original304 artifact remain unchanged. This identifies shutdown ownership gaps; retained evidence does not identify a particular unclosed VideoFrame or prove a unique browser-internal cause.

The run failed correctly. At 2026-09-28T12:37:07.931Z its only console entry was an error: “A VideoFrame was garbage collected without being closed. Applications should call close() on frames when done with them to prevent stalls.” The final console assertion refused measurementComplete; capture.passed and complete.passed remain false, Node/launcher exit1. There were zero targeted GL_INVALID_OPERATION or WebGL suppression warnings. All15 original PNGs and two clips are retained. All owned contexts, browser/server, processes, port and temporary resources were cleaned; GPU lease is released. None of this converts the failed recorder run into a pass or accepts appearance.

## Actual timing

| Event | UTC | Page time / observation |
| --- | --- | --- |
| Real Start completed | 12:36:37.096 | 25049.7ms |
| Near recorder interval | 12:36:37.8975–40.3433 | 25851.2–28297ms;73 delivered track observations |
| Near retention ended | 12:36:40.472 | 28426ms;errors=[] |
| Medium recorder interval | 12:36:57.1605–58.8097 | 45114.2–46763.4ms;49 delivered track observations |
| Medium retention ended | 12:36:58.907 | 46860.7ms;errors=[] |
| Return camera settled | 12:37:05.668 | 53622.7ms |
| VideoFrame GC error | 12:37:07.931 | Approximately55884.7ms |
| Final non-recording session ended | 12:37:16.727 | 64681ms;no processor/recorder armed |

The warning arrived9.024s after medium retention and27.459s after near retention, while waiting for the next translating first leg. A delayed garbage-collection report cannot assign the leak to the frame, style, or session visible at its timestamp. Both clip retention calls returned. Neither records reader terminal state, cancellation result, or individual frame close receipts.

## Ownership trace

The frozen observer's only explicit VideoFrame producer is MediaStreamTrackProcessor on a cloned canvas capture track (observer.mjs:58–60). PNG copies are canvases; recorder chunks are Blobs; retained trackFrames contain scalar fields and plain observations, not VideoFrame references. Observer304 is byte-identical to292.

| Path | Actual ownership behavior |
| --- | --- |
| Delivered done:false frame | Line60 wraps metadata access/read/compact/push in finally value.close(). A metadata exception still closes that frame. No missing close or retained frame reference is present on this path. |
| Pending read when stopping | stop() sets stopped and stops MediaRecorder, but leaves the processor loop reading. A subsequently fulfilled read still executes the same close finally. There is no Promise.race abandoning a read result in this loop. |
| Normal done:true | Breaks before the close finally. A normally closed default stream returns no chunk; this alone is not evidence of a leaked frame. |
| Read/metadata/close rejection | Loop catch resolves trackDone; after stopped becomes true it records nothing. A read rejection provides no delivered value to close. A close exception would be suppressed during shutdown. The actual run cannot distinguish successful EOF from such a suppressed failure. |
| Normal finish | Lines69–71 stop recorder, await its stop event, stop original/clone tracks, then await reader.cancel() before awaiting trackDone. Cancellation discards unread stream chunks rather than delivering them through value.close(). There is no explicit drain or reader-lock release. |
| Recorder rejection or stop throw | finish has no finally around recorder completion. A rejection/throw before line71 skips track stop, cancellation and trackDone. Not evidenced in this run: both motion sessions returned normally. |
| Cancel rejection | Skips the subsequent trackDone join. Also not recorded as this run's path. |
| Arm failure after processor creation | The schedule attempts finish in its catch, but that shares the same incomplete teardown path. No such arm failure occurred here. |
| Schedule retention timeout/rejection | schedule.mjs:11 deletes the observer in finally, even if finish has not completed. Its20s race does not cancel page-side work. This run did not hit that timeout. |

The concrete uncovered boundary is queued/unread ownership during cancellation, plus cleanup bypass on exceptional exits. It is **not proven that a queued JavaScript VideoFrame existed at either cancellation**. The processor also has a UA-owned queue; it must not be conflated with an application-owned chunk. The [Streams cancellation contract](https://streams.spec.whatwg.org/#readable-stream-cancel) discards queued chunks; the [track-processor draft](https://www.w3.org/TR/mediacapture-transform/#mediastreamtrackprocessor) uses a separate queue and zero stream high-water mark. These explain why cancellation is not an explicit per-frame drain, but do not prove this Chromium build leaked a particular queue entry. The installed browser manifest names Chromium153.0.8010.12/revision1243; its matching implementation source was not available through the read-only web lookup. No browser-bug attribution is claimed.

## Bounded correction proposal, not implemented

Keep recorder output and cadence collection unchanged. For normal completion, stop production, let the existing single read loop close every remaining delivered frame through EOF, join that loop, then release its reader lock; avoid normal-path cancel-before-drain. Keep the existing finite retention deadline and refuse a drain that does not terminate. Put track stopping and reader cleanup in finally so recorder failure cannot bypass them. Retain read/close/cancel failures even after stopped; stopped is not permission to suppress resource failures. Any emergency cancellation remains a failed teardown, not an exemption from the console predicate.

A small actual-consumer control should cover queued and pending-read completion with close-once accounting, metadata throw, recorder rejection, cancel rejection, and a stuck drain that refuses. It establishes the JavaScript contract only. One separately admitted native run must still finish both sessions, retain nonempty clips/track telemetry, complete cleanup, and produce no VideoFrame lifetime error. The existing GL and all-console-error refusals must remain intact. No repeat, suppression, broad recorder framework, or product change is proposed.

## Immutable evidence pins

All paths below are relative to primary artifacts/walking304-capture-20260928/.

| File | SHA-256 |
| --- | --- |
| observer.mjs | 8db2b94825daf43ee3b1578a97b48c5185b09d398f38431f5fc91ec3930e7b35 |
| schedule.mjs | a03a9c2c85704bff70004de9b4e851b09d5cb75af83c5c20bf0e40ea81ddf2fc |
| capture.mjs | 2d6be5c24f8a548c2c4948b4027073dd9dcf49417f218724d24e8f834a31c046 |
| runs/walking304-20260928-1/capture.json | d9ab4d070434afb78ca121cd6bd0b59b321944b6221e5a92a9277bdb650719ac |
| runs/walking304-20260928-1/complete.json | 7fbd1ccd62280647ed8433b552dc18a9a93afcf21f18d89723085e032da4104a |
| runs/walking304-20260928-1/evidence-index.json | 424bf58a9b3e0704e928751a06b0e4cb96af57a62f3ab417ac239390384c1a5f |
| runs/walking304-20260928-1/near-walking/observations.json | dfab022994bc7f878eb34eea3efb58bf7da8f1982f9407f2c93e079bcdc3e3d4 |
| runs/walking304-20260928-1/medium-walking/observations.json | 3b10997cadc9d23616d3d5a5d172629e2c688732160a08351067ef5e93bf40b0 |
| runs/walking304-20260928-1/occlusion-return/observations.json | e8b6b25f4c202988e579e168d7702385f31719c17ae6a8c87682c78a357d25b1 |
