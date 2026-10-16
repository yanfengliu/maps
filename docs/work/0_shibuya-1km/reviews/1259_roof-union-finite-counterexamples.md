# 1259 — Source-derived finite discriminators

Status: SOURCE_ONLY_DID_NOT_RUN. None of the following fixtures, operations, queries or expected results was parsed as JavaScript, imported or evaluated. They describe concrete source paths for later independently released controls.

## F1: a complete interval query loses harmless collinear invariance

Use the existing one-box/four-quadrant construction in 1257/union-controls.mjs:69: start from literalFixture('point'), retain only roof/0 and its source patches, remove its original A/2/1 top patch, then insert the four top quadrants. This represents the unchanged solid [0,1]^3 with the same full source/material binding on every top quadrant. The two adjacent patches below are quadrant/0 and quadrant/1, both on support (0,0,1,-1), projected axis2, sign+1, source A/2/1 and the existing A binding.

Before subdivision, quadrant/0 has XY ring (0,0),(1/2,0),(1/2,1/2),(0,1/2) at z=1. Insert m=(1/4,1/2,1) between its last two top-edge corners; this preserves its complete convex region, source, material and orientation. Quadrant/1 has XY ring (0,1/2),(1/2,1/2),(1/2,1),(0,1). The full finite contact remains the segment [a,b], a=(0,1/2,1), b=(1/2,1/2,1). This is a harmless representation subdivision, not additional geometric extent or a new physical/material event.

Exact positive homogeneous tuples are a=(0,1,2,2), b=(1,1,2,2), m=(1,2,4,4). Quadrant/0's complete subdivided ring is [(0,0,1,1),(1,0,2,2),b,m,a]. Quadrant/1's ring is [a,b,(1,2,2,2),(0,1,1,1)].

The corrected closed contact clipping in union-geometry.mjs retains the ordered result [b,m,a]: the first y>=1/2 clip leaves those three zero-valued vertices, and every later clip keeps them. pointMap deduplicates equal points but does not remove the distinct collinear m. In contrast, the core's facet-cell arrangement uses G.hull, which removes redundant collinear m. It introduces no new physical extent or mandatory split solely from this vertex.

Call the accepted certificate's classifyWholeContact('quadrant/0','quadrant/1',[a,b],false). The complete finite query has both true extremes, is contained in both patches and is collinear. The actual atomic interval chain and endpoint stars cover it. Expected: the same whole-finite-contact relationship as before subdivision, while leaky or proper-subset queries remain null. Source result: null at roof-union-core.mjs:109, because complete contains m and [a,b] does not literally contain m. The subsequent within/collinearity/full-chain/endpoint-star checks never run for this query. Supplying [a,m,b] merely avoids this redundant representation restriction.

Required distinction: repair geometric contact completeness, rather than waiving it. A proper subinterval, an endpoint outside either patch, a noncollinear positive-area contact, a missing atomic interval or missing endpoint star must still refuse. Final emitted mandatory split obligations are separate and must remain unchanged. This discriminator does not claim that the current production caller necessarily supplies the failing endpoint-only representation; it establishes the private lookup API's false refusal under the approved complete-interval/subdivision contract.

## F2: the selected unclassified-volume control reaches the wrong refusal first

The frozen 1257 control is exactly negative('unclassified-filled-participant','ABC', f => { f.scope.occupied.pop(); f.scope.otherDomains.push({key:'roof/2'}); }, 'UNION_UNCLASSIFIED_VOLUME_PENETRATION'). All setup and mutation code is outside its expected-refusal catch.

The unchanged ABC fixture includes C=[1/2,3/2]×[1/2,3/2]×[1,2] and keeps its C exterior patches. The first such patch is literal/9, the x=1/2 outward face, with domain roof/2 and source C/0/1/2. After the edit, rawDomains still contains C, but selected domainMap contains only roof/0 and roof/1; C is in otherDomains. Replacements and their sectors are empty.

At core:43–47, that C patch has no selected generating facet, and no replacement sector can cover it. The code therefore requires false under UNION_PATCH_GENERATING_LINEAGE. Only after all patch lineage checks does core:50 test positive-volume penetration between selected and other domains. The expected UNION_UNCLASSIFIED_VOLUME_PENETRATION is unreachable for this mutation.

The intended forbidden geometry is real: C overlaps A in volume 1/2 and B in volume 1/2. Those overlapping regions need not be disjoint for this argument. The issue is that the test's retained C patches violate an earlier precondition. If earlier rows complete, the exact-code assertion in negative() fails at this case, so the frozen 70-row suite has no successful path through it. This is a source argument, not an observed first runtime failure.

Required distinction: preserve a genuine unclassified positive-volume discriminator whose setup satisfies all earlier source/patch lineage contracts. Do not merely accept the earlier lineage refusal and call that coverage of volume penetration. The valid baseline, exact refusal, fresh valid rebuild and explicit role/ID plan still need independently reviewed source and later runtime evidence.

## F3: original capture rows are not reconciled bijectively

In the faithful actualAdapterFixture, retain every registry, native patch, binding, source geometry and other capture field. Replace owned.unionFacts.original[1] with owned.unionFacts.original[0]. captureRoofUnionFacts freezes the outer facts object, but its new original array remains mutable. Its population stays unchanged; one valid source/face pair is duplicated and another original capture row disappears.

roof-union-adapter.mjs:48 checks original.length===registry.original.size and original.every(r => sourceById.get(r.source)===r.face). The duplicate row satisfies this predicate twice. There is no uniqueness or complete source-key comparison for facts.original elsewhere in this adapter. Required outcome for the claimed complete producer-capture identity contract: reject this duplicated/missing row population, then accept exact restoration. The current predicate accepts this malformed census as far as its original-capture check is concerned.

Bound: registry.original and the independently derived source geometry remain complete in this example. It is a producer-capture integrity gap, not evidence that the core accepts an omitted geometric face. The later proof may still refuse for an unrelated reason, and no fixture or proof has run. A bijective source/face reconciliation can be order-independent; this finding does not require a new storage-order policy.
