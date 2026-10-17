# Final capture bundle — focused closeout

PASS / ACCEPT for exact integration. Both initial P2 findings are resolved; no material finding remains. Reviewer checked the exact manifest candidates and current donors, focused fixes, fixtures and causal logs. No engine, CLI or test suite was run by reviewer.

Bundle manifest: 2,977 bytes SHA-256 `53425270c5455e813d1c0bde0a38c6872b9ea50877ec9c0fe8ee6c6fa6b09457`, under maps/artifacts/unreal-native-triangle-import-v1. All six candidate byte lengths/digests match; all four canonical donor hashes match, and both new test targets are absent. Canonical installation destinations are recorded in that manifest.

| Candidate | Bytes | SHA-256 |
| --- | ---: | --- |
| mcp_run.capture-candidate.py | 42054 | c6403a18c7ac325fc7f3a732962a0ec099aa9542aaa293385e347e1492355114 |
| shibuya_tools.capture-candidate.py | 109093 | 4f443c30c74a3c9e455e8115d559c2356e18c779e1d81f935fce52ba771bf0ae |
| test_capture_sweep.py | 16043 | f7c096b4276029e4f2180f1123e461d254b8f847061c944d872825f000e143ac |
| test_capture_cleanup.py | 4567 | e5fc19659a42f652a6fbc307f91950de35059956fed8f5b563b976b3ca6ea977 |
| test_coverage.capture-candidate.py | 14783 | f571af392010fb9bded606995a682d16a196a6d05045ca4e3ef9dec7f01f5468 |
| test_visual_controls.capture-candidate.py | 10249 | 0186733bded108fe07fc9a904e52fc005f947b14810c3c71e04fb6c0626d72a0 |

Donors respectively: driver `5b21659ffd9e3e8fef681b1081af33eccea4207461683e8a4358a7a83d27a2ea`; helper `648e56fe57fb77454865a4af178f822aedca3a169032f65476e443c422e46373`; coverage test `031c693cbfefa7db00108d123ba2158d33b410bfa4464b2c298340edd49bdb24`; visual-controls test `45cd371ab94826e9aeefcd42c8a4708d4c5f60ff8936400345991caa3b361127`.

Cleanup fix: native _finish_capture now requires EditorActorSubsystem.destroy_actor to return exactly True before its restoration receipt can return. False, nonboolean and throwing destruction stay failures. A restoration exception remains primary, with any cleanup failure added as a note; capture state is cleared in finally and the runner still owns terminal engine cleanup. The actual donor false-destruction control is RED (`4d0bea0bd1c430538a248c6e49f03dbaa80a0b8db2e63834c47036c8c0cd7bf1`); eight focused controls are green (`1c8fe108cd48c612e67785fb9447d502726f3058f50065bc7452afed7f43e515`). This addresses the missing native boolean, without a new tool/API or synthetic cleanup receipt.

Malformed-arm fix: readiness, warmup and final capture responses must be JSON objects outside recoverable qualification catches. Generic tool_value remains unchanged for legitimate textual tools. The malformed warmup mutation removes only its new check and makes the causal control RED, with six starts instead of fatal stop (`34910579acde7d7002d7c69163089664a26a16bc5a3a7ed9eb1518d9fe95ba9f`). Final tests cover all three malformed arms and prohibit scoring/continuation.

Fixture deltas preserve behavioral assertions. Coverage's recording destroy fake now returns the actual API success boolean. Visual-controls' successful final export fake now includes the unchanged native restoration receipt only for finish=True. They no longer pretend success with absent API results. Owner's final combined log is 19,341 bytes SHA `2a0c2598e25950fddd4cdac3937f8cf06766653d4c6ecdfea8a83319e2ba7038`: 115 tests PASS in 23.458 seconds, no skips. The earlier 114/115 stale-fixture run stays a failed run.

Earlier accepted sweep/surface-only semantics remain: original six poses and helper FOV, both existing probes before aggregate refusal, unadmitted rejected pixels, readiness FAIL/darkness DID NOT RUN when any view is rejected, fatal native/protocol/cleanup failures, unchanged source/native surface call path, and explicit appearance DID NOT RUN for --surface-only. Canonical integration tests and actual source-only native surface geometry/25 roads/282 rays/checked map save remain required. This code review establishes no native cleanup, image, support or runtime acceptance.
---
Promotion provenance: exact authored source `C:/Users/38909/Documents/github/maps/artifacts/unreal-runtime-next/worktree/Artifacts/capture-sweep-review-v1/closeout.md`; 3989 bytes; SHA-256 `8c7a3040a2eb16f82905510bf1ce36a0444a1a7cd5be9c9a7722a020c12f201c`. Original review text is preserved above; this footer records promotion only.
