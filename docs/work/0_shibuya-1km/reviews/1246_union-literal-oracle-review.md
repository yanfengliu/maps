# 1246 — Independent literal occupied-union oracle

**ADMIT as a hand-derived fixture specification only.** No implementation, fixture, geometry helper, constructor, browser or control ran. I read the approved 1230/1235 design and 1244 assignment, without reading mutable 1244 source or fixtures. Root owns later frozen-source review and acceptance. The existing reviewer checkout is at `0ab58a1a83e19db312bb18a2ffa8a90742029835`; this report is unmerged preparation.

Use literal x,y,z coordinates, A=[0,2]×[0,1]×[0,2], B=[1,3]×[0,2]×[0,2], C=[1/2,3/2]×[1/2,3/2]×[1,2], and the selected test priorities A=1,B=2,C=3. These ranks set no production policy. Areas below concern relative interiors; seams share geometric endpoints but never duplicate positive area. An expected boundary cell has exactly one outward selected patch with the named full source/output/material binding. Every generating-facet region outside the listed boundary has expected selected multiplicity zero. Actual zero, reversed, duplicate or differently bound coverage must refuse independently.

## Complete A/B boundary

Let P have ordered boundary (0,0),(3,0),(3,2),(1,2),(1,1),(0,1). A/B is P×[0,2], with area(P)=5 and perimeter(P)=10. Volume is 10 and exterior area is 30.

| Support / outward normal | Finite region | Area | Selected owner |
| --- | --- | ---: | --- |
| z=0 / -z | P | 5 | A on [0,1]×[0,1]; B on [1,3]×[0,2] |
| z=2 / +z | P | 5 | Same A/B partition |
| y=0 / -y | x∈[0,3], z∈[0,2] | 6 | A for x<1; B for x>1 |
| y=2 / +y | x∈[1,3], z∈[0,2] | 4 | B |
| x=0 / -x | y∈[0,1], z∈[0,2] | 2 | A |
| x=3 / +x | y∈[0,2], z∈[0,2] | 4 | B |
| y=1 / +y | x∈[0,1], z∈[0,2] | 2 | A |
| x=1 / -x | y∈[1,2], z∈[0,2] | 2 | B |

The eight maximal connected planar geometric facets have 12 geometric vertices and 18 edges: the six P edges at each end and six vertical P-vertex edges. The only reentrant edge is (1,1,z), 0<z<2, with occupied/exterior transverse arcs 270°/90°; the other 17 edges have 90°/270°. Priority seams are x=1 on each end cap, y∈[0,1], and x=1 on y=0, z∈[0,2]. Coalescing by connected planar full material identity gives 11 patches, not eight. Their material boundary complex has V/E/F=14/23/11: the geometric complex gains seam endpoints (1,0,0),(1,0,2), two edge splits and three seam edges.

## Complete A/B/C boundary

C adds exactly R×[1,2] outside A/B, where R=[1/2,1]×[1,3/2]. For 0<z<1 the section is P; for 1<z<2 it is Q=P∪([1/2,3/2]×[1/2,3/2]). Q's ordered boundary is (0,0),(3,0),(3,2),(1,2),(1,3/2),(1/2,3/2),(1/2,1),(0,1). Area(Q)=21/4 and perimeter(Q)=10. Thus volume=10+1/4=41/4 and exterior area=5+21/4+10+10+1/4=61/2.

| Support / outward normal | Complete finite region | Area | Selected owner |
| --- | --- | ---: | --- |
| z=0 / -z | P | 5 | A area1, B area4 as above |
| z=2 / +z | Q | 21/4 | C on its whole square S=[1/2,3/2]²; B on ([1,3]×[0,2]) minus S; A on ([0,1]×[0,1]) minus S; areas1,7/2,3/4 respectively |
| z=1 / -z | R | 1/4 | C |
| y=0 / -y | x∈[0,3], z∈[0,2] | 6 | A for x<1; B for x>1 |
| y=2 / +y | x∈[1,3], z∈[0,2] | 4 | B |
| x=0 / -x | y∈[0,1], z∈[0,2] | 2 | A |
| x=3 / +x | y∈[0,2], z∈[0,2] | 4 | B |
| y=1 / +y | ([0,1]×[0,2]) minus ([1/2,1]×[1,2]), in x,z | 3/2 | A |
| x=1 / -x | ([1,2]×[0,2]) minus ([1,3/2]×[1,2]), in y,z | 3/2 | B |
| x=1/2 / -x | y∈[1,3/2], z∈[1,2] | 1/2 | C |
| y=3/2 / +y | x∈[1/2,1], z∈[1,2] | 1/2 | C |

