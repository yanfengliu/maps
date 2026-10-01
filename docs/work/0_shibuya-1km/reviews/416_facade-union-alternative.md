# 416 — facade union alternative, implementation handoff

Date: 2026-09-30. Owner: reused reviewer415, now implementation worker415b. The prior independent review415 remains a separate, earlier source judgment. This document is an authored implementation conclusion, not an independent review of this prototype. Root owns integration and the sole expensive CPU/GPU lease. All changes here are ignored artifacts under `artifacts/city-coverage415b/` and this new report; no product, tests, data, dependency or runtime setting changed.

## Result and decision

The distinct exposed-boundary route passed 29/29 bounded CPU cases. The frozen floating algorithm reproduced 66 coarse fittings versus zero fine fittings. The boundary route produced 72 coarse, 72 fine and 72 reordered-source fittings, with identical IDs, occupancy, centres, dimensions, kind, colour and radiance; choice digest `b99d4b010cec2442d763e09e08eecf55b95181a69ff3bcc3594f7c0ce161cfc6`. All 7,200 fine triangles remained eligible and no coverage/group overflow occurred.

The inherited requirement to preserve 66 was a faulty oracle. The probe independently certifies every admitted footprint against the literal wall box, without invoking a union checker: each PlaneGeometry wall is the closed rectangle `[tileX-35,tileX+35] × [20,26]` at `tileZ`, with tangent +X/up +Y. Every footprint including its .12 m size allowance has strictly positive margins. The 14 newly selected IDs have a minimum vertical margin of .45 m and minimum horizontal margin of 4.265 m. Eight previous IDs in fixture7 disappear because the earlier seeded block now succeeds; 72 is not simply 66 plus six appended panes. Selection, density and seed are unchanged. The original 66/0 negative baseline is retained in the result, and no exact-result count was asserted.

This settles the fixture coverage/tessellation question independently of branch413's polygon subtraction. Continue with a bounded actual-source comparison and a different independent reviewer if root considers adopting either candidate. This artifact is not production approval: whole44 source behavior, 216-plane retention, UV response qualification, final types/gates, actual GPU link and native visual quality remain unrun here.

## Fixed contract and mechanism

The reproduction/disqualifiers were written in `contract.md` before this CPU dispatch. The literal query is the 1.47 by 1.62 m footprint at (0,21.74,0) on the 70 by 6 m wall, two triangles versus 20 by 20 subdivisions/800 triangles. The nine-wall collector comparison preserves the product's floor grid, seed413, strata, ranking, bounded block trials and occupancy. Disqualifiers include a hull across voids, witness samples alone, discarding small triangles, geometric tolerances that hide positive gaps, density/seed tuning, unbounded work and any GPU/whole-city claim from this fixture.

The helper uses exact binary64 dyadics and BigInt orientations/interval comparisons. Dominant-axis projection avoids rounded dot-product coordinates. Exact opposite source edges cancel; remaining edges are divided into exposed parameter intervals by other triangles covering their outward side. No clipped polygon or rounded intersection coordinate is constructed. Nonmatching T-junction edges and overlaps are handled by interval coverage, rather than requiring a paired manifold mesh.

The proof tests corner and interior-witness membership, then refuses any exposed union-boundary interval entering the rectangle's open interior. A finite closed nondegenerate triangle union has its boundary on source edges. If its boundary does not enter the connected open rectangle, its interior cannot change between covered and uncovered regions. The covered interior witness chooses the covered region; closure covers the perimeter. The witness is essential: covered corners alone wrongly accept a query exactly filling a hole. The held-out equal-hole and interior-island cases exercise both refusal paths.

Admission preserves the incumbent .0001 m plane-distance and .999999 normal-dot bounds, and requires a finite orthonormal frame. Coverage arithmetic has no in-plane area/gap tolerance. Thus this is exact planar-union coverage within that existing admission policy, not a claim of zero-tolerance three-dimensional coplanarity for arbitrary inputs. Opposing/degenerate faces do not certify the supplied oriented plane; nonfinite coordinates/frame/dimensions/budgets refuse explicitly.

## Checks and measured cost

The 29 cases cover coarse/fine wall support, reversed triangle order, positive 1e-7 m and 6 mm slits and holes, a query exactly filling a hole, an interior island, wrong-plane source/query, outside extent, unmatched T junctions, overlapping/duplicate faces, an overlap beside a true slit, X-facing dominant-axis projection, interior source indices, a conservative noncontributing index, the 2,048-source cap, edge/interval/part/work overflows, numeric invalid inputs, zero-area-only input, a positive subnormal width and the frozen nine-wall collector.

| Same-dispatch collector arm | Fittings | Groups | Time |
| --- | ---: | ---: | ---: |
| Floating coarse | 66 | 9 | 9.1461 ms |
| Floating fine | 0 | 0 | 121.8429 ms |
| Boundary coarse | 72 | 9 | 3.3533 ms |
| Boundary fine | 72 | 9 | 94.2735 ms |
| Boundary fine, reordered | 72 | 9 | 80.8679 ms |

