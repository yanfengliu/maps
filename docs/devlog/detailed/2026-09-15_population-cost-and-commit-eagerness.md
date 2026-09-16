# 2026-09-15 — the population cost probe, and commit-eagerness as a rule

## What moved

`tools/agents/population-cost.ts` is new: the first instrument that measures the real per-tick cost of a 3,000-pedestrian and 200-vehicle population on this machine, using the real admission authority and the real pose-composition path. It exists because the design proposal named a CPU probe as the cheapest falsifying measurement for the 60 fps target, and because nothing in the tree could answer the question at all.

Measured on a 13th Gen Intel Core i9-13900KF, 32 logical CPUs, Windows 10.0.26100 x64, Node v24.12.0, seed 5,970,698, 12 warmup and 120 measured ticks at exactly 1/60 s, 3,000 pedestrian slots and 200 vehicle slots:

| Batch, ms (n = 120) | Median | p95 | Maximum |
| --- | ---: | ---: | ---: |
| Simulation substrate — lower bound, no motion model | 1.007 | 2.151 | 5.480 |
| Admission: request build, one `resolve`, every `observe` | 2.409 | 4.440 | 5.934 |
| Pose composition: `writePoseMatrix`, `setMatrixAt`, motion writes | 0.526 | 1.062 | 2.162 |
| Same tick, all three | 4.346 | 7.020 | 9.793 |

Reproduce with `node tools/agents/population-cost.ts`; the run writes `artifacts/population-cost/summary.json` and refuses to overwrite an existing one. Machine-readable evidence is retained there, and the probe is deterministic: the final-state digest `9ec22ce6c692a126463aee6a0c83df870d5c73659bfca169e68eeb3cd072a419` and every count were identical across seven runs.

## What was believed and is now false

**The design's 0.5 ms admission budget was an assumption and it is wrong by 4.8x.** Building 2,582 real `AdmissionRequest` objects, calling `JunctionAdmissions.resolve` once and `observe` for every committed actor costs 2.409 ms median. The budget was never measured before; it was a guess in a table and it is now a number.

**The frame-rate target is not the first thing this population breaks.** Admission throughput is. The same tick produced a median of 27 grants against 2,582 requests: 80.8% of the population stands at a gate. The network contract already said its policy was not evidence of acceptable throughput; this is the measurement that statement was missing. On this synthetic demand the queue would take about 96 ticks, roughly 1.6 seconds, to clear if it were static, which it is not.

**Two vehicle routes cannot be driven at all as the network stands.** A mapped stop line sits nearer the gate than half the longest vehicle (5.282 m) — 3.711 m into one entry segment and 0.599 m into another — so any body that reaches the gate has already crossed the line and the authority correctly refuses its own progress. The stop-line offset policy this needs does not exist. Two single-edge pedestrian routes are also refused by the passage builder for having no outside exit section. All four, with the real builder's reason strings, are in `summary.json` under `graph`.

## What this measurement is not

The simulation batch is a floor, not an estimate. No IDM, MOBIL or ORCA implementation exists in this repository, so that batch contains distance integration, the real `sampleEdge` and `headingAt`, and the real dense pose buffers, and it contains no avoidance, no car-following, no spatial hash and no acceleration. It must not be read as evidence that a pedestrian step is cheap.

Nothing here is a frame rate. The GPU, the shadow pass, the post chain, draw submission and the `instanceMatrix` upload are all invisible to this probe. `HumanRenderer.update` cannot be constructed in Node at all, because its `load()` needs GLTFLoader, `fetch` and WebGL; its per-slot body was reproduced call-for-call against the real `writePoseMatrix`, with the counter increment and the GPU upload as the only unmeasured statements. Pose composition at 1.062 ms p95 does mean the design's proposed vertex-shader instance composition is an optimisation rather than a requirement — on the CPU side only.

No quiet window was reserved: a three-hour visual gate was running on this machine throughout. Across seven runs the same-tick median ranged 4.011-4.696 ms and p95 6.781-7.357 ms, so the table is good to about one decimal place, not three.

## The commit-eagerness rule

The owner's instruction on 2026-09-15 was to commit early and commit often, as a rule rather than a preference. It is now written into `docs/policies/local-rules.md`, together with the criterion that makes it usable rather than merely encouraging: a code commit may inherit an earlier revision's gate results only when the built bundle bytes are identical, `data/scene/**` is unchanged, and the changed paths are outside the bundle graph — and the commit message must name the revision the evidence came from and the check that established it.

That criterion was used for this commit. The probe is a tooling file that `vite build` never reads, and adding it leaves the bundle at `dist/assets/index-BP1Vm0F-.js` with SHA-256 `0d99838361a2597053e2eb6f0fdf72dd6a9aa53b31433cc5e540a9c4df1f451c`, byte-identical to the bundle the 44 inspected frames and the four completed gates belong to. Without that check the commit would have owed a three-hour visual gate to prove something a one-second hash comparison settles.

The reason the rule needs to exist at all is the arithmetic in this repository: `npm run visual` is a three-hour command, so a session that waits for a perfect whole lands nothing, and a session that batches unrelated work spends the same three hours on a commit nobody can review.
