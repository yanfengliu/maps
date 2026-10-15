# 1059 — Focused circulation winding rereview

2026-10-14 local. **ADMIT exact1050b-v1 as the corrected private design packet under1051a. Finding1055-R1 is resolved within its source/CPU bound.** Product implementation, public regression-gate landing, rendering and appearance remain unqualified. Original1050/1050a remain RED; this review does not replace their preserved findings or authorize a metric change.

The reviewed `architecture-v1.json` is1,920,896B/SHA`4b1effd521923b887e3d578369e081daa2aa59a5b54f47e4b92558a81679651d`; release manifest SHA`169b4a642e70b170ea6dcf64b67a3c8ed941e1c02f13faba976da31dae2d7878` binds the report SHA`b0636be891e71125a3cbb162028b00c346efed0c2fca4eb417d6310348b158d6`. All39 release bindings and186 old occurrences plus three old seals independently verify. Frozen PRIMARY1039 module SHA`0f534a5670de9f21136ec42778ce274f8b9f4801ae570dd75c734b51917d735e` and test SHA`9b6f9bafa864cccdae6b0bd2f40e07d71df33117e847fdc1973a9767232befd9` remain exact. Root's intervening docs-only checkpoint does not change these inputs.

I read1050b and1051a, the complete writer, reveal validator, sweep changes, inherited validation output and retained failed attempt. The1055 authority and report remain sealed. Only this new report and ignored `artifacts/commercial-corner-20261014/depth-search1047/review1059/` were written. No delegation, product/test/config/source-data/dependency/Git modification, build, browser, GUI, server or GPU was used.

Independent structural comparison confirms exactly24 changes: second/third points swap on the east reveal triangles, with no coordinate-component change. Every other field, room triangle, metal triangle, part, hole, cut, furniture/support datum, palette and resource value is equal. The bounded writer is at1050b `make-packet.mjs:11`; its separate untouched-field assertions at line12 agree with my independent comparison.

My independent Float32 geometry checks cover all48 reveal triangles and48 top/bottom hole-perimeter joins. Every normal faces its opening, every join has exactly two opposing directed incidences. Original1050 independently fails with24 bad normals and24 bad joins. Reversing each of the48 corrected triangles individually produces exactly one bad normal and one bad join; all48 controls are RED. Restoring the exact packet is GREEN. This confirms the complete correction family, not just the six formerly missed rays. The author controls at `validate-reveals.mjs:16` provide corroboration.

I reused the1055 installed PRIMARY Draco/GLTF/B3DM parser setup with actual data518, original Uint8 categorical channels and actual node placement; only image decoding is supplied. Independent source attribute/index/matrix preservation passes. I reconstructed all five corrected room attribute streams directly from the frozen base and released insertions. Their complete position, normal, color, UV and batch-ID hashes match the author's actual-buffer records. The per-component source comparison at `sweep-tail.mjs:4` restricts differences to the selected point permutations and matching geometric normal reversals. Ground hashes remain equal. Materials remain FrontSide.

The independently rerun public grids retain the original witness, cameras, rooms-plus-furnishings subset,1mm behind-pane rule, six finite1041 classifications, miss bounds1/5/3/2 and strict15% residual limit:

| View | Rays | Misses | Raw | Return | Rear | Residual |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
|block|166|0|8|0|0|8|
|close|1080|0|280|74|69|137|
|lower|927|0|231|92|0|139|
|seed1729|922|0|218|89|4|125|

All pass. Lower139/927=14.9946063% establishes no margin beyond these fixed rays. The preserved original1050 remains seed1729 RED4>2. There is no added metal population, stair exemption, DoubleSide change or tolerance adjustment.

The retained inherited validator passes the same hole/coverage/source-containment,264-solid, stair/landing, sampled-clearance and16-furniture-box checks, with the original floating, sealed-hole and flattened-card RED controls. I inspected its IO-only wrapper and results; I did not rerun that complete validator. Exact unchanged coordinates independently support transfer of those positional checks. Resources remain11,746tri/1,890,744B,8 categories,0 new atlases and1 light. These remain CPU allocations, not observed GPU draws or timing. Product Assembly ownership, custom passes, normal registry, source sampler and disposal still require actual implementation qualification; see unchanged `src/scene/commercial-corner.ts:567`.

The author's first sweep failed because strict live-object equality distinguished−0 from the0 retained by JSON. Inspection proves only two saved-record comparisons and the final console summary changed. `sweep-tail.mjs:11` and line12 now compare complete serialized-record digests. My countercontrols accept−0/0 at that saved boundary while rejecting a finite1e-12 component change and a miss-count change. This is appropriate for the retained JSON records and changes no scoring predicate; it is not a general claim that JSON preserves every JavaScript value. The author's failed script, stderr and receipt remain sealed.

My initial verification probe also stopped: it expected only those two comparisons and overlooked the console-summary reduction. The retained failure identifies that reporting-only difference. A separate corrected probe admits exactly all three inspected changes and passes; no input or metric changed.

Reviewer proofs are `independent-proof.json`41,700B, `verification.json`136,430B and `attribute-proof.json`42,545B; the [reviewer manifest](../../../../artifacts/commercial-corner-20261014/depth-search1047/review1059/pins.json) binds their hashes, scripts, receipts and this report. Four30s-bounded Node children, including the failed probe, exited naturally in2,915.4771ms aggregate launcher time. Reading/reasoning cost is unmeasured. All recorded PIDs are absent; zero-reparse/error census preceded empty-only TEMP/cache removal. Scoped CIM returned Access denied, so unseen orphan absence is unavailable. Evidence remains for root acceptance. No persistent resource or worktree lease remains. Original eight-view native judgment, public tests and all downstream integration gates remain owed.
