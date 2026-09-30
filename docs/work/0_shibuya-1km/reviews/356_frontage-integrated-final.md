# Review 356 — integrated frontage final acceptance

Date: 2026-09-29. **ACCEPT the integrated frontage milestone for a local main commit**, on completed run `aaf9317b6cd2e49e` in 355 attempt 3. All five gates pass, every required Satellite original and both basic style-return originals have been inspected, and 351's material reverse-view finding is resolved. No material new source or appearance finding remains. Root still owns the commit; this is not acceptance of the complete Shibuya map.

## Native visual result

Opened all 22 Satellite originals and both Cartographic return originals individually at original 1280x720 resolution. Inspection began after the specific appearance-complete handoff, while the separate lifecycle repetitions finished. Recorded each image's SHA-256 before inspection, then compared all 24 against the completed retained packet: zero differences. No thumbnails, crops, enhancement or contact sheets were used.

| Inspected original views | Finding and bound |
| --- | --- |
| Satellite plaza az180 | The unsupported four-jamb/header frame is absent. Crossing, signal pole and foreground pavement remain visible without an apparent residual frame or AO outline. This resolves 351's blocking view. |
| Satellite plaza az240 | Narrow cropped ends remain beside the photographic building edge at the extreme left, consistent with an exterior, wall-backed view. There is no isolated frame spanning the road. |
| Satellite plaza az000, az060, az120, az300 | Forward views retain the shallow framed glazing and original photo/letters. Az060 partly occludes the frontage with its tree; az120 clips it at the right edge. No conspicuous new clipping, floating foot or unsupported structure was apparent. |
| Satellite noon/dusk crossing heroes | Preserve the accepted local architectural-depth gain: restrained head and returns beneath TSUTAYA, open photographic bays and intact lettering. Dusk remains coherent with its signs and surrounding light. |
| Satellite noon/dusk approach heroes | The crossing remains coherent at the broader scale. The relief is small and does not dominate the scene; these views cannot validate fine joins. |
| Satellite block az000, az060, az120, az180, az240, az300 | No apparent new broader rendering regression. Az000 exposes the crossing at small scale; az060 is strongly occluded by a foreground tower. Most other views show nearer or rear buildings and do not establish local frontage quality. |
| Satellite overhead az000, az060, az120, az180, az240, az300 | Broad layout, road/rail corridors and the square boundary remain coherent. The local relief is too small or occluded for detailed acceptance. |
| Cartographic return dusk/noon | Both show intact rendering, selected Cartographic style and the recorded approach composition. This is basic style-switch regression review only. |

Exact final reverse-view SHA-256: `5e36f4f6bf7b24cbed8510e4b65ebfb22297174830cbd3aee68bb864d80a924a`. Adjacent plaza240: `484198cdc32ab6fe39c657f51f0ae015938a0d2fc85eaa5d581de176e2a9619a`. Noon/dusk crossing heroes: `d9b90a9751b1ddf3f61539007413f7c3a0f2b43ded8aa5ce470a55067b219217` / `172264331beb188b8e1395f58dcce795b4b72b95b9cbefb75b1dd6d21bec344b`.

The inspected Satellite set is exactly four `hero-satellite-{noon,dusk}-{crossing,approach}.png` originals plus all 18 `sweep/satellite/{plaza,block,overhead}-az{000,060,120,180,240,300}.png` originals. Returns are `style-return/return-cartographic-{dusk,noon}.png`. Their hashes are bound by the retained manifests below. The other 22 Cartographic certificate images were hash-checked but did not receive detailed appearance review under the owner's Satellite focus. The accepted 352/354 near-noon comparison remains supporting evidence for feet and joins; no additional near view was generated here.

## Integrated source

Read the actual integrated diff against main `78cf31d3e6f4b5d191c13fcc4cd7a903f016336b` and the new helper. Independently rehashed all five product/test files: they exactly equal the accepted 352/354 candidate. There is no new integration logic beyond that reviewed candidate.

| Actual primary file | SHA-256 |
| --- | --- |
| src/scene/crossing-frontage.ts | 662c7772fa5bd9c52fe5703a76d650223a131a772a70b8ca6deaa4e0cb304b90 |
| src/scene/facade-textures.ts | 487688cf38d61c54db1dd861b0210e96dc08174c133bf6a1e0400c32b64ab911 |
| src/render/post.ts | 6f5b64db71bb3299e28af71c0925842122670cc5cc49763a0459f888599a25d9 |
| src/scene/tile-transaction.ts | c39feae1d563ef29926b652f406eb38cb4100599d02c4c850e638d2b5ede8b75 |
| test/crossing-corner-material.test.ts | d72f0e59bc7d96e7879ca87ff8af49e4d56e163a1a617bba4b24902ab4c388f5 |

