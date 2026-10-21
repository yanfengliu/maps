# Review 008: campus environment and materials

## Target and outcome

Reviewed 2026-10-20 against clean main `8ac22de89acba2ac85d70c3bf15f321c78a14b2d`, together with the simultaneous-input candidate approved in [review 007](007_simultaneous-input.md). GO for the exact frozen candidate below; no open material finding. The two native findings were corrected and re-reviewed. This verdict covers the illustrated Stanford model and tested native browser paths; the embedded-browser hang remains unresolved.

| File | Reviewed SHA-256 |
| --- | --- |
| `src/building-architecture.ts` | `6e369c37d4a620b182a3495c27d13fe2d158d87aa58734850c119d573ed06327` |
| `src/building-details.ts` | `c1b38dc8c40150fb17f8894d44be2a332df864079b8a28ab128f6fb7ce42a2ce` |
| `src/building-geometry.ts` | `ce9bee69e71370478babda8cc317a182db3568479197cd851a98968f90aac731` |
| `src/building-worker.ts` | `db3f7031a4a2736f381cc659feb72afc6388e4c2cc28b37c9cc7784feebf6e14` |
| `src/campus-environment.ts` | `d8f8e3fc01e3fa63ccc88d0e4bf3a89d4e254effd4914f3c2dbead50405663c8` |
| `src/landmark-accents.ts` | `f745c171358925bc2c2b90798d778a4668692aea33727695aab0ae8032b18b1f` |
| `src/main.ts` | `80d13ec33e4b0d4ad282daccfda8486eabf8dce2a75910997d197985ad495cd3` |
| `test/building-details.test.mjs` | `6a6b186dae7694c355ff710fac6ce2dc85150f656198a5c881402ce7b8f282e6` |
| `test/campus-environment.test.mjs` | `221ab2848d714216bfa9931a1b47c42e30c218f733269d55c3b7c090d424b80a` |
| `tools/data/build-campus-environment.mjs` | `c40b32a730646505d84426d13bbdaf68b2e6b7f0a452a64bfdf648d3427b2c29` |
| `public/data/stanford-environment.geojson` | `ffab0171ce296e17ade5f464fbd0239de75f6526f0419c9c0ab86067ae104a74` |
| `public/data/stanford-environment-provenance.json` | `16c3a8e3fb8e68d5abe847c285a6985b659f717578b34ca2ba51c74c88ca6027` |
| `public/data/README.md` | `88981db98c8397502bc6fb19afce4f9c815ec5a02b0cf1ef68d4a58cc9de49e1` |
| `README.md` | `83ffe35aad39ce1d25db67251df66d6d400a9ec8b0ae664af33a4288e0fdce58` |
| `docs/work/0_bay-area-stanford/campus-environment.md` | `141be4f6dd2efbed79f62ec57b1bfc0748c5fc4f4158e8e805034867376cf4d5` |

Exact source snapshots, tracked diff, source oracle, image digests and review-lane evidence are retained outside the disposable worktree under ignored `artifacts/simultaneous-review/evidence/008/`. The integration owner owns the recoverable commit and cleanup. No dependency changed in this increment.

## Independent source and evidence review

Reviewer: `held_architecture_review`, independent Codex review under the canonical multi-CLI runbook. I read the changed source/data/tests, relevant surrounding lifecycle and loader code, actual control scripts/results, and native images. I made no product edits and launched no browser/server or duplicate package gate. Outside-diff reads included [src/main.ts:291](C:/Users/38909/Documents/github/maps/src/main.ts:291), [src/main.ts:343](C:/Users/38909/Documents/github/maps/src/main.ts:343) and [src/main.ts:434](C:/Users/38909/Documents/github/maps/src/main.ts:434), establishing the existing error/Retry, style replacement and layer restoration paths, plus the existing OSM parser in `tools/data/fetch-stanford.mjs`.

The independent oracle verified all four raw extract hashes and all 969 retained point coordinates, versions and retained source tags. Its geometric ray/segment calculations are independent of the generator; it reuses the existing XML parser. No retained root or furniture center lies inside building material, and no modeled bench corner lies inside a building. Minimum precise wall clearances are 0.6901 m for trees, 2.1403 m for benches and 0.9059 m for lamps. The six exclusions and absence of road-rule exclusions match the provenance. Original building, campus and source-provenance SHA-256 remain respectively `a27c564f8c7472bfddafd28e3328cffdf12acadb2f9854da1f1e429fd1d41d2f`, `e8890575c26f83f0b6eec7beb710520b74fb400d7e8509b0814d64ead67ed9dc` and `3f13cf64c82523b2f8916fd24bea7289e3f7284dba012669106086e78ab2d572`.

The result contains 726 trees, 163 benches and 80 lamps. The 337 palm-form models include 336 Phoenix and one Yucca approximation; all present tree dimensions are estimates. Source-grounded positions do not establish a complete current botanical inventory. Historic sandstone/tile, pink Roble and modern light-roof/glazing families use derived colors without replacing original tags. Landmark relief is source-anchored and stays within the original vertical envelopes. Generic windows, ivy coverage and material reflectance remain authored approximations. The previously reviewed church and Quad composition remain intact.

