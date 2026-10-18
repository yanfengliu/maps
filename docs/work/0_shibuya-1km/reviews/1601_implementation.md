# Review 1601: implementation — ordinary-scene history result and raw diagnosis

## Target

Frozen private1610run2 on unchanged A source, ordinary source-mode app and real inputs. Root opened exact native setup and accepted visibility. Full96frames1957–2052 and fixed raw pair1965/1966 were retained. No source or fixture change follows from the result. Actual handoff SHA451bce0139175cab1d03baab492937da0f1a17562262dfc4e2b3c88e6444d33a; frame pinsaa52328dae630c579f13c5a127a07e02bf4a8cdc2141b2ccb90087c3c00bbddf.

## Reviewers and coverage

Independent native1619 reproduced the original evaluator, inspected mismatch cohorts and exact source/format assumptions, and preserved all input hashes. Root read the full report below. This diagnosis does not accept the failed aggregate or authorize a production repair.

## Reports

Original diagnosis report SHA-256:43d0d360738c339c1d5a57a8cf3a4e0ef7281dbc7c2c4da07bac8e214f502cb1

# 1619 frozen ordinary-app raw diagnosis

2026-10-18 UTC. CPU-only, read-only inputs; no browser, server, GPU, capture, source/fixture/index/cache change, tolerance change or original-result rescore. First instrument was the frozen1610 packet and evaluator. Output script instruments a memory copy of that evaluator and preserves its eligibility, assertions, tolerance and verdict.

Classification: C, unresolved production-versus-oracle discrepancy. High confidence that the retained result does not demonstrate a production history defect. A numerical oracle/eligibility mismatch is a supported candidate, with moderate confidence as a major contributor; the evidence does not establish that it explains every failure. No aggregate PASS is claimed.

The original evaluation reproduces exactly: eligible35,890; correct34,394; mismatches1,496; currentOnly7; maximum error0.04767143614614611. Native transfer393,216/393,216 remains the frozen result. Of the1,496 mismatches,1,223 are within2 times the original tolerance,207 within4 times,42 within8 times and24 exceed8 times. These are error cohorts, not widened acceptance thresholds.

The CPU oracle uses double-precision inversion/projection and ideal bilinear interpolation. The production shader receives float uniforms and uses texture2D sampling. Its actual intermediate coordinates and filter weights are absent from the packet; the evaluator bounds half-float output error but has no independently measured bound for those differences. CPU and GPU arithmetic models therefore differ by construction. Packed-depth decoding matches the installed three.js packing factors; target formats and row orientation also agree with the observer/source. No simple format or transposition defect was identified.

Discriminating retained cohort1: six current-only pixels are gridx1512–1517,y840. CPU ideal prior sampling includes a bright next row with fractionalY0.002904–0.002967. A separately labelled approximate float32 projection produces fractionalY0.001823–0.001909; rounding its filter weights to1/256 givesYweight0. With unchanged blend/clamp these six observed outputs differ by0–0.0000240803, below their original tolerance0.000264140625. At1513,840 and1516–1517,840 the hypothesized half blend equals current exactly. This is measured fit to a numerical hypothesis, not a verified claim about the RTX4090's filter specification or compiled shader arithmetic. Equality to current is therefore insufficient by itself to establish rejected history in this cohort.

Discriminating retained cohort2: the seventh current-only pixel837,760 projects toX837.999471211, only0.000528789pixel from a nearest-depth boundary. The CPU-chosen previous texel837,760 has depth error0.01684150 below the0.14166747 rejection limit. Adjacent838,760 has error0.93179614 and would reject. Both neighborhoods have zero retained previous body/influence rejection. Approximate float32 projection alone does not cross this boundary; actual GPU index/valid remains unobserved. This is a sensitive eligibility ambiguity, not proof of which branch executed.

