# 756 — physical construction inquiry

2026-10-11 local. Proposed route; CPU geometry only, unrendered and unadopted. Inquiry began at `1ff554309d9c319a5309211a1bb0196497e4731d`; checkpoint `483d50889df38cd25103dc8645e22b7c608ebc31` leaves the executable graph unchanged.

I inspected all six originals separately at native 1280×720 before reading prior implementation. Candidate753 makes the tower recognizable, but close windows read as repeated black slots; block and held-out views retain that diagram. The cap remains a large photographic blank. These noon observations do not establish rooms or material depth.

Direct Draco decoding of `data519.b3dm` finds 82 target triangles. The north/west walls are four solid triangles, 7.14/11.56m wide, without openings. Each wall occupies roughly 63×255 native atlas pixels, reduced to 15.75×63.75 under its actual 1024 policy. Metadata supports nine office storeys and 33.4m measured height, with aerial-photo appearance and LOD2.2 geometry; it supplies no window polygons or material labels. Source roof height is about52.25m; the raised perimeter reaches57.70m. Increasing atlas allocation cannot manufacture absent structure.

[The concrete CPU prototype](../../../../artifacts/facade756/physical-probe.json) supplies real 1.2m room shells, desks and seeded blinds behind separate dielectric glazing. Its [OBJ](../../../../artifacts/facade756/physical-probe.obj) is a geometry diagram, not an appearance asset. Runtime would use ordinary PBR materials and existing sky/light/exposure, with no virtual-room color shader. Root admits authored apertures on exactly four source wall triangles after source eligibility checks. Original data/buffers/indices/metadata/massing/roof remain immutable; all78 other target triangles and unrelated appearance remain unchanged. The shared corner stays opaque. Independent source-triangle rays demonstrate why apertures are necessary: the original wall intercepts at5m, before proposed backing6.2m away. The [mask/ownership contract](../../../../artifacts/facade756/probe-contract.json) preserves source UV/material appearance outside aperture footprints, including the upper cap.

The prototype has72 authored rooms, 2,226 triangles, approximately214kB nonindexed geometry, seven estimated beauty draws and no additional textures. At y47, the actual benchmark cameras project1.2m separation to3.88–11.02px, versus0.72–2.04px for22cm relief. This is geometric opportunity, not demonstrated readability. Inspection of715 afterward confirms it already has22cm frame relief; another shallow grid would repeat its mechanism.

Next experiment: the same close/block/seed721 real-control benchmark, plus zero-depth and reflection-disabled controls. Require visible jamb/floor/back-wall separation, dielectric glass response and coherent cap/corner/context. Transmission cost/order, full-volume/contact containment, actual mask/source-photo preservation, lower levels and dusk remain unproved. No browser, server, GPU worker or child process was launched; finite CPU probes exited. Process census was unavailable through access denial; no persistent resource was created. Owned artifacts remain for this unresolved handoff.

Inspected SHA-256, baseline/candidate respectively:

| View | Baseline | Candidate |
| --- | --- | --- |
| close | `78905104424b3c36934bcb621666cae3deca8177e97a614cbdbf33dfb8fa7494` | `0f2d7042817b3120996d3f9640c5486264ecc9600e46d8a042cc225bd70202e2` |
| block | `102a9cde8f42f9a854e4a4dff468d16515817f4e4b45f09d0ed2e99b08396fa1` | `3422bd1e9503956bb16a632d535e41b8208c3960c7c15df85c04ffd4fdb4d9c8` |
| seed721 | `7789d6b211a9850c504d0695fd483cd3479b72a1dcdf54a402569a48bf75d2f0` | `628579049a6497230a3d75fd34e2c6902bdb0612f10626a3c1fccfa0df77a0d0` |

Source tile SHA-256: `4bb6b4f51031e6d778ffef44b4c23d7135935471192b7327e9ccf2b1287f0847`. Complete selectors, crop/source hashes, controls, bounds and costs live in the ignored756 artifacts.