This lists all 11 maximal connected planar geometric facets, including the two nonconvex remnants. C's x=3/2 and y=1/2 generating faces are entirely internal; its x=1/2 and y=3/2 faces are internal outside the listed exposed rectangles; its underside is internal outside R. Priority does not expose these internal faces. The top's C ownership extends over its whole footprint, including the already occupied A/B area.

There are 18 geometric vertices and 27 edges, obtained directly as six bottom P edges, eight top Q edges, five unchanged outer vertical edges, the old reentrant vertical edge restricted to [0,1], three new vertical edges at (1/2,1),(1/2,3/2),(1,3/2) for z∈[1,2], and four R-perimeter edges at z=1. The five reentrant open edges are (1,1,z), z∈(0,1); (1/2,1,z) and (1,3/2,z), z∈(1,2); (x,1,1), x∈(1/2,1); and (1,y,1), y∈(1,3/2). They have 270°/90° occupied/exterior arcs. The other 22 geometric edges have 90°/270°.

Connected planar coalescing by full material identity gives 15 patches: bottom2, top3, y=0 two, and one on each of the other eight supports. This permits nonconvex patches and is distinct from convex atomic arrangement cells. The material complex has V/E/F=24/37/15. Besides the 18 geometric vertices, add (1,0,0),(1,0,2) and four top material vertices (1,1/2,2),(1/2,1/2,2),(3/2,1/2,2),(3/2,3/2,2). The 27 geometric edges gain two splits; add eight material seam edges: bottom1, y=0 one, top A/B one, top A/C two and top B/C three. Euler equality is a checksum after this enumeration, not a topology proof. No raw atomic cell/interval count is asserted.

Top material seams are A/B: x=1,y∈[0,1/2]; A/C: (1,1/2)→(1/2,1/2)→(1/2,1); B/C: (1,1/2)→(3/2,1/2)→(3/2,3/2)→(1,3/2), all at z=2. Bottom and y=0 seams retain their A/B form. Flat material seams have 180°/180° transverse arcs. Labels may change along a common surface without changing its occupied cone.

## Exact interval and endpoint links

The old line (1,1,z) must split at z=1. On (0,1), its local transverse occupied set is dx>0 OR dy<0, giving the reentrant link. On (1,2), C supplies a full transverse neighbourhood: occupancy is 360°, exterior is empty, and no boundary patch or accepted boundary relation remains. At (1,1,1), occupancy is dx>0 OR dy<0 OR dz>0; exterior is exactly dx<0,dy>0,dz<0. Merely splitting the old edge while retaining its upper boundary or omitting the downward face is wrong.

For an interval's complete domain population, affine endpoint values must be considered together: equal strict signs, or one zero plus a strict sign, fix the sign on the open interval; two zeros mean active throughout; opposite strict signs require the exact crossing split or refusal. Every participant/facet/material/replacement transition joins the endpoint population. A midpoint or first-point membership does not prove a whole interval. Artificial collinear subdivisions normalize only after using a common exact endpoint population; required z=1 and physical/material transition points remain represented.

The complete geometric corner population is:

| Locations | Count | Occupied octants |
| --- | ---: | ---: |
| z=0 at (0,0),(3,0),(3,2),(1,2),(0,1) | 5 | 1 |
| z=0 at (1,1) | 1 | 3 |
| z=2 at (0,0),(3,0),(3,2),(1,2),(1/2,3/2),(0,1) | 6 | 1 |
| z=2 at (1/2,1),(1,3/2) | 2 | 3 |
| (1/2,3/2,1) | 1 | 1 |
| (1/2,1,1),(1,3/2,1) | 2 | 5 |
| (1,1,1) | 1 | 7 |

