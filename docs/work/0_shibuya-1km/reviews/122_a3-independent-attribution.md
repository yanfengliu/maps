# A3 independent capture-attribution review

Bound: two noon overhead moving-bracket native PNGs and their two nearby encoded PNG witnesses, personally viewed one at a time at original 1280x720 size. Exactly four image calls; observations were written immediately to `native-inspection-ledger.jsonl`. All four file hashes matched before and after inspection. No video playback, frame extraction, browser, GPU run, product change or new gate was performed.

## Verdict

**The proposed disposition is justified:** preserve and label the recorded colour artifacts, exclude these recordings from colour-fidelity judgment, accept the bounded native-background appearance demonstrated here, and make no product-rendering repair on this evidence.

Call this a **recorded-path limitation with unresolved stage attribution**. The evidence does not prove that VP8 encoding, JPEG screencast, decoding or any particular compositor stage caused it. Nor does it establish that every rendered frame is free of the defect. It is sufficient to stop treating the encoded background blocks as evidence requiring a product material or renderer change.

Both native witnesses have a visually even charcoal-blue background around the model. Their nearby encoded witnesses show broad reddish-grey regions on the left and distinct blue or green-blue regions above the right side and beside the lower-left city edge. These are conspicuous spatial colour differences, reproduced in both styles. The city and UI remain recognizable, but framing and fine pixels differ: this is not an exact same-frame comparison.

No material finding blocks that disposition. The recorded-quality finding remains disclosed; the sampled native result does not close full motion, temporal flicker, full-video appearance, fine stability or whole-scene acceptance.

## Timing and movement verification

I independently recomputed frame advance and camera-position displacement from the bound manifest's before/after observations, and recomputed the approximate native brackets from the Node screenshot times and supplied video creation timestamp. These match the comparison record. Temporal accumulation is false before and after both native brackets.

| Witness | Frame advance | Position displacement | Estimated native bracket, video seconds | Supplied encoded PTS |
| --- | --- | --- | --- | --- |
| Satellite drag 15 | 6 | 4.497431748087156 m | 26.103-26.204 | 26.16 s |
| Cartographic drag 15 | 7 | 5.051641201421565 m | 43.703-43.821 | 43.80 s |

The 37 ms creation-time/page-anchor difference also recomputes. Both supplied PTS values lie inside the estimated brackets, but unmeasured recorder/compositor lag can exceed those brackets. PTS was checked against the saved comparison evidence, not independently decoded again. Movement across each bracket supports the moving-witness claim; it does not identify the exact rendered frame returned by the screenshot. The saved metadata log describes the recording as 1280x720 VP8 at 25 fps; that is not app-rendering performance.

The comparison record's five background samples are all RGB (50,57,68) in each selected native image. Encoded samples include (58,55,59) at (20,20), with (45,58,75) at (850,80) in Cartographic and (50,58,63) there in Satellite. I read those supplied pixel measurements and confirmed the broad spatial difference visually; I did not independently remeasure PNG pixels. The reported 14/14 native five-point result is supporting worker evidence, not fourteen personal image inspections.

## Exact inspected files

Paths below are relative to `artifacts/a1-motion-capture-check-20260927/`.

| File | SHA-256 |
| --- | --- |
| `run-01/noon-cartographic-overhead-drag-15.png` | `b99a8c95496100a8a522e67777d764ed55528066b27fe8ced9c8bae465127c5b` |
| `comparison/noon-cartographic-overhead-drag-15-encoded.png` | `67786139aac7283b6bd17ef08f5b75f457de83680d284be63354c50fd5892301` |
| `run-01/noon-satellite-overhead-drag-15.png` | `a58a6bf2bbb28aceff1abc55d634332fd47ae21a612572fab93f3f74c7c2bb68` |
| `comparison/noon-satellite-overhead-drag-15-encoded.png` | `be43677b6420447301817e3c5aae4fd96c4d261a23df4dc1bd2aaba012335f44` |

Independently rehashed evidence: `bound-complete.json` SHA-256 `6153efd32c2d605c957994b79a1b0666720b35b95d0eec3b2f7802263bc15c76`; manifest `d040662978cc3163647568096dbb57f1fa3861cd92ea0c67069e6c8ea1eaff0f`; comparison Markdown `87497041880d53f7265eae2cbf4625302cde63859d096e1dc5e14226c8efe842`; pixel comparison `bcec031f52593cf29bc21ddd83ea1af0a20afad4a5a5797b50e62f0246b4e980`; saved WebM `32bf79861176a7cb019862a846c3702439fad3da2b81e1127facc5c7d54b7d8a`. Rehashing the WebM does not imply playback. Full source/build/scene/hardware binding and capture-owner cleanup remain the capture owner's evidence.

Only `artifacts/a3-independent-review-20260927/` was written. The retained verification script corrects an initial local timestamp-parsing mistake by preserving exact ISO text, including timezone and milliseconds; final arithmetic matches the records. A process inventory was attempted but denied access. This reviewer launched no browser, GUI, server or decoder process requiring cleanup. Preserve these small artifacts for the active integration handoff; the integration owner may promote this authored review to permanent work docs.
