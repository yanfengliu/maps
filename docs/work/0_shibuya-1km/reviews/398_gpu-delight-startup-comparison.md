# GPU de-light startup comparison

2026-09-30. Authored by camera388. Baseline A is complete and accepted by root within the bounds below. Root admitted one candidate B arm after the integrated canonical visual gate and GPU cleanup. All three B navigations completed and their source bindings passed, but the launcher exited1 on a transient process-ownership tracking error and withheld its aggregate cleanup verdict. Root admitted a supplementary census that resolved current resources and removed only the owned temporary subtree; the original red launcher verdict remains unchanged. Actual timing, historical tracking limits and subsequent closure are recorded separately; no product acceptance is claimed here.

## Method

The probe uses the existing production build on the primary checkout and the default URL `http://127.0.0.1:4324/?style=satellite&time=noon`. It makes three sequential navigations in separate fresh browser contexts, within one fresh headless Chromium process per arm. The viewport is1280×720, device scale1. No population, camera, style, simulation or lifecycle setting is overridden. It uses no CPU profiler, screenshots, input simulation or HTTP-body audit.

Each arm gets an isolated temporary profile/cache/TEMP and Vite cache. CDP HTTP cache disabling is acknowledged before each navigation, and cached/service-worker responses are refused. Preflight input hashing warms the OS file cache in both arms; this is browser-cold production timing, not machine-cold timing. Later contexts share that arm's browser process, so their browser/GPU initialization history is not identical to the first context; B must repeat the same sequence.

The frozen read-only harness and loading overlay are polled nominally every250ms. A readiness observation requires a drawn frame, no reported failure/context loss, hidden loading overlay, all67 loaded models, all44 prepared final leaves, cutout readiness and equality of the loaded/required leaf URI sets. The first positive sample supplies an upper bound; its preceding negative sample supplies the exclusive lower bound. Long synchronous work delays polls, so these intervals are not exact event timestamps. Each positive ready observation must arrive within90,000ms of navigation in the Node clock. The arm has a270-second browser deadline and a300-second owned-launcher deadline.

B must preserve URL, viewport, settings, input cache policy, probe, scene/decoder/config files, embedded harness source, Chromium executable/registry/Node version, adapter and driver. Source/build bytes may change for the candidate, but each arm must retain identical inputs throughout its own run. B requires the completed clean A receipt and verified owned cleanup before launch.

## Frozen probe source reviews

Root read the actual runner/wrapper diff and independently rehashed them. Independent reviewer motion380 reviewed the exact source and focused corrections. Two material source findings were fixed before dispatch: an incorrect normalized-harness digest field could compare two undefined values, and a ready evaluation begun before the deadline could return after it and pass. The frozen version asserts concrete64-hex digests, compares `normalizedSourceSha256`, checks positive observation elapsed time and rejects `deadlineExceeded`. These are source-review results, not claims that those rejection paths were exercised in a browser.

| Frozen input | SHA-256 |
| --- | --- |
| artifacts/gpu-delight398-timing/runner.mjs | c07d67f91dacbcfd02d6b56acb0a9617bf76513e9261990555376cef5bba11dc |
| artifacts/gpu-delight398-timing/run-owned.ps1 | 61b26067580b2b7a4651d9f34d126e45d58c987eb6b2e22b64a9c995ee2b6edd |

The wrapper reuses395's retained-handle process ownership and exact final identity/port/marker census. Its scoped differences are arm/output paths, marker, port4324 and launch arguments. Root admitted A only after the focused independent re-review. There was one actual baseline arm; no runtime retry occurred.

## Completed baseline A

Command: `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File artifacts/gpu-delight398-timing/run-owned.ps1 -Arm A -TimeoutSeconds 300`, primary cwd, scoped elevated for the known Windows WMI sandbox restriction. The source HEAD recorded by the receipt is `7b9ffb0835b71879c7395297d8e6cd9002f3233a`; accepted runtime remains `c201b1723d287ad73b52c7227f4e97256190069b`. The build matches visual run `322e0ae20988845e`, whose certificate SHA-256 is `c8c24e831a7834f4667ec66304a1e024bccc8cc03dfe6cc58d090f2b1a62c3da`.

Numbers below are derived from A/run.json, rounded to0.1ms. Intervals use browser navigation-relative performance time; the separately checked Node elapsed ready observations were20,239.3/18,224.7/18,333.0ms.

| Navigation | First frame upper ms | First final leaf upper ms | All67 models and all44 leaves interval ms | Visible full-city ready interval ms | Maximum sampling gap ms |
| --- | ---: | ---: | --- | --- | ---: |
| 1 | 517.5 | 6116.5 | (16127.0,16968.2] | (16968.2,20234.7] | 3266.5 |
| 2 | 385.0 | 5693.4 | (15603.3,16487.2] | (16487.2,18220.9] | 2914.9 |
| 3 | 323.1 | 5727.0 | (15710.4,16605.3] | (16605.3,18329.3] | 2896.6 |

