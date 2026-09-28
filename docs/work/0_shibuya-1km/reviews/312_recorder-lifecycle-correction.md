# 312 — Private VideoFrame lifecycle correction

Prepared for independent review only. No browser, server, GPU, product/source/build change or native retry ran. Failed304 and candidate303 remain immutable. The sole runtime change is the copied observer.mjs under this folder; its contract import points back to the frozen304 contract. Camera, phases, Start, styles, PNG/clip budgets, recorder format/rate, HTTP/ownership machinery and console/GL refusals are unchanged. This is not a launch freeze.

The normal completion path now stops the original and cloned tracks, drains the existing single reader through EOF, joins it and releases the lock. It does not cancel a normally completed reader. Metadata and close failures are retained while remaining frames continue through the close finally; read failures remain fatal even after stopped. Recorder rejection is immediately handled into the retained error array, which the unchanged requireClip consumer refuses. Recorder/track/reader cleanup runs despite earlier errors. Arm failure after processor creation still reaches cleanup through the existing schedule catch.

Cleanup has explicit bounded waits: recorder completion4s, reader drain2s, emergency cancel1s and final join1s. A drain that stalls or finishes without EOF records a failure before cancellation is attempted. Cancellation/release/join failures remain failures. A thrown close is not retried or presented as successful; the run refuses. These waits total at most8s before evidence encoding, inside the existing20s session-retention bound. No error exemptions or warning filters were added.

## Actual controls

Node24.12.0 executed the complete old and new exported installers in isolated VM contexts. The browser media endpoints and VideoFrame-like objects are finite fixtures; read, queue, close and cancel semantics come from Node's real ReadableStream. The tests do not extract or duplicate the new cleanup helper. They replace only the4/2/1-second cleanup timers with20ms while retaining and checking the actual configured deadline labels. They do not emulate Chromium's internal processor queue or reproduce its GC warning.

The unchanged304 actual consumer was red: producer stop exposed three queued frames, but cancellation closed only the first delivered frame; the remaining two had zero close calls and the reader lock remained held. The new consumer closed all three exactly once, reached EOF, released the lock and never called normal-path cancel. This is a meaningful API-boundary ownership counterexample, not proof that this exact queue state existed in failed304.

All11 successor controls passed: queued completion; pending-read/asynchronous EOF; metadata throw after stop; close throw after stop with remaining-frame drain; post-stop read rejection; recorder rejection; bounded stuck-drain refusal; cancel rejection; recorder-stop throw plus missing-stop-event timeout; track-stop throw; and reachable arm failure after processor construction. Failure controls assert retained errors and cleanup, not a successful capture verdict. Both changed scripts passed Node syntax checks. The actual controls command exited0 and retained its full per-case close counts, errors, calls and lock state in controls.json.

## Remaining browser assumption

Normal success depends on the installed Chromium MediaStreamTrackProcessor resolving EOF after its track stops within2s. The API's processor-close behavior supports that intended sequence, but these finite controls cannot verify this Window-exposed Chromium implementation or identify the original UA leak. If it does not drain, the candidate must fail and clean up; it must not fall back to a passing cancellation. Independent review and a separately admitted native experiment are required before claiming this recorder problem is resolved. No GPU lease is held.

## Bound inputs and outputs

The unchanged original observer is ../walking304-capture-20260928/observer.mjs, SHA-256 8db2b94825daf43ee3b1578a97b48c5185b09d398f38431f5fc91ec3930e7b35. The unchanged console predicate is ../walking304-capture-20260928/console-warning.mjs, SHA-256 b59d28d49fa1427f2ab970b9b38672902821ae3afc2970f4da1b13b233d80335. The failed run and310 diagnosis pins remain in their original indexes/report. index.json binds this report, the actual delta, successor observer, control code and receipts by raw bytes and SHA-256; it is a small review index, not another dependency inventory or execution certificate.