[354](354_frontage-visibility-review.md)'s source findings remain applicable: exact tile/GML/UV/plane/winding guards, authored five-box relief, source half-space visibility in beauty/AO/shadow passes, ordinary normal-pass behavior, and unique tile resource disposal. The perspective rule discards at or behind the exact source plane; the orthographic rule follows draw-camera ray direction. This is a principled source-bound presentation repair. It does not reconstruct the source wall's interior or establish through-wall motion and sub-metre near-clip pixels. Point-light shadow source and ownership controls remain supported, but no point-light scene capture is claimed.

## Final evidence and gates

Packet: `C:/Users/38909/Documents/github/maps/artifacts/frontage355-attempt3-20260929/`. Independently rehashed all 44 retained certified PNGs, both retained return PNGs and all three retained lifecycle JSONs, with zero mismatches. Every certified PNG matches its certificate row and canonical original. All 24 inspected preinspection hashes match the retained originals. The native manifest's certificate hash matches the actual retained certificate.

| Binding artifact | Independently verified SHA-256 |
| --- | --- |
| native-frame-manifest.json | bc488cdebd555f71569da048edc9cd6b72ff4f05902c201bb4ae351d44769726 |
| style-runtime-evidence.json | 46f26eb86265c3e91a75fba0b0c09d0a19b4d7aec7345a092e03736b2d533b71 |
| certificate.json | 1f7417b5c2503e105307890090bdfd780d847fd9ada0f20d280edc42a4124c5e |
| final-binding-check.json | 27ad84ae8c1a1a1a384810628708825df568286bbecb974259bfd34d880d115c |
| opt-in-runtime-binding.json | 2a21736cf87e6bb68ec18709d3bb6ebbb24f79855d428f2eca8473d3bfc4b635 |

Rehashed the final binding's 60 protected-file/default-build/optional-build records, with zero mismatches. Independently compared the actual source-map content for all seven critical runtime entries in each build against current primary source, normalizing CRLF to LF: seven matches in the default build and seven in the optional build. These include all four frontage runtime files and the existing local walking prototype/gait/controller. The optional six outputs come from the passed attempt 2 rebuild and were revalidated by attempt 3; there is no optional browser-run or default-activation claim.

Certificate and final binding agree on scene digest `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce` over 151 files/354,752,173 bytes, and harness digest `0e6fe08b850829403b5f076e171e10d52a1a313faa3a2e39a829ccb68ed46701` over 24 files/220,140 bytes. I did not independently recompute those entire trees. Default bundle SHA-256 is `0c06649a0f82ef784302e5d0785338dc9f244af359e5d31d222f4d4b7e75e84e`; optional bundle is `27a8a5d8720fe567cfc56adeddd487b8377ffc6d6276a02e65e18628f7343fc8`.

Read actual successful build/type/test/audit exit records and their logs: 112 test files and 993 tests passed. Audit passes the high-severity threshold with the same two moderate vulnerabilities. Build retains its large-chunk advisory. The canonical visual command exits 0 and certifies 44 fresh originals on RTX 4090 driver 616.64 through ANGLE D3D11. Read all three actual retained lifecycle records: hardware renderer matches, console/page errors are empty, and teardown is completed in each. The earlier 355 preparation failures remain retained; this acceptance covers completed attempt 3 and does not relabel those failures as successful runs.

The two recorded style returns preserve camera and page time origin, advance rendered frame count, retain the admitted rail packet's 20 layers/10 replacements, and report ready rendering without error or context loss. They do not record population progression or rail-specific object/disposal counters. No continuous motion, crowd qualification or performance claim follows from these static gates.

## Cleanup and disposition

Read `execution.json`, SHA-256 `2a0715a57caacc906ce6f2ef50c436260abc75a19c6a451055c48c507185f302`: all recorded steps exit 0, passed is true, failure is null and environmentRestored is true. Read the owned-process receipt, SHA-256 `c77576aabe3af91a71341a069d894f331fd950a4e94450c8701b4ef53fff2b15`: no retained, unadmitted or scoped survivors and no port listeners. Temporary cleanup records preserve primary scene/network/rail directory identities and counts while removing only owned temporary/cache roots. These are inspected receipts, not a fresh independent process census.

This reviewer launched no browser, capture, server, test or gate and owns no remaining process or temporary artifact. Only this report was written. The source photo's blur, full-map realism, inhabited-scene behavior, optional walking runtime and the 3,000-pedestrian/200-vehicle performance target remain outside this milestone acceptance. Root should commit this verified frontage unit locally, then continue the approved populated visual flow.
