# Independent Source3 producer v3 focused closure — 2026-10-17

**PASS for the exact 14-file candidate. All three prior P1 findings are closed; no material finding remains in this review scope.** This permits ordinary integration, confined input preparation and bounded production execution. It does not accept unpublished geometry, profiles or native behavior.

The independently checked file map is 2951 bytes / `285181fc39fbdd93456aa4860491b3c5d7b807088bbd0616baede47fa2e27d95`. All 14 candidate hashes and canonical preimages match. Only these three files differ from the reviewed v2; the other 11 are byte-identical:

| Candidate path | Bytes | SHA-256 |
| --- | ---: | --- |
| `tools/data/support_source3.py` | 53010 | `953f8e3f09db8e3daff8f58720793c0e20c52c138c37468ec5c2f04a6227b2c6` |
| `tools/data/surface_network.py` | 124071 | `de28141417938ebffbea811162b2771d4269801db2ad2e0f42d7f2b56473630d` |
| `tests/data/test_support_source3.py` | 30356 | `6274e21898494ffd3deccae4f34eb2744672594167cf8f0725e06d11ab8662e9` |

R1 closes through actual in-range source barycentrics, interpolation of the original native float32-centimetre face, exact rounded `original_native_cm`, independently bound actual `replacement_native_cm`, and Euclidean displacement at most 0.1 cm. Road replacements use explicit stitch semantics. Retained-fragment edits use the same original-point and displacement convention while retaining measured plane/UV error checks. Fabricated originals, out-of-range weights, unbound replacements and over-limit displacement refuse the actual validator.

R2 closes through a deterministic `source_triangle_index` reset per consumed road GLB in document mesh/primitive/local-face order. Both unchanged and changed profiles and both native ray paths use that flat identity, while local ancestry remains separate. The real multi-mesh/multi-primitive writer/readback fixture covers later roads, replacement counts and output map order. This matches the separately reviewed Native consumer v2 contract.

R3 closes at the actual `Surface` initialization used by reading and reprofiling. It calls local source/geometry admission with already parsed raw parent/current arrays before exposing providers. The real outer constructor fixture passes valid lineage and refuses false inferred anchors, false original-road points and geometry outside its declared region. Its Source2 parent is an explicitly substituted already-admitted fixture, so this is not a fresh whole-parent qualification claim.

The approved optional inferred-bank edit retains the exact raw bank anchor, binds original and actual consumed coordinates, enforces the same 1 mm bound, and requires at least one matching validated incident derived-road binding with every such binding sharing the replacement. Unedited bank vertices remain exact. Inferred provider, grade, region, deletion-coverage and occlusion rules remain intact. The focused positive and false-bank/original/output/shared-output/over-limit refusals cover this addition. The revised interface is 12585 bytes / `f521ed68c06852d6072687a6e80078f3990ad6775c715f58ddb3c7c937c0b099`.

Reviewed exact evidence records 19 PASS in 1.323 s and three causal RED classes: old unbound stitch, old aggregate profile index and removed reader admission. The winding guard, complete terrain assembly/readback, path/record limits, unchanged input comparison, atomic promotion, and frozen legal-route reconstruction are AST-identical to the reviewed v2. The concrete relocation document preserves literal inputs and changes only confined record paths in a newly pinned ledger; final Road bytes and actual copying remain pending. The inherited two parent admissions are stated honestly; no rebuild, cache or new qualification command was added.

Full file/evidence pins are in `reviewed-pins.json`. This reviewer ran no full producer, reprofiling, engine, build or heavy test and changed no canonical/Source file or native process. Actual final geometry, normal producer/reprofile results, native import/rays/contacts/appearance/controls and population/performance acceptance remain subsequent owner gates. Only intentionally retained review artifacts were authored.
