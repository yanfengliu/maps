# 1529 — Walking history port to main: source review

Date: 2026-10-18 UTC. Status: PASS for the exact three-file main-baseline port. No material source finding. This is the independent walking-history milestone, not another traffic qualification arm. The traffic candidate and its unverified visible boundary exit remain parked; [1525](1525_walk-history-review.md) and [1527](1527_fixed-history-native-review.md) remain sealed unchanged. Native verification, the final five-gate bundle and integrated/main acceptance are still required.

## Exact reviewed change

The new owned worktree is artifacts/walk-history1528/worktree, branch codex/walk-history1528, HEAD `34fd765c85603c3315d389ae4380ff49f0795bcc`. I read its actual Git diff/status and independently hashed the three resulting files before source approval, then rehashed them after the worker checks. They match transfer-manifest.json, SHA-256 `42b835dedcb21014666f9a882ffee91ea0157bec6fc8cb6f9f6bf443a3e48eeb`:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| src/agents/population/local-walk-gait.ts | 13490 | 46a8a11de55c30a32a9ca3dc961d15a3b156ccaa4d53ecbb590baf2fd29ca657 |
| src/agents/local-walk-prototype.ts | 8091 | 5ec30262c81e7688dd04677e0c6c754ea38d86c5a78ab37a1348be0c16b5270c |
| test/local-walk-history.test.ts | 6104 | 1f7b78463640a6e6c8fab6f1c882d688b1c3e666e1eae7ba7f17bea0da05578f |

Git status contains only the two edited source files and the new test. The tracked diff is 3 added/3 removed prototype lines and 33 added/8 removed gait lines; the untracked new regression test is included in the hash inventory. Read-only diff --check passes. No app, population default, route, authority, admission, render, local-walk-options, cache, dependency or profile-pin file changes are present.

## Portability and caller semantics

The main baseline gait is byte-identical to the literal old implementation reviewed in 1525: 11188 bytes, SHA-256 `23219df38c04475cec620b62e422f1a18989a47205d60cc742bf2b443107d223`. The new gait and test are byte-identical to the reviewed 1524 implementation. The controller remains SHA-256 `17c01366d56c9285e8fb1892b80cd0b3bec9eb2f52d20364eb72797e106d3c6e`. This supports reusing 1525's complete-history, lazy-view ownership, iterative flattening, rollback/exception, interpolation and mutable-admission analysis without a duplicate full audit.

The main prototype is deliberately not copied from the traffic candidate. Its actual diff adds localGaitEventCount to the existing import, replaces the interval event-change length read, and replaces the accepted-frame lastEvent assignment. No other line changes. Reversing those three replacements produces the main prototype's exact normalized text. The saved WT baseline is 8066 bytes / `ccfcc3cce19548a806a7d905a3c437aa95d1888b790e0913a4c575537a9b769d`; its raw hash differs from PRIMARY because the checkout uses CRLF and PRIMARY uses LF, not because of a semantic baseline difference.

The prototype still supplies a frozen empty otherActors list and rejects any nonempty interval occupancy. Its exact unheld-junction geometry comparison remains. The existing local-walk-options still admits the default walker only with zero generic population and rejects positive population coexistence. The exported walker interface has no traffic occupancy setter. Thus this port does not admit the parked candidate's vehicle coexistence or ordinary 24-vehicle default.

The count reader supplies the same complete event count from the published view's private history head. The two callers need only whether the count changed and the last accepted count. Their admission observation, restoration and refusal behavior is unchanged. Explicit public status still requests complete events. The physical controller, source geometry, motion arithmetic, world clock and quality settings remain unchanged. Historical preparation-source pins remain untouched; this review does not establish fresh data:setup or packet regeneration under those frozen source bindings.

## Actual retained checks and remaining acceptance

I read focused-green.log: two files, seven tests PASS in 10.09 seconds. These cover all four complete-history regression/ownership cases and the actual-foot source-phase tests, including the existing independently pinned 1320-tick physical/controller-history digest. Its SHA-256 is `3f2f0f35ff56ef5277babb125d79d5c9ca2c0463475918fcb4950701c9c7d4f8`. The literal-old RED proof retained by 1525 remains applicable because the old/new gait and regression bytes are identical; it was not repeated here solely for the port.

The worker's actual typecheck-result.json records `tsc --noEmit` exit 0 on the main-port worktree, timestamp 03:24:34.1169159 UTC, SHA-256 `d8f78405862a7b47b2fa5f028651f96c414e11757d378e0dcf928dc6ef5182f7`. It is a bounded worker receipt, not the later final integrated type gate. I ran no tests, runtime, GPU work or probes. The nine fixture copies are recorded by the worker manifest; this source review does not independently relabel them as a full test-suite result.

Source PASS was sent to root before authoring this report so the exact three PRIMARY files could be prepared. Final real-Start aged zero-population native evidence, public 44-image review and three hardware lifecycle records, all five final gates, integrated byte/diff readback, commit/main push and worktree cleanup remain pending. The traffic25 worktree remains parked and is not an integration dependency of this three-file port.
