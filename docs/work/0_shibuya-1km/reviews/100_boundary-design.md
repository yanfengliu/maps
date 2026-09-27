# Independent review of Route A after Route B was frozen

2026-09-27. `REPORT.md` and its experiment were written before reading Route A. This separate review reads `route-a-report.md`, `route-a.mjs`, `route-a.json`, the primary building loader, and independently decoded source sections. No runtime/source changes or GPU/browser work occurred.

## Verdict

Final-leaf sections plus an explicit loading/refinement policy are a credible bounded route. General source healing is not needed by the measured final-leaf failure. This is permission to propose that implementation contract, not acceptance of existing caps, rendering or lifecycle behavior. The source tree includes all 67 tiles; the renderer need not expose each published coarse LOD to the user, but any change from all-LOD closure to a final-leaf display invariant must be approved explicitly by root and named as a presentation policy. It cannot be reported as all 67 tiles having source-derived closed sections.

Prefer one source-coincident additive connector over mean welding. The independent graph has 72 vertices, 71 edges and six connected components. Five components are closed; the sixth has exactly two degree-1 tips and all other vertices degree 2. The tips are (176.42130606881628, 95.83484720055988) and (176.42075597796247, 95.83484560283799) in the west-edge section plane. Their Euclidean distance is 0.0005500931740687938 m. Adding that segment keeps all original endpoints untouched, yields 72 vertices / 72 edges, preserves six components, gives every vertex degree 2 and removes the odd interval. My independent decode recovered the same tips within 3e-14 m. See `route-a-review.json`.

Route A's proposed mean weld also removes the odd interval and closes this graph, but moves each source-contact endpoint about 0.275047 mm while leaving the source triangles unchanged. Its geometric guarantee therefore stops at the welded section. Source/cap seam contact needs additional explanation or bridging. The additive connector avoids that particular gap and makes the authored addition explicit.

## Narrow guarantee and controls

The researched connector rule is limited to an odd section with exactly one open connected component, exactly two degree-1 tips, no other non-degree-2 vertices, and tip distance at most 1 mm. Add one connector; move no source/cap endpoint; then require a closed section graph and no odd slabs. A larger gap, multiple open components or ambiguous degree pattern is a named failure. This is an authored correction to one local section discontinuity, not a claim that the source building is watertight or a generic proximity weld. An intentional opening smaller than the bound cannot be distinguished semantically from a crack using proximity alone; the source witness is the basis for accepting this particular presentation class.

Seven independent controls ran: closed rectangle stays unchanged; a missing full edge is rejected; a 0.55 mm endpoint gap gets exactly one connector; a 2 mm gap is rejected; two closed components stay separate; an outer contour and cavity stay unchanged; multiple open components are rejected. These cover the narrow endpoint rule only. The earlier Route B duplicate-open-roof control still demonstrates why even parity or graph degree alone cannot certify solid area. Actual cap construction must check degeneracy and its material region as well.

The all-leaf graph pass covers all 150 sections and 246 connected components from the same independently decoded 67-tile source. Besides the known `data533.b3dm` pair of degree-1 tips, it found one degree-4 contact at `data510.b3dm`, batch 29, south side, section (144.03029464850056, 50.301101149356754). That section has even parity already. Four incident segments share this point, including two rising nearly vertical branches. A simple-loop tracer that rejects or arbitrarily pairs every non-degree-2 vertex would mishandle a real input. The connector must not modify this contact. A slab-region construction can represent touching contours, but it needs an explicit touching-contour control and actual cap validation. This finding does not demand healing that source.

`graph-source-pass.mjs` is a separate copy of the frozen independent source probe that additionally retains raw sections under `graph-pass/`; it leaves the original report and candidate outputs untouched. `review-route-a.mjs` reads those sections and Route A's recorded coordinates, independently computes graph incidence and vertical parity, runs the seven controls and writes `route-a-review.json`. No worker output writer was executed.

## Exact remaining loading and refinement gap

The current primary loader still uses `errorTarget = 16`; `ready` resolves at `load-root-tileset`, and its `load-model` handler immediately enables cast/receive shadows. There is no invariant that visible cut geometry belongs to ready final leaves. The 34 coarse cut sections remain open and cannot be tolerated into closure.

Before exposing the cutout, a runtime policy must identify all boundary descendant leaves (24 measured source leaves), load and validate their caps, and complete any required textures/materials. It must prevent a coarse boundary ancestor from contributing to beauty, normals, depth or shadows. Supersession must preserve every original batch through its descendant representation; it cannot delete a straddling building or silently declare an uncapped ancestor closed. All source paths and hashes remain in the audit, with each coarse cut explicitly classified as superseded or not yet displayable.

The invariant must persist after startup: camera/viewport changes, style switching, LRU eviction, disposal/reload and load failure must never restore uncapped coarse boundary geometry or expose a partly loaded edge. Loading should be a visible whole-scene state until the required boundary is ready, rather than selective holes in buildings. Root must choose whether boundary leaves remain resident or whether the whole-scene readiness state can return, then measure startup, memory accounting and disposal against that contract. Showing an opaque overlay while leaving exterior source shadows active is insufficient.

These are finite renderer/lifecycle obligations, not an unproved topology-healing subproblem. After they are implemented, remaining acceptance is source-coincident cap triangulation (including cavity and touching-contour controls), all-pass clipping, ordinary controls through the loading/style/camera cases, both styles at noon/dusk on every edge, native image review and the full required gates. No claim that those checks ran is made here.

No task-owned browser, GUI or server was created. Numerical Node commands exited. The redundant stdout artifact was removed; source-bound investigation artifacts remain because root requested their preservation for the implementation decision.

## Root disposition

Root accepts the final-leaf presentation invariant and the bounded additive connector for implementation, subject to a concrete loading and residency policy before runtime integration. Source-derived closure is claimed only for qualified final-detail sections, with the one authored connector disclosed. Coarse open sections remain rejected counterevidence. Rendering, lifecycle behavior, actual cap triangulation and final visual acceptance remain unverified.
