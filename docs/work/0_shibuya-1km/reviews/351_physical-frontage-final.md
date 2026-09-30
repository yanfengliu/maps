# Review 351 — physical frontage final integration

Date: 2026-09-28. **REJECT final acceptance for run `0957b950c445c531`.** All five automated gates passed on the integrated 349 candidate, but the required full visual sweep exposes one material new surround artifact. Do not commit this product state as accepted until that finding is resolved and its affected evidence is renewed.

## Material finding

**[P1] The reverse close view renders the authored surround without its supporting wall.** In `native/sweep/satellite/plaza-az180.png`, the four jambs and continuous header occupy much of the right foreground as an isolated freestanding frame. The photographic TSUTAYA wall is absent behind them. This is conspicuous in an established controls-driven composition and defeats the intended reading as shallow relief attached to that wall. The narrower forward views used by 349 did not expose this angle.

Exact failing PNG SHA-256: `c125dc8bcb50ddc4de47c9b60870fc95090d605d842ef4cdec649900ade90cae`. The manifest records the plaza view at 45 m, azimuth approximately -pi and polar angle 1.5. The added `BoxGeometry` meshes in `src/scene/crossing-frontage.ts:61` retain visible reverse surfaces independently of the source wall. The image is consistent with the close orbit being behind the original photographic face while the closed boxes remain visible; the precise camera/source-wall culling mechanism was not separately instrumented. The required outcome is that authored relief cannot become an unsupported frame from this existing view, while retaining the accepted exterior gain. Preserve this view in regression coverage.

`plaza-az240.png` also exposes cropped surround ends at the extreme left edge. It does not establish a second independent failure, but belongs in the affected recheck. No other material new issue was found in the required set.

## Native visual coverage

Opened every image individually at original 1280x720: all 22 Satellite originals and the two basic Cartographic return originals. No crop, enhancement, thumbnail or contact-sheet review was used.

| Inspected views | What they establish |
| --- | --- |
| Satellite noon/dusk crossing heroes | Preserve 349's local depth gain: three open bays, restrained head/returns, readable original lettering/photo and grounded feet. No conspicuous new clipping, glare or halo. |
| Satellite noon/dusk approach heroes | Frontage is exposed at much smaller scale; the city remains coherent and the surround does not dominate it. Fine join/footing claims still rely on 349's near pair and its checked geometry. |
| Satellite plaza az000, az060, az300 | Exterior faces expose the new structure clearly and retain the wall-backed architectural reading. The plaza az060 tree does not conceal the whole surround. |
| Satellite plaza az120, az180, az240 | Az120 is oblique and partly beyond the right edge; az180 contains the blocking unsupported-frame artifact; az240 exposes only cropped ends on the left. |
| Satellite block az000, az060, az120, az180, az240, az300 | Az000 exposes the crossing at small scale. The remaining block views hide most or all relevant detail behind nearer buildings or rear faces; az060 is strongly occluded by a foreground tower. They do not validate the local surround, and no independent new surrounding regression was apparent. |
| Satellite overhead az000, az060, az120, az180, az240, az300 | Broad city layout and street corridors remain coherent. The relief is too small or occluded to support fine-detail acceptance. |
| Cartographic return dusk and noon | Both return images show intact rendering and the selected Cartographic style at the recorded approach camera. This is basic style-switch regression review only. |

The other 22 Cartographic certificate images were hash-checked but not given detailed appearance review under the owner's Satellite focus. Review 349's near-noon A/B remains supporting evidence for the exterior gain; it does not override the newly exposed failure.

## Integrated source and evidence binding

Read the actual integrated tracked diff and verified the new helper's exact bytes. All three product/test hashes equal the 349 candidate: `crossing-frontage.ts` = `2444b17cedf2be61623291f9cee9b17895a8a3c34a18ec10969e1bdcb56f4376`; `facade-textures.ts` = `487688cf38d61c54db1dd861b0210e96dc08174c133bf6a1e0400c32b64ab911`; `crossing-corner-material.test.ts` = `d56a4c429be61ef68416521702b0b58891d41ac2ed0fb1d1aa831ceafc108f39`. The code review conclusions about source guards, authored metadata, static footprint and tile ownership in 349 remain applicable; the final angle reveals a visual condition those conclusions did not cover.

Packet: `C:/Users/38909/Documents/github/maps/artifacts/frontage350-integration-20260928/`. Independently rehashed all 44 retained certificate PNGs, both return PNGs and all three retained lifecycle records, with zero mismatches. Each certified image also matches its certificate row. The exact inspected Satellite filenames are the four `hero-satellite-{noon,dusk}-{crossing,approach}.png` files and all 18 `sweep/satellite/{plaza,block,overhead}-az{000,060,120,180,240,300}.png` files. Both return names are `return-cartographic-{dusk,noon}.png`.

| Binding artifact | Independently verified SHA-256 |
| --- | --- |
| native-frame-manifest.json, binding all 44 originals | 81a50f296f5f94ad9ef145931f79bd7761dcfc2d0896dd3d94d62c5be3e42183 |
| style-runtime-evidence.json, binding both return originals | 9a1e0c2fa41d8abd49b904c0c744b0c6e2dc6257d0c033596abef9218a501cb1 |
| certificate.json | 5b86a2356b3aada001d0838d28ef6cdee1c02b289f71cb1e810c0171de88a9da |
| final-binding-check.json | 1c0e225a3295050d0552c6e5c9166b53c1ab0c2650d9f173cd3e6b3fea4df341 |
| opt-in-runtime-binding.json | 617d3f2f42128eebce38be379ba14cc1e4ad2b03fe52957d5638fc67239b2058 |

Independently rehashed the final binding's 58 default-build, optional-build and protected-file records, with zero mismatches. The certificate and final binding agree on scene digest `dfa01d585ff5147745d2ce6e642179d820af89b4d986c0df89cee258247545ce` and harness digest `0e6fe08b850829403b5f076e171e10d52a1a313faa3a2e39a829ccb68ed46701`. I did not independently recompute those full tree digests. Default bundle SHA-256 is `dc152060dcee0af11b0c78b100ee1acd6cbf0f2641a94e7c2fd9c8577e6f4393`; optional bundle is `c5550e5e434e5acd84b09bd7de0b2a5ba1efd622cdc58e272a280f9827274b88`. The optional compiled-source record includes the exact frontage/helper hashes. That optional build has no browser-run claim and does not activate the optional walker by default.

## Gates, cleanup and limits

Read successful build/typecheck/test/audit exit records and logs: 112 test files and 987 tests passed. Audit passed its high-severity threshold while reporting two moderate vulnerabilities; the build keeps the large-chunk advisory. The visual log and certificate report 44 fresh frames on RTX 4090 driver 616.64 through ANGLE D3D11. All three hardware lifecycle records have completed teardown and empty console/page errors. Both recorded style returns retain the camera and page time origin, report ready rendering, and have no error or context loss. They do not record population progression or rail-specific disposal counters.

The final owned-process receipt reports no retained, unadmitted or scoped survivors and no port listeners. Temporary cleanup records preserved scene/network/rail directory identities and counts. I checked these records, not a fresh process census. This reviewer launched no browser, capture, server, test or gate and owns no remaining process or temporary artifact; only this report was written.

The accepted aim remains local authored photographic relief, not a surveyed reconstruction, source-geometry repair, interior, crowd qualification or performance result. Unobserved motion and optional runtime behavior remain outside this review. The green automated results are valid within their bounds, but final acceptance remains blocked by the recorded reverse-view appearance failure.
