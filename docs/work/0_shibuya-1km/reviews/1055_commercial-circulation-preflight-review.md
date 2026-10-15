# 1055 — Independent circulation geometry and sightline preflight review

2026-10-14 local. **HOLD exact sealed1050 before implementation. Finding1055-R1: every east slab-cut reveal is wound toward the slab solid, so the intended opaque edge disappears when viewed from the opening.** The unchanged public sightline metric independently reproduces seed1729 RED,4 misses against2 allowed. This is a construction defect, not evidence for changing the ray population, miss allowance,15% ceiling or1041 classifier. A private winding-only counterfactual supports a bounded repair of that whole family; it does not repair1050 or qualify product/GPU appearance. Product1054 was not dispatched during this review.

Root owns integration and the next contract. I read AGENTS, local rules, lessons, progress, the canonical review/self-improvement instructions,1009,1040,1041, sealed1050 and prepared1051. This read-only review uses PRIMARY docs main8b1bad469d7c3ca22f9a475608302d7f5768169d and the frozen uncommitted1039 module/test. No subagent was needed. Only this new report and ignored `artifacts/commercial-corner-20261014/depth-search1047/review1055/` were written. No worktree, product/test/source-data/dependency/config/build/Git modification, browser, GUI, server or GPU launch occurred.

## Exact scope and independent instrument

| Reviewed input | Bytes | SHA-256 |
| --- | ---: | --- |
| PRIMARY `src/scene/commercial-corner.ts` |46956|`0f534a5670de9f21136ec42778ce274f8b9f4801ae570dd75c734b51917d735e`|
| PRIMARY `test/commercial-corner.test.ts` |84316|`9b6f9bafa864cccdae6b0bd2f40e07d71df33117e847fdc1973a9767232befd9`|
|1050 `architecture.json`|1920896|`0f5cced0c9179c871bdeaa1052530533812a0f2a79999640c304a28efa552262`|
|1050 `construction.json`|2255488|`a50296f280368a76abc01904899c5de88af7ab8536981c2eff9bea87ce1fe859`|
|1050 `pins.json`|22393|`74b16f52a413f6882ea43d48f8071d1a42ae0fa5a255b49b98a47ac560b54430`|
|Candidate6 `evidence-index.json`|17822|`44ca6664034ce5af7457f9d3f9484ae445755e0b0b75d22a1474eef4b623bf33`|

All81 seal entries and40 nested construction/validation/projection/image binding occurrences verify:113 in `edge-and-pin-proof.json`, with the remaining8 construction-image bindings in `counterfactual-proof.json`. Exact original1050 bytes remain unchanged. Root released only1050a `exit-proof.json`,67741B/SHA`551fbc8d4da5aac0f88c9a4197a246e23ab9e89b9224b9ed20f1205e494bf85b`, during the investigation. I verified that digest before reading it; no unreleased1050a script, sightline file or report was read. The independent results below do not depend on its conclusions.

The existing1040 installed-parser graph is sufficient for this question. I reused its bounded source/parser setup, then independently assembled the exact retained1039 triangles minus1050's48 explicit removals plus its sealed insertions. The actual pinned data518 goes through PRIMARY Draco, GLTFLoader and B3DMLoader with original Uint8 categorical channels and the real node transform. The independent known vertex agrees within1e-10m. Original source attributes/index/matrices remain identical before/after source preparation. Only image decoding is supplied by a dimension-only fixture. The loaded module graph and direct input pins are retained and checked after the run. No installed render callback, shader execution, tile event, draw or appearance is inferred.

I copied the unchanged public witness definition and exact four camera/grid populations from `test/commercial-corner.test.ts:620`, including its `.001m` behind-pane rule, rooms-plus-furnishings scope and finite1041 classifier at `test/commercial-corner.test.ts:68`. Separate diagnostics include every authored opaque category, metal included, and both actual data518 source primitives after clipping only the selected lower source faces according to `src/scene/commercial-corner.ts:79`. Double-sided room/pane queries are diagnostic countercontrols; actual opaque materials remain FrontSide, as confirmed in the instantiated model and `src/scene/commercial-corner.ts:554`.

## 1055-R1 — East reveal winding leaves a visible hole through the slab

The generator emits each cut-edge quad in the same point order for both faces at1050 `construct.mjs:93`. The two world-coordinate bases have opposite orientation. Consequently all24 east reveal triangles, covering four edges at each of L1/L3/L5, face into the surrounding slab. All24 south reveal triangles face into their opening correctly. This is broader than the six sampled failures.

