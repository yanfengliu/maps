# 1522 — Independent aged-pace review

Date: 2026-10-17 (measurement UTC 2026-10-18). Status: PASS for the bounded 1521 instrument and actual two-arm observations. No material methodological finding remains. The component causing the slowdown is UNKNOWN; this is not traffic acceptance or a production fix.

## Subject and prelaunch review

The subject remains unmerged traffic candidate3 in `artifacts/traffic1499/worktree`, branch `codex/traffic1499`, base `0681715632e66ad825a3d78ac7d9282c5cb038b5`, freeze SHA-256 `461a3e2deed114a29f290e7e36b974516072816fdeb7c7a37e2e8359f991e91c`. The counter, clock, query, fixed-step cap and rendering-path source review in [1520](1520_pace-instrument-review.md) applies to the unchanged bytes.

I read the complete new helper and its literal diff against 1519 before the new GPU lease. `artifacts/performance1521/capture.mjs` is SHA-256 `ecb318acd5043e5f5b50f630d48e923f05ae0b670fd53e219b58bc2ed0087acb`; `run-owned.ps1` is `3561270cabd3be77e8adda84fb607a68df765bb6bfb0738d09288882efeb33bd`. The changes select B then C, replace the quiet warmup with 180 seconds of wall aging, add C's existing full far observer during aging, and retain the 20-second measurement and original controls. This matters because 1519 C had a quiet warmup and observed only during its measurement.

B uses only common endpoint snapshots during aging and measurement. C runs the historical full observe/validate/sample projection and then waits 1000ms during both periods. Both use ordinary `/`, 24 requested vehicles, no generic pedestrians, seed 5970698 and the retained walker started through its real button. The same OrbitDriver inputs establish the 45m crossing view; source/configuration/data, Satellite dusk, moving post path, hardware renderer and 1280×720/DPR1 are fixed. One browser/context has one page at a time; the first page closes before the second starts. Native proof images precede aging.

The existing supervisor caps the entire owned process at 600 seconds. The nominal two 180+20-second periods leave 200 seconds for startup, navigation, pins and cleanup; measured earlier setup suggested sufficient headroom but did not guarantee completion. Nested operations do not extend the outer cap. No extra launch, rerun, source hook, actor reset, fake clock, profiler or qualification capture was approved or performed in this review.

Equal wall aging is a valid comparison of the two complete execution paths. Different simulation ages are an outcome of those paths, not a reason to realign actors. This design is not a pure per-call cost comparison at identical simulation state. One B-then-C pair also cannot exclude order, cache, external-load or state effects.

## Actual evidence

The payload completed 02:51:24.987–02:59:00.934 UTC, within the 600-second ceiling, and the supervisor exited 0. I independently recomputed the following from raw browser performance.now and frame/walker counters. Node monotonic bounds enclose each actual measurement interval. The counters measure returned application render calls and eligible shared fixed steps; they do not measure GPU-completed frames or GPU milliseconds.

| Condition | Actual aging wall seconds | Population seconds at measurement | Actual measurement wall seconds | Render iterations | Iterations/wall second | Fixed simulation seconds/wall second | Full observer calls, aging/measurement |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- |
| B, endpoint-only | 180.0737 | 166.600–182.167 | 20.1342 | 216 | 10.7280 | 0.773146 | 0 / 0 |
| C, far observer | 180.9783 | 183.250–201.350 | 20.3551 | 472 | 23.1883 | 0.889212 | 171 / 18 |

B advances 160.183 simulation seconds during aging, an average ratio 0.889543, then 0.773146 in its final window. C advances 178.117 during aging, an average 0.984188, then 0.889212. These are period averages, not proof of a monotonic trajectory or an exact onset. The actual aging durations replace nominal 180 seconds; the roughly 0.9-second between-arm difference is disclosed rather than hidden.

Both have 21 active and rendered vehicles at measurement start and end, with 24 requested. Neither fills all 24 slots. B's walker event history grows 997→1091 entries; C's grows 1099→1208. Walker root-time differences agree with tick/60, and population tick differences equal walker differences. Interpolated train ratios 0.773970/0.890028 corroborate them within endpoint phase differences.

