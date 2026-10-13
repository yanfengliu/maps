# 868 — two photographic sign implementation contract

**ADMIT the bounded implementation contract after root grants its write lease.** No material proposal finding remains. This admits two source-selected advertisements for implementation, not an implemented shader, fresh runtime correspondence, visible gain or adoption. An independent review of the frozen patch remains required.

I read the bound 866 handoff, selected records, whole-footprint and existing-fixture correspondence. Their raw tuples match. The two selected polygons have complete clipped UV coverage on `data/data518.b3dm`, GML `bldg_e6e4de58-1a37-4345-8795-6b759771ade6`; maximum whole-footprint plane residuals are 1.164 and 4.533 mm. The four old positive correspondences remain a reconstruction check with maximum 3.808 mm residual, not new GPU rays. I also read the current region validator/predicate, material shader and relevant existing time/style/resource paths.

The purple and KIRIN crops were each opened individually at native size. They show distinct colored advertisement artwork within vertical panel housing; neither is a window or evidence of room occupancy. Purple is violet/pink; KIRIN is a muted warm panel with photographed lettering. Eligibility is reasonable for retaining and illuminating that photographic artwork. The crops are:

| Native crop | Bytes | SHA-256 |
| --- | ---: | --- |
| purple-native.png |8569| `80939ccea1e8d01f81a29d1292a2756df65070858d6b131997e17d2dc8078bb1` |
| kirin-native.png |8492| `bf249e6f2d74283168fccb44d712efc57d8304d9e676ce1e8af98b3068b7b11d` |

The whole-panel mode must preserve the exact convex four-edge UV predicate already used by the CPU and generated GLSL, with the existing tile/hash/GML/group, plane slab, outward-normal and identity-UV guards. Both artwork footprints are sloped. An axis-aligned bounding rectangle would wrongly include housing corners. Purple's corner `(1042,2668)` and KIRIN's `(975,2665)` are inside their bounding rectangles but outside their selected polygons; include such exclusions alongside admitted interior and sloping-edge cases. Do not shrink to an inscribed rectangle or let atlas brightness/alpha select extra surfaces. Keep the full true artwork polygons, source RGB and surrounding housing intact.

Group 2 may be shared by the legacy Hisamitsu record and these two disjoint panels because all three have the same tile/hash/GML identity. Replace uniqueness-per-group/building rejection with consistent tuple validation and disjoint-region checks; refuse a conflicting tuple, an alternate group for the same source building or overlapping same-plane selections. Vertex assignment can stay unchanged. The new polygons are disjoint from each other and the legacy group 2 UV polygon; other atlas users, roofs, backs and adjacent blank surfaces remain excluded.

Keep all three legacy records and their alpha-modulated coefficient behavior unchanged. Generate a separately selected whole-panel term at the fixed 0.65 radiance. Remove the shared uniform's 0.05 daylight floor only inside this new branch, clamping at zero; the actual existing noon value is 0.05. The existing `(1.0 - mapsProcedural)` factor must suppress the new term in Cartographic, with style return reusing the same resources. Test the actual patched material/noon/dusk/style path, exact shared-source population and categorical unsigned-byte batch accessor while retaining the old observations and UV/hash/LOD refusals.

The proposed six paths require no new material instance, texture, geometry, PointLight, render target, pass, decoder, app wiring or uniform owner. Preserve the existing caps, transactions, LRU/ImageBitmap release, idempotent patching and disposal paths. The shader program cache key must identify changed generated shader code so an existing program cannot conceal the new branch; this is a local material integration detail within the existing shader path.

Proceed from reviewed source to the existing finite four-original dusk A/B triage at 45 m and 220 m. Projected panel sizes omit occlusion, and the TOKYO board remains intact. Weak wide-view gain closes the pilot without tuning or expansion. Worthwhile gain still needs noon/style checks, scoped performance qualification, all five gates, independent final review and meaningful main integration. Whole-map lighting, facade quality and 35 criteria stay open.

2026-10-12. Reviewer 863 wrote only this authored review and ignored `artifacts/review868/source-sign-contract-receipt.json`. No source mutation, decoding repeat, test/gate, browser/GPU/server, Git, cache or canonical-board action ran. No task-owned runtime resource was created.
