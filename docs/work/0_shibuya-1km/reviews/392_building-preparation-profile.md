# 392 — cold production building preparation

2026-09-30. Worker: camera388. Bound: one instrumented, fresh-browser-context production navigation at accepted main `c201b1723d287ad73b52c7227f4e97256190069b`, Satellite/noon, default camera and actor configuration, 1280×720. This is cost diagnosis, not a fix, an uninstrumented latency qualification, a visual review or the population performance gate. Root owns the next experiment and integration.

The observed delay is predominantly synchronous facade preparation on the main thread after building downloads finish. De-lighting accounts for 10.362 s of the 20.438 s weighted main profile. Four Draco workers together have only 0.301 s of sampled non-idle time. Geometry section generation is a smaller cost in this run. Preserve the existing requirement to prepare all 44 final leaves before revealing the city.

## Instrument and timings

The existing frozen harness and `tools/visual/lifecycle.spec.ts` answer frame/readiness, loaded-model and prepared-leaf milestones. They do not attribute preparation CPU. One CDP main-thread profile and four actual Draco-worker profiles supply that attribution, alongside CDP Network completion events and a buffered native long-task observer. A 120 ms named busy-function control on `about:blank` produced 85 samples and the expected function before the application navigation; it touched no application asset. Requested sampling interval was 1 ms. No pose setter, control input, response-body audit, screenshot or source instrumentation ran.

| Observation | Time from document origin |
| --- | ---: |
| HTML headers / body complete | 5.7 / 6.1 ms |
| First sampled real render-loop frame | 398.3 ms |
| First building request | 1,354.6 ms |
| All 67 building responses complete, HTTP 200 | 2,176.1 ms |
| First sampled prepared final leaf | 6,090.9 ms |
| All 67 models loaded and 44 final leaves prepared | 17,058.8 ms |
| Last scene response, late `control-hardware.json` | 17,061.6 ms |
| First sampled ready state with loading overlay hidden | 20,426.9 ms |

The separate wall-clock wait for `page.goto(..., waitUntil: 'commit')` was 14.48 ms. Building preparation continued for 14.883 s after the last building transfer; the visible-ready sample followed that transfer by 18.251 s. No response reported disk-cache or service-worker reuse, and no request failed. “Cold” here means a fresh browser context with the existing disk scene; OS filesystem and driver caches were not flushed. Network timestamps were aligned through the document request's wall time and `performance.timeOrigin`.

Readiness values are sampled upper bounds: nominal 250 ms polling yielded only 20 observations because long tasks blocked the page. The first-frame observation is not proof of visible buildings. `src/app.ts:227` keeps the city hidden until scene loading and `buildings.displayReady`; `src/scene/buildings.ts:431` and `src/scene/aoi-cutout.ts:37` retain all 44 leaves and visible-tile coverage. The renderer's “parsing” counter includes asynchronous facade/cutout hooks and subsequent resource accounting, so it cannot independently measure Draco decoding. This 20.427 s production single-page run is a new baseline; it does not establish improvement over the earlier 45.80 s dev run or the 32–34 s concurrent visual-lane runs.

## Ranked sampled costs

The main profile contains 14,128 samples over 20.438 s. Group self time sums each sampled stack's executing frame once. Inclusive time contains callees and must not be added to their self time. Offline source-map attribution uses the unchanged production maps.

| Rank / source | Group self time | Interpretation |
| --- | ---: | --- |
| 1. `src/scene/delight.ts` | 10.362 s (50.7%) | `delightInPlace:283` is 10.039 s inclusive. Its inverse-sRGB converter `linearToSrgbByte:40` alone is 5.714 s self across nodes; three per-pixel power conversions sit inside the parent cost. |
| 2. three.js shader `onFirstUse:6491` | 2.015 s (9.9%) | First-use program checks and their native boundary. This is sampled main-thread time, which may include driver waiting, not measured GPU execution time. |
| 3. `src/scene/signage.ts` | 1.911 s (9.3%) | 1.994 s inclusive; `writeSignMask:184` is 1.797 s inclusive, including 0.787 s in `smoothstep:220`. |
| 4. `src/scene/paint-support.ts` | 1.058 s (5.2%) | Most is the returned indexed triangle-query function at line 33, called during paint presentation preparation. |
| 5. Native `createImageBitmap` | 0.653 s (3.2%) | Sampled main-thread native API cost; background browser image processing is outside these JS-worker profiles. |

`src/scene/cutout-sections.ts` accounts for 0.216 s self and 0.341 s inclusive. It is not the leading target here. Garbage collection contributes 0.126 s; `(program)` leaves 1.113 s unattributed. Facade orchestration includes these child scopes, so its 13.776 s inclusive total is not additional time. All-node, recursion-safe inclusive unions and raw function rows are retained in `analysis.json`.