The aging/start/end cameras remain exactly stable within each arm and differ between arms only at floating-point rounding scale. All saved endpoints have idle tiles at revision 67 with unchanged visible URI identities. Post settings match across arms and endpoints: nonaccumulating TAA, sampleLevel1, 2560×1440 scene target with 4 requested MSAA samples. Readiness, seed, style, requested counts, drawing size and RTX4090/D3D11 renderer satisfy the declared checks; there are no application errors or material authority/refusal errors. Driver 32.0.16.1664 matches the previous diagnosis.

I opened both native 1280×720 proof images individually. They show the same expected crossing composition, Satellite selection and Local walk running. Their purpose is framing; they do not establish appearance throughout aging or actual boundary exit. Each actual byte length and SHA-256 independently matches capture.json:

| Original under run1/payload | Bytes | SHA-256 |
| --- | ---: | --- |
| pose-1-B.png | 902944 | 0174090101dadbf563c2925efd38a431e6264f22c43fc286db3fbba0678c6697 |
| pose-2-C.png | 902850 | c2e4a11c6135569b8f3fd5fa47e2c54be14db8e6a6aec1a53fd3109ad6f54c23 |

## Interpretation and limits

The quiet aged B window establishes that substantial slowdown occurs without intervening full observer polling. Its 10.728 render iterations/s and 0.773146 simulation/wall ratio are substantially below the young ordinary B windows in 1520, despite the same camera and moving render configuration. The current B aging average also exceeds its later measurement rate. Thus a large slowdown does not require continuous full harness observation. Common endpoint observation, automation connection and process-ownership supervision remain present.

C is faster than B in this ordered pair while having a later simulation age and larger event history. This does not establish that polling improves performance, give a signed observer cost, or disprove all history-dependent costs. It also prevents treating history length alone as a demonstrated dominant cause. The natural phase/actor-state differences, order and unmeasured external load remain possible contributors. Both aged final windows are slower than their young counterparts, but the rate variation is not identified by a component measurement.

The retained run3 far-wait decline in 1520 remains valid within its historical UTC-timestamp bound. Together the records justify investigating work that can slow the ordinary running experience without full polling; they do not isolate walker support, vehicle simulation, train/scene rendering, GPU work, memory/GC or another subsystem. No production patch or further experiment follows automatically from this review.

## Input binding and cleanup

I compared before/after manifests and independently hashed all 322 current files against the final manifest: 139 source, 6 dist, 121 scene, 1 network, 34 rail and 21 visual-harness files. Every length/hash matches. These checks bind actual endpoint bytes; they are not an atomic filesystem lock. The reviewer changed only this authored review after 1520 was sealed, and launched no browser/server/GUI or runtime probe.

Payload cleanup reports page, context, browser, browser server, preview and esbuild closed. The supervisor's fresh 02:59:01.5719885UTC census and the later 02:59:58.1110870UTC census independently report no known, omitted or late descendant survivors. I read and hash-checked the later receipt: the exact owned external TEMP directory has zero descendants and is absent after cleanup.

Raw evidence stays ignored under `artifacts/performance1521/run1/`. `payload/capture.json` SHA-256 is `42a1dd7bb35c8f245c9f1970eb9e339e2f38ddaeef36ec155730f259ac7269c6`; `payload/measurements.json` is `cb5d524f2dd65e082afd311eec643a13873dc90b9ec55bde2334f98d85823349`; `process-cleanup.json` is `d26596b4a2719e561d7f1cc610d3410435065b882701b04dcf1f083b1a402210`; `temporary-cleanup.json` is `10797193f702dc168173f8b0bbc2aba859c8fab82dc61c2a1413b54cfb2dcff9`.

The bounded diagnostic is reviewed and complete. Native true boundary exit, continuous contact/interpolation, full fleet/crowd fill, GPU timing and the 3,000-pedestrian/200-vehicle/60fps at 1080p requirement remain OPEN. Five code gates, executable commit, source adoption and main integration DID NOT RUN in 1521. Candidate3 remains unmerged and unadopted.
