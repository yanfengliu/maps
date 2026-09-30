# 369 — Preventive walking prototype

2026-09-29 local / 2026-09-30 UTC. One root-authorized prototype following [367](367_walking-turn-discriminator.md) and the independent 368 experimental contract. Owner: branch A; integration: root. Runtime checkout remains `C:/Users/38909/.codex/worktrees/crossing-frontage/maps` at `1e840ac590149c1bae2760ca4e6ef06f521fd6b9`; main's separate diagnosis-doc commit was not copied into it. This is local unit green, not runtime passage clearance or visual success. No product commit, merge or push occurred.

The prototype guards the eventual post-halt route advance instead of changing the existing ORCA formula. It samples the candidate source-route occurrence, uses the exact float32 position that the pose writer publishes, and checks the existing delivered variant/scale body envelope and 0.05 m margin against nearby current pedestrian poses. An unsafe candidate is shortened by a bounded 16-step search. If its starting pose is already unsafe and the requested result is also unsafe, it holds the step; it does not push the actor out. The current integration's arc-speed/velocity scaling then uses that shortened advance.

Only `src/agents/population/pedestrians.ts`, minimal `src/agents/population/tick.ts` plumbing and new `test/pedestrian-avoidance-turn.test.ts` are changed. The two product files have 45 insertions and 4 deletions. Authority logical radius, halts, admission, source routes, support/body predicates and leases remain unchanged. No lateral state, route/demand change, teleport or expiry was added. There is no whole-crowd scan: the guard reuses the existing 8 m nearby index query and cap of 8, with a bounded number of candidate checks. This preserves that query's coverage boundary; it does not claim all-neighbor safety at arbitrary density.

## Actual red and green

The original two focused tests drove `createPopulation` from normal construction with the actual RenderLoop callbacks, 150/20 actors, seed 5970698, spawn interval 1 and default avoidance interval. Baseline source hashes match 367: pedestrians.ts `db92594a90b8039a5eaf6552ef07ef5686ae2bed5f082fe03709323035f38bf8`, tick.ts `4278a65015f75fba9118dd9e05b565e6ae96b086f6a73092cae54d414e1d4b61`. Both assertions went red through the real production update path:

| Checkpoint | Actual baseline gap (m) | Independent requirement (m) |
| --- | ---: | ---: |
| 613, displayed envelopes and margin | 1.0516854893789982 | 1.0541073973178865 |
| 1239, original smaller movement disks | 0.4990494491755365 | 0.4992784261703491 |

The candidate passes those same distance requirements. Final tests additionally require both named slots active and planned, generation 1, original variant/scale, more than 3 m of source-route progress and the original 35-edge route identity (edge-ID JSON SHA-256 `4dcf906fce46e07fe4defcb4f644e278e9fd8878c3b578e82814c80b246d954f`). An inactive/unplanned/default pose cannot pass the checkpoint. These assertions establish the local queue counterexample's prevention, not eventual admission or traversal.

Avoidance environment binding is not a retrospective shell observation: `baseline-launch.json` captured absence before the baseline child command, and the candidate caller captured absence before spawning Vitest. Both timeline test bodies assert the actual flag is undefined before fixed stepping. Baseline failures reached the later physical-distance assertion, so their flag assertions ran and passed; the final candidate tests passed those flag assertions. The default interval 1 follows from that startup absence and the unchanged bound runtime switch; the private interval constant itself is not a public diagnostic value.

The final focused run reports 16 tests passed, zero failed. Small frozen pre-step inputs from 613/1239 are inline in this one test file. The production clearance helper and production route placer run on the actual retained source routes; the oracle is independent physical X/Z distance and literal delivered-body radii/margin, not a copy of the new search. Cases cover both slot orders, unequal variants/scales, resting and moving neighbors, and separated following. Separated following retains its requested positive advance in all eight combinations. The already displayed-envelope-overlapped 1239 fixture is held and remains overlapped; it is not reported as healed. The normal timeline case prevents that state earlier.

One class setup run did not reach assertions because slot 76's route was not planned after the setup's 180-tick prefix. Its JSON/receipt/log remain named `candidate-unit-fixture-failure.*` and record zero passed/zero failed assertions, not green. Only setup was changed to the already captured 613 prefix. The product mechanism stayed the same. The later successful run was strengthened with the anti-vacuity contract and rerun; no second candidate was tried.

## Frozen candidate and evidence

