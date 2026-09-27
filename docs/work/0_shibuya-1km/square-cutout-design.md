# Shibuya cutout presentation proposal

Status: design only; base `fc6dab3`; owner `square_boundary`; no browser or source-data writes. Root owns acceptance, implementation allocation and the canonical plan.

## Outcome and bound

Show the existing city as one intentional approximately 1 km square cutout. Every visible city layer ends at the same geographic AOI. The terrain has a solid matte section down to a common model-base floor. Buildings that cross the cut have solid, restrained section faces. This is authored model presentation, not surveyed soil strata or modeled building interiors. Source files, geographic selection, interior geometry, paint supports, camera control semantics and simulation remain unchanged.

The retained native `artifacts/visual/sweep/satellite/overhead-az000.png` and `cartographic/overhead-az120.png` confirm the current broad unbuilt terrain/road apron. They also show that the existing 950 m overhead camera is too close to inspect the whole boundary. A further-out acceptance orbit is necessary.

## Canonical footprint

Add four projected world-space corners to `src/world/aoi.ts`, with provenance and tests against the existing independent projection. They are a presentation export of `AOI_BOUNDS_WGS84`, not another editable geographic region. In x/z metres, current projection gives NW (-497.270985919, -499.924726160), NE (498.620900502, -498.578590111), SE (497.327296053, 499.896660774), SW (-498.676342161, 498.550668378). Four vertical planes through those edges preserve the real projected orientation. Rounded `AOI_EXTENT_M / 2` is unsuitable: the documented 997.1/997.3 m values are north-east versus south-west axis differences, not the lengths of projected geographic edges. No projection code runs in the browser. Straight corner-to-corner edges are the explicit presentation boundary; tests measure the small projection curvature departure at edge midpoints rather than claiming exact curved geographic edges.

## Rendering policy

Enable renderer local clipping. Give all city beauty materials the same four inward-facing planes and `clipShadows = true`. This includes terrain, roads, semantic pavement, source and authored paint, signage, vegetation, hardware and later agent render meshes. Apply to initial roots as they mount and to the finished building tile materials before their first draw, after the facade plugin. The sky and lights stay outside the city clipping policy.

Do not rely on `renderer.clippingPlanes`: the installed three.js `WebGLClipping.beginShadows` expressly removes global planes for the shadow pass. The existing shadow adapter propagates local beauty clipping to generated and custom depth/distance materials. Verify that path against the installed source and a rendered control.

GTAO replaces city beauty materials in `withNormalMaterials`; therefore its ordinary normal material and registered agent normal materials need the same local planes. Preserve the current material-array restoration and exception cleanup. Use one clipped ordinary normal variant owned and disposed by the post pass, not one material allocation per mesh per frame. The sky must not acquire the city normal policy accidentally. TAA and beauty depth reuse the same clipped material shaders. Dynamic actor deformation must occur before the standard clipping position is emitted; no simulation coordinate or pose is changed.

## Solid terrain edge

Intersect the original cached terrain triangles with each of the four planes, constrain each resulting segment to its AOI side, and build a vertical strip down from that exact piecewise-linear profile. No regular sampling, extrapolation or new top surface is needed. The base floor is 12 m below the minimum height in the cached terrain mesh. It is a disclosed presentation thickness. Each side must cover its full projected length without a gap, duplicate contradictory height or corner mismatch. Fail with the side, missing interval and input name if the source cannot establish the profile.

Use one flat, matte, low-chroma section material derived from the selected ground palette, visibly darker than the top. No raised rim, repeated strata, decorative road-end markings or skirt extending outside the AOI. Close the bottom with a quad. The section faces receive light and AO, and belong to the terrain's disposal and style lifecycle. A tiny bounded inset for section faces prevents floating-point self-clipping without introducing an outward apron.

## Cut building faces

Before freezing implementation, qualify the actual recovered cached tiles for closed building sections at all four AOI planes. A triangle-plane slice gives line segments in a 2D side-distance/height frame. Group by source building batch ID. Between consecutive slice endpoint distances, sorted segment intersections give even/odd filled height intervals. Triangulate those intervals into the section faces. This bounded cross-section operation preserves holes and concavity without a general scene boolean engine or contour-repair framework.

