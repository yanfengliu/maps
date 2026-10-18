# Elevated source-ground candidate

2026-10-17. Frozen main9bb5eb9/executablee1097edd. **Source-level contact discrepancy; no transform repair qualified. A2 remains OPEN.** Target: `bldg_398703bd-1086-4c64-a438-237caf53eed5`, `data468.b3dm`, center X/Z436.55/−93.706m. Native appearance unassessed.

The complete CityGML GroundSurface is one quadrilateral, no holes or BuildingPart. All four source corners have Y48.475m: X/Z(438.285,−77.676),(429.105,−108.096),(434.855,−109.736),(443.995,−79.406). Its projected area is189.48334998037143m². Source attributes state31.1m measured height,10 storeys,class3002/usage401. These codes were not interpreted as support authority.

This is not the earlier minimum-versus-center comparison. Terrain at those same corners is31.837758–32.301900m. Clipping existing terrain triangles to the entire source footprint yields30 patches,total area189.48334998037112m²,height31.809055–32.301900m. Source GroundSurface is therefore16.173100–16.665945m above the retained terrain across those clipped patches. This area sum is checked; it is not a new terrain-topology proof.

The existing repository b3dm/Draco decoder traversed the installed selected scene and ordinary node matrices:100 target triangles/300 vertices,world Y48.456401–85.158127m. Ground faces1456/1457 cover189.48334998037114m² of the source footprint. Their four corners agree with source X/Z within0.6mm,with Y about18.6mm lower. The16m elevation is already in CityGML and preserved in the installed file; it is not an introduced datum or translation error.

Support check decoded both final leaves whose declared boxes intersect this footprint:data468/data498. No other building triangle has positive projected overlap inside the quad;five interior queries likewise find no other-building surface. No supporting roof was established. Outside-leaf coverage,other source categories,real-world intent and visibility remain unproved. Lowering the building or raising terrain would be speculative.

Instruments: `tools/tiles/{b3dm,draco}.ts`,selected-scene traversal,`surfaceSampler`,`partitionConvex`. Three literal interpolation/outside/edge and two positive/disjoint clipping controls pass. Nonvacuity:complete quad,two ground faces,30 terrain patches,matching nonzero areas. Raw scripts,XML,faces/results remain ignored in `artifacts/terrain1545/`;`candidate.json` SHA d02ca997c0d0a06226a73674661af9c3c7c652f12b231ec21f4f30c87f732d9b.

Input SHA-256: terrain c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773;data468 68eb1e8375a5f9a9be4408a0abf5436312157505d587a6e94899e411caddf6bc;data498 979ab194aa165391e058e1b3b0b3b37ea5c3d64dfc5f5353e61922f9c97ead55. Full CityGML pin is in candidate.json. Source inputs rehashed unchanged. CPU processes completed;no GPU,browser,server,gates or product/cache/Git changes. Smallest next action is a targeted native view of this footprint,then source intent/support review before choosing a repair.
