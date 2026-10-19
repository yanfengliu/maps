# Independent native and performance review — 2026-10-18

Reviewer: independent_review, GPT-6 Astra, xhigh. Target: final source hashes in [round 2](02-source-repair-review.md). Original report follows.

**GO for the bounded native and performance evidence.** No new material finding.

I inspected all six 1280×720 originals and verified their SHA-256 values against `native/report.json`. The dusk/noon entry views preserve the prior scene appearance; the Shift help text is readable. Forward and look views retain street support, crossing paint, façades, trees and bridge geometry.

The capture script exercises real controls. Recorded movement is approximately 2 m normally and 6 m with Shift over 700 ms; release returns movement to approximately 2 m. Focus clearing, style switching, exit/reentry and active-page teardown pass. The script verifies unchanged source/runtime/build inputs.

| Measured crossing route | FPS | Mean CPU advance | p95 frame interval |
| --- | ---: | ---: | ---: |
| Original, 1.4 m/s | 43.991 | 22.305 ms | 33.4 ms |
| Speed-only, 2.8 m/s | 29.755 | 33.084 ms | 66.7 ms |
| Final, 2.8 m/s | 60.002 | 4.493 ms | 16.7 ms |
| Final Shift, 8.4 m/s | 60.003 | 4.491 ms | 16.8 ms |

I recomputed the normal-route results from raw timestamps. The final window contains 724 intervals spanning 12,066.2 ms, with a maximum interval of 16.8 ms. `tools/frame-budget/probe-entry.ts:127–136` confirms that advance timing measures the existing render-loop call.

These results cover one RTX 4090/D3D11 configuration at 1920×1080, DPR 1, default dusk, zero generic population and a held local prototype. They establish neither whole-AOI/populated performance nor cold streaming behavior. Six stills also cannot establish continuous appearance: successive captured gaps are 4.760/0.600 s at dusk and 4.825/0.662 s at noon, including intervening control checks.

The historical baseline retains a post-measurement server-cleanup error. Speed-only and final performance records contain no errors. The separate native-wrapper cleanup repair is outside appearance/performance acceptance.

Inspected image hashes:

| Image | SHA-256 |
| --- | --- |
| dusk-entry | `acb9f5956c0ac5966edfef0441ab9ff1a3aa2bc8223167f68655acc2676b9fe3` |
| dusk-forward | `d68e399f71155791757d933ca5702690241bfd74f016d2a152d3bc4b58be5850` |
| dusk-look | `e4bdadcd52ad6cb412fe370a82f46dde64094014952441a8524ca937a0d14417` |
| noon-entry | `708cb6e48c0f8769b9f6a6226bfc3f2fe648726a674d1eb631b4174a09810ba0` |
| noon-forward | `e4586c088c1436598d1326714a67861580d1d832c86eab10a4327d220951da35` |
| noon-look | `fe7cbde9c88d7a3426ab6339ccb76a6af0a69a1c7d3aa061d2b534cf47ae0197` |

Evidence bindings: native report `98463363db3633789e65a3d753c2aeed0a2dbfb34e90ffd27fa2dd4e8c9b4027`; native inputs `8d984a540743e2c51f2bc72c50df09843e232a5a6f6a8b617e375a27b559714f`; final timing result `6a04a47eb5c4adfb94eb1dcd6cd74bf64522802ad9bb1476381fd801f79bca56`.

Final public visual-set review remains pending. No files changed or browser/server processes launched by this reviewer.
