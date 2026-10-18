# Review 1603: design — independent numerical and control routes

## Target

Documentation integration base: main `044e86abe2b7cce83cec7f04676babbcfb5f7b5f`. Review target: the frozen ordinary-scene1610run2 packet described in [1601](1601_implementation.md) and the uncommitted A source at `artifacts/taa1582a/worktree`, whose actual worktree HEAD is `16bb1f360eb1b530fb4cf92413f932b21dc11616`. Candidate source bytes are bound by `artifacts/taa1593/source-freeze.json`, SHA-256 `80f003149b1dbb1b075d5eeeea06e1b24a4924a8c23c44afc80730c06ff01bd4`, and `artifacts/taa1582a/reviewed-source1593.patch`, SHA-256 `3648ae7bed00625e6e11e4ec78d6ab781c96f67ce2ad359dcd03908db738277e`. The two reports below retain exact source/input provenance and measured CPU controls; their authored bytes are preserved in this round. No product/source repair or new capture is reviewed.

## Reviewers and coverage

Independent CPU branches1622 (numerical/reference) and1623 (requirements/control boundary) worked without consulting each other's conclusions. Root read both actual reports and accepts their bounded BLOCKED outcomes. Neither observed the actual GPU arithmetic/history source or timed playback.

## Reports

### 1622 — numerical/reference branch

Original authored report: `artifacts/taa1622/handoff.md`; SHA-256 `a820d3895dda0c9c1e335d789390706b7ba4faf988b92e8f10448707fa71a9fa`. Retained verbatim below.

```markdown
# 1622 numerical/reference branch — bounded handoff

Owner: /root/taa1622_reference_search. CPU only, independent fresh branch from1620. Started2026-10-18 10:04:07UTC. No other branch conclusions consulted. No production, original evaluator, raw packet, build, index, cache or registry writes. No browser/server/GPU process launched. Model work unknown.

## Result

BLOCKED numerical-reference route; no corrected scorer, rescoring, production defect, A6 contribution acceptance or mechanism impossibility is established. The actual old NOT_ESTABLISHED remains unchanged. The probe reproduces35,890eligible,34,394matching,7current-only and393,216/393,216native channels. Original input/evaluator hashes are asserted before and after the probe.

There is concrete non-equivalence between the original ideal-double oracle and the selected execution family. It is NOT counterevidence proving that any of the1,496 actual mismatches is a false failure. In particular, none of the four preselected numerical models explains every mismatch. Do not promote their better counts to acceptance or select the best model by hindsight.

## What was measured

The fixed original mask/depth/reprojection/separation eligibility is reproduced independently without reading resolved/native output. Every original eligible pixel is compared; the first16 qualifying numerical-difference witnesses are retained only as examples after aggregate counters. Thresholds and eligibility remain unchanged. No model parameter is fitted to actual output.

| Fixed diagnostic model | Expected value differs from old oracle beyond its unchanged tolerance | Actual output within old tolerance of model | Old mismatches within model tolerance | Maximum old/model difference |
| --- | ---: | ---: | ---: | ---: |
| Ideal coordinates, nearest-even8-bit fractional texel coordinates | 882 | 34,529 | 659 | 0.032538076149517536 |
| Float32 uploaded matrices, otherwise double arithmetic/ideal sampling | 101 | 34,509 | 307 | 0.006155250165022608 |
| Unfused sequential Float32 arithmetic, ideal sampling | 167 | 34,361 | 462 | 0.010605979828583356 |
| Same Float32 arithmetic plus8-bit fractional sampling | 1,225 | 34,467 | 842 | 0.032538076149517536 |

These overlap counts are diagnostic, not rescored candidates. Each still has unmatched pixels and can also lose old matches. Arithmetic reassociation, division/reciprocal choice, actual sampler precision, raster interpolation, copied history bytes and branch decisions remain outside these simple models. The script emulates one arithmetic order, not all legal implementations or the actual compiled shader.

Selected source artifacts/taa1582a/worktree/src/render/reprojected-history.ts SHAe746a6a413cf489416a0abaca5c2fe1d87d4f40b621b09a34c906c9068128008 stores previous raw currentGrid, never prior resolved; its shader performs matrix transforms, nearest depth/mask rejection, bilinear colour lookup, neighbourhood clamp and half blend. Installed Three.js WebGLUniforms.js:68,330–348 converts Matrix4 elements through Float32Array before uniformMatrix4fv. The old evaluator instead inverts/projects in JavaScript double precision and uses unquantized bilinear weights. Source inspection does not observe the actual compiled program or driver allocation.

Microsoft's primary [D3D11.3 specification](https://microsoft.github.io/DirectX-Specs/d3d/archive/D3D11_3_FunctionalSpec.htm), sections3.1.3,3.2.4.1,7.18.8,7.18.16, specifies finite arithmetic and texture-coordinate precision: sampling coordinates are snapped with at least8fractional bits and float-to-fixed permits0.6ULP error. Fused arithmetic may differ from one serial order; division may use reciprocal/multiply. It does not identify this RTX4090/ANGLE run's exact sampler precision or compiled arithmetic. The8-bit model is therefore a documented possible mechanism, not an observed hardware setting. The [GLSL ES3.00 specification](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf), section5.10, also permits associative regrouping and reciprocal/multiply division. Those permissions prevent assuming a single Math.fround instruction order is an exact GPU oracle.

## Finite controls and missing conditions

All controls call the unchanged original evaluator against task-owned in-memory packet mutations. They establish instrument sensitivity only, never production behavior.

- Current-only resolved output: NOT_ESTABLISHED;0/35,890blend matches,35,890current-only. Actual prior raw/structure remain unchanged.
- Wrong previous source, previous resolved substituted for raw: NOT_ESTABLISHED;5,572/53,333matches. Actual raw B substituted for raw A: NOT_ESTABLISHED;2,566/126,758matches. These substitutions change input-only eligibility; neither is an actual older-frame packet.
- Wrong previous matrix association: structural assertion REFUSED. This cannot establish stale-texture rejection if metadata remains correct.
- Stale native transfer from frameA: NOT_ESTABLISHED;106,865/393,216native channels match. Original actual transfer remains393,216/393,216.
- Forced all-current-body rejection population: NOT_ESTABLISHED with0eligible. This tests empty-population refusal. Actual fixed ROI contains0current-body/influence-invalid samples, so invalid-history rejection is DID_NOT_RUN. Disocclusion/object motion, resize/style/lighting and teardown remain unproved here.
- All96retained copies are present. Only the pinned adjacent pair is evaluated. No other pair, held-out approach/fractional-DPR scene or native moving-sequence quality review is performed.

## Strongest remaining route and exact gap

A source-derived enclosure could avoid demanding ideal bilinear equality: compute all permitted reprojected addresses, mask/depth decisions, filter results and half-storage roundings from independent inputs; require every possible accepted-history output to lie in an expected interval separated from every possible current-only output. Evaluate the complete predeclared source-only population and retain ambiguous cases as UNKNOWN. This requires a proved bound, not a wider tuned tolerance. Source/format identity and prior-frame association must remain separately checked; invalid-history and native transfer controls must stay mandatory.

A deliberately UNPROVED4x4 prior-footprint enclosure around the ideal2x2 cell excludes current-only for3,611original eligible pixels using source bytes alone. It is not scored against resolved output and is not a deliverable or admissible eligibility. Its assumed plus/minus1pixel address bound, original depth/mask-branch stability and actual arithmetic/storage enclosure have not been established. Applying it now would relocate the same unknown. The smallest missing numerical result is a independently reviewed, source/spec-derived complete address-and-branch enclosure with actual observed program/format identities. A fixed8-bit sampler guess or generic GPU reference cannot supply that result.

Next discriminator: review the specific non-equivalence evidence before any instrument correction. If pursuing the enclosure, first prove actual full-screen vUv/current-depth reconstruction and all shader arithmetic/sampler address bounds, then test its scorer with current-only, stale same-metadata source, deliberately invalid history and native-transfer mutants, including an untouched held-out packet. No rerun is requested or performed by this branch. A future corrected instrument needs independent review and candidate rerun; the old result remains retained.

Files: numerical-probe.mjs and numerical-result.json; additional-controls.mjs and additional-controls.json. The result files retain full original scorer results and witnesses. Hash receipt and elapsed cost are in handoff-receipt.json. All outputs remain ignored task evidence.

```