The maximum mismatch is HDR edge1632,840: current18.1875; four prior green texels45.0625,4.4453125,1.859375,1.5078125; ideal halfblend23.578921436; actual23.53125; original tolerance0.03127. The float32/filter hypotheses do not consistently explain the largest witnesses. Do not adopt a replacement oracle from these fits.

Narrow positive observation: retained795,515 has current0.0452880859375, ideal clamped prior0.0468936559753, ideal halfblend0.0460908709564 and actual0.04608154296875 (error0.00000932799; original tolerance0.00008103515625). It supports local observed previous-color contribution, together with the canonical shader boundary, but not aggregate eligibility, all-scene behavior, quality, crawl, FPS, lifecycle or fullA6.

Smallest next action: preserve NOT_ESTABLISHED and avoid a production repair based on this packet. If root authorizes another discriminator later, observe the actual shader old.xy/selected depth texel/valid for fixed837,760 and actual history sample for fixed1513,840 through the existing pass. A new96-frame run or general GPU oracle is unnecessary. That capture was neither prepared nor dispatched here.

raw-diagnosis.json holds per-pixel values, original-cohort error bins, explicitly hypothetical float32/quantized-weight comparisons and matching before/after input SHA-256. The seven main inspected inputs stayed byte-identical across all CPU runs:

- handoff451bce0139175cab1d03baab492937da0f1a17562262dfc4e2b3c88e6444d33a
- evaluate7f66a2458162ad6572b1f6a025b363361c90d1a3eacddafafe187231b61c1876
- observer536bf153f3de025a6826789a05eb6248a9a94206dac96cedc993828bf760720e
- reprojected-historye746a6a413cf489416a0abaca5c2fe1d87d4f40b621b09a34c906c9068128008
- post703bec41c7ebf95b30a75047980691bafbb0631bd029e0abd7b8e55d175ef69b
- history-pair874c45032352241d413951cafbf51f1a48c83ddbe224d5cfa8766931fa199a99
- history-evaluation8c3d3298b4c7596b4deb6af5afb3fd04c733a67285b068677b9576316b288124

Also inspected raw-frames786a33c00b1de9cb0ded89032f6c49171bfd86c18d87faf3fd04bc17ca318652 and installed packing chunk0a83da52570b06621fd8973a9e76c3557fac877b8d5493e66712a1ef0755398a. Diagnostic script7272e81035bd02e8f672cfd1664c66fb037f9f8072cb8946bead53d67f10e08c; JSON41684654d513a6c39765ab9b7cadee52d20a10084a78f7cbe9572d5c1120144b. CPU Node processes completed; no browser/GUI/server was started. Own ignored report/script/JSON remain as unresolved-issue evidence. No implementation or runtime gates ran. Wall time approximately3minutes; model-work cost unmeasured.
## Findings and disposition

Keep the original NOT_ESTABLISHED result. No production defect is established; no data rescore, ROI/tolerance retuning or source repair was authorized. Run2 reached the real shader hook and raw readback, unlike run1.

## Verification

Run2 retained96native1280x720images, all raw/frame hashes and the36,381,154B packet. Copy span2114.6ms includes heavy diagnostic readbacks and is not performance evidence. External64.256s/controller63.103s, no timeout. Resource closes fulfilled; final exact census passed with no remaining known/omitted/late processes, marker/controller/listener0. Ordinary owned profile was removed; failed-run Vite cache remains evidence. Source8/builds/runtime/harness/certificate/protected inputs stayed unchanged. No full product gates or96-frame appearance/perceived-motion review ran for this diagnostic.

## Round outcome

Retain the unresolved result and reject automatic rescoring, tolerance/ROI tuning or a production fix based on this packet. Root recorded fixed reproduction/disqualifiers for fresh independent CPU measurement searches in ignored artifacts/taa1620/search-contract.md, SHAd0ba68dc000a080d3e9fa686c7a2a1680820e6a9d69b25ba0ddb8d625233a094. No new GPU lease or A adoption; original A6, held-out candidate, quality, cost and all five final gates remain open.
