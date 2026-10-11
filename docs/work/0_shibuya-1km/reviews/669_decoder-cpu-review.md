# 669 — Decoder CPU obligation review

Bound: independent read-only inspection of actual667 fixture/results on product `d210bc6` and documentation `899a997`. This review did not rerun the fixture, import its executable module, launch native/GPU/browser/build/gate work, or change shared inputs. Only this report was authored.

**ACCEPT the literal-host result; no material finding within that bound.** The fixture imports actual installed FileLoader and LoadingManager and calls inherited Loader.loadAsync. It replaces fetch with a three-byte Node Response/ReadableStream adapter and supplies a missing ProgressEvent adapter. It does not invoke builtin network fetch or use real decoder bytes. The installed request's composite signal is exercised through the classes' own abort methods; simulated signal-to-reader failure is supplied by the host adapter.

Actual retained results contain four successful normal/after-header loader-cancel/manager-cancel/reader-failure cases. Error paths reject the consumer with the exact reason identity while manager completion also fires. The declared negative removes only instance callback forwarding to loadAsync's reject; loader error and manager completion remain observed, consumer stays pending, and the intended assertion refuses after600 ms. Thus manager completion alone cannot satisfy the consumer obligation. Events are saved before assertions. All four current source hashes and fixture/result provenance match.

The recorded single CPU child exited0; fixture elapsed644.886 ms, globals restored in finally, and no TEMP, browser/server or persistent child was needed. This establishes the tested Node stream/callback behavior, not Chromium cancellation semantics, historical661 causality, actual decoder consumption or a supported product fix. The next missing fact is the failing browser request's actual loader/decoder consumer terminal outcome, linked to its abort-signal/caller identity. This review authorizes no follow-on or filtering. Original red evidence remains separate. All reader leases are released; no owned resource remains.

## Exact inspected pins

Fixture/results are under ignored `artifacts/decoder667/`; source files are installed PRIMARY `node_modules/three/src/loaders/`.

| Input | SHA-256 |
| --- | --- |
| literal-fixture.mjs | 33321c473b985ed74cc58cac8bc0377a0d542bdca3375a14cbb8f9ac2a2f97c7 |
| results.json | 9b7dc35ded080e9014006fce5ca16eb30f69e923b7647ce0d326ee37d3463854 |
| 667_decoder-literal-cancellation.md | 1b00669390556608a3322cd63425e6af406c9002520a0644979488a372db9a95 |
| artifacts/decoder663/relevant-pins.json | 4291fb904130c198af3b09427016dab6bc5b2531f7626f451a38add61cc2de11 |
| FileLoader.js | 848679ec402f63cfa73ee7d4ba23b250e2a460be41d1f7160dcc2ec0262f0336 |
| LoadingManager.js | a59b83415230e814f7b68177dae75fdb511611d60ad6d38f48d579904a41c166 |
| Loader.js | 27554c200797c34762ce4b3a09e908be2eefa96de153e2d43eec24815de79ad8 |
| Cache.js | a328507fd03dd18bd0c498ee01689d13d35a0636b44e5bad62f6ea2792ea746b |