At (1/2,1,1) the exact occupied germ is dy<0 OR (dx>0 AND dz>0). At (1,3/2,1) it is dx>0 OR (dy<0 AND dz>0). These are genuine five-octant saddle corners. At (1/2,3/2,1), it is dx>0 AND dy<0 AND dz>0. A/B alone has ten one-octant and two three-octant geometric vertices.

Counts do not establish endpoint links. Use the direction-cube surface max(|a|,|b|,|c|)=1, glue every face subdivision along identical cube edges and vertices, and retain the whole occupied, exterior and common complexes. Signed permutations reduce the corner germs above to these literal models:

* One octant: O={a>0,b>0,c>0}. The common boundary is the simple closed cycle (1,0,0)→(1,1,0)→(0,1,0)→(0,1,1)→(0,0,1)→(1,0,1)→start.
* Three octants: O={c>0 AND (a>0 OR b>0)}. The common boundary cycle is (0,-1,0)→(1,-1,0)→(1,1,0)→(-1,1,0)→(-1,0,0)→(-1,0,1)→(0,0,1)→(0,-1,1)→start.
* Five and seven octants: interchange occupied/exterior in the three- and one-octant models, with the appropriate signed permutation. The same simple cycles remain.

The strict inequalities label open cells; closures supply the shared boundary. In each model both sides are connected disks on the glued cube, every common-cycle vertex has degree2, and every selected outward germ belongs once to that cycle. These explicit cones and cycles supply the topology argument; octant counts and separate per-face contours do not. New subdivision or material endpoints also need their actual germs: flat-face points such as (1,1,2) and the top triple-material vertex have a halfspace cone, while points introduced on an existing edge inherit that edge's cone. They are not extra geometric corners and cannot be omitted from an actual endpoint audit merely for that reason.

## Required discriminators and review bound

All controls remain **DID_NOT_RUN**. A future source/control review must check complete expected coverage and not use these totals as substitutes:

* Baseline A/B and A/B/C, storage reorder, cyclic polygon rotation and harmless collinear subdivisions preserve the normalized boundary, labels and links. Priority reversal changes the cooriented overlap winner only. The separately approved immutable 1220/provenance.mjs:57,59 uses higher priority, then lower original numeric part index (`j<i`); retain that original identity when reordering storage. For an equal-priority A/B control with original IDs A=0,B=1, A owns [0,2]×[0,1] on both caps and B owns the remainder of P; y=0 switches at x=2. The cap seam is (2,0)→(2,1)→(1,1), rather than the B-higher x=1 seam. Current array positions must not become new tie keys.
* Deleting an entire facet or one link sector, reversing a patch, duplicating positive area, substituting source/support/output/material, omitting C, retaining the old upper edge, or omitting any new C face gives its own coverage/orientation/multiplicity/binding/link refusal. Exact restoration accepts. Preserve whole-region zero coverage for all internal source facets.
* Opposed cubes sharing a whole face can produce one box boundary after internal cancellation when explicitly selected into the union. Point-only touching cubes give disconnected occupied endpoint links; diagonally opposed prisms meeting only along an edge give two occupied and two exterior transverse arcs. Both must refuse. Merely meeting the same total octant/edge count is insufficient. Unselected crossing logical sheets need an existing typed finite relationship or refusal; they cannot become filled participants.
* Missing context, absent generating binding or replacement evidence, a non-first off-support polygon vertex, nonpositive homogeneous denominator, a partially leaking finite contact, or a missing endpoint participant must refuse before a success claim. Every exclusion must cover the complete cell, interval and endpoint where used. No cached/global success flag can replace the requested finite row.

No mutable source or fixture was read for this derivation. After deriving the geometry, I read only the separately approved immutable comparator lines above to settle the tie direction. No executable code or test was run; no native-process absence, actual certificate, performance, emitted geometry, runtime, controls or product acceptance is claimed. Only this report and the compact flat `data/commercial-work/1246/consumed-input-pins.json` were authored. The receipt records the eight exact approved files and their read scopes; hashes were first recorded after initial reading, then compared at finalization. It preserves 1244's earlier 3223-byte/b035ecd0 version and final 3461-byte/c250422d version explicitly, following root's comparator clarification; it does not assert unchanged bytes for that path. No historical closure was recursively pinned. The report is ready for root's independent intake and subsequent frozen-source assignments.