### 1623 - requirements/control-boundary branch

Original authored report: `artifacts/taa1623/handoff.md`; SHA-256 `1c295cf3090fb6b7dc9f40b9e0c23b017de80685aa997d7529010802db0e774f`. Retained verbatim below.

```markdown
# 1623 - Clamp-boundary control search

Verdict: BLOCKED on the frozen ordinary pair. This is an independent requirements/control-boundary branch, not a correction or rescore. The original NOT_ESTABLISHED result and all 1552 requirements/disqualifiers remain unchanged. No production impossibility follows.

The actual 1552 done condition requires an unchanged production-path GPU control showing actual immediate previous-rendered-frame contribution during ordinary motion, with an independent expected pixel result and actual old moving branch RED. It does not explicitly require every ideal-arithmetic-eligible pixel in an ROI to match. The evaluator's correct===eligible condition is a measuring choice, but this wording distinction is not raw counterevidence that the evaluator is wrong. This branch does not authorize changing its assertions. Independent review and a justified correction would still precede any rescore.

## Distinct mechanism and actual result

Instead of reproducing hardware linear interpolation weights, test the shader's clamp boundary. Before reading resolved output, enumerate the same fixed ROI from raw current/prior colour, packed depth, masks and independent projection. Use a predeclared expanded prior footprint: the ideal 2x2 footprint plus two texels in every direction, a complete 6x6 population. If every prior texel is below current 3x3 low or above current 3x3 high, the clamp result is an exact endpoint for any convex interpolation over that support. Independent expected output is (now+endpoint)/2. Require the unchanged per-value tolerance and separation >8 times that tolerance; retain every qualifying pixel rather than choosing a passing one.

Actual eligible endpoint population: ZERO. Therefore this mechanism produces no independently scorable contribution witness in this fixed packet. Radius2 was fixed before scoring and never tuned. Empty agreement cannot pass. Even a nonempty population would remain PREPARED until a conservative complete GPU coordinate/rejection envelope and actual history-source identity were proved. This is not a qualified tolerance change or proposal to rerun a GPU control.

The small probe also independently re-runs the frozen original evaluator and obtains exactly 35,890 eligible, 34,394 blend matches, seven current-only, 393,216/393,216 native transfer, NOT_ESTABLISHED. CPU elapsed for one completed Node24.12.0 probe is 3894.3922ms. The original source/evaluator/observer/packet bytes are untouched.

## Concrete false-pass counterexamples

Two packet mutants exist only in memory. They do not alter source or retained packets and are not actual GPU executions of the old moving branch.

- Current-only resolved output: 0/35,890 expected blend matches and 35,890 current-only; nevertheless 393,216/393,216 native-transfer channels match.
- Previous raw image sampled at unchanged current coordinates: 314/35,890 accidental expected blend matches and 3,442 current-only; nevertheless 393,216/393,216 native-transfer channels match.

For each mutant the native image is independently formed by the declared 2x2 raw-grid average and binary16 conversion. This proves that a native-transfer pass is compatible with completely absent contribution and with wrong source alignment. It also concretely shows why one numerically lucky pixel is insufficient. It does not reproduce stale n-2 storage; no such actual prior image is retained in this pair.

## Remaining obligations and exact gap

Current-only false pass is refused by the unchanged blend evaluator across the complete fixed population. Stale/wrong-source alignment is refused in aggregate, despite 314 accidental matches. The proposed endpoint population is selected entirely before reading resolved/native; its empty count is retained. Native transfer is a separate property and cannot promote either mutant. Invalid-history GPU rejection on disocclusion/object motion, resize/style/lighting and teardown is not tested here; 1591 component readback cannot transfer it to ordinary S0, and its two assertion corrections remain owed before fixture reuse.

The retained observer reads current colour before history render and packed depth after render, but does not read the actual history-colour texture immediately before it is consumed or the original current-depth texture used by the shader. It records CPU matrices rather than a certified complete shader arithmetic envelope. The exact unresolved gap for the endpoint route is both non-vacuous ordinary-scene input support and an independently justified coordinate/depth/mask envelope; neither exists here. Reopening by shrinking the footprint or selecting resolved-success pixels would violate this branch's precommitment. Mathematical bounding must precede any renewed measurement; merely moving shader sampling into a new GPU helper would relocate the original unknown oracle.

No S1 or held-out fractional-DPR control ran. No complete 96-native-original quality review ran. No claim about perceived crawl, material detail, ghosting, population, FPS, cost/five gates, adoption or A6 follows. All existing native-sequence and integration requirements remain open. No new framework, capture scheduler, production fix or GPU request was created.

## Cost, resources and provenance

One completed bounded CPU probe, one failed PowerShell setup call before output creation, no browser/server/GPU/model CLI/new capture, no source/index/cache/registry write. The failed setup used incompatible Split-Path parameter names and stopped immediately; changing the parent computation to System.IO.Path.GetDirectoryName allowed the unchanged planned probe to run. Model work and actual process/GPU memory peak are unknown. Existing input JSON is about36.4MB; this CPU probe decodes it and copies two packet graphs in memory. No whole-process-memory measurement is claimed. Future native capture costs retain the existing1552 budgets and one-GPU-lease rule; this branch requests none.

Inputs are hash-pinned in probe.mjs/result.json. The endpoint-selection hash is SHA-256 of the empty list, 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. Preserve the probe/result/report as active handoff evidence. The report is source reasoning plus measured CPU counterexamples, not independently reviewed production acceptance.

Primary technical lookup consulted: Khronos GLSL ES3.00 specification https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf and Khronos texture-filter specifications. No precision bound from these sources was adopted into the probe; actual GPU envelope remains unproved. No private source was uploaded.

```

## Findings and disposition

Root accepts both routes as BLOCKED within this frozen packet. Numerical non-equivalence does not establish false failures or a production defect; the clamp-boundary route has no eligible witness. Native transfer cannot establish history contribution. Preserve the original NOT_ESTABLISHED result and controls; stop numerical-oracle expansion. This disposition is separate from the authored reports.

## Verification

The reports retain the actual CPU probe outcomes, exact input pins and limits. This docs integration verifies their verbatim byte spans and hashes, not their measurements anew. No browser/server/GPU, model CLI, runtime gate or candidate held-out run occurred. Independent production-path contribution, invalid-history rejection and candidate quality/cost remain unproved.

## Round outcome

Both independent routes finished BLOCKED. A remains frozen, parked and unadopted at `artifacts/taa1582a/worktree`; no lease or automatic retry follows. [1604](1604_integration.md) records the accepted product-direction critique. All1552 obligations and A6 remain open.
