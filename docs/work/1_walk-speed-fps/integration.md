# Faster walking and walking FPS — 2026-10-18

Owner: root. Base: c3dde03. Executable main revision: `883d31ac72818d1518ed9cbb51c493ba3d8a2728`, pushed to origin/main. All requested acceptance checks pass within the bounds below.

The owner requested faster walking and better FPS. Normal first-person movement doubles from 1.4 to 2.8 m/s; holding either Shift key raises it to 8.4 m/s. The help text, setup guide and local controls rule describe the boost. Diagonals stay normalized, focus/reset clears movement and Shift, and the existing 0.1 s time cap and at most 0.12 m collision sweeps remain.

The measured walking cost came from up to fifteen repeated full-mesh triangle scans per sweep. A lazy, local-space triangle BVH now rejects empty regions before the installed Three triangle intersection calculation. Source geometry, world transforms, material sides/groups, draw ranges, query layers and near/far limits retain authority. Custom/deformed/special meshes and unsupported ranges retain the original raycast. Building-model revision changes replace the cache owner; invisible retained final leaves still collide. No rendering, population, source-data, texture, shadow or quality setting changed.

## Performance evidence

The existing `frameBudgetProbe=1` instrument observes real rAF boundaries and existing render-loop calls. An ignored runner uses actual Start walking and held W/S input on the ordinary default app. Profiling occurs after the unprofiled measurement windows. All arms use 1920×1080, DPR 1, RTX 4090/D3D11, dusk, zero generic population and a held local prototype. Windows alternate three two-second forward/backward pairs; the final boost window uses three one-second pairs.

| Arm | Walking speed | FPS | Mean CPU advance | p95 frame interval |
| --- | ---: | ---: | ---: | ---: |
| Original | 1.4 m/s | 43.991 | 22.305 ms | 33.4 ms |
| Speed alone | 2.8 m/s | 29.755 | 33.084 ms | 66.7 ms |
| Final | 2.8 m/s | 60.002 | 4.493 ms | 16.7 ms |
| Final Shift | 8.4 m/s | 60.003 | 4.491 ms | 16.8 ms |

The matched speed-alone/final comparison isolates collision acceleration at the requested faster speed. Final normal sampling contains 724 intervals over 12,066.2 ms, maximum 16.8 ms. The original CPU profile is dominated by vertex access and triangle intersection; the provisional accelerated profile is mostly idle. These finite route samples do not qualify populated, whole-AOI, cold/streaming or uncapped performance. Lazy first-query builds and revision replacement may still cost time outside these windows. A10 remains open.

Four diagnostic runs are retained: original 53.152 s, speed-alone 52.806 s, provisional acceleration 56.322 s and final reviewed source 60.635 s. The provisional run is not final-source evidence. Each records build digest, raw intervals, camera/renderer/post state and its profile under ignored `artifacts/walk-speed-fps/`. The original run's post-measurement `taskkill` failed in the sandbox; root subsequently checked the exact owned preview identity and stopped PID 34228, then the parent exited. No measurement error is inferred from that later cleanup failure.

## Verification and reviews

All five code gates pass on the final source with Node 24.12.0: production build, types in 5.664 s, 143 unit files/1,255 tests in 60.274 s, hardware visual in 245.978 s and audit in 1.899 s. Audit retains two moderate findings and no high findings; dependencies are unchanged. Unit stderr contains the intentional missing-final-leaf 404 negative.

The production-caller regression uses an independently specified 20,000-triangle wall and expected contact. Restoring the old full-mesh call goes RED with `expected 20000 to be less than 100`; exact restoration goes GREEN. The targeted proof deliberately selects one test, leaving eleven unselected; the separate full unit gate passes every test. The oracle suite covers 1,200 seeded indexed/nonindexed transformed rays plus literal winding, seams, limits, groups, attribute invalidation and custom behavior. Root inspected the saved RED/GREEN output and exact restoration receipt. That private replay used the earlier helper before the two compatibility fallback fixes; its valid-wall path is unchanged, while the final full suite covers the repaired helper.

Hardware run `9892577b97482379` certifies 44 frames and three completed error-free lifecycle records on RTX 4090/616.64. Certificate SHA-256: `e2a9034b5e734b75c6391a06e4934b8f544a27021a7f73455e45aa1b5e98f77e`. Root inspected all 22 Satellite originals and two basic Cartographic returns at native 1280×720, then rehashed them against the final certificate/current bytes. Existing block-060 foreground occlusion and plaza-180 interior framing remain inherited limitations. No new sampled visual regression was found.

The ordinary real-control check passes at dusk and noon: Start walking, normal movement, right-Shift boost, release, drag look, movement relative to look, focus clearing with Shift+W, both style directions, exact overview restoration, reentry, button exit and active-page teardown. Approximately 700 ms gives 1.960/2.006 m normally and 6.020 m boosted. Six native originals retain their hashes and pass root review. The native input inventory's 169 source/runtime/build tuples remain exact after all gates; five unrelated inherited LF files also retain their raw hashes. Stills and finite paths do not establish continuous whole-city collision or appearance.

Independent Astra review initially held two compatibility findings: absent material and overridden `_computeIntersections`. Both now fall back to the original raycaster, with fixtures; focused re-review is GO. [Initial source report](reviews/01-source-review.md), [repair report](reviews/02-source-repair-review.md) and [native/performance report](reviews/03-native-performance-review.md) preserve the authored rounds. Exact initial reviewed bodies are retained under ignored `artifacts/walk-speed-fps/review-source-initial/`; final source is recoverable from the executable commit.

The native child passed and closed its context, browser and preview, but its parent cleanup census initially built a nested PowerShell array and failed a per-entry attribute check. Root retained the PASS child result, checked the exact temporary root for processes and reparse points, removed it and corrected only the private flat enumeration. Later final timing and all gate cleanup censuses pass. This is a repaired instrumentation failure, not an appearance failure; its broader retiring gate remains in lessons.

## Integration and cleanup

The [final independent integrated review](reviews/04-integrated-review.md) is GO, with no open material findings. It independently hashes and inspects all 24 required static originals, checks the certificate and confirms the two inherited framing limitations against prior originals. Earlier source and native/performance approvals remain applicable to the committed bytes.

The executable commit is on pushed main. GitHub readback reports zero workflows, zero check runs and zero commit statuses; its aggregate pending state has no configured runnable check. Remote CI verification is unavailable, rather than passed. Local five-gate and independent-review acceptance is complete.

Task evidence is retained under ignored `artifacts/walk-speed-fps/`, including this run's copied visual certificate, frames, manifests, lifecycle records and authored-review byte snapshots. Unneeded duplicate diagnostic images and the one-time retention script were removed. After pushed-main acceptance, fresh zero-reparse censuses admitted the exact two owned worker checkouts (2,633/2,635 entries), then both worktrees and task branches were removed. Final owned-process and temporary-root censuses are empty. No task server remains. All inherited worktrees, five source/test files and shared caches remain with their existing owners.