Reject odd/open interval counts, ambiguous coincident segments or missing batch authority with the tile and building ID. Do not bridge a roof to arbitrary terrain, fill a courtyard by bounding box, remove an entire straddling building, or silently omit a failed face. Such an input requires a source-specific reviewed decision before this milestone can be accepted. The expected PLATEAU solid topology is a hypothesis until all source tiles are checked.

Caps use a neutral matte section color, with no photographic facade drawn across a cut. Attach each tile's section group to that tile's own scene so visibility, REPLACE refinement and unloading follow the source. Do the small topology operation once at load, after a world-matrix update, and account for/dispose its geometry with the tile. GPU shaders perform all recurring clipping; CPU work is bounded startup topology construction, as in existing mesh setup. Prefer a plugin before LRU byte measurement to ensure cap bytes are included; a load-model hook alone must explicitly account for added geometry and disposal.

## Source coverage and dependencies

The terrain recipe keeps AOI plus 0.0025 degrees and complete edge triangles, so it is expected to span every new boundary. Whole intersecting building tile content is retained. These recipe facts do not prove that the current cached terrain has no perimeter holes or that every building cut is closed. The primary cache was empty at design time; recovery owns reconstructing or finding exact bytes. The first implementation probe reports terrain coverage by side and section eligibility across all 67 actual tile inputs, with input digests. Missing source is a prerequisite failure, not a reason to invent terrain or rebuild over old paint.

Satellite work owns `src/scene/delight.ts` and `src/scene/tile-materials.ts`. This design can apply the clip policy after completed facade materials without editing either file. If a material-level helper becomes necessary, root serializes that small hook after Satellite freeze. No source rebuild, texture rebake, simulation work or unrequested camera redesign is part of this milestone.

## Ownership and verification

Proposed worker files: `src/world/aoi.ts`; new `src/scene/aoi-cutout.ts`; new `src/scene/cutout-sections.ts`; `src/scene/terrain.ts`; `src/scene/buildings.ts`; `src/app.ts`; `src/render/normal-pass.ts`; small `src/render/post.ts` and `renderer.ts` wiring; focused tests. Root assigns one owner for all of these because clipping and cap contracts are inseparable. Root or a separate verification owner controls supplemental GPU capture files after implementation freezes; no concurrent full gates.

Automated acceptance: projected corners and edge-midpoint deviation; inside/outside classification on every side; exact terrain slice profile, gaps and shared corners; section holes, concave silhouettes, multiple batches, transformed meshes, coplanar/vertex edge cases and deliberate open-shell refusal; no mutation of source buffers; identical planes on beauty, ordinary/custom normals and shadow materials; exception restoration and disposal; all five required repo gates. Add an explicit failing control for an unclipped normal pass and unclipped shadow caster, plus a deliberately missing cap/terrain gap. Synthetic results alone do not accept the real map.

Visual acceptance: retain the ordinary certified 44 frames and inspect all at native resolution. Add six complete-footprint overhead azimuths at a distance that fits all four corners (start 1500 m), both styles, both dusk and noon: 24 supplemental frames. Add four corner and four side-midpoint close views, both styles and hours: 32 supplemental frames. Aim through actual right-drag panning, left-drag orbit and wheel input; extend the existing input driver only if needed. Capture manifests bind exact frame hashes, source digest, build, GPU, pose and clock. Inspect every image, including cap closure, no exposed building interior or roof hole, no floating paint, no hanging road fragments, no ghost AO, no shadows from clipped-away buildings, no bright fringe, no rim obscuring interior content, and stable section visibility through style switches and tile refinement. The noon arm is essential because sharp shadows are disabled at dusk.

Use one small rendered diagnostic scene with a straddling caster and interior receiver to observe the shadow/AO failure controls independently of dense city pixels. Use the production clipping helper and normal adapter; do not widen the public harness with setters. Compare unchanged interior hero views and actual dropdown camera/agent preservation. Independent visual and code reviewers assess the final frozen revision, including cap accounting and cleanup. No claim of city completion follows solely from this bounded boundary milestone.