The independently calculated normal dotted with the vector from each reveal triangle centre toward the hole centre is−0.925m on east edges0/2 and−4.25m on east edges1/3. The south values are positive. The actual Float32 triangle normal at east edge2 is approximately(-0.978355776,0,-0.206929881); the required inward-to-opening normal is its opposite. For the six failing rays, normal·ray is positive0.675134–0.839193, so FrontSide raycasting and rendering cull this surface.

The east hole perimeter in X/Z is A=(1.153535575796595,−33.21599062444418), B=(2.912438834274814,−41.53201487448788), C=(1.102480600432666,−41.91483492587889), D=(−0.656422658045553,−33.59881067583520). Edge2 is C→D, the d=2.65m rear edge between s=11.3m and2.8m. Every edge spans the same0.33m slab interval: L1 y24.89128407189864..25.22128407189864, L3 y34.83945130091672..35.16945130091673, L5 y44.78761852993481..45.11761852993481. These coordinates already meet the intended cut plane; they need no displacement, expansion or new triangles.

An independent Float32 edge-incidence check finds exactly two incidences at every one of the48 prescribed top/bottom hole-perimeter joins. All24 east joins have the same directed orientation on the cut surface and reveal, rather than opposing directions required by an oriented slab boundary. Reversing only the east reveal triangle order makes all48 joins opposed. This proves the cut-edge orientation defect and its local correction; it is not a whole-building manifold certificate.

The1050 validator cannot detect this defect. Its outward/closed-solid loop at `validate.mjs:39` checks the264 entries in `parts`, which contain treads, stringers, landings, rails and posts but no reveals. Its horizontal normal/coverage loop at `validate.mjs:49` checks cut floors/ceilings. The reveals pass only generic containment/area checks. Therefore the retained PASS is valid only for those narrower predicates, not the complete oriented slab boundary.

| Unchanged view | Pane rays | Misses / allowed | Raw orientation count | Admitted return | Admitted rear | Residual |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
|block|166|0 /1|8|0|0|8|
|close|1080|0 /5|283|78|69|136|
|lower|927|2 /3|231|93|0|138|
|seed1729|922|**4 /2 RED**|218|89|4|125|

All residual ratios remain below15%; this does not override seed1729's miss failure. The six rays enter the east pane, cross the intentionally removed upper-floor region, then intersect the rear cut edge from its culled side while still within the slab's height interval. They do not leave through a second transparent pane. Adding all authored opaque categories finds no substitute near opaque hit. The first actually front-facing source hits lie beyond the local room,71.380–81.916m from the camera. They do not justify counting a closed room or exempting the missing edge.

| View/pixel | Culled actual cut edge | Edge distance, m | First retained source, m |
| --- | --- | ---: | ---: |
|lower(702,342)|east:L1:reveal2|55.920017|72.814761|
|lower(714,342)|east:L1:reveal2|56.949878|71.380465|
|seed1729(702,210)|east:L3:reveal2|53.368616|81.915605|
|seed1729(714,210)|east:L3:reveal2|53.960208|79.349992|
|seed1729(726,210)|east:L3:reveal2|54.578421|76.969352|
|seed1729(738,210)|east:L3:reveal2|55.223935|74.756445|

The baseline hits are independently reproduced on old room triangle229 at y25.221284866333008 for lower, triangle260 at y35.16945266723633 for the first seed1729 ray and261 at that height for the other three. Both removal and ensuing failed boundary intersection are therefore concrete, not an assumption from a missing-hit count.

## Repair constraint and private countercontrols

A bounded correction should orient every reveal triangle toward its actual opening and recompute matching vertex normals, preserving every point, material, triangle count and original policy. Winding, rather than normal attributes alone, determines front-face culling. Correct the whole family, including all east edges and levels; independently verify south remains correct. No DoubleSide change, added opaque blocker, moved opening, tolerance adjustment or metric reclassification is justified by this evidence.

Require an independently defined opening-side normal check for both triangles of every reveal and opposed directed incidences at all top/bottom hole contacts. Preserve the current horizontal coverage, hole-overlap, retained wall/seam, closed structural-solid, stair/landing, furniture and source checks. The exact sealed wrong-winding artifact must fail that public class check; a single reversed triangle at each face/level/edge must fail too. My24 private single-triangle reversal controls all go RED, while the correct orientation passes. These controls are reviewer evidence, not a public retiring gate.