The worker fetches the local input with a finite timeout and explicit network/HTTP/JSON/schema errors. Fresh geometry starts only at zoom 14 or closer within 6 km of campus. Failure is not cached; Retry recreates the layer. Complete geometry is cached independently of GPU resources, supporting restoration without another environment fetch. The combined mesh contains 148,465 triangles and 23,160,540 bytes in two draws. Environment sentinel `-2` and solid shader kinds separate foliage/furniture from selection and window treatments. The retained sentinel `-1` negative control fails, then passes when `-2` is restored. Planar roof subdivision removal preserves the existing triangulation, courtyard coverage and heights.

## Findings and dispositions

| Finding | Disposition |
| --- | --- |
| Baseline Roble ivy appeared as repeating camouflage across every elevation. | Resolved at [src/building-details.ts:137](C:/Users/38909/Documents/github/maps/src/building-details.ts:137) and [src/building-geometry.ts:210](C:/Users/38909/Documents/github/maps/src/building-geometry.ts:210). Connected ivy is limited to photographed front-facing elevations; other elevations retain pink stone. Final front, entrance and side captures confirm the correction. |
| The initial full-buffer upload took 23.7 ms, exceeding a 16.7 ms frame interval. | Resolved at [src/building-details.ts:200](C:/Users/38909/Documents/github/maps/src/building-details.ts:200). One allocation or at most 1 MiB transfer occurs per callback. Both draws and readiness wait for complete buffers. Source and tests cover contiguous offsets, partial context loss/removal, failed transfer and restart. Final measured allocation/transfer slices satisfy the tested bound below. |

## Native verification and limits

I inspected all 20 baseline images at native resolution. For the final 14 images, I inspected each changed unique image at native resolution and verified exact digest equality for unchanged or duplicate images. The final Roble front, entrance and side digests are `34ffb79e5ea9758db7c18a0fc03063f88a93da19ec3f7f1fa282f9886bb1ffda`, `a10a3eccb60680d3874339ee168445ad32ec03090d47ff095875fe3f445eadda` and `4c4b5cb4f98966158fccb874cb9fca28aa6aad6f609a55e36a0d1518c0b18def`. Fixed, overhead, side, rear, oblique and mobile views show the new materials and planting without an additional material regression. Their photo grounding uses the actual Stanford reference captures independently inspected in review 006; no reference photograph is shipped as a texture.

I read the final native script and its 17/17 result, retained as `final-environment-visual.js` and `final-visual.json` (result SHA-256 `bd704395848c30db0f0c5e3e33ef881b8dffe6a627cbc4510de68cb0d5f17f2b`). Actual HTTP 503 and malformed JSON controls preserve native campus geometry and camera response, then recover the complete mesh through Retry. Actual church clicks select its source identity. Context restoration preserves counts and makes no new environment request; overview hides the mesh; mobile views remain usable. No unexpected browser or application errors were recorded.

At 1920×1080, pixel ratio 1, HeadlessChrome 153 and ANGLE/RTX 4090/Direct3D11, initial and restored uploads each use 25 callbacks. Maximum measured shader/allocation/transfer CPU slices are 0.2/0.5 ms; accumulated upload CPU is 1.2/3.4 ms and upload wall time 99.9/105.4 ms. Simultaneous W/right-drag motion begins over campus and continues toward its arrival context: 346 motion-render events over 1,436.5 ms, p95 4.7 ms and maximum 5.9 ms. These are JavaScript/WebGL API-call and render-event measurements, not GPU completion, physical refresh or a guarantee across devices/viewpoints. Whole-buffer allocation remains isolated and measured; the transfer cap alone cannot bound every driver.

I also read the owner's final primary evidence: 14/14 actual-control checks pass with simultaneous right/middle movement, release behavior, exact held/native wheel delta equality, church click, overview and no errors. All 36 before/after input hashes are unchanged. The owner's logs confirm Node 24, all 51 tests, types, build and audit pass with zero vulnerabilities. The existing large-bundle warning remains. These were owner/worker executions, not duplicate reviewer runs; their evidence is under `artifacts/simultaneous-input/primary-verification/` and `artifacts/simultaneous-review/evidence/integration/`.

Claude is unavailable, not an approval. The single fresh canonical pinned/max-effort attempt on installed Claude 2.1.281 produced initialization and API retries only, no source-review messages and no final result/modelUsage before the 60-second timeout. Initial sandbox cleanup failed; the approved stop then removed owned PID 45528. Post-stop checks found it absent and no source changes. Raw events and before/after audits are retained under the evidence path above. No fallback or additional retry was used. The process-selection incident and corrected cleanup bounds are recorded in review 007; final environment cleanup reports an empty owned-process census. Commit, remote-gate status and worktree removal remain the integration owner's responsibility.
