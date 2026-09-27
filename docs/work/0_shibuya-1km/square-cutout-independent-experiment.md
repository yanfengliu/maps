# Independent Route B: ground-connected section envelope

2026-09-27. Written before reading Route A. Scope: numerical geometry only; runtime source, source data, simulation, browser and GPU untouched. Reproduce from primary checkout with `node artifacts/boundary-independent/probe.mjs` (about two seconds on this machine). The protocol's original eligibility files remain untouched.

## Result and verdict

The original closed-input assumption really fails, but that does not make the authored-edge requirement impossible. Independently decoding all 67 pinned tiles produced the same 184 cut sections and the same 35 odd/open sections across 532,315 triangles. Every tile hash and terrain hash matched the preserved baseline; source hashes were checked again at the end. Corners were recomputed from canonical AOI projection and matched the baseline to 1e-9 m. No tile, batch, edge or triangle was omitted.

The distinct candidate fills each section vertically between its lowest/highest source intersections and the actual terrain profile. It keeps horizontal gaps and batch identity, and subdivides at every source endpoint, terrain knot and line crossing. It creates 5,451 planar cells / 10,902 triangles across all 184 sections. Three samples in each piecewise-linear cell found no source intersection outside its cap. `cap-meshes.json` contains the actual candidate triangles, in plane-local coordinates; `report.json` carries every section and the controls. This is numerical coverage, not proof of a watertight source mesh or accepted rendering.

Do not ship this blanket rule as a faithful section construction. Its explicit price is invented footing and erased vertical openings. The hole control has 12 square metres of material but receives 16; the floating-block control has 8 but receives 28. It preserves two horizontally separate components, including their four-metre gap, but does not preserve vertically separate components or cavities. It is viable only as a deliberately authored solid-mass interpretation. The narrower result below makes blanket fill unnecessary for final-detail source.

## Independently verified source witnesses

Chosen before implementing the candidate: `data459.b3dm`, batch 14, GML `bldg_5dcc3a11-a8ae-4d3b-bd5a-e26ddbeabdb0`, north edge. A separate vertical line/triangle barycentric calculation at world (456.0113824803351, -498.6361849256065) hits exactly one triangle, number 80, at Y=39.19414492286191. Its barycentric weights are (0.2737609905282045, 0.3535405327167888, 0.3726984767550066), so this is an interior hit rather than an edge-counting ambiguity. Terrain is Y=24.010000228881836. The original odd span [944.4718753642713, 962.0946031408229] along the north side is genuinely missing its lower intersection. Authored fill here invents about fifteen metres of vertical support.

The hierarchy substantially changes the diagnosis: every one of the 34 non-leaf sections is odd/open; only one of the 150 final-leaf sections is. There are 44 final leaves among the 67 tiles. The only affected leaf is `data533.b3dm`, batch 42, west edge, with about 0.55009 mm total odd width. At its preserved baseline midpoint (world X=-498.4280294309921, Z=322.129812604876), the independent line test finds exactly three interior hits at Y=35.493833183256264, 95.83484229893897 and 97.30984660781785; terrain is Y=35.9980013792637. This is a real tiny source-section defect, not permission to discard the tile.

Across all LODs the envelope adds 3,530.2259 square metres even in intervals where parity already pairs the input. Of that, only 7.8992 square metres is on final leaves. Summed LOD areas are diagnostic totals, never simultaneous scene area. Non-leaf geometry is the dominant source of missing floors and invented fill. This conclusion was obtained from the untouched tileset hierarchy after the source experiment; it was not a filter used to improve the result.

## Instrument assumptions and controls

Seven analytic controls passed: grounded closed rectangle, open roof, duplicate open roof, two horizontally separate components, cavity, floating component, and crossing lines. Expected areas were written independently of the algorithm. The duplicate open roof demonstrates a limit in parity eligibility: two coincident roof segments are even, yet enclose no area and have no floor. Thus zero odd intervals alone is not proof of a valid solid section. It remains a useful necessary check on these nondegenerate source cases, not a sufficient closure oracle.

The candidate used a fixed 1e-8 m numerical epsilon, with no tile-specific fallback or snap tuning. The first Draco decode attempt failed because Node Buffer slicing retained a larger underlying ArrayBuffer; copying the exact payload into an Int8Array fixed the research loader. That failure was not counted as a geometry result. The candidate's source all-edge run then passed twice, with the second run adding the independently selected leaf witness and explicit hierarchy record. No source case was adjusted to pass.

## Disqualifier audit

- All 67 source tiles, all 184 sections, four canonical edges, batch identities, hierarchy and source hashes are retained. No AOI movement, tile omission, source edit, simulation change, whole-building removal, or swallowed parse/topology error.
- No exposure, camera crop, raised uniform rim or apron is involved. The rule is nevertheless a planar authored fill and must be described as such; claiming source-derived closed geometry would fail the protocol.
- Closed/open/multiple-component controls are independent of actual source and include explicit counterexamples to this rule's fidelity. The source run covers untuned east, south and west sides as well as the chosen north witness.
- Zero source-boundary miss is a coverage measurement only. It is not a mesh-incidence, hole-preservation, LOD transition, shadow, normal-pass, material or native-pixel verdict. This branch cannot certify those under its assigned numerical-only scope.
- Source geometry away from the boundary is unchanged in this experiment; the candidate triangles exist only as ignored research output. Keeping interior geometry unchanged in a future runtime implementation remains an integration obligation.

## Recommendation and exact gap

Do not generalize topology healing or authorize universal ground-envelope fill from these results. Investigate final-leaf section closure plus a deliberate loading/refinement presentation rule: 149 of 150 final-leaf cuts have no odd interval, and the sole remaining defect is bounded below a millimetre. All non-leaf source still needs an explicit policy; ignoring it without a policy fails the 67-tile protocol. A correction must be checked against actual section topology, preserve holes/components, and reject larger or unsupported defects. The remaining task is to prove such a bounded rule on the leaf witness, demonstrate that incomplete/refining tiles never expose open shells, and then verify actual appearance, depth/shadow/normal passes, both styles, all edges, and the ordinary 44-frame gate. No claim of overall closure or visual acceptance is made here.

Evidence hashes: `probe.mjs` SHA-256 f36bb4ed35a7e00b4a36d1671f981c9e1782e2e21dd07d185159dd7bfa6e23ba; `report.json` 42c1f061565bad47f29e07940003caaaa982f4a149de552e584e51b328754aed; `cap-meshes.json` 4cde09673f67a34e68a6ced2d68e7fd9797505e393904a2e9317bcf799106936.
