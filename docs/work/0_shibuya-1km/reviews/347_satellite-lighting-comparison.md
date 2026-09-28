# Review 347 — Satellite lighting comparison

Date: 2026-09-28. **REJECT candidate1.** This is the first candidate comparison under review 342. Both hero views must show a clear visible improvement; neither does. Root independently agrees and has stopped this lighting milestone after this comparison, without a second parameter candidate or final gate run.

## Appearance verdict

I inspected all six original 1280x720 PNGs at native resolution before reading the changed coefficients. No crops, enhancement, contact sheets or difference maps were used.

- **Noon crossing: fails improvement.** The crossing paint and yellow foreground lines remain readable, and the IKEA, SHIBUYA and red TOKYO signs remain distinct. The subdued TSUTAYA face and adjoining retail walls still have nearly the same flat relationship to the broad grey paving. Any brightness change is too small to establish clearer daylight, shade or facade depth at this composition.
- **Dusk approach: fails improvement.** The warm sky and small sign lights retain evening character. Foreground station roofs remain very dark, while the crossing light pools remain isolated bright spots in front of similarly cool middle-distance walls. Slight warmth on exposed faces does not establish a clearer street-to-facade relationship or materially better building separation.
- **Overhead: preservation passes.** Street corridors and building masses remain coherent at city scale, with similarly dark road bands. This frame supplies no compensating hero-view gain. I saw no conspicuous new washout, paint glare, halo, lost sign or newly black facade in these three pairs.

Preserving the baseline without a clear improvement is insufficient for acceptance. This verdict was sent to root before inspecting parameters.

## Exact inspected bytes

Packet: `C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/lighting346-20260928/`. Independently computed SHA-256 values match each arm's manifest and the comparison index.

| Original image | Baseline SHA-256 | Candidate1 SHA-256 |
| --- | --- | --- |
| hero-satellite-noon-crossing.png | 7cf493e2f433615ae835cdc845f8d374ab3623db5ccd7071bfd814b7285d15de | a1fdbea3f52607674346c2a7b0a579ddc1148fc157b9b3b83db67becc20e6ce8 |
| hero-satellite-dusk-approach.png | baecb85f25ed63f9091fefaec3c25bd7a4413e937951d38bcaed3d393aa33795 | eedd4af2d92c4684c224f7604897d770d7997d885f10fe856cd432c57bc8928f |
| overhead-az000.png | e231b7bf58ce5b5c3ebc2633b2f011ac5faaabeea1231287410fa765e9ba9f92 | 8e25d259b8b5b9dc4f708ceee7a46d6516436611bda8f8be11ec110d850f5450 |

## Comparability and scope

The manifests record identical corresponding cameras, Satellite style, population state and post settings. Noon is 2026-10-15 11:27 JST; both remaining compositions are 17:20 JST. All six report 1280x720, ready rendering, settled tiles, 67 loaded tiles, zero failed tiles and no context loss. Both arms use the NVIDIA GeForce RTX 4090, driver 616.64, through ANGLE D3D11. The recorded source, build, scene, harness and runner bindings are unchanged within each arm. The scene, harness and runner bindings match across arms; the common scene digest is `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce` for 151 files and 354,752,173 bytes. This checks recorded comparisons; I did not rehash the full scene or rerun capture.

After judging appearance, I read the actual one-file diff against `2146b2b5972b40ea615cce8dcfb4542e191d480c`. It changes only direct intensity 3.1 to 3.8, twilight key 0.46 to 0.58 and explanatory comments in `src/scene/time-of-day.ts`. The captured candidate source has SHA-256 `5069436195c73fa31cf93b7ec3d98e46177c2d6a9f26636ad4675dcb91e8d8f8`. The recorded noon key changes 2.365 to 2.899 and dusk key 0.389 to 0.490. Exposure, hemisphere fill, environment, signage and post settings remain equal in each corresponding pair. No architecture, asset, actor, geometry or material change appears in the inspected diff; the worktree status showed that one modified source file.

Both manifests have empty error and warning arrays and successful context, browser, browser-server and preview-server cleanup records. Their process receipts record the admitted browser and runner identities already exited, with exit code zero; conhost identities were outside that observer's admission set. Root owns broader cleanup verification. I launched no browser, server, gate or test and created no temporary resource. The reported 20 focused passing tests were not rerun by this reviewer.

These three static compositions establish no continuous motion, performance, full Satellite coverage, Cartographic appearance or final integrated acceptance. The manifest records a Cartographic-to-Satellite switch, but I did not exercise that control. The failed appearance requirement means this candidate should not advance to the final gates or merge. This report is the only reviewer-authored file.