The exact three-file patch and full focused test are retained under primary `artifacts/runtime369-prototype-20260929/`. The final runtime files are:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| src/agents/population/pedestrians.ts | 31,901 | `c48504aceb92ba08e501e48998b71ac8e8a32a4b5d34e108e47003c7606eb2d9` |
| src/agents/population/tick.ts | 123,031 | `6867407444a44395cdd3419e5c17be443e4f11b8e60990c454a7265c179739e9` |
| test/pedestrian-avoidance-turn.test.ts | 10,373 | `2c7ea5e07097b8405a4e43858e85061b2144095e0c9307dec48cd1212685d7eb` |

`candidate.patch` is 15,808 bytes, SHA-256 `45481249ced58fece1525653ae216475711029ebb51569fc1bbce0ec8e278186`. The final full test copy has the same bytes/hash as the runtime test. `baseline-test.json` is 3,819 bytes, SHA-256 `9d047323c0a478c00541bcbe53863928119d2578a53370430b63414d8f84ce9e`; `baseline-launch.json` binds the absent environment flag, Node version and original product/test hashes. The original 2,478-byte baseline test was recovered exactly to its startup-bound SHA-256 `cfb77a8b6a5f1da10d9732fc559f50e028e0d92f2cad0b71779d85dceb4cdf0c`, and is retained separately from the final strengthened test.

`candidate-unit.json` is 6,488 bytes, SHA-256 `7a686774e145fb64a10df8a66715b363053c3539b71cbd6d86317487ccfd3ed8`. `candidate-unit-receipt.json` is 15,540 bytes, SHA-256 `5bfdbb3ff6da4a3aaba82c5cad65e903b75f7a32d76e100be6f5e6dfe9ed8469`. The task-owned `run-unit.mjs` records exact command, Node 24.12.0, caller, before/after hashes for the 37 runtime source files plus inputs/test, the absent `DSH_AVOIDANCE_INTERVAL` before child launch and child exit 0. Those bindings are unchanged during the final test. Inputs remain network SHA-256 `314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677` and fleet SHA-256 `5b29efc7977949db1611273c8fb294b3ab23a1a55c8f42316cad9b5309c94a01`.

## Admission requested for one runtime experiment

No expensive replay is authorized or run yet. Request exactly one normal-from-start candidate query, using the same actual RenderLoop callback, population parameters, dynamic admission/signals and absent/default avoidance environment, capped at 36,000 actual fixed ticks (600 simulated seconds). Bind this frozen candidate, all imported source/input/caller bytes and environment before launch. Use existing diagnostics, route reader, crowd/hash, body, commitment and fresh halt APIs; do not patch product diagnostics or reconstruct private solver/radius state.

Monitor walkers 40/76 on their original generation and route. Record actual first target lease/grant/entered times at `junction:walk:665310545:0:0:ground0`, each source occurrence's positive progression, the actual route poses and nearby envelope distances at the turn, and the first actual retained-passage release. If an actor does not enter or stalls earlier, retain its actual route/halt/refusal/neighbor state and report that result. Do not interpret freezing before admission as green. Record earliest measured entry/release rather than applying the unaccepted 120-second proposal. Cleanup in finally and verify the task-owned process handles. This one query is pending root admission; no automatic second attempt follows it.

The guard checks sampled published endpoints within the existing nearby cap, not continuous mesh or swept-body physics. Its bounded shortening is not a certificate for every intermediate route point or for all actors. Private ramped preferred velocity remains inaccessible, but this prototype constrains the actual production result after that ramp and authority halt. The float32 displayed-body path is explicit; production's private double authority radius remains unchanged. No essential change beyond the three-file cap was needed for the local prevention experiment. Safe ordinary traversal and actual passage release remain unresolved and can fail despite these unit greens.

Held-out seed 42, accepted first-event capture trigger/finite bound, all five native stills, source/visual review and all five product gates remain later acceptance work. The original 357 empty 20-second capture remains the negative baseline. No central crossing success, performance target or final product acceptance is claimed here.

Final owned launcher PID 3736 and Vitest child PID 26532 are gone; exact Get-Process lookups also found earlier tracked pairs 13780/46112 and 20328/42388 absent. The caller observed child close and used one thread worker. Population/RenderLoop test resources are disposed in finally. No browser, server, GUI, GPU or port was claimed, and no live exec session remains. The current worktree has only the two permitted modified source files and one untracked focused test. Evidence remains needed for this unresolved handoff. No build, full typecheck, full unit suite, visual gate or audit was run in this authorized unit-only phase.