The four Draco-worker profiles each span about 19 s and are more than 99.5% idle by weighted samples; combined non-idle time is 0.301 s. This bounds the captured worker execution, not every browser-internal decode thread or native allocation. There are 71 long tasks totalling 18.949 s, 92.8% of the observed visible-ready interval; the largest lasts 2.345 s. Native calls and driver waits can contribute to those wall durations. CDP reports 20.049 s TaskDuration and 17.704 s ThreadTime; its 2.712 s ScriptDuration alone does not represent the complete sampled preparation cost.

## Smallest next experiment

Prototype only the per-pixel de-light pass on the existing hardware GPU, outside production integration, using actual capped atlas bytes and the unchanged settings/reference output. This follows the local GPU-first rule and addresses the measured dominant scope. Compare every output channel, alpha, source orientation and dimensions, mask inputs and reported statistics; measure the whole pass including upload, readback if needed, and resource disposal. Float precision and byte rounding may differ from JavaScript's scalar path, so parity is an acceptance check, not an assumption. Keep the original path available for the comparison. Do not reduce atlas resolution, disable de-lighting/sign masking, change source bytes or relax the 44-leaf reveal boundary. A successful small prototype precedes any worker, persistent cache or pipeline redesign. The sampled converter cost is an opportunity bound, not a promised latency reduction.

## Reproduction, bindings and cleanup

Actual command, cwd `C:/Users/38909/Documents/github/maps`, Node `v24.12.0`: `& ./artifacts/performance392/run-owned.ps1 -Output artifacts/performance392 -TimeoutSeconds 360`, exit 0. It used the inspected retained-handle hidden launcher, installed Chromium with D3D11 on the NVIDIA RTX 4090, driver `616.64`, and the existing production build through the actual Vite preview configuration on owned port 4324. The harness reported the RTX 4090 ANGLE D3D11 renderer, no error and no context loss. Navigation/readiness deadlines were 180/150 s. No full gate ran. Profiling, worker auto-attach and polling may perturb this one latency observation.

Before/after hashes match for all 291 bound product source, build, cached scene/data, serving, runtime and measurement-tool inputs. The existing visual certificate `322e0ae20988845e` (`c8c24e831a7834f4667ec66304a1e024bccc8cc03dfe6cc58d090f2b1a62c3da`) bound the runtime build before launch. These filesystem bindings are not a new HTTP-body certificate. No product, build, dependency or scene file changed.

| Retained ignored evidence, under `artifacts/performance392/` | SHA-256 |
| --- | --- |
| `profile.json`, timings/network/291 input bindings/worker summaries | `2cffcf7b684375973e5c1b948947bf044ee5f7226aa65a5a5ea57d4247431a69` |
| `main.cpuprofile` | `03e73df34a276fe497b211cd551b15e5a237bd489079e549dcc598bc317e5240` |
| `analysis.json`, complete grouped attribution and worker/network totals | `400f05cd1be3cb48fc0678e094c5aa2690e48922e7944daaf135dd6e3515a7a9` |
| `closure.json`, exact process/port census | `c2050dcefcc080ede54bd84a655efda787d9fbe81015339676cfbeb78eb0bc4f` |
| `profile.mjs` / `run-owned.ps1` | `ee054330bcd15063bb97f30ddd17c14afe641761b745525c0bed1acb20edb2fc` / `c949b63f6c41b7fddd7ef019d9743dcf7fff9438d91a15fac1591e037fde5723` |

The raw worker/control profiles, stdout/stderr and ownership receipts remain beside these files. `node artifacts/performance392/analyze.mjs` completed offline with exit 0; its first invocation failed on the observer receipt field name and was corrected from `entries` to `rows`, without repeating navigation or changing evidence. Browser page/context/server and Vite/esbuild shutdown all succeeded in `finally`. The completed creation-identity census found no remaining admitted identities, omitted identities, session-marker processes or port-4324 listener. The checked owned temporary directory was removed after a non-following reparse-point census; intentionally retained evidence remains. User port 5319, visual port 4319 and the preserved frontage checkout were untouched. Independent source reconciliation belongs to worker370's review 393; this author does not supply an independent vote on their own instrument.

## Independent check and root acceptance

Read-only reviewer motion380 independently recomputed the raw 14,128 sample/time-delta pairs and source-map attribution. The weighted total is 20,437.982 ms against a 20,438.162 ms span, with no missing sampled node. Their de-light, converter, signage, shader, cutout and worker totals agree with the recorded groups. They independently aligned all 67 tile responses to 2,176.115 ms, distinguished the later control-hardware response, and verified the source-map binding and empty cleanup census. No material measurement finding remains. The largest readiness polling gap is 3.368 s; sampled milestones remain upper bounds. This reused worker is not a fresh-context critic.

Root accepted that scoped independent vote and the separate source diagnosis 393, read the actual profile/analysis/closure artifacts, and rehashed all 291 bound files against their before/after arrays with no mismatch. The next admitted step is one ignored actual-atlas GPU prototype, with no product integration or latency qualification implied. Exact RGBA equality, bounded RGB differences with exact alpha, and native appearance equivalence require distinct conclusions; a mismatch blocks automatic promotion until root selects an evidence-based contract.
