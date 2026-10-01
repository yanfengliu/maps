# 551 — Startup evidence triage

2026-10-01. Read-only at docs81903e4/product39ba; no runtime, gate or source change. Healthy539 explains neither534's decoder abort nor historical0/44.

Actual `artifacts/noon539/native-inspection.json`, each arm's `documentEvents`/`readyObservations`, gives these Node-monotonic **main-navigation-event→first timed ready snapshot** intervals:

| Arm | Noon | Dusk |
| --- | ---: | ---: |
| Raw main baseline | 11.2635183s | 11.1319458s |
| Lighting-only pilot | 9.9005763s | 9.6810032s |

These snapshots follow first-frame readiness, five60ms idle polls, preservation settling and canvas reads (`native.mjs:82–85`; frozen `tools/visual/orbit.ts:144,274`). First-frame returns have frame counts115/111 but no stage timestamps. Final snapshots have153–155/149 frames: intervals include verification overhead, not exact app-ready transitions. Serial order supplies no machine-cold or lighting-causal comparison.

Goto→DOMContentLoaded observation is509.3783/132.8526ms baseline and157.7807/119.9483ms pilot. Decoder request→requestfinished is90.5545/100.2452/96.6783/106.4683ms, with200 and no failure. All67 building-header responses arrive within1.361–1.718s of before-goto; body completion/identity and decode were not sampled for those requests. Their8.347–9.786s gap to ready is not proved preparation time. All ready snapshots show67 loaded,44/44 leaves, pending/failed0,110 drawn meshes/355,520 triangles and RTX4090/D3D11. No CPU/GPU phase or first-building timestamp exists.

524's first diagnostic retains ready/frame150 baseline and153 pilot,67/44 and hardware identity, but lacks navigation/ready timestamps. No startup interval can be recovered from it. Logs report two builds1.83/1.56s (524),1.87/1.50s (539). Native totals193.030/120.711s include multiple navigations, aiming, screenshots, style/motion work and cleanup; they are not loading measurements.

**One next experiment:** a single ordinary startup with a same-browser-clock phase ledger at existing tile transaction/facade hooks: body consumed, parse, atlas resize/de-light/readback, model admission, first/44th leaf and display-ready. Stop at readiness; no recapture sequence. Existing frame-budget measures post-load frames/population, and Node cpuprofile readers cannot attribute browser/GPU startup. This ledger would distinguish decode/preparation from transfer/verification;539 proves no decoder-transport bottleneck, but no specific slow preparation component.

Exact reductions/input hashes: ignored `artifacts/startup551/triage.json` SHA `aea129e9be9664696450dd45416bf4e69c0e30edaed8afd24628f48cd1b6c975`.539 receipt SHA `2df51144317626f4b51ce073ea7537039cfcb89709f890adb8983bf9b8980ba2`;524 `8e7dfcba09499082fff39d2106313f054ceea25f9163c447f9ff4ecbdb2c4393`.
