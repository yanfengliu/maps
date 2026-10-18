# Matched graphics comparison: final native visual addendum

2026-10-17. Independent graphics-only review. This addendum supersedes the unavailable-pair conclusion in matched-comparison-final-review.md (ced9b0f6), retaining that failed-attempt history. Root authorized a complete source-supported stock-contract repair of the same candidate within the original cumulative native budget. No simulation, Source, physics, population or performance prerequisite was introduced.

Both final Unreal images and both unmodified default references were inspected individually at their native 1280x720 size. I gave Root the visual judgment before receiving Root's verdict. The poses are convincingly matched. Unreal provides stronger light/shadow separation and relief on some common buildings, especially the tall tower and facades in the approach view. I do not see a decisive overall visual upgrade. The default reference is more consistently legible as a complete street scene, but much of that advantage comes from authored content and source treatment rather than a renderer comparison.

At crossing, Unreal's large foreground is a blurred blue-gray photographic surface. Shared photographic facade blur remains visible, though some facade edges and shading read more distinctly. The default has crisp plaza joints and road markings, trees, authored signs and storefront treatment. Their absence or difference in Unreal is a material content confound, not evidence that Unreal cannot render those elements.

At approach, Unreal gives useful contrast and volume to common building faces, but dark foreground roof shadows lose detail and a dark horizon band is conspicuous. Road/ground imagery is stretched or blurred compared with the default's authored road/rail treatment. Both have limited photographic texture detail. Unreal retains a cool cast; the sky/tone/shadow balance differs. Stronger contrast alone does not establish better fidelity. No engine-wide winner or photoreal claim follows from these two scenes.

## Inspected original pixels

| View | Bytes | SHA-256 |
| --- | ---: | --- |
| Unreal crossing | 1312365 | f1918c572b2bd6f771aeb86e5fabec2fada28c06707ffef90a1db02f26f0d67f |
| Unreal approach | 1498359 | 6051f3df6c1e7b8c3c612f14d52a8d3c350ce05ebaaf9903826aa99aa58c9fb9 |
| Default crossing | 911217 | 41346416a09d445267852f743990ea8702beebb7b78181ed3874c41eb12dcf0d |
| Default approach | 1028683 | d011df5b1557413df12de454739502a9406bdff9be200b496a55cdfd3925614a |

Unreal originals are under C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/artifacts/unreal/matched-graphics-20261017-230053/{crossing,approach}.png. Default originals are under C:/Users/38909/Documents/github/maps/artifacts/matched-graphics-comparison-20261017/threejs/hero-satellite-noon-{crossing,approach}.png. I verified the four hashes before viewing; no crop, rescale or postprocessing was used for judgment. UI overlays in the default originals are excluded from the quality judgment.

## Actual camera and candidate evidence

The reviewed camera contract remains 11898 bytes / 8d59c024536adb8c169b68651bf61878f21ad6f8fc374fda4eaa244b421b5932. Its geodetic correction, 44.261 mm source-height/geoid limitation, untransformed coordinate epoch and source/LOD differences remain explicit. Actual native readbacks substantiate angular framing and physical pose; they do not establish identical content or radiometry.

I inspected the final terminal report, 3306589 bytes / 944647883fad7ac213507f4f2f35a98192cc05fec3ca337f50f0e44d2576e74e, at C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree/artifacts/unreal/matched-graphics-20261017-230053/report.json. Both final views have 1280x720 output, perspective projection, no custom projection matrix, actual horizontal FOV85.56558990478516 degrees, 100cm near override and 800000cm visibility bound. Independent subtraction against the contract gives horizontal FOV error2.076e-7 degrees, maximum location error0.0007141cm and maximum basis-component error6.862e-8 across the final pair. Stock actor location, unit scale and all three Rotator-derived basis axes passed. The near/angular framing match is supported; native reversed-Z finite-far depth encoding differs from three.js.

Both final PostProcessSettings readbacks show Manual physical exposure, ISO100, shutter125, f8, bias0 and overridden white balance6500K. The single frozen candidate uses Sun25000lux, the mapped noon direction/color and Engine DaylightAmbientCubemap; actual sky intensity24070.51953125 reflects the one initial SH0 scale choice. This is not radiometric equivalence or consumed-irradiance proof. One crossing preview preceded the frozen crossing and approach; there was no per-view lighting/exposure candidate or feedback search.

## Operator, cleanup and workflow judgment

I read final operator16497 bytes / 1e48164e456d9eed20cd5ff6b49d06dc3de2dbb82d560f396e10240d9ffa7a9b against installed-stock contract11046 bytes / 499cda9d7f5fc78659c09ba8fef826564965242d342164ee60b9096366c4c9f6. Primary-source spot checks confirmed native FNames, normalized FColor serialization, location/Rotator transforms and the official matrix basis. Property writes, readbacks and restoration dictionaries are consistent; partial setter failures retain pre-write originals. Earlier required-argument/property-name findings are closed for this bounded executed path. No material remaining code finding was identified for this observation; this is not a general stock-tool workflow qualification.

The successful continuation took56.078 seconds, cumulative native107.374 seconds including the two earlier failures, within the reviewed cumulative cap. The report records graphics_capture_completed=true, natural exit0, no timeout, errors/restoration_errors empty, no residual or terminated owned processes, owned_job_empty=true, no disk saves and unchanged31 protected disk inputs. Source actor/geometry identity was checked before/after. I launched no process and own no resource requiring cleanup.

Unreal MCP ultimately performed the in-memory operation and produced a fairer camera-matched pair. That demonstrates capability, not that graphics are easier. Custom Shibuya capture/inspection tools, the external operator, two failed integrations and the source-supported stock repair must count in the workflow assessment. The retained default images do not measure current default recreation effort. For this bounded candidate, no overall visual upgrade or easier-workflow advantage is demonstrated. Stop; no additional tuning, captures or verification framework is needed to answer this experiment honestly.