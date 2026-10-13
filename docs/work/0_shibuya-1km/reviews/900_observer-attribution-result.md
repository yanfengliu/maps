# 900 — Baseline observer attribution result

**Diagnostic complete; qualification remains RED.** One leased baseline A1 run used private port 4346 on 2026-10-12, 23:58:55.365–23:59:18.750 UTC. The owner returned raw exit 1 and retained `Observer hook+poll p95 exceeds0.25ms: overhead-tracked`. `diagnosticCompleted` and `attributionCollected` are true; `instrumentPassed`, `qualificationPassed` and `appearanceCaptured` are false. There were no PNGs, candidate arm, ABBA comparison, retries or product changes.

The exact lease is `artifacts/observer897-attribution/lease-attribution-40c482a8280be1f081c712f1963ef8d0.json` (14,203 bytes; SHA-256 `eed92ec6192bf28610567839dfd103e2e6d505b0931fd9a0f354defacb4e98f1`). The pinned owner ran with `C:\Program Files\nodejs;` prefixed to PATH. The retained run is `artifacts/observer897-attribution/run-attribution-40c482a8280be1f081c712f1963ef8d0/`.

Actual controls clicked the visible enabled Start walking button, recording start frame 482, then reached the 45 m Satellite dusk pose through Orbit controls. Each window contains exactly 30 consecutive ready app frames: inert 698–727 and tracked 731–760. The tracked window has 30 completed queries, two genuine same-target colour samples per frame, no pending query and no drain row. Scene/refinement and actor endpoint records match. These are endpoint observations, not continuous revision proofs.

| Recorded quantity (ms) | Inert 30 | Tracked 30 |
| --- | ---: | ---: |
| Before/read/init total | 5.300000 | 4.800001 |
| GL observation total | 3.000001 | 4.400000 |
| Return/read/finalize total | 11.099999 | 13.100000 |
| Registration/outside carry total | 0.100000 | 0 |
| Hook total | 19.500000 | 22.300001 |
| Poll total | 0 | 0.900000 |
| Hook + poll mean | 0.650000 | 0.773333 |
| Hook + poll nearest-rank p95 | 1.000000 | 1.200000286 |
| Hook + poll maximum | 1.000000 | 1.299999952 |

The largest recorded tracked hook bucket is return/read/finalize: 13.10 of 22.30 ms, about 58.74%. Its inert counterpart is also the largest: 11.10 of 19.50 ms. The concrete region is copied `gl-observer.mjs:195–226`: query termination, post-callback bridge read, app/colour/state classification and row finalization. This localizes an observed span; it does not identify a particular operation as its cause. Its mean alone is about 0.436667 ms tracked and 0.370000 ms inert. The recorded GL observation bucket is smaller, and the full poll total is only 0.90 ms.

All 62 unique recorded app intervals reconcile with maximum absolute bucket residual 0 ms, within the frozen 1e-9 ms tolerance: 60 control rows, one startup row and one outside/startup-drain row. Unconsumed outside carry is zero. The startup hook is 94.199999809 ms, outside the control denominator. All 31 poll batches retain one actual interval owner: one startup-drain batch with recorded 0 ms and 30 tracked batches totaling 0.899999857 ms. Their per-row reconciliation residual is zero; there are no orphan polls. No duration was shared, subtracted or converted into a fabricated frame. The unchanged summary admission at `artifacts/sign886-qualification/summarize.mjs:35–37` still uses hook plus poll and refuses the original 0.25 ms bound.

Strict ordinary-response versus CDP URL/status multisets match 130/130, with 130 actual-body identity witnesses totaling 272,401,734 decoded bytes. Retention is disabled/detached and diagnostic body jobs settled. The source/build/data provenance remains unchanged according to the retained caller checks. Hardware before/after is NVIDIA GeForce RTX 4090, driver 616.64; the actual renderer is ANGLE D3D11 on that adapter. No FPS, candidate cost, whole-map performance, noon, appearance or adoption claim follows.

GL disposal reports stopped=true, owned queries=0, pending=0, errors=[]. All six caller closures are true. The owner census is available; admitted-live, omitted-live, descendants, ownership-unavailable, exact-marker processes and port listeners are empty, and its owned TEMP directory is removed. A fresh scoped CIM/port/TEMP observation at 2026-10-13 00:00:07.3635173 UTC confirmed the exact marker and six retained PIDs absent, port 4346 empty and TEMP absent. The GPU/port lease was released to root. The retained output is 4,098,560 bytes, below the 512 MiB cap; the closed Default NetLog is 3,434,554 bytes.

These are existing clock spans, not complete pure observer CPU. Bridge reads contain native queries, inert retains hooks, clock granularity is visible, and newly added bucket bookkeeping is partly outside those spans. No overhead was inferred from an inert/tracked difference, no native work was subtracted, and no precise sub-operation remedy was implemented. Root owns the next repair decision.

The ignored `artifacts/observer897-attribution/result-900.json` binds the exact inspected run, observer, closure, input, metric and report bytes. Original 886/895/897 artifacts remain preserved.