My private in-memory counterfactual swaps only the second/third vertices of the24 east reveal triangles. It retains FrontSide, the exact coordinate set and public sample/classification definitions. All six rays then hit the intended near edge, and the full fixed grids give misses0/0/0/0. Counterfactual raw orientation counts are8/280/231/218, admitted returns0/74/92/89, admitted rears0/69/0/4 and residuals8/137/139/125. Lower139/927=14.9946% remains just below the unchanged15% bound. This is evidence that a winding-only repair is coherent; it does not make original1050 pass, replace real implementation tests or establish a margin beyond the fixed population.

## Other construction and preservation bounds

The sealed triangle positions, intended concave floor subtraction and specified stair/landing topology remain a usable design input subject to1055-R1. I inspected the independent source-contour, support, hole-overlap, solid, tread/contact, sampled centre-clearance and16-box furniture-separation calculations and their retained controls. I did not rerun that full validator or promote its PASS to the missing reveal contract. The264 closed structural solids do not certify the surrounding cut slab. Sampled1.9m paths do not establish continuous circulation or navigation safety.

Resource arithmetic is consistent with the actual installed1039 base:8458tri/1417272B plus3288tri/473472B gives11746tri/1890744B. The fixed ceiling remains12000tri/2097152B,8 material categories,0 new atlases and1 existing light. This is buffer/category arithmetic; no draw count, GPU allocation or frame-time claim follows. My parser probe preserves actual source arrays/index/matrices.1050's explicit old-triangle retention and ground stream hashes, plus unchanged furniture and other category meshes, support its stated CPU preservation bound. Product retention of complete attribute streams still needs exact comparison after an implementation exists.

The independent pure-vector projection code and retained calibrations support the stated70.79–170.36px stair chord range at the original captured cameras. The3px local ray model includes assembly/source occlusion and explicitly omits other tiles, pane transfer, lighting, shadows, GTAO and TAA. Its zero east block samples remain counterevidence. It supplies a finite geometric prediction, not native appearance, visibility fraction or a reason to tune coefficients. I made no new native-image acceptance claim.

The CPU construction's replacement `Mesh` objects at1050 `construct.mjs:112` are probe-only. They reuse beauty materials but do not reproduce the product custom depth/distance materials, normal registry or disposal ownership registered at `src/scene/commercial-corner.ts:567`.1051 correctly requires using the existing Assembly categories. The full threshold/source sampler/exported shader/style/pass/lifetime preservation test boundary remains owed on any actual implementation.

## Evidence, cost and closure

| Reviewer artifact under ignored review1055 | Bytes | SHA-256 |
| --- | ---: | --- |
|`independent-proof.json`|63674|`5cfb86bed60976ad28783cd005c858a3e9d1d7f3394bb8891359bc41a63392da`|
|`edge-and-pin-proof.json`|88553|`f48dee70f53538bcfb4c10d8131d40f42bf312c1c4681e168fe081e2d961fc19`|
|`counterfactual-proof.json`|66468|`51268f73ea66b238653b13488a828ed92d6877cc98f57f3b1c0f4c739184e029`|

Three owned Node children returned naturally with exit0 under separate30s deadlines, disabled compile cache and task-owned TEMP/cache. Launcher wall times were1105.1676ms,127.2148ms and1770.5018ms, total3002.8842ms; bodies1013.7222ms,58.8690ms and1666.2848ms. Reading, reasoning and authoring cost is unmeasured. No invalid CPU run or repair retry occurred. The initial read-only Git query hit the known ownership refusal; command-local safe.directory then read HEAD/status without changing configuration. Status warnings for a denied global-ignore read are retained as an inspection limitation.

Final owned-tree and ancestor census found zero reparse points and zero enumeration errors. All three recorded direct PIDs are absent. The empty owned TEMP/cache directories were removed nonrecursively after resolved-path checks. Scoped CIM returned Access denied; unseen orphan absence is unavailable, not an empty census. No browser, GUI, server, GPU, expensive gate or persistent process was launched. Both parser scene probes dispose their generated geometry/material/texture resources before exit. Evidence remains retained for this unresolved construction finding and root's decision.

The final verdict is **HOLD original1050; accept1055-R1 as a concrete whole-family winding correction requirement before product dispatch**. Root must decide and seal any revised design contract. Keep original1050, the public4>2 RED and all prior metric history intact. A corrected artifact/product needs focused independent review, meaningful public RED/restoration/GREEN and its normal source/resource/pass checks before the original eight-view capture. Appearance, final fallback qualification, five-gate chain, integrated review/main/push and full35 remain open.