Each navigation recorded19 samples, completed67 unique tile HTTP200 requests, reached the exact required44-leaf set, and reported ready with the overlay hidden. The three full-city upper bounds range from18,220.9 to20,234.7ms. The third first-leaf upper bound is5727.0ms; earlier chat summaries with different values were transcription errors and are superseded by this receipt-derived table.

All three actual renderers were `ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)`. The machine probe before/after reported NVIDIA GeForce RTX4090, driver616.64, through nvidia-smi. Pinned headless-shell revision1243, Node v24.12.0, browser executable SHA-256 `addfa79abb060e1e514e155ed745d4bf96140bca402735958bb4e223aea0b98c` and browser registry SHA-256 `545d52f8382c391e605562c330e9c1c534a16045898203037a49bb8bd769a946` are recorded. There were zero browser errors or warnings.

All291 disk input bindings were equal before/after. Root independently rehashed all291 with zero mismatch. The scope includes runtime/build/source, scene/network/rail, Draco, configuration, serving/ownership/GPU helpers and the two probe files. The embedded harness source hash is `6d05fe8bcae158aa08fd2a288d14c2c3cf89388e4a5be28102339a8c696157f6`. Successful uncached requests and unchanged disk mounts bind the normal production serving path; response-body equality was not separately audited. No images were captured or visually accepted by this timing probe.

## Baseline A cleanup and receipts

All six runner cleanup flags are true: page, context, browser, browser server, HTTP server and esbuild. Each individual context/page was also closed. The wrapper reports exit0 and cleanupVerified=true with an available census, zero live admitted/omitted identities, zero marker processes, port4324 closed, no cleanup errors and owned temporary files removed after its non-following directory check. The final terminal poll found its session already closed; the retained-owner cleanup receipt supplies the exit/census evidence. GPU/4324 were released. User port5319 was untouched.

| Retained evidence | SHA-256 |
| --- | --- |
| artifacts/gpu-delight398-timing/A/run.json | 662c3189c7cf32e3f074c2d41817fc7de8c073d453c4a659444901bf293ada53 |
| artifacts/gpu-delight398-timing/A/process-cleanup.json | c11f5448b2c09c95e6fda02d092cf1f1dadfde26eee7657d444c4bdd461c4285 |
| artifacts/gpu-delight398-timing/A/process-owner.json | 9a2ffdd2c3673bc31850fecaa71d647b4c7e5f10973ae4c64a362ac77a05f800 |

The original in-app-browser symptom of remaining at0/44 is not classified by this production timing result. Dev entry discovery was treated separately in387/390. Native appearance, disposal/restart lifecycle and the full-population60fps target are separate acceptance questions.

## Completed candidate B measurements; launcher cleanup red

Command: `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File artifacts/gpu-delight398-timing/run-owned.ps1 -Arm B -TimeoutSeconds 300`, primary cwd, scoped elevated for the same native ownership requirement. There was one B dispatch and no retry, source repair or second measurement. Its receipt records main HEAD `b3b02a05a2766e73c8ded036067611259d82a162` with the nine root-adopted candidate paths still uncommitted. Run started2026-09-30T12:01:49.721Z and completed12:02:20.732Z.

The served candidate build matches canonical visual run `9174dee71f86ed7d`, certificate SHA-256 `533a6778f3efeb8f3fe86b743fb8ebb19974ae4456e89685c8a35a896c5949ce`. That separate gate certified44 frames and three hardware lifecycle records before B was admitted. B retained the same default URL, viewport/device scale, context sequence, cache policy, polling/deadlines, actual adapter/driver, browser executable/registry/Node and concrete embedded harness digest as A. Its `baselineReceiptSha256` is the unchanged A digest `662c3189c7cf32e3f074c2d41817fc7de8c073d453c4a659444901bf293ada53`.

| Navigation | HTML commit ms | First frame upper ms | First final leaf upper ms | All67 models/all44 leaves interval ms | Visible full-city ready interval ms | Maximum sampling gap ms |
| --- | ---: | ---: | ---: | --- | --- | ---: |
| 1 | 10.8 | 502.7 | 2746.8 | (7352.5,7787.3] | (7787.3,10982.3] | 3195.0 |
| 2 | 11.7 | 356.7 | 2914.7 | (7300.9,7762.8] | (7762.8,9443.8] | 1681.0 |
| 3 | 7.0 | 410.5 | 2742.3 | (7280.6,7733.8] | (7733.8,9361.7] | 1627.9 |

