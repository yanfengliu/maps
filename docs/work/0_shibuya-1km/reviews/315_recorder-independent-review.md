# Independent recorder review315

ACCEPT-for-native-candidate, with no blocking source finding in the inspected312 observer. This accepts a bounded experiment, not a repaired recorder, a launch seal or a native success. Failed304 and its VideoFrameGC error remain failed;310's trigger remains unproved. Root must separately bind the successor into the executable runner and explicitly admit any native attempt. The existing304 schedule still imports its original observer.

## Inspected ownership and failures

observer.mjs:62 has one sequential reader. Every value actually returned by read reaches one close attempt in finally, even when metadata throws; a close failure is retained and remaining reads continue. Read rejection is retained even after stopped. Lines66/72 handle recorder rejection immediately into errors and still enter track cleanup. Arm failures after processor creation remain reachable by304 schedule's catch/finish path; a recorder that never starts does not wait forever for a stop event.

Lines71-80 stop recording, wait at most4s, stop both original and cloned tracks, then await the existing consumer and EOF at most2s. Normal completion never cancels the reader. Missing EOF, read failure or timeout is recorded before emergency cancellation. Cancel and final join each have1s limits, release errors are retained, and final reader completion is joined. A failed cancel or thrown close is never relabelled as cleanup success. The8s sequential ceiling is inside the existing20s retention bound; the finite controls accelerate timers and do not prove native elapsed time.

The actual contract still refuses raw.errors, remaining targets, wrong dimensions and invalid clip bounds. The copied observer imports the unchanged304 contract. The existing capture retains all console messages, rejects every error-level entry, retains page errors and the observed GL_INVALID_OPERATION/suppression warnings, and makes final passed conditional on zero errors. No predicate, warning exception, frame/contact limit, camera, phase, clip budget or error filter changed in this patch.

## Meaning and limit of the negative control

I reran byte-identical check.mjs and observer.mjs copies in this separate review directory using Node24.19.0. The actual exported old installer failed the ownership condition with close counts1,0,0 and a held reader lock. The actual successor passed all11 controls; normal completion gave1,1,1, EOF, an unlocked stream and no cancellation. Failure controls retained their errors. Receipt: controls.json, SHA-25684bcd70417664ad32e0208d8ec078ea1a1fd848a589d5e9fcc8f3186575be3ac. The author's original run used Node24.12.0; this is an independent finite rerun, not a browser reproduction.

The negative control is meaningful for a generic ReadableStream consumer but is not a faithful model of the production processor queue. check.mjs:16-23 enqueues three JS frame-like objects directly into the stream when clone.stop runs. The real processor uses a native frame queue, and its readable is configured with highWaterMark0. Chromium defaults video buffering to1 and exposes frames in response to pending reads. Therefore the fixture's two stranded JS chunks are not established as reachable in this installed one-reader pipeline. Retain the old-red/new-green result with this narrower bound; do not report it as the cause of304.

## Track stop and EOF assumption

The W3C draft connects an ended input track to processorClose, closes the readable and clears the processor queue. It does not require delivering every internally queued frame to the application before EOF. [MediaStreamTrackProcessor algorithms](https://www.w3.org/TR/mediacapture-transform/#dom-mediastreamtrackprocessor-readable).

Chromium main supports the intended stop-to-EOF path: MediaStreamTrackImpl::stopTrack sets ended state; state change notifies observers; the processor's UnderlyingSourceCloser invokes CloseSources. [Track stop](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/modules/mediastream/media_stream_track_impl.cc), [processor observer](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/modules/breakout_box/media_stream_track_processor.cc).

FrameQueueUnderlyingSource::Close stops delivery, closes the controller and destroys/releases its native queue. Its frame delivery also has separately scheduled Blink-frame enqueue work. Application EOF plus joining the JS consumer therefore proves less than ownership of all native or scheduled UA frames; this review does not diagnose that work as the original leak. [Chromium frame queue implementation](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/modules/breakout_box/frame_queue_underlying_source.cc).

These are current upstream sources, not verified source for the exact installed binary. The frozen local browser is chromium1243; local Playwright metadata names153.0.8010.12. Fetches for the exact153.0.8010.12 source tag were unavailable. No browser was launched. The2s EOF behavior and absence of the GC error in this Window-exposed implementation still need the separately admitted native experiment. A drain failure must remain a failed run, as the candidate currently enforces.

## Exact pins and resources

All312 index descriptors matched their actual files. Inspected index SHA-2563c71cabf8ebbc35c83f24b26ebfe39c29e4a7480fb6eaad56696a1f07fba4951; successor observer d45374af172feb8a8a3333c23c71e2e2ca6c7a105796617bdea283d96df769a5; check7e8074dbfaa1b6359752b73744621eb95cb6fed7933ab3bfe326ffcaf4df21a2; controls2de8aed1133876654e8e2f3af60febf85cb30319b92e6caf760fbc155c18366c; delta8bed4107ae45d513d8074cb76c8a607228c00b933a8797fc3404b47e4bf0089d; author report e2e1a5f3035e7af0ab44a116b911c4e479e0b4aaff5f8e8cb6744593df4afb17. Original observer8db2b94825daf43ee3b1578a97b48c5185b09d398f38431f5fc91ec3930e7b35 and console predicate b59d28d49fa1427f2ab970b9b38672902821ae3afc2970f4da1b13b233d80335 remain unchanged.

Only this ignored review folder was written. No product/build, browser/server/GPU, default startup, installer or history change occurred. The finite Node command completed normally and created no browser or worker processes. Temporary byte-identical execution copies were removed after their hashes and receipts were verified; originals remain read-only in312. REPORT.md and controls.json are intentionally retained for the open handoff. Completed313 evidence remains untouched.
