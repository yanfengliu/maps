# Review 346 — bounded Satellite lighting trial

Date: 2026-09-28. **REJECTED after one matched comparison.** Root and independent 347 inspected all six originals and found no clear improvement in depth or readability in either hero view. The candidate produced restrained brightening without a material regression. The implementation owner's native inspection agrees. No second candidate or final all-five gate was run; the source edit is restored and no code commit was made.

## Candidate and restoration

The retained crossing-frontage checkout was safely advanced from b01096dd to accepted main 2146b2b5972b40ea615cce8dcfb4542e191d480c using a mixed reset and the exact 14 documentation restores. All 13 corner source files remained byte-identical to primary; ignored raw source, scene cache and earlier evidence were preserved. Primary later advanced through a documentation-only checkpoint; this comparison kept its original base.

Only src/scene/time-of-day.ts changed: direct coefficient 3.1 to 3.8 (+22.6%) and twilight-key coefficient 0.46 to 0.58 (+26.1%). The adjacent comment was corrected so its earlier irradiance estimate did not claim to justify the new values. Fill, exposure, post chain, sky, direction, materials, source atlases, geometry, signage and actor state were unchanged.

Candidate SHA-256: 5069436195c73fa31cf93b7ec3d98e46177c2d6a9f26636ad4675dcb91e8d8f8. The exact candidate remains in candidate1/time-of-day.ts and rejected-candidate.patch under the evidence root below. After rejection, current and frozen candidate hashes were verified, then only this task's source edit was restored from baseline-time-of-day.ts. Restored SHA-256: 50a7e6f9ea2fdb9bf59c9f26302bd7c97d3a2021167c3ea537a380211ff88e7a. The product diff against 2146b2b is clean; restoration.json records that check.

## Matched native evidence

Evidence root: C:/Users/38909/.codex/worktrees/crossing-frontage/maps/artifacts/lighting346-20260928. The retained Satellite tonal runner was minimally adapted to the three 342 compositions using existing OrbitDriver, shot constants, GPU identity, scene digest and retained-handle cleanup helpers. Each arm contains three original 1280x720 PNGs, opened individually at original detail. No crops, contact sheet, alternate camera or moving-image inference was used.

| Original filename under baseline/ and candidate1/ | Baseline SHA-256 | Candidate SHA-256 |
| --- | --- | --- |
| hero-satellite-noon-crossing.png | 7cf493e2f433615ae835cdc845f8d374ab3623db5ccd7071bfd814b7285d15de | a1fdbea3f52607674346c2a7b0a579ddc1148fc157b9b3b83db67becc20e6ce8 |
| hero-satellite-dusk-approach.png | baecb85f25ed63f9091fefaec3c25bd7a4413e937951d38bcaed3d393aa33795 | eedd4af2d92c4684c224f7604897d770d7997d885f10fe856cd432c57bc8928f |
| overhead-az000.png | e231b7bf58ce5b5c3ebc2633b2f011ac5faaabeea1231287410fa765e9ba9f92 | 8e25d259b8b5b9dc4f708ceee7a46d6516436611bda8f8be11ec110d850f5450 |

comparison.json SHA-256: f1844b000f6e7e78a6df616f03f7b998e3887a2cf591731cee36ee6610bde194. All three A/B camera position, target, distance, azimuth and polar deltas are exactly 0. The renderer is the same RTX 4090/driver 616.64. Both arms retain accepted 338's scene digest dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce over 151 served files/354752173 bytes. Source, build, scene and harness records were unchanged during each arm; the sole cross-arm source change is time-of-day.ts. Disk binding is not a claim that every HTTP response body was independently hashed.

The actual key intensity changed 2.365 to 2.899 at noon and 0.389 to 0.490 at dusk. Harness observations confirm nonzero environment intensity, active post, settled 32-sample TAA, identical remaining lighting/post settings and identical unattached zero-population state. Each arm exercised a real Cartographic-to-Satellite dropdown round trip and preserved camera position within 5 mm. This is a basic switching check, not detailed Cartographic appearance acceptance.

## Checks, failed attempt and cleanup

The unchanged road-tone, environment-grading and realism tests passed 20/20 in 1.35 s. Baseline/candidate production builds passed in 1.93/1.89 s. Node was 24.12.0. Each build used owned output. Vite received a directly imported configuration with configFile:false and an owned cache directory; Vitest used its runner loader, cache:false and owned cache/TEMP paths. No installation, data regeneration or primary source/build edit occurred. No whole shared-dependency before/after inventory was taken.

One initial capture attempt failed before launching a browser/server because the adapter passed a path to sceneTreeDigest instead of using its default mount list. Its exact logs remain under failed-baseline-preflight-1; the corrected call completed the baseline. Successful captures took 84.983/84.476 s, including loading, controls, screenshots and style checks; these are not rendering FPS measurements. The failed attempt's cleanup showed no survivors but did not report overall success because capture exited 1.

Both successful arms closed contexts, browser/server objects and preview in finally; retained-handle cleanup and final process/port observations passed with no owned survivors or 4324 listener. Only lighting346's verified unlinked temporary directory was removed. An extra temporary-cleanup guard initially matched its own PowerShell command text and refused before deletion; the corrected executable-scoped observation found no owned processes. Earlier cache/evidence and all 13 corner source hashes remain intact. The active checkout intentionally retains the frozen rejected candidate and comparison for review; root owns its later lifecycle.

This trial rejects the hypothesis that a modest increase of the existing key lights alone supplies the required visible hero improvement. It does not establish that every lighting change would fail, nor accept photorealism, animation, contact, population performance or the full scene. Root stops this direction rather than spending the two-candidate ceiling automatically.