These are one process's fixture-arm measurements, including the copied collector, not a city-scale or cross-process benchmark. The boundary support adapter prepares each immutable plane once and reuses it for queries. One fine wall has 1,240 unique edges, 1,160 exact cancelled interior edges, 80 candidate/exposed parts and 63,920 edge/triangle tests. The fine collector performed 72 fitting attempts and 193,480 query support tests; boundary preparation counts are reported separately. The literal single fine-wall query took 13.1717 ms preparation plus .5673 ms query. The probe took 422.741 ms; the owned dispatch/closure took 650.7911 ms on Node24.12.0.

## Resource and downstream contracts

Limits are 2,048 triangles, 6,144 edge records, 2,048 live interval records per edge, 8,192 exposed parts and 8,388,608 edge/triangle tests. A query has at most five witness scans, one conservative-source scan and one boundary scan. Every exceeded record/work cap refuses with overflow before further retained allocation. The small-cap controls made each corresponding path run; the default worst-case nonmanifold work bound was not benchmarked.

Finite source coordinates use at most 2,098 integer bits (53 mantissa bits plus the maximum source-grid exponent shift). Exact rectangle multiplication requires a query grid down to exponent -2149; projected coordinates stay below 3,180 bits and determinants/ratio comparison temporaries below 16,384 bits. Raw dyadics are capped at 12,288, source and shared scaled points at 6,144 each, faces at 2,048, edge records at 6,144, parts at 8,192 and scratch intervals at 2,048. Point/edge key lengths are bounded at 1,265/2,531 UTF-16 characters. Numeric/key payload has a conservative per-union/query bound below 128 MiB, excluding V8 headers, allocator/GC overhead and caller triangles. This is an experimental bound, not an approved whole-city memory policy. Before/after heap was 15,196,144/95,537,456 bytes; runtime pin buffers and floating-baseline garbage were in the same process, GC/retained union memory and peak heap were not isolated. Multiplying a per-union bound by 216 cached planes is not approved.

Root correctly identified that corner/centre witness indices cannot certify complete response UV continuity. Covered queries now return every admitted face whose exact projected box intersects the exact query box, plus witness faces. This is a conservative superset of every positive-area footprint contributor, including interior UV/material seams; it may over-refuse continuity for noncontributing box overlaps. Dedicated interior-face and noncontributing-face controls observed that behavior. The artifact WeakMap cache assumes immutable source triangles and frame; production invalidation and total residence require separate review. These caveats preclude silently swapping this adapter into product.

## Exact provenance and run closure

The exhaustive 17-file before/after binding lives in `preflight.json` and the result. All 17 were independently rehashed after the run with zero changes. The source collector is SHA `83dfd248ea2ad10b22b134769a122ab1a4cdb4a6f89c1f8b4beb0a102f4bc906`; floating helper `db825b6104b08ebeae54210b5700042031659d45455ad950ee5fa9e9150df5db`; fixture test `7e3f5d2381faa862c4901ea2a8497cd013b352eb045a0eea6ee7f408f8410450`. Only import paths/LF/provenance changed in the floating selection copy. The boundary selection copy additionally replaces the coverage call with the immutable-support adapter; selection code is unchanged. Installed dependencies were inspected; the helper is authored here, adds no dependency and copies no external geometry algorithm. Existing Three package/core/module, lockfile and Node executable identities are pinned.

| Artifact | SHA-256 |
| --- | --- |
| boundary-union.ts | `90773cf128e48a5b3e51b26892111c86a49ea9622d6338355819a9271a4e7818` |
| boundary-probe.mjs | `da6f4246b75efa8b82d10f556ec2dab1c0e6da42220d0ad807db03091a4562f7` |
| boundary-adapter.ts | `c73d0c40ab1bc62e802aa980e3c061fe22721f3a48041ef54f2e87ede5244253` |
| layout-boundary.ts | `d2f0cc947b6e318b19375b5df4002fa4ae73dd6aeb757276e009c02d5b74c49c` |
| layout-floating.ts | `9ca8cf1febc7fd7c8ac0339c0fac39496d0b689b9d6af55866708d19a96f6666` |
| contract.md | `9c1f3425f2dd6e4c37d60a6aac324a15376c0d862790ea570ab0abb930c03801` |
| preflight.json | `bdc60d2c8280a5eab5f43aba87d5aaee9e05cd67976477162a5ab12d8b32eaa6` |
| run-boundary.ps1 | `5ebecc7b18c1e2b9254787768cd059fd8e4f83fb9e340d79726addecedbced01` |
| boundary-results.json | `4188c4ae1e82cfba1d353b69071a53830d9265f4a7ced677408ec12c0ecc0d3c` |
| boundary-process.json | `353580a6958c3ae2c1ef9b4c9c9be2fdf0d3c54702625498fb83f94f72e3302e` |

Root admitted exactly one <=60 s artifact experiment after the explicit process-handle correction. The hidden Node process was PID48148, creation UTC2026-09-30T20:33:20.7151236Z. The wrapper retained its handle immediately, used that Process object for any kill, recorded exit0/closed/no-timeout, then disposed the handle. The probe launches no children, browser, server, build or gate. Stderr is empty. No task process remains; retained artifacts are intentional handoff evidence.