The separately deadline-checked Node ready observations were10,988.706/9,449.1496/9,365.3182ms. Sample counts were18/18/17. Each navigation completed67 unique uncached successful tile requests, reached the exact44 required leaf URIs, and showed ready with the loading overlay hidden. All three actual renderers were RTX4090/D3D11; before/after hardware identity is unchanged, driver616.64. There were zero browser errors or warnings. The runner records `passed=true`, no failure/bindingFailure, and all six cleanup flags true; each individual page/context also closed.

B binds292 input records before/after with exact equality. The additional record relative to A is `src/render/atlas-delight.ts`. The runtime source differences are that new file and the admitted `buildings.ts`, `facade-textures.ts` and `tile-transaction.ts`; build differences are `dist/index.html` and the renamed main/local-walk JavaScript bundles and their source maps. All non-source/non-build records match A exactly. The concrete normalized embedded harness hash remains `6d05fe8bcae158aa08fd2a288d14c2c3cf89388e4a5be28102339a8c696157f6`. The separate nine-path integration/gate record402 binds the adopted tests as well; this timing probe does not claim to bind tests it did not read.

The last tile download completed1881.1/1619.8/1514.2ms after the respective CDP document request. Subtracting those document-relative network values from the browser navigation-relative readiness upper observations gives indicative residuals9101.2/7824.0/7847.5ms. These use distinct clock origins, so they are not exact CPU phase durations or event timestamps. The unprofiled probe supplies no CPU/GPU attribution for that residual.

The B readiness upper observations range9361.7–10982.3ms, versus A's18220.9–20234.7ms. All B observed readiness intervals lie below all A readiness intervals: B's largest upper bound10982.3ms is below A's smallest exclusive lower bound16487.2ms. That is a measured readiness improvement under this configuration despite delayed polling; it is not a machine-cold result or an exact percent speedup, and the launcher cleanup qualification below remains separate and red.

## Candidate B cleanup qualification and receipts

The wrapper returned exit1 and `cleanupVerified=false`. Its only cleanup error is `ownership-unavailable` for PID51560: `GetProcessById` reported that the process was no longer running after the CIM snapshot had selected it. Seven retained handles were already exited. The available final census nevertheless reports `admittedLive=[]`, `omittedLive=[]`, `markerRows=[]`, `portClosed=true`, `portRows=[]` and `error=null`. The two omission records include a conhost and a transient renderer; no fallback process termination was attempted. The lost child handle cannot be retroactively reported as retained, and no aggregate arm pass is claimed.

The wrapper conservatively preserved `artifacts/gpu-delight398-timing/B/temporary/`; its non-following removal precondition was not satisfied because the ownership error remained recorded. The author stopped and reported the red exit before any follow-up. Root then admitted only the supplementary closure below, with no repeated runtime, probe change or retroactive aggregate pass.

The available supplementary CIM census found every recorded known/omitted exact identity absent, PID51560 currently absent, zero B-marker processes, zero references to the exact B temporary path, and zero4324 listeners. No historical creation identity was retained for51560; current absence resolves the current resource census and cannot retroactively prove handle ownership. The literal and resolved target `C:/Users/38909/Documents/github/maps/artifacts/gpu-delight398-timing/B/temporary` matched. All10 relevant ancestors/root were checked without reparses; a non-following census found one remaining entry and zero descendant reparses. Only that owned temporary subtree was removed and is absent afterward. No process was terminated. Original run/cleanup receipts were rehashed unchanged. The GPU/4324 resource blocker is resolved within this current-absence bound; root and the independent reviewers own measurement/product acceptance.

| Retained B evidence | SHA-256 |
| --- | --- |
| artifacts/gpu-delight398-timing/B/run.json | 5501179ea3d8b6701da1d61db2c5fdb72b90cde42a603a69b7120f034aea15a9 |
| artifacts/gpu-delight398-timing/B/process-cleanup.json | 18e03e5ccb74cfe0a90ba5ce2124ca1e4532aa6849ece21f8886e00b47f30ff5 |
| artifacts/gpu-delight398-timing/B/process-owner.json | 4ae1a4b91800c82002a4f3168cb3199143ec5dbd66abb2454dfea7c353e97290 |
| artifacts/gpu-delight398-timing/B/run.log | 0d11f24548bf2456160e18e063e0bea1e441eb49daea25ba2558f9da8f4b42cb |
| artifacts/gpu-delight398-timing/B/run-errors.log | 91d4d80f6fdad102ae096b261e220d530589c511323ce5ae0b46871e960c1f44 |
| artifacts/gpu-delight398-timing/B/supplementary-closure.json | 8d11816eddb8ab46c6e5e671e6a10a4358a30fcdad2834efd6c37bc63caf8c17 |
