# 726 — Walker completed-render timing repair

Private `artifacts/walker726/native.mjs` corrects723's premature post-Start TAA assertion. It clones exact preserved720 native bytes. Removing the two added helper functions and reversing two caller edits reproduces the original byte for byte. It is neither installed into709 nor dispatch-ready; its existing709 location/admission guards remain unchanged.

Immediate Start before/after observations remain input evidence. The new stage retains that raw input and waits at most5000ms, trimmed by the existing absolute work deadline. It requires the same epoch, URL, actor/startFrame identity and a safe, nonregressing `frameCount > startFrame`. Actual pinned PRIMARY `RenderLoop` renders before publishing this counter. Wall time and `started` alone cannot qualify the stage.

The wait wakes on a completed frame or invalid document/actor/readiness state. It stores the raw resulting observation before assertions. Timeout/failure stores another bounded raw observation when available, or an explicit unavailable reason. It then applies the exact unchanged `assertWalker`: TAA1/false/0, actor identity, null refusal and existing15mm contact/5mm drift limits. Later continuity uses the first qualified `start.rendered` observation; `start.after` remains the immediate input receipt. Completed rendering alone does not establish simulated movement or gait.

Fifteen finite CPU controls execute actual candidate helper/signal and unchanged `bounded`, `assertWalker` and `firstLegWindow` definitions through a fake page API. The original retained after-click observation still fails the old predicate and remains pending under the new signal. Literal frame889, startFrame888, TAA1/false/0 passes transition only; its tick/travel remain zero. Stale/regressed frames, epoch/URL changes, each wrong TAA field, refusal, actor mutation,5mm drift, expired/unresolved deadline and nonmoving first-leg input refuse. Raw failures remain retained; owned timers finish empty. These literals are synthetic controls, never rendered gait/support evidence.

Candidate syntax passes. Six original function definitions and the complete near-event guard line are byte-identical. Eight live709 runtime files, four exact PRIMARY sources, ten initial709 failure copies and fifteen720 retry copies match their pins. Recipe12 originals, observer, consumer, predicate, real controls, event timing/travel/cycle guards, ownership and220/240/300 deadlines are unchanged. Source base is975b224; root reports docs-only2cef08bc without product changes.

No replay, build, browser/server/GPU, product/Git/progress/shared-data write, output clearing or preparation reseal occurred. Both actual failures remain RED. Independent source review and root admission are required before any installation or third dispatch; facade715/722 retains runtime priority. Browser transition, walking, native appearance and cleanup remain unverified.

| Exact source/control input | Bytes | SHA-256 |
| --- | ---: | --- |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker726/native.mjs` | 41254 | `9fb57c3b2defb2200e9d30bee4f17b3eb8a93c21df459a45c010bb64c00e0eb6` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/failed-retry720/native.mjs` | 38597 | `aaf8c16e405dab79a75309f3a5dd566746900f8cdd72bf66c618674e7d622426` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker726/prepare-candidate.mjs` | 6131 | `b133e017a34efca948a5c00149e9d79c943eadac7f669ae954990954ec45d1fa` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker726/source-delta.json` | 5003 | `f988ca47fd485d233a487708a7f91bf0ef34d9c87c66531e6e82e56d5c77d1f7` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker726/cpu-controls.mjs` | 9224 | `500e16d19b6ef81f09b051bba50e63adcda91766a41199e0a2b6c2d69261e928` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker726/cpu-controls.json` | 4344 | `b95b93b57853e1b8f5c156b64080f56a66e079d9f1ec9462a2ce6bff52be94fb` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker726/freeze-source.mjs` | 4114 | `4a7541a9d517b232b483ae79356f91e99d05e28ca02d2ecab85cc25d2d6f827e` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker726/source-proof.json` | 12016 | `f291ced6ebb0da936bc1305b185bfc352511886ab8c23aac0d87c643f38bf15e` |
| `C:\Users\38909\.codex\worktrees\crossing-frontage\maps\artifacts\walker709\native.mjs` | 38597 | `aaf8c16e405dab79a75309f3a5dd566746900f8cdd72bf66c618674e7d622426` |
| `C:\Users\38909\.codex\worktrees\crossing-frontage\maps\artifacts\walker709\recipe.json` | 5133 | `5dbcbc1381619994abc4416f3aee08226af00eedadcac9936425b2bd9f560491` |
| `C:\Users\38909\.codex\worktrees\crossing-frontage\maps\artifacts\walker709\observer.mjs` | 10181 | `c663cb69f4d29769a6ba62f22cc2f2aa8b292e18d37961cba6d0e5204956c069` |
| `C:\Users\38909\.codex\worktrees\crossing-frontage\maps\artifacts\walker709\consumer.mjs` | 5511 | `3a8b8d462f01661074b14f3ba77948d0812ebab141ff3c9c87b017c69eff49b6` |
| `C:\Users\38909\.codex\worktrees\crossing-frontage\maps\artifacts\walker709\predicate.mjs` | 5629 | `7d7f69122986c2dd1f8e95a9ef27551987ad35f7cc1f77d439a89166de983900` |
| `C:\Users\38909\.codex\worktrees\crossing-frontage\maps\artifacts\walker709\camera-range.mjs` | 1600 | `987449cca966d1cce1b09bb857ebdb3d21211579ebf82a8b360c8c483bedb6fc` |
| `C:\Users\38909\.codex\worktrees\crossing-frontage\maps\artifacts\walker709\contract.mjs` | 285 | `1dc70809d8ca825e4516ff741705a7b8e20fd1ec754f206b93dc83fe2adfab73` |
| `C:\Users\38909\.codex\worktrees\crossing-frontage\maps\artifacts\walker709\run-owned.ps1` | 20665 | `05eb3e76f9930c2f962bace4b19f4295c841c96d4c636507ac5d7306fcf351b2` |
| `C:\Users\38909\Documents\github\maps\src\agents\local-walk-prototype.ts` | 7993 | `5ac97393e1fd0d913171e6454138b0b620687c9d479b9fea97c14152e56de7b1` |
| `C:\Users\38909\Documents\github\maps\src\app.ts` | 21715 | `08868340833371b695af0f3c6349b9e6ec9106bbda59f4a27de1ee43293d06cb` |
| `C:\Users\38909\Documents\github\maps\src\render\post.ts` | 15018 | `6f5b64db71bb3299e28af71c0925842122670cc5cc49763a0459f888599a25d9` |
| `C:\Users\38909\Documents\github\maps\src\render\loop.ts` | 6510 | `8750fd5349bb0862e15825a94634226cc3a702a3549eb4f9d2a446ae3d10820a` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/start-boundary.json` | 4768 | `eafdb06f124be09a7cb2e9bdb2acd61b3f5bf710c50435240a807620d67eae11` |
| `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/walker709/diagnosis723/preservation.json` | 9912 | `df3e04d1ec0b59d60a54bfe0da33c9ef67ed6a63b41ddb59a516e928294f7ae2` |
