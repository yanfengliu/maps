# Integrated pavement source review 287

Approve the two-file source integration in the primary working tree over main a72add5d58f85727194de1380456f6a60476d65c. No actionable source finding. The candidate is still uncommitted at inspection; this verdict does not report a merge or final acceptance. The final five gates and independent inspection of the completed immutable 46-image set remain pending.

I read the actual integrated diff and full material source, the affected style/material application sites, source review 254 and its evidence correction 254a. Both changed product files match the frozen 253 candidate byte-for-byte, including their exact SHA-256 identities below. The product diff is exactly src/scene/surface-materials.ts and test/surface-material-shader.test.ts. The pending plan and promoted review documents belong to the other assigned owner and were left untouched. No dependency, configuration, controller or default-startup change is included.

The runtime change is confined to the sidewalk fragment treatment: continuous-coordinate derivatives feed the staggered box-coverage helper, normalized tone uses the shared detail-strength uniform, and the sidewalk program-cache key advances. The existing 0.6 by 0.4 metre pattern, roughness 0.82, palette assignment, environment settings and disposal remain. Road and ground branch bodies and their v3 cache keys remain unchanged. The unit additions evaluate emitted scalar arithmetic against known areas and exercise the actual bound style uniform; their existing double-precision and box-footprint limits remain explicit. I did not rerun the scalar investigation or tests.

Pavement geometry construction, vertex positioning, road/pavement samplers, depth behavior, polygon offsets and marking handling are unchanged. The primary pavements.mesh, roads.mesh, terrain.mesh and markings.mesh bytes also match the accepted 277 input hashes. This change therefore does not claim to repair the inherited diagonal line noted in native review 283 or change physical contact. Its source cause remains outside this review.

The existing createRoads.setStyle path calls paving.apply on the same material. That call changes the same uniform object already bound to the shader to 0.12 for the photographic style and 0.08 for the procedural style, while retaining each style's palette. It does not replace geometry or allocate a new material on switching. The integrated bytes are the candidate whose bounded native improvement I accepted in review 283; that earlier evidence does not replace the final integrated appearance gate.

No implementation, gate, build, browser, GPU work, new capture or canonical-document edit occurred. Mutable canonical visual files were not inspected. Only this ignored report was written; no persistent process was created. Stop here until root supplies the completed immutable final image set.

| Reviewed file | Bytes | SHA-256 |
| --- | --- | --- |
| src/scene/surface-materials.ts | 13521 | f905020c983366b27a763fd3403d5ed50eab06904d15c0994133cbcfeaf886c6 |
| test/surface-material-shader.test.ts | 14986 | 970eaf5b6ffa193f0c8ce5ba8ddab7a0eda83d85bda780df5fbe866c53cb01ea |
| data/scene/pavements.mesh | 13068136 | 3b24c5ef71f864fc6a90c768d8850b2f72ba1eb41255cf40dc37fd940115fb62 |
| data/scene/roads.mesh | 6509676 | 0d429c3145be6c7b96fdff6001e49fbdad07db0d0bb4cf966785668bf8fedabc |
| data/scene/terrain.mesh | 4415496 | c39d49edd405e266373e0b48e0202967a01f546e7d11d2dffd5497c14d692773 |
| data/scene/markings.mesh | 388992 | efdba9cb4532db023f18455f858cdbeae8bc76f21d419888df9544b21c42ccf4 |
