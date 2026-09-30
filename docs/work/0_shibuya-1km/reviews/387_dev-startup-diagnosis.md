# 387 — Development startup diagnosis

The user reported Satellite/noon on port 5319 stuck at “Loading Shibuya buildings: 0 of 44 ready”. User resources were untouched. No product/Git change, build, install or data regeneration ran.

Initial direct HTTP returned 200: index 50.58 ms; tileset, root/first final tile and Draco files 3.66–8.03 ms. Only 5319 listened among 5319/4319/4324. Timestamp was not retained. Before reproduction, server PID 51468 disappeared; at 05:27:51 UTC requests failed. Subsequent checks returned ECONNREFUSED; existing-tab CUA returned `Browser is not available: iab`. The original browser stall remains unclassified.

Three admitted cold experiments used unchanged primary Vite/app bytes, owned port 5320, separate empty dependency caches and fresh headless contexts. Baseline and entries-only runs both failed before document headers/commit within the configured 30 s navigation bound. Entries-only scan resolved at 24.28 s, but HTML stayed blocked. Its watcher held 6,679 directories/58,209 entries, including 6,625 artifact directories versus 13 src directories. Observed Node RSS was 801 MB and cumulative CPU 62.14 s, including 50.88 system seconds.

Installed Vite's matching default discovery census found 284 HTML entries, 282 under artifacts. The project-root watcher also includes retained artifacts. Entries-only is insufficient.

Adding only artifact-watch exclusion to the entries-only configuration passed. Watch scope fell to 54 directories/1,181 entries, with zero artifact directories. Document commit took 121.60 ms. Relative to navigation, first sampled frame was at most 4.81 s, internal meshes 9.16 s, first final leaf 14.05 s and complete visible city 45.80 s. These are sampling upper bounds. All building HTTP requests finished by 14.05 s, while preparation continued from one leaf through 44; no frozen 0/44 reproduced. Significant preparation latency remains.

The successful run loaded 67 models and all 44 final leaves, with 150 internal meshes/460,159 triangles. Cache accounting was 647,282,035 bytes; reported uploaded bytes 486,954,234 are renderer estimates. RTX 4090/D3D11 and vendor driver 616.64 matched. The single 1280×720 first-visible PNG was inspected at original resolution: the Satellite square is visible without the loading overlay. Its SHA-256 is `106af9898af71e215aab4400a6a1ee2d7e185d3628549ae5bad43b4e1cb25a42`.

All 286 bound files totaling 364,630,382 bytes stayed unchanged. Largest sampled Node RSS was 285,978,624 bytes, not a continuous peak. No runtime errors occurred. Cleanup took 0.415 s; every close succeeded. At 06:16:04Z all eleven observed process IDs and the task marker were absent; 5319/5320 had no listeners.

Proposed product fix: pin optimizer entries to index.html and exclude `**/artifacts/**` from watching. Gate actual discovery/watch exclusion with unrelated retained HTML/source fixtures, a mutated old-config red control and preserved src hot reload. Measure complete-city startup separately from HTML. No product fix is implemented yet.

Ignored evidence: `artifacts/startup387/{initial-http-witness.json,http.json,iab-unavailable.json,html-entry-census.json,cold/,scoped/,combined/}`.
